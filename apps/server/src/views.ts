/** Leituras prontas para cada tela. Nenhuma função aqui altera dados. */
import {
  addDays, addMonths, at, closeAt, confirmationAt, daysLate, diffDays, documentAlert, firstName, fmtDayMonth, minutesBetween,
  monthOf, subscriptionMonthly, WEEKDAY_LONG, type Enrollment, type Line, type ScheduleEntry,
} from '@vanflow/domain';
import { all, byId, metaGet, one, sql } from './db.ts';
import {
  calendarOf, countRows, HttpError, isPaused, lineOf, linesOf, now, operatorIdOfLine, operatorOf, semester, settingsOf, studentOf, subscriptionOf,
  today, tripId, vanOf, vansOf, type Booking, type Invoice, type Operator, type Student, type Subscription, type Trip,
} from './context.ts';
import { availability, freeSeats, interestedFor } from './avulsas.ts';
import { DOCUMENT_LABELS, openChargeOf, ownerLabel } from './billing.ts';
import { routeView } from './route.ts';
import { noServiceReason, tripOf, tripView, tripsOfDay } from './trips.ts';

const facultyMap = () => new Map(all<{ id: string; name: string }>('faculties').map((f) => [f.id, f.name]));

export function shell(operatorId: string) {
  const operator = operatorOf(operatorId);
  const subscription = subscriptionOf(operatorId);
  const vans = vansOf(operatorId);
  return {
    operator, subscription, vans, lines: linesOf(operatorId), settings: settingsOf(operatorId),
    drivers: all('drivers', 'operator_id = ?', operatorId), faculties: all('faculties'),
    trial_days_left: Math.max(0, diffDays(today(), operator.trial_ends_at.slice(0, 10))),
    paused: isPaused(operatorId), monthly: subscriptionMonthly(vans.length, subscription.plan), semester: semester(),
  };
}

function enrichTrip(trip: Trip, line: Line) {
  const settings = settingsOf(operatorIdOfLine(line));
  const view = tripView(trip);
  return { ...view, close_at: closeAt(trip.date, line, settings), confirmation_at: confirmationAt(trip.date, settings) };
}

export function todayView(operatorId: string, vanId?: string) {
  const lines = linesOf(operatorId).filter((l) => !vanId || l.van_id === vanId);
  const dates = [today(), addDays(today(), 1)];
  const days = dates.map((date) => ({
    date, no_service: noServiceReason(operatorId, date),
    cards: lines
      .map((line) => {
        const trips = tripsOfDay(line.id, date);
        const ida = trips.find((t) => t.direction === 'ida');
        const volta = trips.find((t) => t.direction === 'volta');
        return {
          line_id: line.id, line_name: line.name, shift: line.shift, van_id: line.van_id, van: vanOf(line).nickname,
          ida: ida ? enrichTrip(ida, line) : null, volta: volta ? enrichTrip(volta, line) : null,
          free_to_sell: freeSeats(line, date), interested: trips.length ? interestedFor(line, date).filter((s) => !s.offered).length : 0,
        };
      })
      .filter((c) => c.ida || c.volta),
  }));

  const late = sql<any>(
    `SELECT i.id, i.amount, i.due_date, i.reference_month, s.name FROM invoices i JOIN students s ON s.id = i.student_id
     WHERE i.operator_id = ? AND i.status = 'atrasada' ORDER BY i.due_date`, operatorId,
  ).map((i) => ({ ...i, days_late: daysLate(i.due_date, today()) }));

  const sold = sql<{ n: number; total: number }>(
    "SELECT COUNT(*) AS n, COALESCE(SUM(price), 0) AS total FROM avulsa_bookings WHERE operator_id = ? AND status = 'pago' AND paid_at LIKE ?",
    operatorId, `${today()}%`,
  )[0];

  return {
    now: now(), today: today(), days, late_invoices: late, documents: documentsView(operatorId).filter((d) => d.alert.level !== 'ok').slice(0, 5),
    avulsas_today: sold, messages: messagesView(operatorId, {}, 8),
    alerts: all('alerts', 'operator_id = ? ORDER BY id DESC LIMIT 5', operatorId),
  };
}

