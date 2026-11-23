/** Vagas avulsas: o lugar de quem faltou vira dinheiro para o operador. */
import {
  addDays, addMinutes, avulsaTxid, brl, fmtDayMonth, msg, summarizeSeats, type BookingKind, type Enrollment, type Line, weekdayOf,
} from '@vanflow/domain';
import { all, byId, insert, one, sql, update } from './db.ts';
import {
  HttpError, linesOf, logEvent, now, operatorIdOfLine, operatorOf, settingsOf, studentOf, today, tripId, tripKey, vanOf,
  type Booking, type Operator, type Passenger, type Student,
} from './context.ts';
import { pix, whatsapp } from './integrations.ts';
import { passengersOf, tripsOfDay } from './trips.ts';

const OPEN = ['planejada', 'confirmacoes_enviadas'];

export const priceOf = (line: Line, kind: BookingKind) =>
  kind === 'ida_volta' ? line.price_table.avulsa_round : line.price_table.avulsa_one_way;

const directionsOf = (kind: BookingKind) => (kind === 'ida_volta' ? ['ida', 'volta'] : kind === 'so_ida' ? ['ida'] : ['volta']);

/** Vagas livres do dia para um tipo de compra: ida e volta precisa de lugar nas duas viagens. */
export function freeSeats(line: Line, date: string, kind: BookingKind = 'ida_volta'): number {
  const seats = vanOf(line).seats;
  const trips = tripsOfDay(line.id, date).filter((t) => directionsOf(kind).includes(t.direction));
  if (trips.length !== directionsOf(kind).length || trips.some((t) => !OPEN.includes(t.status))) return 0;
  return Math.min(...trips.map((t) => summarizeSeats(passengersOf(t.id) as any, seats).free));
}

export interface Availability { line_id: string; line_name: string; date: string; departure_time: string; free: number; price_round: number; price_one_way: number }

export function availability(operatorId: string, from = today(), days = 7): Availability[] {
  const out: Availability[] = [];
  for (const line of linesOf(operatorId)) {
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      const free = freeSeats(line, date);
      if (free > 0) {
        out.push({
          line_id: line.id, line_name: line.name, date, departure_time: line.departure_time, free,
          price_round: line.price_table.avulsa_round, price_one_way: line.price_table.avulsa_one_way,
        });
      }
    }
  }
  return out.sort((a, b) => a.date.localeCompare(b.date) || a.departure_time.localeCompare(b.departure_time));
}

/** Lista de interesse da viagem: quem é da lista de avulsos e quem não tem plano naquele dia. */
export function interestedFor(line: Line, date: string): Array<Student & { last_purchase: string | null; offered: boolean }> {
  const operatorId = operatorIdOfLine(line);
  const weekday = weekdayOf(date);
  const onTrip = new Set(
    sql<{ student_id: string }>(
      `SELECT tp.student_id FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id
       WHERE t.line_id = ? AND t.date = ? AND tp.status <> 'expirado'`, line.id, date,
    ).map((r) => r.student_id),
  );
  const enrollments = all<Enrollment>('enrollments', "line_id = ? AND status = 'ativa'", line.id);
  const offered = new Set(all<{ student_id: string }>('avulsa_offers', 'trip_key = ?', tripKey(line.id, date)).map((o) => o.student_id));
  const students = all<Student>('students', 'operator_id = ?', operatorId).filter((s) => {
    if (onTrip.has(s.id)) return false;
    if (s.status === 'interessado_avulsa') return s.interest_line_id === line.id;
    const enrollment = enrollments.find((e) => e.student_id === s.id);
    return s.status === 'ativo' && !!enrollment && !enrollment.weekdays.includes(weekday);
  });
  return students
    .map((s) => ({
      ...s, offered: offered.has(s.id),
      last_purchase: sql<{ paid_at: string | null }>("SELECT MAX(paid_at) AS paid_at FROM avulsa_bookings WHERE student_id = ? AND status = 'pago'", s.id)[0].paid_at,
    }))
    .sort((a, b) => (b.last_purchase ?? '').localeCompare(a.last_purchase ?? ''));
}

/** Manda a oferta para até `limit` interessados que ainda não receberam, por compra mais recente. */
export function offerSeats(line: Line, date: string, limit = 5, onlyStudentIds?: string[]): number {
  const operatorId = operatorIdOfLine(line);
  if (freeSeats(line, date) === 0) return 0;
  const targets = interestedFor(line, date)
    .filter((s) => !s.offered && (!onlyStudentIds || onlyStudentIds.includes(s.id)))
    .slice(0, limit);
  for (const student of targets) {
    whatsapp.send({
      operator_id: operatorId, student_id: student.id, kind: 'oferta_avulsa',
      body: msg.offer(date, line.name, line.departure_time, line.price_table.avulsa_round),
      buttons: ['Reservar'], payload: { line_id: line.id, date },
    });
    insert('avulsa_offers', { trip_key: tripKey(line.id, date), student_id: student.id, sent_at: now() });
  }
  if (targets.length) logEvent('oferta', `Vaga de ${fmtDayMonth(date)} oferecida para ${targets.length} ${targets.length === 1 ? 'interessado' : 'interessados'} (${line.name})`);
  return targets.length;
}

