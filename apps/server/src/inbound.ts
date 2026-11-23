/** O que acontece quando chega uma mensagem de aluno. Em produção, é o webhook da Meta. */
import { addDays, addMinutes, MENU_BUTTONS, msg, parseReply, PRESENCE_BUTTONS, weekdayOf, type Enrollment, type Line, type ParsedReply } from '@vanflow/domain';
import { all, byId, sql } from './db.ts';
import { HttpError, lineOf, linesOf, now, studentOf, today, type Passenger, type Student } from './context.ts';
import { whatsapp, type Message } from './integrations.ts';
import { availability, book } from './avulsas.ts';
import { sendPixAgain } from './billing.ts';
import { applyAnswer, saveReason } from './presence.ts';
import { advanceMinutes } from './scheduler.ts';
import { pendingTripsOf, tripsOfDay } from './trips.ts';

export interface InboundInput {
  student_id: string; text: string; message_id?: string;
  /** Respostas simuladas em lote não movem o relógio uma a uma. */
  keep_clock?: boolean;
}

const REASON_WINDOW_MINUTES = 30;

function targetOf(studentId: string, source?: Message): { line: Line; date: string } | null {
  const payload = source?.payload as { line_id?: string; date?: string } | undefined;
  if (payload?.line_id && payload.date) {
    const open = tripsOfDay(payload.line_id, payload.date).some((t) => !['concluida', 'cancelada'].includes(t.status));
    return open ? { line: lineOf(payload.line_id), date: payload.date } : null;
  }
  const pending = pendingTripsOf(studentId, today());
  // Sem pergunta em aberto, vale a viagem mais recente perguntada: a de amanhã, não a volta de hoje à noite.
  const pick = pending.find((p) => p.status === 'aguardando') ?? pending.at(-1);
  return pick ? { line: lineOf(pick.line_id), date: pick.date } : null;
}

const lastOutbound = (studentId: string) =>
  all<Message>('messages', "student_id = ? AND direction = 'out' ORDER BY seq DESC LIMIT 1", studentId)[0];

const lastOffer = (studentId: string) =>
  all<Message>('messages', "student_id = ? AND direction = 'out' AND buttons LIKE '%Reservar%' ORDER BY seq DESC LIMIT 1", studentId)[0];

function reserve(student: Student, source?: Message): void {
  const offer = source?.buttons?.includes('Reservar') ? source : lastOffer(student.id);
  const payload = offer?.payload as { line_id?: string; date?: string } | undefined;
  if (!payload?.line_id || !payload.date) {
    whatsapp.send({ operator_id: student.operator_id, student_id: student.id, kind: 'texto', body: msg.menu(), buttons: MENU_BUTTONS });
    return;
  }
  book(student.id, lineOf(payload.line_id), payload.date);
}

function linesForStudent(student: Student): string[] {
  const enrolled = all<Enrollment>('enrollments', "student_id = ? AND status = 'ativa'", student.id).map((e) => e.line_id);
  if (student.interest_line_id) return [student.interest_line_id, ...enrolled];
  return enrolled.length ? enrolled : linesOf(student.operator_id).map((l) => l.id);
}

function resolveDay(day: ParsedReply['day']): string | undefined {
  if (day === undefined) return undefined;
  if (day === 'hoje') return today();
  if (day === 'amanha') return addDays(today(), 1);
  for (let i = 0; i < 7; i++) {
    const date = addDays(today(), i);
    if (weekdayOf(date) === day) return date;
  }
  return undefined;
}

function answerAvulsa(student: Student, day: ParsedReply['day']): void {
  const wanted = resolveDay(day);
  const lines = linesForStudent(student);
  const options = availability(student.operator_id).filter((a) => lines.includes(a.line_id) && (!wanted || a.date === wanted));
  const offer = options.find((a) => !sql(
    `SELECT 1 FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id
     WHERE tp.student_id = ? AND t.line_id = ? AND t.date = ? AND tp.status NOT IN ('expirado', 'nao_vai')`, student.id, a.line_id, a.date,
  ).length);
  if (!offer) {
    whatsapp.send({ operator_id: student.operator_id, student_id: student.id, kind: 'texto', body: msg.noAvailability() });
    return;
  }
  whatsapp.send({
    operator_id: student.operator_id, student_id: student.id, kind: 'oferta_avulsa',
    body: msg.availability(offer.date, offer.line_name, offer.departure_time, offer.free, offer.price_round),
    buttons: ['Reservar'], payload: { line_id: offer.line_id, date: offer.date },
  });
}

/** "Não vou" pelo botão, e o motivo vem na mensagem seguinte. */
function reasonTarget(studentId: string) {
  const since = addMinutes(now(), -REASON_WINDOW_MINUTES);
  const rows = sql<Passenger & { line_id: string; date: string }>(
    `SELECT tp.*, t.line_id, t.date FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id
     WHERE tp.student_id = ? AND tp.status = 'nao_vai' AND tp.reason IS NULL AND tp.responded_at >= ? ORDER BY tp.responded_at DESC`, studentId, since,
  );
  return rows[0];
}

function answerUnknown(student: Student, text: string): void {
  const pendingReason = reasonTarget(student.id);
  if (pendingReason) {
    saveReason(student.id, lineOf(pendingReason.line_id), pendingReason.date, text.trim());
    whatsapp.send({ operator_id: student.operator_id, student_id: student.id, kind: 'texto', body: msg.reasonNoted() });
    return;
  }
  const waiting = pendingTripsOf(student.id, today()).find((p) => p.status === 'aguardando');
  if (waiting) {
    whatsapp.send({
      operator_id: student.operator_id, student_id: student.id, kind: 'texto', body: msg.notUnderstood(),
      buttons: PRESENCE_BUTTONS, payload: { line_id: waiting.line_id, date: waiting.date },
    });
    return;
  }
  whatsapp.send({ operator_id: student.operator_id, student_id: student.id, kind: 'texto', body: msg.menu(), buttons: MENU_BUTTONS });
}

export function handleInbound({ student_id, text, message_id, keep_clock }: InboundInput): void {
  const body = text?.trim();
  if (!body) throw new HttpError(400, 'Mensagem vazia.');
  const student = studentOf(student_id);
  const source = message_id ? byId<Message>('messages', message_id) : undefined;
  // O tempo da demo anda um minuto a cada resposta, para os horários do chat parecerem de verdade.
  if (!keep_clock) advanceMinutes(1);
  whatsapp.record({ operator_id: student.operator_id, student_id: student.id, body, payload: message_id ? { reply_to: message_id } : {} });

  const { intent, reason, day } = parseReply(body);
  switch (intent) {
    case 'reservar':
      return reserve(student, source);
    case 'avulsa':
      return answerAvulsa(student, day);
    case 'pix':
      return sendPixAgain(student.id);
    case 'desconhecido':
      return answerUnknown(student, body);
  }

  // "Sim" logo depois de uma oferta é aceitar a oferta, não confirmar presença.
  if (intent === 'vai' && lastOutbound(student.id)?.buttons?.includes('Reservar')) return reserve(student);

  const target = targetOf(student.id, source);
  if (!target) {
    whatsapp.send({ operator_id: student.operator_id, student_id: student.id, kind: 'texto', body: msg.noPendingTrip(), buttons: MENU_BUTTONS });
    return;
  }
  applyAnswer(student.id, target.line, target.date, intent, reason);
}