export function gradeView(operatorId: string) {
  const faculties = facultyMap();
  const lines = linesOf(operatorId).map((line) => {
    const enrollments = all<Enrollment>('enrollments', "line_id = ? AND status = 'ativa'", line.id);
    const seats = vanOf(line).seats;
    const days = [1, 2, 3, 4, 5, 6].map((weekday) => {
      const riders = enrollments.filter((e) => e.weekdays.includes(weekday)).map((e) => firstName(studentOf(e.student_id).name));
      return { weekday, count: riders.length, free: Math.max(0, seats - riders.length), names: riders };
    });
    const school = days.filter((d) => d.weekday <= 5);
    const busiest = school.reduce((a, b) => (b.count > a.count ? b : a), school[0]);
    const lightest = school.reduce((a, b) => (b.count < a.count ? b : a), school[0]);
    const insight = busiest.count === lightest.count
      ? `Todos os dias têm ${busiest.count} alunos previstos.`
      : `${WEEKDAY_LONG[busiest.weekday]} é o dia mais cheio; ${WEEKDAY_LONG[lightest.weekday]} tem ${lightest.free} ${lightest.free === 1 ? 'lugar sobrando' : 'lugares sobrando'} para avulsas.`;
    return { id: line.id, name: line.name, van: vanOf(line).nickname, seats, days, insight: insight[0].toUpperCase() + insight.slice(1) };
  });
  const calendar = calendarOf(operatorId);
  return {
    lines,
    exceptions: calendar.exceptions.filter((e) => e.date >= today()).sort((a, b) => a.date.localeCompare(b.date)).map((e) => ({
      ...e, target: e.scope === 'faculdade' ? faculties.get(e.ref_id) : e.scope === 'linha' ? lineOf(e.ref_id).name : studentOf(e.ref_id).name,
    })),
    holidays: calendar.holidays.filter((h) => h.date >= today()),
  };
}

export function studentsView(operatorId: string) {
  const faculties = facultyMap();
  const lines = new Map(linesOf(operatorId).map((l) => [l.id, l]));
  const month = monthOf(today());
  return all<Student>('students', 'operator_id = ? ORDER BY name', operatorId).map((s) => {
    const enrollment = one<Enrollment>('enrollments', "student_id = ? AND status <> 'cancelada'", s.id);
    const line = enrollment ? lines.get(enrollment.line_id) : s.interest_line_id ? lines.get(s.interest_line_id) : undefined;
    const invoice = one<Invoice>('invoices', 'student_id = ? AND reference_month = ?', s.id, month);
    return {
      id: s.id, name: s.name, phone: s.phone, city: s.city, neighborhood: s.neighborhood, status: s.status, course: s.course,
      faculty: faculties.get(s.faculty_id) ?? '', faculty_id: s.faculty_id, line_id: line?.id ?? null, line_name: line?.name ?? '', van_id: line?.van_id ?? null,
      van: line ? vanOf(line).nickname : '', plan_days: enrollment?.plan_days ?? null, weekdays: enrollment?.weekdays ?? [],
      monthly_price: enrollment?.monthly_price ?? null, invoice_status: invoice?.status ?? null,
    };
  });
}

export function studentDetail(id: string) {
  const student = studentOf(id);
  const faculties = facultyMap();
  const enrollment = one<Enrollment>('enrollments', "student_id = ? AND status <> 'cancelada'", id) ?? null;
  const schedule = all<ScheduleEntry>('schedules', 'student_id = ? ORDER BY weekday', id).map((s) => ({ ...s, faculty: faculties.get(s.faculty_id) ?? '' }));
  const attendance = sql<{ date: string; status: string; reason: string | null; source: string }>(
    `SELECT t.date, tp.status, tp.reason, tp.source FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id
     WHERE tp.student_id = ? AND t.direction = 'ida' AND tp.status <> 'expirado' ORDER BY t.date`, id,
  );
  return {
    student, enrollment, schedule, attendance, line: enrollment ? lineOf(enrollment.line_id) : null, faculty: faculties.get(student.faculty_id) ?? '',
    invoices: all<Invoice>('invoices', 'student_id = ? ORDER BY reference_month DESC', id),
    messages: all('messages', 'student_id = ? ORDER BY seq DESC LIMIT 30', id).reverse(),
    bookings: all<Booking>('avulsa_bookings', 'student_id = ? ORDER BY date DESC', id),
  };
}

