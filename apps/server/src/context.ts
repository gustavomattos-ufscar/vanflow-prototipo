/** Leituras comuns usadas pelos serviços, e o registro da linha do tempo da demo. */
import {
  addDays, at, closeAt, dateOf, type CalendarException, type Enrollment, type Holiday, type Line, type OperatorSettings,
  type ScheduleEntry, type Semester,
} from '@vanflow/domain';
import { all, byId, db, insert, metaGet, one } from './db.ts';
import { clock } from './integrations.ts';

export class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Operator {
  id: string; name: string; trade_name: string; owner_name: string; whatsapp: string; city: string; pix_key: string | null;
  pix_key_type: string | null; pix_merchant_name: string | null; pix_city: string | null; created_at: string; trial_ends_at: string;
  status: string; onboarded: boolean;
}
export interface Subscription { operator_id: string; price_per_van: number; vans_count: number; started_at: string | null; status: string; plan: 'padrao' | 'frotista' }
export interface Van { id: string; operator_id: string; nickname: string; plate: string; model: string; seats: number; color: string; driver_id: string | null }
export interface Student {
  id: string; operator_id: string; name: string; phone: string; city: string; neighborhood: string; pickup_label: string; lat: number; lng: number;
  faculty_id: string; course: string; status: string; guardian_phone: string | null; created_at: string; interest_line_id: string | null; token: string;
}
export interface Trip {
  id: string; line_id: string; date: string; direction: 'ida' | 'volta'; departure_time: string; status: string;
  confirmations_sent_at: string | null; reminder_sent_at: string | null; closed_at: string | null;
}
export interface Passenger {
  id: string; trip_id: string; student_id: string; source: 'plano' | 'avulsa'; status: string; reason: string | null;
  responded_at: string | null; faculty_id: string | null; class_start: string | null;
}
export interface Invoice {
  id: string; operator_id: string; enrollment_id: string; student_id: string; reference_month: string; amount: number; due_date: string;
  status: string; pix_txid: string; pix_payload: string; sent_at: string | null; paid_at: string | null; paid_via: string | null;
  paid_note: string | null; reminders: Array<{ kind: string; sent_at: string }>;
}
export interface Booking {
  id: string; operator_id: string; line_id: string; date: string; student_id: string; kind: string; price: number; status: string;
  hold_until: string | null; pix_txid: string; pix_payload: string; paid_at: string | null;
}

export const now = () => clock.now();
export const today = () => dateOf(clock.now());
export const semester = () => metaGet<Semester>('semester');

export const settingsOf = (operatorId: string) => one<OperatorSettings>('operator_settings', 'operator_id = ?', operatorId)!;
export const operatorOf = (id: string) => {
  const operator = byId<Operator>('operators', id);
  if (!operator) throw new HttpError(404, 'Operador não encontrado.');
  return operator;
};
export const subscriptionOf = (operatorId: string) => one<Subscription>('subscriptions', 'operator_id = ?', operatorId)!;
export const vansOf = (operatorId: string) => all<Van>('vans', 'operator_id = ? ORDER BY id', operatorId);

export function linesOf(operatorId: string): Line[] {
  const vans = vansOf(operatorId).map((v) => v.id);
  return all<Line>('lines').filter((l) => vans.includes(l.van_id));
}

export const lineOf = (id: string) => {
  const line = byId<Line>('lines', id);
  if (!line) throw new HttpError(404, 'Linha não encontrada.');
  return line;
};
export const vanOf = (line: Line) => byId<Van>('vans', line.van_id)!;
export const operatorIdOfLine = (line: Line) => vanOf(line).operator_id;

export const studentOf = (id: string) => {
  const student = byId<Student>('students', id);
  if (!student) throw new HttpError(404, 'Aluno não encontrado.');
  return student;
};

export const facultyName = (id: string | null) => (id ? byId<{ name: string }>('faculties', id)?.name ?? '' : '');

export const tripKey = (lineId: string, date: string) => `${lineId}|${date}`;
export const tripId = (lineId: string, date: string, direction: string) => `trip_${lineId.replace(/^line_/, '')}_${date}_${direction}`;

export interface CalendarData {
  semester: Semester; holidays: Holiday[]; exceptions: CalendarException[];
}

export const calendarOf = (operatorId: string): CalendarData => ({
  semester: semester(),
  holidays: all<Holiday>('holidays'),
  exceptions: all<CalendarException>('calendar_exceptions', 'operator_id = ?', operatorId),
});

export const enrollmentsOfLine = (lineId: string) => all<Enrollment>('enrollments', 'line_id = ?', lineId);

export function schedulesOfStudents(ids: string[]): ScheduleEntry[] {
  if (!ids.length) return [];
  return all<ScheduleEntry>('schedules', `student_id IN (${ids.map(() => '?').join(',')})`, ...ids);
}

/** Depois do fim do teste sem assinar, os envios automáticos pausam (docs/08, seção 1). */
export function isPaused(operatorId: string): boolean {
  const operator = operatorOf(operatorId);
  const subscription = subscriptionOf(operatorId);
  if (subscription.status === 'active') return false;
  return subscription.status === 'canceled' || now() > operator.trial_ends_at;
}

export function logEvent(type: string, description: string): void {
  insert('events_log', { at: now(), type, description });
}

export function addAlert(operatorId: string, kind: string, body: string, ref?: string): void {
  insert('alerts', { operator_id: operatorId, kind, body, ref: ref ?? null, created_at: now() });
}

export const lineCloseAt = (line: Line, date: string, settings: OperatorSettings) => closeAt(date, line, settings);
export const departureAt = (date: string, hhmm: string) => at(date, hhmm);
export const tomorrow = () => addDays(today(), 1);
export const countRows = (table: string, where = '1=1', ...params: any[]) =>
  (db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE ${where}`).get(...params) as { n: number }).n;
