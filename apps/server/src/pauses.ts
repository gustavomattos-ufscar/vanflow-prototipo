/**
 * Pausa de plano: férias, estágio, trancamento. O aluno sai das listas e das cobranças
 * e volta sozinho na data marcada. Fica separado para o agendador usar sem ciclo de importação.
 */
import { fmtDayMonth, msg, type Enrollment } from '@vanflow/domain';
import { all, one, update } from './db.ts';
import { addAlert, HttpError, logEvent, studentOf, today } from './context.ts';
import { whatsapp } from './integrations.ts';
import { resyncOperator } from './trips.ts';

const activeEnrollment = (studentId: string) =>
  one<Enrollment>('enrollments', "student_id = ? AND status IN ('ativa', 'pausada')", studentId);

export function pauseEnrollment(studentId: string, until: string | null, reason: string): void {
  const student = studentOf(studentId);
  const enrollment = activeEnrollment(studentId);
  if (!enrollment) throw new HttpError(409, 'Este aluno não tem plano para pausar.');
  if (until && until <= today()) throw new HttpError(400, 'A data de volta precisa ser depois de hoje.');
  update('enrollments', enrollment.id, { status: 'pausada', paused_until: until, pause_reason: reason?.trim() || null });
  resyncOperator(student.operator_id);
  whatsapp.send({ operator_id: student.operator_id, student_id: studentId, kind: 'texto', body: msg.planPaused(until) });
  logEvent('cadastro', `Plano de ${student.name} pausado${until ? ` até ${fmtDayMonth(until)}` : ''}${reason ? ` (${reason})` : ''}`);
}

export function resumeEnrollment(studentId: string, automatic = false): void {
  const student = studentOf(studentId);
  const enrollment = activeEnrollment(studentId);
  if (!enrollment || enrollment.status !== 'pausada') throw new HttpError(409, 'Este plano não está pausado.');
  update('enrollments', enrollment.id, { status: 'ativa', paused_until: null, pause_reason: null });
  resyncOperator(student.operator_id);
  whatsapp.send({ operator_id: student.operator_id, student_id: studentId, kind: 'texto', body: msg.planResumed() });
  if (automatic) addAlert(student.operator_id, 'plano_volta', msg.alertPlanResumed(student.name), studentId);
  logEvent('cadastro', `Plano de ${student.name} voltou${automatic ? ' na data marcada' : ''}`);
}

/** Roda no agendador: planos com data de volta já alcançada voltam sozinhos. */
export function resumeDuePauses(): void {
  for (const enrollment of all<Enrollment>('enrollments', "status = 'pausada' AND paused_until IS NOT NULL AND paused_until <= ?", today())) {
    resumeEnrollment(enrollment.student_id, true);
  }
}