export function invoicesView(operatorId: string, month: string) {
  const rows = sql<any>(
    `SELECT i.*, s.name, s.phone, e.plan_days, e.line_id FROM invoices i JOIN students s ON s.id = i.student_id
     JOIN enrollments e ON e.id = i.enrollment_id WHERE i.operator_id = ? AND i.reference_month = ? ORDER BY s.name`, operatorId, month,
  ).map((r) => ({ ...r, reminders: JSON.parse(r.reminders ?? '[]'), days_late: r.status === 'atrasada' ? daysLate(r.due_date, today()) : 0, van_id: vanOf(lineOf(r.line_id)).id }));
  const sum = (status: string[]) => rows.filter((r) => status.includes(r.status)).reduce((total, r) => total + r.amount, 0);
  const months = sql<{ m: string }>('SELECT DISTINCT reference_month AS m FROM invoices WHERE operator_id = ? ORDER BY m', operatorId).map((r) => r.m);
  const current = monthOf(today());
  return {
    month, rows, months: [...new Set([...months, current])].sort(), current_month: current,
    totals: { receivable: sum(['pendente']), received: sum(['paga']), late: sum(['atrasada']), late_count: rows.filter((r) => r.status === 'atrasada').length },
  };
}

export function avulsasView(operatorId: string) {
  const lines = linesOf(operatorId);
  const month = monthOf(today());
  const days = Array.from({ length: 7 }, (_, i) => addDays(today(), i));
  const grid = lines.map((line) => ({
    line_id: line.id, line_name: line.name, van_id: line.van_id, van: vanOf(line).nickname, price_round: line.price_table.avulsa_round,
    days: days.map((date) => {
      const trips = tripsOfDay(line.id, date);
      const key = tripId(line.id, date, 'ida');
      return {
        date, has_trip: trips.length > 0, free: freeSeats(line, date), closed: trips.length > 0 && !['planejada', 'confirmacoes_enviadas'].includes(trips[0].status),
        sold: sql<{ n: number }>("SELECT COUNT(*) AS n FROM trip_passengers WHERE trip_id = ? AND source = 'avulsa' AND status IN ('confirmado', 'embarcou')", key)[0].n,
        held: sql<{ n: number }>("SELECT COUNT(*) AS n FROM trip_passengers WHERE trip_id = ? AND status = 'reservado'", key)[0].n,
      };
    }),
  }));
  const bookings = sql<any>(
    `SELECT b.*, s.name, l.name AS line_name FROM avulsa_bookings b JOIN students s ON s.id = b.student_id JOIN lines l ON l.id = b.line_id
     WHERE b.operator_id = ? ORDER BY b.date DESC, b.id DESC LIMIT 30`, operatorId,
  );
  const revenue = sql<{ total: number; n: number }>(
    "SELECT COALESCE(SUM(price), 0) AS total, COUNT(*) AS n FROM avulsa_bookings WHERE operator_id = ? AND status = 'pago' AND date LIKE ?", operatorId, `${month}%`,
  )[0];
  const interested = lines.map((line) => {
    const date = availability(operatorId).find((a) => a.line_id === line.id)?.date ?? null;
    const people = date ? interestedFor(line, date) : [];
    return {
      line_id: line.id, line_name: line.name, date,
      people: people.map((p) => ({ id: p.id, name: p.name, neighborhood: p.neighborhood, status: p.status, last_purchase: p.last_purchase, offered: p.offered })),
    };
  });
  return { days, grid, bookings, revenue, interested, month };
}

export function documentsView(operatorId: string) {
  return all<any>('documents', 'operator_id = ?', operatorId)
    .map((d) => ({ ...d, label: DOCUMENT_LABELS[d.type] ?? d.type, owner: ownerLabel(d), alert: documentAlert(d.expires_at, today()) }))
    .sort((a, b) => a.expires_at.localeCompare(b.expires_at));
}

