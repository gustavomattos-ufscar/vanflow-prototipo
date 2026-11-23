/**
 * O agendador da demo. Quando o relógio avança, ele para em cada horário que importa,
 * na ordem certa, e roda os trabalhos daquele instante. Assim um salto de 20 dias
 * se comporta igual a 20 dias de verdade.
 */
import { addDays, addMinutes, at, closeAt, confirmationAt, dateOf, reminderAt, timeOf, type Line } from '@vanflow/domain';
import { all, one, sql, tx, update } from './db.ts';
import {
  addAlert, isPaused, logEvent, now, operatorIdOfLine, settingsOf, subscriptionOf, today, type Booking, type Operator,
} from './context.ts';
import { clock } from './integrations.ts';
import { expireHolds } from './avulsas.ts';
import { markOverdue, runDocumentAlerts, runInvoiceReminders, runMonthlyBilling } from './billing.ts';
import { closeList, sendConfirmations, sendReminders } from './presence.ts';
import { ensureTrips, passengersOf, tripsOfDay } from './trips.ts';

/** Depois desse tempo sem o motorista marcar nada, a viagem conta como feita. */
const AUTO_FINISH_MINUTES = 120;
const TRIAL_EXTENSION_DAYS = 30;

function runTrialCheck(): void {
  const protect = one<{ protect_trial: boolean }>('demo_state', 'id = 1')!.protect_trial;
  for (const operator of all<Operator>('operators')) {
    if (subscriptionOf(operator.id).status !== 'trial' || now() <= operator.trial_ends_at) continue;
    if (protect) {
      // Sem isso, o teste acabaria em 26/11 e pausaria as cobranças de dezembro do roteiro da demo.
      const extended = at(addDays(today(), TRIAL_EXTENSION_DAYS), '23:59');
      update('operators', operator.id, { trial_ends_at: extended });
      logEvent('assinatura', `Teste de ${operator.trade_name} estendido em ${TRIAL_EXTENSION_DAYS} dias para a demo seguir`);
    } else if (!one('alerts', "operator_id = ? AND kind = 'teste_fim'", operator.id)) {
      addAlert(operator.id, 'teste_fim', 'Seu teste grátis acabou. Os envios automáticos pausaram até você assinar.');
      logEvent('assinatura', `Teste de ${operator.trade_name} acabou: envios automáticos pausados`);
    }
  }
}

function runLineJobs(line: Line): void {
  const operatorId = operatorIdOfLine(line);
  const settings = settingsOf(operatorId);
  const paused = isPaused(operatorId);
  const current = now();
  const tomorrow = addDays(today(), 1);

  for (const date of [today(), tomorrow]) {
    const trips = tripsOfDay(line.id, date);
    if (!trips.length) continue;
    const closes = closeAt(date, line, settings);
    if (current >= closes) {
      closeList(line, date);
      continue;
    }
    if (paused || date !== tomorrow) continue;
    if (current >= confirmationAt(date, settings)) sendConfirmations(line, date);
    const pendingReminder = settings.reminder_enabled && current >= reminderAt(date, settings) && !tripsOfDay(line.id, date).some((t) => t.reminder_sent_at);
    if (pendingReminder) sendReminders(line, date);
  }
}

/** Viagem saiu no horário; duas horas depois conta como feita, se o motorista não fechou antes. */
function runTripProgress(): void {
  const current = now();
  for (const trip of all<{ id: string; date: string; departure_time: string; status: string }>(
    'trips', "status IN ('lista_fechada', 'em_andamento') AND date <= ?", today(),
  )) {
    const departure = at(trip.date, trip.departure_time);
    if (trip.status === 'lista_fechada' && current >= departure) update('trips', trip.id, { status: 'em_andamento' });
    if (current >= addMinutes(departure, AUTO_FINISH_MINUTES)) finishTrip(trip.id);
  }
}

export function finishTrip(id: string): void {
  for (const passenger of passengersOf(id)) {
    if (['confirmado', 'sem_resposta', 'aguardando', 'previsto'].includes(passenger.status)) {
      update('trip_passengers', passenger.id, { status: 'embarcou' });
    }
  }
  update('trips', id, { status: 'concluida' });
}

export function runJobs(): void {
  expireHolds();
  markOverdue();
  runTrialCheck();
  for (const operator of all<Operator>('operators')) {
    if (timeOf(now()) >= '08:00' && !isPaused(operator.id)) {
      runMonthlyBilling(operator.id);
      runInvoiceReminders(operator.id);
    }
    if (timeOf(now()) === '08:00') runDocumentAlerts(operator.id);
  }
  for (const line of all<Line>('lines')) runLineJobs(line);
  runTripProgress();
}

function checkpointsOfDay(date: string): string[] {
  const times = new Set(['00:00', '08:00']);
  for (const operator of all<Operator>('operators')) {
    const settings = settingsOf(operator.id);
    times.add(settings.confirmation_time);
    times.add(settings.reminder_time);
  }
  const points = [...times].map((t) => at(date, t));
  for (const line of all<Line>('lines')) {
    const settings = settingsOf(operatorIdOfLine(line));
    points.push(closeAt(date, line, settings));
    for (const time of [line.departure_time, line.return_time]) {
      points.push(at(date, time), addMinutes(at(date, time), AUTO_FINISH_MINUTES));
    }
  }
  return points;
}

/** Avança o relógio até `target`, parando em cada horário com trabalho a fazer. */
export function advanceTo(target: string): void {
  tx(() => {
    const start = clock.now();
    if (target <= start) return;
    const points = new Set<string>([target]);
    for (let date = dateOf(start); date <= dateOf(target); date = addDays(date, 1)) {
      for (const point of checkpointsOfDay(date)) points.add(point);
    }
    for (const booking of all<Booking>('avulsa_bookings', "status = 'reservado'")) points.add(booking.hold_until!);
    let previousDate = dateOf(start);
    for (const point of [...points].filter((p) => p > start && p <= target).sort()) {
      clock.set(point);
      if (dateOf(point) !== previousDate) {
        previousDate = dateOf(point);
        for (const operator of all<Operator>('operators')) ensureTrips(operator.id, addDays(previousDate, 7), 1);
      }
      runJobs();
    }
  });
}

export const advanceMinutes = (minutes: number) => advanceTo(addMinutes(clock.now(), minutes));

export const lastEvents = (limit = 60) =>
  sql<{ id: number; at: string; type: string; description: string }>('SELECT * FROM events_log ORDER BY id DESC LIMIT ?', limit);
