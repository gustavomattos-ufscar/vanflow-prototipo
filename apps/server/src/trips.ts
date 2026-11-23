/** Viagens concretas e passageiros: a lista do dia nasce aqui, a partir da grade. */
import {
  addDays, expectedStudents, firstName, holidayOn, isLineCancelled, isServiceDay, summarizeSeats, type Direction, type Line,
} from '@vanflow/domain';
import { all, byId, insert, remove, sql, update } from './db.ts';
import {
  calendarOf, enrollmentsOfLine, facultyName, HttpError, linesOf, operatorIdOfLine, schedulesOfStudents, today, tripId, vanOf,
  type Passenger, type Student, type Trip,
} from './context.ts';

export const DIRECTIONS: Direction[] = ['ida', 'volta'];

/** Status que ainda ocupam lugar na van. */
export const ACTIVE_STATUSES = ['previsto', 'aguardando', 'confirmado', 'sem_resposta', 'embarcou', 'reservado'];
const OPEN_TRIP = ['planejada', 'confirmacoes_enviadas'];

export const tripOf = (id: string) => {
  const trip = byId<Trip>('trips', id);
  if (!trip) throw new HttpError(404, 'Viagem não encontrada.');
  return trip;
};

export const tripsOfDay = (lineId: string, date: string) =>
  all<Trip>('trips', 'line_id = ? AND date = ?', lineId, date).sort((a, b) => a.direction.localeCompare(b.direction));

export const passengersOf = (id: string) => all<Passenger>('trip_passengers', 'trip_id = ?', id);

export function expectedFor(line: Line, date: string, direction: Direction) {
  const enrollments = enrollmentsOfLine(line.id);
  const schedules = schedulesOfStudents(enrollments.map((e) => e.student_id));
  return expectedStudents({ date, line, direction, enrollments, schedules, ...calendarOf(operatorIdOfLine(line)) });
}

/** Acerta a lista de uma viagem ainda aberta sem perder as respostas já dadas. */
export function syncPassengers(trip: Trip, line: Line): void {
  if (!OPEN_TRIP.includes(trip.status)) return;
  const expected = expectedFor(line, trip.date, trip.direction);
  const current = passengersOf(trip.id);
  for (const item of expected) {
    const existing = current.find((p) => p.student_id === item.student_id);
    if (existing?.source === 'avulsa' && existing.status !== 'expirado') continue;
    const data = { faculty_id: item.faculty_id, class_start: trip.direction === 'ida' ? item.start : item.end };
    if (existing && existing.source === 'plano') {
      update('trip_passengers', existing.id, data);
    } else {
      insert('trip_passengers', {
        id: `tp_${trip.id}_${item.student_id}`, trip_id: trip.id, student_id: item.student_id, source: 'plano',
        status: trip.confirmations_sent_at ? 'aguardando' : 'previsto', ...data,
      }, 'INSERT OR REPLACE');
    }
  }
  for (const passenger of current) {
    if (passenger.source === 'plano' && !expected.some((e) => e.student_id === passenger.student_id)) {
      remove('trip_passengers', 'id = ?', passenger.id);
    }
  }
}

/** Gera as viagens sob demanda (sete dias à frente) e mantém as abertas em dia com a grade. */
export function ensureTrips(operatorId: string, from: string, days = 8): void {
  const calendar = calendarOf(operatorId);
  for (const line of linesOf(operatorId)) {
    for (let i = 0; i < days; i++) {
      const date = addDays(from, i);
      if (!isServiceDay(date, calendar)) continue;
      const cancelled = isLineCancelled(date, line.id, calendar.exceptions);
      for (const direction of DIRECTIONS) {
        const id = tripId(line.id, date, direction);
        let trip = byId<Trip>('trips', id);
        if (!trip) {
          // Dia sem ninguém com aula, como o sábado, não tem van: nem lista, nem vaga à venda.
          if (!cancelled && expectedFor(line, date, direction).length === 0) continue;
          trip = {
            id, line_id: line.id, date, direction, status: 'planejada',
            departure_time: direction === 'ida' ? line.departure_time : line.return_time,
            confirmations_sent_at: null, reminder_sent_at: null, closed_at: null,
          };
          insert('trips', trip);
        }
        if (cancelled && trip.status !== 'cancelada') update('trips', id, { status: 'cancelada' });
        if (!cancelled && trip.status === 'cancelada') update('trips', id, { status: trip.confirmations_sent_at ? 'confirmacoes_enviadas' : 'planejada' });
        syncPassengers({ ...trip, status: cancelled ? 'cancelada' : trip.status === 'cancelada' ? 'planejada' : trip.status }, line);
      }
    }
  }
}

export function resyncOperator(operatorId: string, from = today()): void {
  ensureTrips(operatorId, from);
}

const STATUS_RANK: Record<string, number> = {
  embarcou: 0, confirmado: 1, aguardando: 2, previsto: 2, sem_resposta: 3, reservado: 4, nao_apareceu: 5, nao_vai: 6,
};

export function tripView(trip: Trip) {
  const line = byId<Line>('lines', trip.line_id)!;
  const van = vanOf(line);
  const rows = sql<Passenger & Student & { passenger_id: string; passenger_status: string }>(
    `SELECT tp.*, tp.id AS passenger_id, tp.status AS passenger_status, s.name, s.neighborhood, s.city, s.pickup_label, s.phone, s.lat, s.lng, s.token
     FROM trip_passengers tp JOIN students s ON s.id = tp.student_id WHERE tp.trip_id = ? AND tp.status <> 'expirado'`, trip.id,
  );
  const passengers = rows
    .map((r) => ({
      id: r.passenger_id, student_id: r.student_id, name: r.name, first_name: firstName(r.name), neighborhood: r.neighborhood, city: r.city,
      pickup_label: r.pickup_label, source: r.source, status: r.passenger_status, reason: r.reason, responded_at: r.responded_at,
      faculty: facultyName(r.faculty_id), class_start: r.class_start,
    }))
    .sort((a, b) => (STATUS_RANK[a.status] ?? 9) - (STATUS_RANK[b.status] ?? 9) || a.name.localeCompare(b.name));
  const summary = summarizeSeats(passengers as any, van.seats);
  // "Vagas liberadas": lugares que vieram de quem respondeu "Não vou", para o painel explicar a vaga.
  const released = passengers.filter((p) => p.status === 'nao_vai').map((p) => p.first_name);
  return { ...trip, line_name: line.name, shift: line.shift, van_id: van.id, van_nickname: van.nickname, passengers, summary, released };
}

export function noServiceReason(operatorId: string, date: string): string | null {
  const calendar = calendarOf(operatorId);
  const holiday = holidayOn(date, calendar.holidays);
  if (holiday) return `Feriado: ${holiday.name}. Sem viagem e sem confirmação.`;
  if (!isServiceDay(date, calendar)) return 'Sem viagem neste dia.';
  return null;
}

/** Passageiro do plano em viagem aberta para resposta, do mais próximo ao mais distante. */
export function pendingTripsOf(studentId: string, from: string) {
  return sql<{ line_id: string; date: string; status: string; trip_status: string; direction: string }>(
    `SELECT t.line_id, t.date, t.direction, tp.status, t.status AS trip_status FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id
     WHERE tp.student_id = ? AND tp.source = 'plano' AND t.date >= ? AND t.confirmations_sent_at IS NOT NULL
       AND t.status NOT IN ('concluida', 'cancelada') ORDER BY t.date, t.direction`, studentId, from,
  );
}