export function financeView(operatorId: string, vanId: string | undefined, month: string) {
  const vans = vansOf(operatorId).filter((v) => !vanId || v.id === vanId);
  const current = monthOf(today());
  const months = [-3, -2, -1, 0].map((n) => addMonths(current, n));
  const forMonth = (m: string, van: string) => {
    const fees = sql<{ total: number }>(
      `SELECT COALESCE(SUM(i.amount), 0) AS total FROM invoices i JOIN enrollments e ON e.id = i.enrollment_id JOIN lines l ON l.id = e.line_id
       WHERE l.van_id = ? AND i.reference_month = ? AND i.status = 'paga'`, van, m,
    )[0].total;
    const avulsas = sql<{ total: number }>(
      `SELECT COALESCE(SUM(b.price), 0) AS total FROM avulsa_bookings b JOIN lines l ON l.id = b.line_id
       WHERE l.van_id = ? AND b.date LIKE ? AND b.status = 'pago'`, van, `${m}%`,
    )[0].total;
    const costs = sql<{ total: number }>('SELECT COALESCE(SUM(amount), 0) AS total FROM expenses WHERE van_id = ? AND date LIKE ?', van, `${m}%`)[0].total;
    return { fees, avulsas, costs };
  };
  const series = months.map((m) => {
    const parts = vans.map((v) => forMonth(m, v.id));
    const fees = parts.reduce((t, p) => t + p.fees, 0);
    const avulsas = parts.reduce((t, p) => t + p.avulsas, 0);
    const costs = parts.reduce((t, p) => t + p.costs, 0);
    return { month: m, fees, avulsas, costs, revenue: fees + avulsas, profit: fees + avulsas - costs };
  });
  const byVan = vans.map((v) => {
    const p = forMonth(month, v.id);
    return { id: v.id, nickname: v.nickname, ...p, revenue: p.fees + p.avulsas, profit: p.fees + p.avulsas - p.costs };
  });
  const ids = vans.map((v) => v.id);
  const expenses = all<any>('expenses', `operator_id = ? AND date LIKE ? ORDER BY date DESC`, operatorId, `${month}%`)
    .filter((e) => ids.includes(e.van_id))
    .map((e) => ({ ...e, van: byId<{ nickname: string }>('vans', e.van_id)?.nickname ?? '' }));
  return { month, months, series, by_van: byVan, expenses, totals: series.find((s) => s.month === month) ?? series[series.length - 1] };
}

export function messagesView(operatorId: string, filter: { kind?: string; student_id?: string }, limit = 300) {
  const rows = sql<any>(
    `SELECT m.*, s.name FROM messages m LEFT JOIN students s ON s.id = m.student_id
     WHERE m.operator_id = ? AND (? IS NULL OR m.kind = ?) AND (? IS NULL OR m.student_id = ?) ORDER BY m.seq DESC LIMIT ?`,
    operatorId, filter.kind ?? null, filter.kind ?? null, filter.student_id ?? null, filter.student_id ?? null, limit,
  );
  return rows.map((m) => ({ ...m, buttons: JSON.parse(m.buttons ?? '[]'), payload: JSON.parse(m.payload ?? '{}') }));
}

export function conversationsView() {
  const rows = sql<any>(
    `SELECT s.id, s.name, s.phone, s.status, s.operator_id, s.token, o.trade_name, m.body AS last_body, m.created_at AS last_at, m.seq AS last_seq, m.direction AS last_direction,
       (SELECT COUNT(*) FROM messages u WHERE u.student_id = s.id AND u.direction = 'out' AND u.read_at IS NULL) AS unread
     FROM students s JOIN operators o ON o.id = s.operator_id
     LEFT JOIN messages m ON m.seq = (SELECT MAX(seq) FROM messages x WHERE x.student_id = s.id)
     ORDER BY COALESCE(m.seq, 0) DESC, s.name`,
  );
  return rows;
}

export function conversationView(studentId: string) {
  const student = studentOf(studentId);
  const operator = operatorOf(student.operator_id);
  const enrollment = one<Enrollment>('enrollments', "student_id = ? AND status <> 'cancelada'", studentId);
  const lineId = enrollment?.line_id ?? student.interest_line_id;
  return {
    student: { id: student.id, name: student.name, phone: student.phone, status: student.status, token: student.token },
    operator: { id: operator.id, trade_name: operator.trade_name },
    line_name: lineId ? lineOf(lineId).name : '',
    messages: all('messages', 'student_id = ? ORDER BY seq', studentId),
    paid_txids: sql<{ txid: string }>(
      `SELECT p.txid FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id LEFT JOIN avulsa_bookings b ON b.id = p.avulsa_booking_id
       WHERE i.student_id = ? OR b.student_id = ?`, studentId, studentId,
    ).map((p) => p.txid),
  };
}

function nextTripOfStudent(studentId: string) {
  const row = sql<any>(
    `SELECT t.*, tp.status AS p_status, tp.reason, tp.source, tp.class_start FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id
     WHERE tp.student_id = ? AND t.date >= ? AND t.status NOT IN ('concluida', 'cancelada') AND tp.status <> 'expirado'
     ORDER BY t.date, t.departure_time LIMIT 1`, studentId, today(),
  )[0];
  return row ?? null;
}

