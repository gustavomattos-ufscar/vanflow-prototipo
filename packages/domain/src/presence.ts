import type {
  CalendarException, Direction, Enrollment, Holiday, Line, OperatorSettings, PassengerLike,
  ScheduleEntry, SeatSummary, Semester,
} from './types.ts';
import { addDays, addMinutes, at, weekdayOf } from './time.ts';

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

export interface CalendarContext {
  semester: Semester; holidays: Holiday[]; exceptions: CalendarException[];
}

export const holidayOn = (date: string, holidays: Holiday[]) => holidays.find((h) => h.date === date);

/** Dia com serviço: dentro do semestre, fora de domingo e de feriado. */
export function isServiceDay(date: string, { semester, holidays }: Pick<CalendarContext, 'semester' | 'holidays'>): boolean {
  return date >= semester.start && date <= semester.end && weekdayOf(date) !== 0 && !holidayOn(date, holidays);
}

export function isLineCancelled(date: string, lineId: string, exceptions: CalendarException[]): boolean {
  return exceptions.some((e) => e.date === date && e.kind === 'viagem_cancelada' && e.scope === 'linha' && e.ref_id === lineId);
}

/** A aula atende esta viagem? A ida precisa chegar antes do início; a volta precisa sair depois do fim. */
export function scheduleFitsTrip(entry: Pick<ScheduleEntry, 'start' | 'end'>, line: Pick<Line, 'departure_time' | 'return_time'>, direction: Direction): boolean {
  const departure = toMinutes(line.departure_time);
  const back = toMinutes(line.return_time);
  if (direction === 'ida') {
    const start = toMinutes(entry.start);
    return start > departure && start <= departure + 240;
  }
  // Até 30 min depois da volta ainda serve: a van passa por várias faculdades antes de seguir viagem.
  const end = toMinutes(entry.end);
  return end > departure && end <= back + 30;
}

function isExcused(studentId: string, entry: ScheduleEntry, date: string, exceptions: CalendarException[]): boolean {
  return exceptions.some(
    (e) => e.date === date && e.kind === 'sem_aula' &&
      ((e.scope === 'faculdade' && e.ref_id === entry.faculty_id) || (e.scope === 'aluno' && e.ref_id === studentId)),
  );
}

export interface ExpectedStudent { student_id: string; faculty_id: string; start: string; end: string }

/**
 * Quem deveria ir nesta viagem segundo a grade e o plano (docs/08, seção 3):
 * matrícula ativa na linha + dia no plano + aula na grade + sem exceção.
 */
export function expectedStudents(
  input: { date: string; line: Line; direction: Direction; enrollments: Enrollment[]; schedules: ScheduleEntry[] } & CalendarContext,
): ExpectedStudent[] {
  const { date, line, direction, enrollments, schedules, semester, holidays, exceptions } = input;
  if (!isServiceDay(date, { semester, holidays }) || isLineCancelled(date, line.id, exceptions)) return [];
  const weekday = weekdayOf(date);
  const expected: ExpectedStudent[] = [];
  for (const enrollment of enrollments) {
    if (enrollment.line_id !== line.id || enrollment.status !== 'ativa') continue;
    if (date < enrollment.start_date || date > enrollment.end_date) continue;
    if (!enrollment.weekdays.includes(weekday)) continue;
    const entry = schedules.find(
      (s) => s.student_id === enrollment.student_id && s.semester === semester.id && s.weekday === weekday && scheduleFitsTrip(s, line, direction),
    );
    if (!entry || isExcused(enrollment.student_id, entry, date, exceptions)) continue;
    expected.push({ student_id: enrollment.student_id, faculty_id: entry.faculty_id, start: entry.start, end: entry.end });
  }
  return expected;
}

/** Quando a confirmação de uma viagem do dia `date` sai: na véspera, no horário configurado. */
export const confirmationAt = (date: string, settings: Pick<OperatorSettings, 'confirmation_time'>) => at(addDays(date, -1), settings.confirmation_time);
export const reminderAt = (date: string, settings: Pick<OperatorSettings, 'reminder_time'>) => at(addDays(date, -1), settings.reminder_time);

/** Fechamento: horário fixo de manhã; à noite, minutos antes da saída. */
export function closeAt(date: string, line: Pick<Line, 'shift' | 'departure_time'>, settings: Pick<OperatorSettings, 'close_time_morning' | 'close_minutes_before_departure'>): string {
  if (line.shift === 'manha') return at(date, settings.close_time_morning);
  return addMinutes(at(date, line.departure_time), -settings.close_minutes_before_departure);
}

/**
 * Resume a lista. Ocupa lugar quem conta como indo e também quem ainda não respondeu:
 * sem isso, a van pareceria vazia logo depois das 21h e venderia lugares de quem vai.
 */
export function summarizeSeats(passengers: PassengerLike[], capacity: number): SeatSummary {
  const s: SeatSummary = { total: 0, going: 0, confirmed: 0, pending: 0, noAnswer: 0, notGoing: 0, avulsos: 0, reserved: 0, occupied: 0, free: 0, capacity };
  for (const p of passengers) {
    if (p.status === 'expirado') continue;
    if (p.status === 'reservado') { s.reserved++; continue; }
    s.total++;
    if (p.status === 'nao_vai' || p.status === 'nao_apareceu') { s.notGoing++; continue; }
    s.going++;
    if (p.source === 'avulsa') s.avulsos++;
    else if (p.status === 'confirmado' || p.status === 'embarcou') s.confirmed++;
    else if (p.status === 'sem_resposta') s.noAnswer++;
    else s.pending++;
  }
  s.occupied = s.going + s.reserved;
  s.free = Math.max(0, capacity - s.occupied);
  return s;
}

/** Próximo dia do plano depois de `date`, para o "Até segunda." da resposta. */
export function nextClassDate(date: string, weekdays: number[], ctx: Pick<CalendarContext, 'semester' | 'holidays'>): string | null {
  for (let i = 1; i <= 14; i++) {
    const candidate = addDays(date, i);
    if (weekdays.includes(weekdayOf(candidate)) && isServiceDay(candidate, ctx)) return candidate;
  }
  return null;
}
