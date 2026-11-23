/** Ações do operador sobre um aluno: pedir grade, marcar falta, mandar mensagem, reenviar Pix e ações em grupo. */
import { absenceWhen, checkPlanAgainstGrade, fmtDayMonth, msg, WEEKDAY_SHORT, type Enrollment, type ScheduleEntry } from '@vanflow/domain';
import { all, one, update } from './db.ts';
import {
  addAlert, HttpError, lineOf, logEvent, now, operatorIdOfLine, settingsOf, studentOf, today, type Invoice, type Passenger,
} from './context.ts';
import { whatsapp } from './integrations.ts';
import { offerSeats } from './avulsas.ts';
import { openChargeOf, remindNow, sendPixAgain, studentLink } from './billing.ts';
import { findAvulsaOffer, sendAvulsaOffer } from './inbound.ts';
import { replaceSchedule } from './records.ts';
import { tripsOfDay } from './trips.ts';

const MAX_MESSAGE = 1000;

/** Manda o link da página do aluno, que abre direto no formulário da grade. */
export function requestGrade(studentId: string): void {
  const student = studentOf(studentId);
  whatsapp.send({
    operator_id: student.operator_id, student_id: studentId, kind: 'texto',
    body: msg.gradeRequest(student.name, `${studentLink(student)}?grade=1`),
  });
  update('students', studentId, { grade_requested_at: now() });
  logEvent('cadastro', `Pedido de grade enviado para ${student.name}`);
}

type GradeEntry = Pick<ScheduleEntry, 'weekday' | 'faculty_id' | 'start' | 'end'>;

/** O aluno preencheu a grade pelo link. O operador recebe um aviso, com o alerta se o plano não bater. */
export function submitGradeByStudent(studentId: string, entries: GradeEntry[]): void {
  const student = studentOf(studentId);
  if (!Array.isArray(entries) || entries.length === 0) throw new HttpError(400, 'Marque pelo menos um dia de aula.');
  replaceSchedule(studentId, entries);
  update('students', studentId, { grade_updated_at: now() });
  const weekdays = [...new Set(entries.map((e) => e.weekday))].sort();
  const enrollment = one<Enrollment>('enrollments', "student_id = ? AND status IN ('ativa', 'pausada')", studentId);
  const check = enrollment ? checkPlanAgainstGrade(enrollment.plan_days, enrollment.weekdays, weekdays) : null;
  addAlert(student.operator_id, 'grade_aluno', msg.alertGradeUpdated(student.name, check?.message), studentId);
  whatsapp.send({
    operator_id: student.operator_id, student_id: studentId, kind: 'texto',
    body: msg.gradeReceived(weekdays.map((d) => WEEKDAY_SHORT[d]).join(', ')),
  });
}

const CANNOT_MARK = ['nao_vai', 'expirado', 'embarcou', 'nao_apareceu', 'reservado'];

/** O aluno avisou o operador por fora (ligação, conversa): a falta entra na lista e o lugar é liberado. */
export function markAbsence(studentId: string, lineId: string, date: string, reason?: string): void {
  const student = studentOf(studentId);
  const line = lineOf(lineId);
  const trips = tripsOfDay(lineId, date).filter((t) => !['concluida', 'cancelada', 'em_andamento'].includes(t.status));
  const changed: string[] = [];
  for (const trip of trips) {
    const passenger = one<Passenger>('trip_passengers', 'trip_id = ? AND student_id = ?', trip.id, studentId);
    if (!passenger || CANNOT_MARK.includes(passenger.status)) continue;
    update('trip_passengers', passenger.id, { status: 'nao_vai', reason: reason?.trim() || 'avisou o operador', responded_at: now() });
    changed.push(trip.direction);
  }
  if (!changed.length) throw new HttpError(409, 'O aluno não está na lista desse dia.');
  const when = absenceWhen(date, today(), changed);
  whatsapp.send({ operator_id: student.operator_id, student_id: studentId, kind: 'texto', body: msg.absenceMarked(when) });
  logEvent('resposta', `${student.name}: falta marcada pelo operador em ${fmtDayMonth(date)}${reason ? ` (${reason})` : ''}`);
  const stillOpen = trips.some((t) => ['planejada', 'confirmacoes_enviadas'].includes(t.status));
  if (stillOpen && settingsOf(operatorIdOfLine(line)).avulsa_auto_offer) offerSeats(line, date);
}

export function sendOperatorMessage(studentId: string, text: string): void {
  const body = text?.trim();
  if (!body) throw new HttpError(400, 'Escreva a mensagem.');
  if (body.length > MAX_MESSAGE) throw new HttpError(400, `A mensagem pode ter até ${MAX_MESSAGE} letras.`);
  const student = studentOf(studentId);
  whatsapp.send({ operator_id: student.operator_id, student_id: studentId, kind: 'texto', body });
  logEvent('mensagem', `Mensagem do operador para ${student.name}`);
}

export function resendPix(studentId: string): void {
  const { invoice, booking } = openChargeOf(studentId);
  if (!invoice && !booking) throw new HttpError(409, 'Este aluno não tem cobrança em aberto.');
  sendPixAgain(studentId);
  logEvent('cobranca', `Pix reenviado para ${studentOf(studentId).name}`);
}

/** Para a aba de interessados: manda a próxima vaga aberta da linha do aluno. */
export function offerAvulsaTo(studentId: string): void {
  const student = studentOf(studentId);
  const offer = findAvulsaOffer(student);
  if (!offer) throw new HttpError(409, 'Nenhuma vaga aberta nos próximos 7 dias na linha deste aluno.');
  sendAvulsaOffer(student, offer);
  logEvent('oferta', `Vaga de ${fmtDayMonth(offer.date)} oferecida para ${student.name}`);
}

export type BulkAction = 'message' | 'remind' | 'grade';

export interface BulkResult { done: number; skipped: Array<{ name: string; reason: string }> }

export function bulkAction(ids: string[], action: BulkAction, text?: string): BulkResult {
  if (!Array.isArray(ids) || ids.length === 0) throw new HttpError(400, 'Selecione pelo menos um aluno.');
  if (action === 'message' && !text?.trim()) throw new HttpError(400, 'Escreva a mensagem.');
  const result: BulkResult = { done: 0, skipped: [] };
  for (const id of ids) {
    const student = studentOf(id);
    if (action === 'message') sendOperatorMessage(id, text!);
    if (action === 'grade') requestGrade(id);
    if (action === 'remind') {
      const open = all<Invoice>('invoices', "student_id = ? AND status IN ('pendente', 'atrasada')", id);
      if (!open.length) {
        result.skipped.push({ name: student.name, reason: 'sem cobrança em aberto' });
        continue;
      }
      for (const invoice of open) remindNow(invoice.id);
    }
    result.done++;
  }
  return result;
}