export function studentPage(token: string) {
  const student = one<Student>('students', 'token = ?', token);
  if (!student) throw new HttpError(404, 'Este link não é válido.');
  const detail = studentDetail(student.id);
  const operator = operatorOf(student.operator_id);
  const next = nextTripOfStudent(student.id);
  const line = next ? lineOf(next.line_id) : detail.line ?? (student.interest_line_id ? lineOf(student.interest_line_id) : null);
  const { invoice, booking } = openChargeOf(student.id);
  const lineIds = line ? [line.id] : [];
  const offers = availability(student.operator_id).filter((a) => !lineIds.length || lineIds.includes(a.line_id)).filter((a) => {
    const already = sql(
      `SELECT 1 FROM trip_passengers tp JOIN trips t ON t.id = tp.trip_id WHERE tp.student_id = ? AND t.line_id = ? AND t.date = ? AND tp.status NOT IN ('expirado', 'nao_vai')`,
      student.id, a.line_id, a.date,
    );
    return already.length === 0;
  });

  // "Onde está a van": a viagem da linha que está acontecendo agora, mesmo que o aluno não esteja nela.
  let van = null;
  if (line) {
    const active = all<Trip>('trips', "line_id = ? AND date = ? AND status IN ('lista_fechada', 'em_andamento')", line.id, today())
      .sort((a, b) => a.departure_time.localeCompare(b.departure_time))[0];
    if (active) {
      const route = routeView(active);
      const myStop = route.stops.find((s) => s.student_id === student.id);
      van = {
        route, elapsed: route.elapsed_minutes, started: route.elapsed_minutes >= 0,
        minutes_to_me: myStop ? myStop.offset_minutes - route.elapsed_minutes : null, my_stop: myStop ?? null,
      };
    }
  }
  const payments = sql<any>(
    `SELECT p.*, i.reference_month, b.date AS booking_date FROM payments p LEFT JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN avulsa_bookings b ON b.id = p.avulsa_booking_id WHERE i.student_id = ? OR b.student_id = ? ORDER BY p.paid_at DESC`, student.id, student.id,
  );
  return {
    now: now(), student: { ...student, token: undefined, faculty: detail.faculty }, operator: { trade_name: operator.trade_name, whatsapp: operator.whatsapp },
    enrollment: detail.enrollment, schedule: detail.schedule, line, next_trip: next, open_invoice: invoice ?? null, open_booking: booking ?? null,
    payments, offers: offers.slice(0, 6), van,
  };
}

export function receiptView(token: string, paymentId: string) {
  const student = one<Student>('students', 'token = ?', token);
  const payment = byId<any>('payments', paymentId);
  if (!student || !payment) throw new HttpError(404, 'Recibo não encontrado.');
  const invoice = payment.invoice_id ? byId<Invoice>('invoices', payment.invoice_id) : null;
  const booking = payment.avulsa_booking_id ? byId<Booking>('avulsa_bookings', payment.avulsa_booking_id) : null;
  if ((invoice?.student_id ?? booking?.student_id) !== student.id) throw new HttpError(404, 'Recibo não encontrado.');
  const operator = operatorOf(student.operator_id);
  return {
    payment, student_name: student.name, operator: operator.name, trade_name: operator.trade_name,
    description: invoice ? `Mensalidade de ${invoice.reference_month}` : `Vaga avulsa de ${fmtDayMonth(booking!.date)}`, month: invoice?.reference_month ?? null,
  };
}

export function driverView(operatorId: string, vanId?: string) {
  const vans = vansOf(operatorId);
  const lines = linesOf(operatorId).filter((l) => !vanId || l.van_id === vanId);
  const ids = lines.map((l) => l.id);
  const candidates = all<Trip>('trips', "date >= ? AND date <= ? AND status NOT IN ('concluida', 'cancelada')", today(), addDays(today(), 4))
    .filter((t) => ids.includes(t.line_id) && countRows('trip_passengers', "trip_id = ? AND status <> 'expirado'", t.id) > 0)
    .sort((a, b) => at(a.date, a.departure_time).localeCompare(at(b.date, b.departure_time)));
  const trip = candidates[0];
  const drivers = all<{ id: string; name: string }>('drivers', 'operator_id = ?', operatorId);
  const options = vans.map((v) => ({ id: v.id, nickname: v.nickname, driver: drivers.find((d) => d.id === v.driver_id)?.name ?? '' }));
  if (!trip) return { now: now(), vans: options, van_id: vanId ?? null, trip: null, route: null };
  const line = lineOf(trip.line_id);
  const view = tripView(trip);
  return {
    now: now(), vans: options, van_id: line.van_id, driver: options.find((o) => o.id === line.van_id)?.driver ?? '',
    trip: view, route: routeView(trip), minutes_to_departure: minutesBetween(now(), at(trip.date, trip.departure_time)),
  };
}

