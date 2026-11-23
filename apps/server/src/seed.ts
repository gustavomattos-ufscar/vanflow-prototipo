/** Carrega dados-demo/seed.json no banco e prepara o estado inicial da demo. */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  addDays, at, buildPixPayload, dateOf, invoiceTxid, isServiceDay, monthName, type Line,
} from '@vanflow/domain';
import { all, clearAll, insert, metaSet, remove, ROOT, tx, update } from './db.ts';
import { calendarOf, operatorIdOfLine, tripId, type Operator, type Trip } from './context.ts';
import { DIRECTIONS, ensureTrips, expectedFor, passengersOf } from './trips.ts';
import { runJobs } from './scheduler.ts';

const HISTORY_DAYS = 28;
const ABSENCE_REASONS = ['prova em outro horário', 'aula cancelada', 'consulta médica', 'trabalho', null];

export function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function studentToken(id: string, name: string): string {
  const first = name.normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/)[0].toLowerCase();
  return `${first}-${hash(id).toString(36).slice(0, 5)}`;
}

/** O seed usa "RITA_1" no txid, e o BR Code só aceita letras e números. Refaz o Pix desses casos. */
function fixPixIdentifiers(seed: any): void {
  const operators = new Map<string, any>(seed.operators.map((o: any) => [o.id, o]));
  for (const invoice of seed.invoices) {
    if (/^[A-Za-z0-9]{1,25}$/.test(invoice.pix_txid)) continue;
    const operator = operators.get(invoice.operator_id);
    const txid = invoiceTxid(invoice.reference_month, invoice.student_id);
    for (const payment of seed.payments) if (payment.invoice_id === invoice.id) payment.txid = txid;
    invoice.pix_txid = txid;
    invoice.pix_payload = buildPixPayload({
      key: operator.pix_key, merchantName: operator.pix_merchant_name, merchantCity: operator.pix_city, amount: invoice.amount, txid,
    });
  }
}

/** Histórico de viagens desde a criação da conta, para o calendário de presença e as métricas. */
function backfillTrips(operator: Operator, line: Line, todayDate: string): void {
  const calendar = calendarOf(operator.id);
  const firstDay = addDays(dateOf(operator.created_at), 1);
  for (let i = HISTORY_DAYS; i >= 1; i--) {
    const date = addDays(todayDate, -i);
    if (date < firstDay || !isServiceDay(date, calendar)) continue;
    for (const direction of DIRECTIONS) {
      const id = tripId(line.id, date, direction);
      const sentAt = at(addDays(date, -1), '21:00');
      insert('trips', {
        id, line_id: line.id, date, direction, status: 'concluida',
        departure_time: direction === 'ida' ? line.departure_time : line.return_time,
        confirmations_sent_at: sentAt, closed_at: sentAt,
      });
      for (const item of expectedFor(line, date, direction)) {
        const seed = hash(`${item.student_id}${date}`);
        const absent = seed % 9 === 0;
        insert('trip_passengers', {
          id: `tp_${id}_${item.student_id}`, trip_id: id, student_id: item.student_id, source: 'plano',
          status: absent ? 'nao_vai' : 'embarcou', reason: absent ? ABSENCE_REASONS[seed % ABSENCE_REASONS.length] : null,
          responded_at: sentAt, faculty_id: item.faculty_id, class_start: direction === 'ida' ? item.start : item.end,
        });
      }
    }
  }
}

/** Hoje as viagens já aconteceram: quem vinha respondeu, e o agendador fecha o que passou. */
function prepareToday(operator: Operator, todayDate: string): void {
  const sentAt = at(addDays(todayDate, -1), '21:00');
  for (const trip of all<Trip>('trips', 'date = ?', todayDate)) {
    if (operatorIdOfLine(all<Line>('lines', 'id = ?', trip.line_id)[0]) !== operator.id) continue;
    update('trips', trip.id, { status: 'confirmacoes_enviadas', confirmations_sent_at: sentAt });
    for (const passenger of passengersOf(trip.id)) {
      update('trip_passengers', passenger.id, { status: 'confirmado', responded_at: sentAt });
    }
  }
}

/** No seed, a mensagem de cobrança só traz o código: o bloco do Pix também precisa de valor e título. */
function withPixDetails(message: any, invoices: any[]): any {
  const invoice = invoices.find((i) => i.id === message.payload?.invoice_id);
  if (!invoice || !message.payload.pix_payload) return message;
  return {
    ...message,
    buttons: [],
    payload: { ...message.payload, txid: invoice.pix_txid, amount: invoice.amount, title: `Mensalidade de ${monthName(invoice.reference_month)}` },
  };
}

export function loadSeed(): void {
  const seed = JSON.parse(readFileSync(resolve(ROOT, 'dados-demo/seed.json'), 'utf8'));
  fixPixIdentifiers(seed);
  tx(() => {
    clearAll();
    insert('demo_state', { id: 1, now: seed.demo_state.now, scenario: seed.demo_state.scenario, speed: seed.demo_state.speed, protect_trial: true });
    metaSet('semester', seed.semester);
    metaSet('startup_baseline', seed.startup_baseline);

    const tables: Array<[string, any[]]> = [
      ['faculties', seed.faculties], ['operators', seed.operators], ['operator_settings', seed.operator_settings], ['subscriptions', seed.subscriptions],
      ['drivers', seed.drivers], ['vans', seed.vans], ['lines', seed.lines], ['plans', seed.plans], ['schedules', seed.schedules],
      ['enrollments', seed.enrollments], ['invoices', seed.invoices], ['payments', seed.payments], ['expenses', seed.expenses],
      ['documents', seed.documents], ['holidays', seed.holidays], ['calendar_exceptions', seed.calendar_exceptions], ['leads', seed.leads],
    ];
    for (const [table, rows] of tables) for (const row of rows) insert(table, row);
    for (const student of seed.students) insert('students', { ...student, token: studentToken(student.id, student.name) });
    for (const booking of seed.avulsa_bookings) {
      const operatorId = seed.students.find((s: any) => s.id === booking.student_id).operator_id;
      insert('avulsa_bookings', { ...booking, operator_id: operatorId, line_id: booking.trip_ref.line_id, date: booking.trip_ref.date });
    }
    seed.messages.forEach((message: any, index: number) => insert('messages', { ...withPixDetails(message, seed.invoices), seq: index + 1 }));

    const todayDate = dateOf(seed.demo_state.now);
    for (const operator of all<Operator>('operators')) {
      for (const line of all<Line>('lines')) {
        if (operatorIdOfLine(line) === operator.id) backfillTrips(operator, line, todayDate);
      }
      ensureTrips(operator.id, todayDate);
      prepareToday(operator, todayDate);
    }
    runJobs();
    // O que o agendador fez ao arrumar o dia de hoje não é evento da demo.
    remove('events_log', '1=1');
    insert('events_log', { at: seed.demo_state.now, type: 'demo', description: 'Demo pronta: quarta, 11/11, 20h55. Faltam 5 minutos para as confirmações.' });
  });
}
