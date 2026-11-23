import { describe, expect, it } from 'vitest';
import {
  closeAt, confirmationAt, expectedStudents, isServiceDay, nextClassDate, scheduleFitsTrip, summarizeSeats,
  type CalendarException, type Enrollment, type Line, type PassengerLike, type ScheduleEntry,
} from '../src/index.ts';

const line: Line = {
  id: 'l1', van_id: 'v1', name: 'Itu', shift: 'noite', departure_time: '17:40', return_time: '22:50',
  origin: { lat: 0, lng: 0 }, destinations: ['f1'],
  price_table: { plan_5: 420, plan_3: 300, plan_2: 220, avulsa_round: 20, avulsa_one_way: 12 },
};
const semester = { id: '2026/2', start: '2026-08-03', end: '2026-12-12' };
const holidays = [{ date: '2026-11-20', name: 'Consciência Negra' }];

const enrollment = (id: string, weekdays: number[], extra: Partial<Enrollment> = {}): Enrollment => ({
  id: `e_${id}`, student_id: id, line_id: 'l1', plan_days: weekdays.length, weekdays, monthly_price: 300,
  start_date: '2026-08-01', end_date: '2026-12-12', status: 'ativa', ...extra,
});
const grade = (id: string, weekdays: number[], faculty = 'f1'): ScheduleEntry[] =>
  weekdays.map((weekday) => ({ id: `${id}${weekday}`, student_id: id, semester: '2026/2', weekday, faculty_id: faculty, start: '19:00', end: '22:40' }));

const run = (date: string, enrollments: Enrollment[], schedules: ScheduleEntry[], exceptions: CalendarException[] = []) =>
  expectedStudents({ date, line, direction: 'ida', enrollments, schedules, semester, holidays, exceptions }).map((e) => e.student_id);

describe('lista do dia pela grade', () => {
  const thursday = '2026-11-12';

  it('só entra quem tem plano e aula naquele dia', () => {
    const list = run(thursday, [enrollment('ana', [1, 3, 4]), enrollment('caio', [1, 3, 5])], [...grade('ana', [1, 3, 4]), ...grade('caio', [1, 3, 5])]);
    expect(list).toEqual(['ana']);
  });

  it('plano sem aula na grade naquele dia não entra', () => {
    expect(run(thursday, [enrollment('ana', [4])], grade('ana', [1]))).toEqual([]);
  });

  it('aula sem plano naquele dia não entra', () => {
    expect(run(thursday, [enrollment('ana', [1])], grade('ana', [1, 4]))).toEqual([]);
  });

  it('matrícula pausada ou fora do período não entra', () => {
    expect(run(thursday, [enrollment('a', [4], { status: 'pausada' })], grade('a', [4]))).toEqual([]);
    expect(run(thursday, [enrollment('a', [4], { end_date: '2026-11-01' })], grade('a', [4]))).toEqual([]);
  });

  it('não há lista em feriado, domingo ou fora do semestre', () => {
    const e = [enrollment('a', [5, 0, 1])];
    const g = grade('a', [5, 0, 1]);
    expect(run('2026-11-20', e, g)).toEqual([]);
    expect(run('2026-11-15', e, g)).toEqual([]);
    expect(run('2026-12-14', e, g)).toEqual([]);
    expect(run('2026-11-13', e, g)).toEqual(['a']);
  });

  it('exceção de faculdade tira só os alunos dela', () => {
    const exception: CalendarException = { id: 'x', operator_id: 'o', date: thursday, scope: 'faculdade', ref_id: 'f2', kind: 'sem_aula', note: '' };
    const list = run(thursday, [enrollment('a', [4]), enrollment('b', [4])], [...grade('a', [4], 'f1'), ...grade('b', [4], 'f2')], [exception]);
    expect(list).toEqual(['a']);
  });

  it('viagem cancelada esvazia a lista', () => {
    const exception: CalendarException = { id: 'x', operator_id: 'o', date: thursday, scope: 'linha', ref_id: 'l1', kind: 'viagem_cancelada', note: '' };
    expect(run(thursday, [enrollment('a', [4])], grade('a', [4]), [exception])).toEqual([]);
  });

  it('aula de manhã não entra na van da noite', () => {
    expect(scheduleFitsTrip({ start: '08:00', end: '12:00' }, line, 'ida')).toBe(false);
    expect(scheduleFitsTrip({ start: '19:00', end: '22:40' }, line, 'ida')).toBe(true);
    expect(scheduleFitsTrip({ start: '19:00', end: '23:00' }, line, 'volta')).toBe(true);
  });

  it('segunda recebe confirmação no domingo: quem conta é o dia da viagem', () => {
    expect(isServiceDay('2026-11-16', { semester, holidays })).toBe(true);
    expect(confirmationAt('2026-11-16', { confirmation_time: '21:00' })).toBe('2026-11-15T21:00:00-03:00');
  });
});

describe('fechamento e próximos dias', () => {
  const settings = { close_time_morning: '05:30', close_minutes_before_departure: 180 };

  it('noite fecha 3h antes da saída e manhã às 5h30', () => {
    expect(closeAt('2026-11-12', line, settings)).toBe('2026-11-12T14:40:00-03:00');
    expect(closeAt('2026-11-12', { ...line, shift: 'manha', departure_time: '06:30' }, settings)).toBe('2026-11-12T05:30:00-03:00');
  });

  it('pula feriado ao buscar o próximo dia de aula', () => {
    expect(nextClassDate('2026-11-19', [4, 5], { semester, holidays })).toBe('2026-11-26');
    expect(nextClassDate('2026-11-12', [1, 3, 4], { semester, holidays })).toBe('2026-11-16');
  });
});

describe('vagas livres', () => {
  const plan = (status: PassengerLike['status'], n: number): PassengerLike[] => Array.from({ length: n }, () => ({ status, source: 'plano' }));

  it('reproduz o exemplo da landing: 11 de 14 vão, 4 lugares livres', () => {
    const s = summarizeSeats([...plan('confirmado', 9), ...plan('sem_resposta', 1), ...plan('nao_vai', 3), { status: 'confirmado', source: 'avulsa' }], 15);
    expect(s).toMatchObject({ going: 11, total: 14, confirmed: 9, noAnswer: 1, notGoing: 3, avulsos: 1, free: 4 });
  });

  it('quem ainda não respondeu segura o lugar', () => {
    expect(summarizeSeats(plan('aguardando', 14), 15).free).toBe(1);
  });

  it('"Não vou" libera o lugar e reserva pendente segura', () => {
    const list = [...plan('aguardando', 13), ...plan('nao_vai', 1)];
    expect(summarizeSeats(list, 15)).toMatchObject({ going: 13, total: 14, free: 2 });
    expect(summarizeSeats([...list, { status: 'reservado', source: 'avulsa' }], 15)).toMatchObject({ going: 13, free: 1, reserved: 1 });
  });

  it('reserva expirada não conta e a van cheia não fica negativa', () => {
    expect(summarizeSeats([{ status: 'expirado', source: 'avulsa' }], 15).free).toBe(15);
    expect(summarizeSeats(plan('confirmado', 16), 15).free).toBe(0);
  });
});