export function tripDetail(id: string) {
  const trip = tripOf(id);
  return { trip: enrichTrip(trip, lineOf(trip.line_id)), route: routeView(trip) };
}

/** Viagens para escolher na tela de rota. */
export function routeOptions(operatorId: string) {
  const ids = linesOf(operatorId).map((l) => l.id);
  return all<Trip>('trips', "date >= ? AND date <= ? AND status <> 'cancelada' ORDER BY date, departure_time", today(), addDays(today(), 3))
    .filter((t) => ids.includes(t.line_id))
    .map((t) => ({ id: t.id, date: t.date, direction: t.direction, departure_time: t.departure_time, status: t.status, line_name: lineOf(t.line_id).name }));
}

export function startupMetrics() {
  const baseline = metaGet<any>('startup_baseline');
  const operators = all<Operator>('operators');
  const subscriptions = all<Subscription>('subscriptions');
  const vanCount = (operatorId: string) => vansOf(operatorId).length;
  const active = subscriptions.filter((s) => s.status === 'active');
  const canceled = subscriptions.filter((s) => s.status === 'canceled');
  const trial = subscriptions.filter((s) => s.status === 'trial');
  const mrr = active.reduce((total, s) => total + subscriptionMonthly(vanCount(s.operator_id), s.plan), 0);
  const potential = trial.reduce((total, s) => total + subscriptionMonthly(vanCount(s.operator_id), s.plan), 0);
  const vansActive = active.reduce((n, s) => n + vanCount(s.operator_id), 0);
  const vansTrial = trial.reduce((n, s) => n + vanCount(s.operator_id), 0);

  const leads = all<any>('leads', '1=1 ORDER BY created_at DESC');
  const operatorLeads = leads.filter((l) => l.kind === 'operador');
  const activated = operators.filter((o) => sql(
    `SELECT 1 FROM trips t JOIN lines l ON l.id = t.line_id JOIN vans v ON v.id = l.van_id WHERE v.operator_id = ? AND t.confirmations_sent_at IS NOT NULL LIMIT 1`, o.id,
  ).length > 0).length;
  const since = addDays(today(), -28);
  const retained = operators.filter((o) => {
    const dates = sql<{ date: string }>(
      `SELECT DISTINCT t.date FROM trips t JOIN lines l ON l.id = t.line_id JOIN vans v ON v.id = l.van_id
       WHERE v.operator_id = ? AND t.confirmations_sent_at IS NOT NULL AND t.date >= ?`, o.id, since,
    );
    return new Set(dates.map((d) => Math.floor(diffDays(since, d.date) / 7))).size >= 4;
  }).length;
  const weekSales = sql<{ n: number }>("SELECT COUNT(*) AS n FROM avulsa_bookings WHERE status = 'pago' AND date >= ? AND date <= ?", addDays(today(), -7), today())[0].n;
  const allVans = vansActive + vansTrial;

  return {
    now: now(), baseline,
    mrr, arr: mrr * 12, potential_mrr: potential, price: baseline.preco_por_van, ltv: baseline.ltv_12_meses,
    operators_trial: trial.length, operators_active: active.length, operators_canceled: canceled.length, vans_active: vansActive, vans_trial: vansTrial,
    conversion: operators.length ? active.length / operators.length : 0,
    churn: active.length + canceled.length ? canceled.length / (active.length + canceled.length) : 0,
    funnel: {
      acquisition: { value: operatorLeads.length, base: 25, target: null },
      activation: { value: activated, target: 3 },
      retention: { value: retained, target: 2 },
      revenue: { value: active.length, target: 2, avulsas_per_van_week: allVans ? weekSales / allVans : 0 },
      referral: { value: leads.filter((l) => l.source === 'indicacao').length, target: 1 },
    },
    leads: leads.filter((l) => l.source === 'landing').concat(leads.filter((l) => l.source !== 'landing')),
    lead_counts: {
      total: leads.length, landing: leads.filter((l) => l.source === 'landing').length,
      operators: operatorLeads.length, students: leads.filter((l) => l.kind === 'estudante').length,
    },
    operators: operators.map((o) => ({
      id: o.id, trade_name: o.trade_name, city: o.city, vans: vanCount(o.id), trial_ends_at: o.trial_ends_at,
      status: subscriptions.find((s) => s.operator_id === o.id)?.status ?? 'trial', days_left: Math.max(0, diffDays(today(), o.trial_ends_at.slice(0, 10))),
    })),
  };
}

