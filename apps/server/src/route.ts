/** Rota do dia: quem vai, em que ordem, e os links para o Maps e o Waze. */
import { addMinutes, at, minutesBetween, timeOf, type Coord, type Line } from '@vanflow/domain';
import { all, sql } from './db.ts';
import { lineOf, now, operatorIdOfLine, settingsOf, type Passenger, type Student, type Trip } from './context.ts';
import { maps } from './integrations.ts';

interface Faculty extends Coord { id: string; name: string }

export interface RouteStop extends Coord {
  order: number; kind: 'saida' | 'aluno' | 'faculdade'; name: string; label: string; eta: string; offset_minutes: number;
  passenger_id?: string; student_id?: string; status?: string; source?: string; reason?: string | null;
}

type Rider = Coord & { passenger: Passenger; student: Student };

function ridersOf(trip: Trip): Rider[] {
  return sql<any>(
    `SELECT tp.id AS p_id, tp.status AS p_status, tp.source AS p_source, tp.reason AS p_reason, tp.faculty_id AS p_faculty, tp.class_start AS p_class,
            s.id AS s_id, s.name, s.pickup_label, s.neighborhood, s.lat, s.lng
     FROM trip_passengers tp JOIN students s ON s.id = tp.student_id WHERE tp.trip_id = ? AND tp.status <> 'expirado'`, trip.id,
  ).map((r) => ({
    lat: r.lat, lng: r.lng,
    passenger: { id: r.p_id, status: r.p_status, source: r.p_source, reason: r.p_reason, faculty_id: r.p_faculty, class_start: r.p_class } as Passenger,
    student: { id: r.s_id, name: r.name, pickup_label: r.pickup_label, neighborhood: r.neighborhood } as Student,
  }));
}

/** Faculdades como paradas finais, em ordem de horário de aula; empate segue a ordem da linha. */
function facultyStops(line: Line, riders: Rider[]): Faculty[] {
  const faculties = all<Faculty>('faculties');
  const used = [...new Set(riders.map((r) => r.passenger.faculty_id).filter(Boolean))] as string[];
  const ids = used.length ? used : line.destinations.slice(0, 1);
  const classAt = (id: string) => riders.filter((r) => r.passenger.faculty_id === id).map((r) => r.passenger.class_start ?? '99:99').sort()[0] ?? '';
  return ids
    .map((id) => faculties.find((f) => f.id === id)!)
    .sort((a, b) => classAt(a.id).localeCompare(classAt(b.id)) || line.destinations.indexOf(a.id) - line.destinations.indexOf(b.id));
}

export function routeView(trip: Trip) {
  const line = lineOf(trip.line_id);
  const settings = settingsOf(operatorIdOfLine(line));
  const riders = ridersOf(trip);
  const goingStatuses = ['confirmado', 'sem_resposta', 'embarcou', 'nao_apareceu', ...(settings.no_answer_counts_as_going ? ['aguardando', 'previsto'] : [])];
  const going = riders.filter((r) => goingStatuses.includes(r.passenger.status));
  const faculties = facultyStops(line, going);
  const last = faculties[faculties.length - 1];
  const isIda = trip.direction === 'ida';

  const homes = isIda ? maps.orderStops(line.origin, going, faculties[0]) : maps.orderStops(last, going);
  type Point = Coord & { kind: RouteStop['kind']; name: string; label: string; rider?: Rider };
  const homePoints: Point[] = homes.map((r) => ({ lat: r.lat, lng: r.lng, kind: 'aluno', name: r.student.name, label: r.student.pickup_label, rider: r }));
  const facultyPoints: Point[] = faculties.map((f) => ({ lat: f.lat, lng: f.lng, kind: 'faculdade', name: f.name, label: f.name }));
  const origin: Point = { lat: line.origin.lat, lng: line.origin.lng, kind: 'saida', name: 'Saída', label: line.origin.label ?? 'Saída' };
  const points = isIda ? [origin, ...homePoints, ...facultyPoints] : [...facultyPoints, ...homePoints];

  const offsets = maps.minutesFromStart(points);
  const departure = at(trip.date, trip.departure_time);
  const stops: RouteStop[] = points.map((p, i) => ({
    order: i, kind: p.kind, name: p.name, label: p.label, lat: p.lat, lng: p.lng,
    offset_minutes: Math.round(offsets[i]), eta: timeOf(addMinutes(departure, Math.round(offsets[i]))),
    passenger_id: p.rider?.passenger.id, student_id: p.rider?.student.id, status: p.rider?.passenger.status,
    source: p.rider?.passenger.source, reason: p.rider?.passenger.reason,
  }));

  // "Rota de cabeça": todo mundo previsto, indo sempre para o ponto mais perto, sem revisar a ordem.
  const everyone = riders.filter((r) => r.passenger.status !== 'reservado');
  const habit = isIda
    ? [line.origin, ...maps.orderByHabit(line.origin, everyone), ...faculties]
    : [...faculties, ...maps.orderByHabit(last, everyone)];
  const km = maps.distanceKm(points);
  const habitKm = maps.distanceKm(habit);

  const skipped = riders
    .filter((r) => r.passenger.status === 'nao_vai')
    .map((r) => ({ name: r.student.name, label: r.student.pickup_label, lat: r.lat, lng: r.lng, reason: r.passenger.reason }));

  return {
    trip_id: trip.id, date: trip.date, direction: trip.direction, departure_time: trip.departure_time, status: trip.status,
    line_name: line.name, stops, skipped,
    km: Math.round(km * 10) / 10, minutes: Math.round(offsets[offsets.length - 1] ?? 0),
    habit_km: Math.round(habitKm * 10) / 10, saved_km: Math.max(0, Math.round((habitKm - km) * 10) / 10),
    elapsed_minutes: minutesBetween(departure, now()),
    maps_links: maps.googleMapsLinks(points),
    embed_url: maps.embedUrl(points),
    waze_links: stops.filter((s) => s.kind !== 'saida').map((s) => ({ order: s.order, name: s.name, label: s.label, url: maps.wazeLink(s), status: s.status })),
  };
}
