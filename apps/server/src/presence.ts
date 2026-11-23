/** Confirmação da véspera, respostas dos alunos, lembrete e fechamento da lista. */
import {
  at, closeAt, fmtHour, minutesBetween, msg, nextClassDate, summarizeSeats, timeOf, type Enrollment, type Line,
} from '@vanflow/domain';
import { one, update } from './db.ts';
import {
  addAlert, calendarOf, facultyName, logEvent, now, operatorIdOfLine, settingsOf, studentOf, today, vanOf, type Passenger, type Trip,
} from './context.ts';
import { whatsapp } from './integrations.ts';
import { passengersOf, tripsOfDay } from './trips.ts';
import { offerSeats } from './avulsas.ts';

function studentsOnDay(trips: Trip[]) {
  const seen = new Map<string, Passenger>();
  for (const trip of trips) {
    for (const p of passengersOf(trip.id)) {
      if (!seen.has(p.student_id) || trip.direction === 'ida') seen.set(p.student_id, p);
    }
  }
  return [...seen.values()];
}

/** Manda a pergunta da véspera para quem tem aula. Uma mensagem por aluno, valendo para ida e volta. */
export function sendConfirmations(line: Line, date: string): number {
  const operatorId = operatorIdOfLine(line);
  const trips = tripsOfDay(line.id, date).filter((t) => t.status === 'planejada');
  if (!trips.length) return 0;
  let sent = 0;
  for (const passenger of studentsOnDay(trips)) {
    if (passenger.source !== 'plano' || passenger.status !== 'previsto') continue;
    const student = studentOf(passenger.student_id);
    const ida = one<Passenger>('trip_passengers', "student_id = ? AND trip_id = ?", student.id, trips.find((t) => t.direction === 'ida')?.id ?? '');
    whatsapp.send({
      operator_id: operatorId, student_id: student.id, kind: 'confirmacao',
      body: msg.confirmation(student.name, date, ida?.class_start ?? passenger.class_start ?? line.departure_time, facultyName(passenger.faculty_id)),
      buttons: ['Vou', 'Não vou'], payload: { line_id: line.id, date },
    });
    sent++;
  }
  for (const trip of trips) {
    update('trips', trip.id, { status: 'confirmacoes_enviadas', confirmations_sent_at: now() });
    for (const p of passengersOf(trip.id)) {
      if (p.status === 'previsto') update('trip_passengers', p.id, { status: 'aguardando' });
    }
  }
  logEvent('confirmacao', `${sent} confirmações enviadas para ${line.name} (${date.slice(8)}/${date.slice(5, 7)})`);
  return sent;
}

function deadlineLabel(line: Line, date: string): string {
  const close = closeAt(date, line, settingsOf(operatorIdOfLine(line)));
  return `${fmtHour(timeOf(close))} de amanhã`;
}

export function sendReminders(line: Line, date: string): number {
  const operatorId = operatorIdOfLine(line);
  const trips = tripsOfDay(line.id, date).filter((t) => t.status === 'confirmacoes_enviadas');
  let sent = 0;
  for (const passenger of studentsOnDay(trips)) {
    if (passenger.status !== 'aguardando') continue;
    const student = studentOf(passenger.student_id);
    whatsapp.send({
      operator_id: operatorId, student_id: student.id, kind: 'lembrete',
      body: msg.reminder(student.name, deadlineLabel(line, date)), buttons: ['Vou', 'Não vou'], payload: { line_id: line.id, date },
    });
    sent++;
  }
  for (const trip of trips) update('trips', trip.id, { reminder_sent_at: now() });
  if (sent) logEvent('lembrete', `Lembrete enviado para ${sent} ${sent === 1 ? 'aluno que não respondeu' : 'alunos que não responderam'} (${line.name})`);
  return sent;
}

/** Fecha a lista: quem não respondeu conta como "vai" (padrão) e fica marcado para o motorista. */
export function closeList(line: Line, date: string): void {
  const settings = settingsOf(operatorIdOfLine(line));
  const trips = tripsOfDay(line.id, date).filter((t) => ['planejada', 'confirmacoes_enviadas'].includes(t.status));
  if (!trips.length) return;
  for (const trip of trips) {
    for (const p of passengersOf(trip.id)) {
      if (p.status !== 'aguardando' && p.status !== 'previsto') continue;
      update('trip_passengers', p.id, settings.no_answer_counts_as_going
        ? { status: 'sem_resposta' }
        : { status: 'nao_vai', reason: 'Sem resposta' });
    }
    update('trips', trip.id, { status: 'lista_fechada', closed_at: now() });
  }
  logEvent('fechamento', `Lista fechada: ${line.name} (${date.slice(8)}/${date.slice(5, 7)})`);
}