function nextBookingId(): string {
  const last = sql<{ n: number }>("SELECT COALESCE(MAX(CAST(SUBSTR(id, 4) AS INTEGER)), 0) + 1 AS n FROM avulsa_bookings")[0].n;
  return `av_${String(last).padStart(3, '0')}`;
}

export type BookResult = { ok: true; booking: Booking } | { ok: false; reason: string };

/** Segura a vaga por 30 minutos e manda o Pix. Quem chegar depois do último lugar recebe recusa. */
export function book(studentId: string, line: Line, date: string, kind: BookingKind = 'ida_volta'): BookResult {
  const student = studentOf(studentId);
  const operatorId = operatorIdOfLine(line);
  const operator = operatorOf(operatorId);
  const settings = settingsOf(operatorId);
  const reply = (body: string) => whatsapp.send({ operator_id: operatorId, student_id: studentId, kind: 'texto', body });

  const trips = tripsOfDay(line.id, date).filter((t) => directionsOf(kind).includes(t.direction));
  const alreadyIn = trips.some((t) => {
    const p = one<Passenger>('trip_passengers', 'trip_id = ? AND student_id = ?', t.id, studentId);
    return p && !['expirado', 'nao_vai'].includes(p.status);
  });
  if (alreadyIn) {
    reply(msg.alreadyOnList(date));
    return { ok: false, reason: 'Esse aluno já está na lista desse dia.' };
  }
  if (freeSeats(line, date, kind) === 0) {
    reply(msg.seatTaken());
    return { ok: false, reason: 'Não há vaga livre nessa viagem.' };
  }
  if (!operator.pix_key) throw new HttpError(400, 'Cadastre a chave Pix do operador em Configurações.');

  const id = nextBookingId();
  const price = priceOf(line, kind);
  const charge = pix.createCharge(operator as Operator & { pix_key: string; pix_merchant_name: string; pix_city: string }, price, avulsaTxid(date, id));
  const booking: Booking = {
    id, operator_id: operatorId, line_id: line.id, date, student_id: studentId, kind, price, status: 'reservado',
    hold_until: addMinutes(now(), settings.avulsa_hold_minutes), pix_txid: charge.txid, pix_payload: charge.payload, paid_at: null,
  };
  insert('avulsa_bookings', booking);
  for (const trip of trips) {
    insert('trip_passengers', {
      id: `tp_${trip.id}_${studentId}`, trip_id: trip.id, student_id: studentId, source: 'avulsa', status: 'reservado',
      reason: null, faculty_id: student.faculty_id, class_start: null,
    }, 'INSERT OR REPLACE');
  }
  whatsapp.send({
    operator_id: operatorId, student_id: studentId, kind: 'pix', body: msg.reserved(settings.avulsa_hold_minutes),
    payload: { booking_id: id, pix_payload: charge.payload, txid: charge.txid, amount: price, title: `Vaga avulsa de ${fmtDayMonth(date)}` },
  });
  logEvent('avulsa', `${student.name} reservou vaga avulsa de ${fmtDayMonth(date)} (${brl(price)})`);
  return { ok: true, booking };
}

function setBookingPassengers(booking: Booking, status: string): void {
  for (const direction of directionsOf(booking.kind as BookingKind)) {
    const id = `tp_${tripId(booking.line_id, booking.date, direction)}_${booking.student_id}`;
    update('trip_passengers', id, { status, responded_at: now() });
  }
}

/** Reserva vencida: a vaga volta e o aluno fica sabendo. */
export function expireHolds(): void {
  for (const booking of all<Booking>('avulsa_bookings', "status = 'reservado' AND hold_until <= ?", now())) {
    update('avulsa_bookings', booking.id, { status: 'expirado' });
    setBookingPassengers(booking, 'expirado');
    whatsapp.send({ operator_id: booking.operator_id, student_id: booking.student_id, kind: 'texto', body: msg.reservationExpired() });
    logEvent('avulsa', `Reserva de ${studentOf(booking.student_id).name} expirou: a vaga voltou`);
  }
}

export function cancelBooking(id: string): void {
  const booking = byId<Booking>('avulsa_bookings', id);
  if (!booking) throw new HttpError(404, 'Reserva não encontrada.');
  if (booking.status !== 'reservado') throw new HttpError(409, 'Só dá para cancelar reserva ainda não paga.');
  update('avulsa_bookings', id, { status: 'cancelado' });
  setBookingPassengers(booking, 'expirado');
  logEvent('avulsa', `Reserva de ${studentOf(booking.student_id).name} cancelada`);
}

/** Pix confirmado: a reserva vira lugar na lista. */
export function confirmBookingPaid(booking: Booking, paidAt: string): void {
  const line = byId<Line>('lines', booking.line_id)!;
  const student = studentOf(booking.student_id);
  update('avulsa_bookings', booking.id, { status: 'pago', paid_at: paidAt });
  setBookingPassengers(booking, 'confirmado');
  whatsapp.send({
    operator_id: booking.operator_id, student_id: booking.student_id, kind: 'recibo',
    body: msg.avulsaPaid(booking.date, line.departure_time, student.pickup_label), payload: { booking_id: booking.id },
  });
  logEvent('pagamento', `${student.name} pagou a vaga avulsa de ${fmtDayMonth(booking.date)}: entrou na lista (${brl(booking.price)})`);
}