export type Answer = 'vai' | 'nao_vai' | 'so_ida' | 'so_volta';

function nextDayFor(studentId: string, line: Line, date: string) {
  const enrollment = one<Enrollment>('enrollments', "student_id = ? AND line_id = ? AND status = 'ativa'", studentId, line.id);
  return enrollment ? nextClassDate(date, enrollment.weekdays, calendarOf(operatorIdOfLine(line))) : null;
}

/** Aplica a resposta nas duas viagens do dia e responde no modelo da docs/08. */
export function applyAnswer(studentId: string, line: Line, date: string, answer: Answer, reason?: string): void {
  const operatorId = operatorIdOfLine(line);
  const settings = settingsOf(operatorId);
  const student = studentOf(studentId);
  const trips = tripsOfDay(line.id, date).filter((t) => t.status !== 'concluida' && t.status !== 'cancelada');
  const seats = vanOf(line).seats;
  const mine = (trip: Trip) => one<Passenger>('trip_passengers', 'trip_id = ? AND student_id = ?', trip.id, studentId);

  const reply = (body: string) => whatsapp.send({ operator_id: operatorId, student_id: studentId, kind: 'texto', body, payload: { line_id: line.id, date } });
  const wantedStatus = (trip: Trip) => {
    if (answer === 'vai') return 'confirmado';
    if (answer === 'nao_vai') return 'nao_vai';
    return (answer === 'so_ida') === (trip.direction === 'ida') ? 'confirmado' : 'nao_vai';
  };

  // Quem liberou o lugar e mudou de ideia só volta se ainda houver vaga na van.
  for (const trip of trips) {
    const passenger = mine(trip);
    if (passenger?.status === 'nao_vai' && wantedStatus(trip) === 'confirmado') {
      if (summarizeSeats(passengersOf(trip.id) as any, seats).free === 0) return reply(msg.vanFull());
    }
  }

  for (const trip of trips) {
    const passenger = mine(trip);
    if (!passenger) continue;
    const status = wantedStatus(trip);
    update('trip_passengers', passenger.id, { status, reason: status === 'nao_vai' ? reason ?? null : null, responded_at: now() });
  }

  const ida = trips.find((t) => t.direction === 'ida') ?? trips[0];
  if (answer === 'vai') reply(msg.going(ida?.departure_time ?? line.departure_time, student.pickup_label));
  if (answer === 'nao_vai') reply(msg.notGoing(nextDayFor(studentId, line, date)));
  if (answer === 'so_ida') reply(msg.onlyOneWay('ida'));
  if (answer === 'so_volta') reply(msg.onlyOneWay('volta'));

  logEvent('resposta', `${student.name}: ${answer === 'vai' ? 'vou' : answer === 'nao_vai' ? 'não vou' : answer.replace('_', ' ')}${reason ? ` (${reason})` : ''}`);

  if (answer !== 'vai') {
    const closed = ida && !['planejada', 'confirmacoes_enviadas'].includes(ida.status);
    if (closed) {
      const minutes = minutesBetween(now(), at(date, ida.departure_time));
      const when = date === today() ? 'hoje' : 'amanhã';
      const label = minutes > 0 ? `${when} (${minutes} min antes da saída)` : when;
      addAlert(operatorId, 'falta_tardia', msg.alertLateAbsence(student.name, label), ida.id);
    } else if (settings.avulsa_auto_offer) {
      offerSeats(line, date);
    }
  }
}

/** Guarda o motivo digitado logo depois do "Não vou". */
export function saveReason(studentId: string, line: Line, date: string, reason: string): void {
  for (const trip of tripsOfDay(line.id, date)) {
    const passenger = one<Passenger>('trip_passengers', 'trip_id = ? AND student_id = ?', trip.id, studentId);
    if (passenger?.status === 'nao_vai') update('trip_passengers', passenger.id, { reason });
  }
  logEvent('resposta', `${studentOf(studentId).name} informou o motivo: ${reason}`);
}
