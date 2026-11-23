/** Ações da Central da demo: saltos de relógio, cenários e atalhos do roteiro. */
import { addDays, addMinutes, at, dateOf, nextDayOfMonth, normalizeIso, timeOf, weekdayOf } from '@vanflow/domain';
import { all, one, remove, sql, tx, update } from './db.ts';
import { HttpError, logEvent, now, today, type Invoice, type Passenger, type Trip } from './context.ts';
import { updateDemoState } from './integrations.ts';
import { handlePixWebhook } from './billing.ts';
import { handleInbound } from './inbound.ts';
import { advanceMinutes, advanceTo } from './scheduler.ts';
import { hash, loadSeed } from './seed.ts';
import { pendingTripsOf } from './trips.ts';

const MAIN_OPERATOR = 'op_ze';
const MAIN_LINE = 'line_itu_noite';
const ABSENCE_REASONS = ['tenho prova em outro horário', 'vou de carona hoje', 'não tenho a última aula', ''];

function nextTime(hhmm: string): string {
  const candidate = at(today(), hhmm);
  return candidate > now() ? candidate : at(addDays(today(), 1), hhmm);
}

function nextWeekdayAt(weekday: number, hhmm: string): string {
  for (let i = 0; i < 8; i++) {
    const candidate = at(addDays(today(), i), hhmm);
    if (weekdayOf(dateOf(candidate)) === weekday && candidate > now()) return candidate;
  }
  throw new Error('dia da semana inválido');
}

/** Dia do mês às 9h: depois dos trabalhos das 8h (cobranças e lembretes). */
const nextMonthDay = (day: number) => at(nextDayOfMonth(today(), day), '09:00');

export const PRESETS: Record<string, () => string> = {
  '+15': () => addMinutes(now(), 15),
  '+60': () => addMinutes(now(), 60),
  '20h55': () => nextTime('20:55'),
  '21h': () => nextTime('21:00'),
  'quarta-20h55': () => nextWeekdayAt(3, '20:55'),
  'manha-6h': () => nextTime('06:00'),
  'quinta-17h30': () => nextWeekdayAt(4, '17:30'),
  'dia-1': () => nextMonthDay(1),
  'dia-5': () => nextMonthDay(5),
  'dia-8': () => nextMonthDay(8),
};

export function advance(input: { preset?: string; to?: string; minutes?: number }): void {
  if (input.preset) {
    const target = PRESETS[input.preset];
    if (!target) throw new HttpError(400, 'Atalho de relógio desconhecido.');
    advanceTo(target());
  } else if (input.minutes) {
    advanceMinutes(input.minutes);
  } else if (input.to) {
    const target = normalizeIso(input.to);
    if (target <= now()) throw new HttpError(409, 'O relógio só anda para a frente. Para voltar, use "Resetar demo".');
    advanceTo(target);
  } else {
    throw new HttpError(400, 'Informe para quando avançar.');
  }
}

/** Viagem de ida que ainda espera respostas, começando pela van principal da demo. */
function waitingTrip(): Trip | undefined {
  const trips = sql<Trip>(
    `SELECT DISTINCT t.* FROM trips t JOIN trip_passengers tp ON tp.trip_id = t.id
     WHERE t.direction = 'ida' AND tp.status = 'aguardando' AND t.date >= ? ORDER BY t.date, (t.line_id = ?) DESC`, today(), MAIN_LINE,
  );
  return trips[0];
}

/**
 * Parte dos alunos responde "Vou", parte "Não vou" e o resto fica calado.
 * É determinístico: o mesmo ensaio dá o mesmo resultado na frente do professor.
 */
export function simulateReplies(tripId: string | undefined, percentYes: number, quiet = false): { yes: number; no: number; silent: number } {
  const trip = tripId ? one<Trip>('trips', 'id = ?', tripId) : waitingTrip();
  if (!trip) {
    if (quiet) return { yes: 0, no: 0, silent: 0 };
    throw new HttpError(409, 'Nenhuma viagem está esperando respostas. Avance para as 21h primeiro.');
  }
  const waiting = all<Passenger>('trip_passengers', "trip_id = ? AND status = 'aguardando' ORDER BY student_id", trip.id)
    .sort((a, b) => hash(a.student_id) - hash(b.student_id));
  const yesCount = Math.round((waiting.length * percentYes) / 100);
  const noCount = Math.ceil((waiting.length - yesCount) / 2);
  const result = { yes: 0, no: 0, silent: 0 };
  tx(() => {
    waiting.forEach((passenger, index) => {
      if (index < yesCount) {
        handleInbound({ student_id: passenger.student_id, text: index % 3 === 0 ? 'Vou sim' : 'Vou', keep_clock: true });
        result.yes++;
      } else if (index < yesCount + noCount) {
        const reason = ABSENCE_REASONS[index % ABSENCE_REASONS.length];
        handleInbound({ student_id: passenger.student_id, text: reason ? `Não vou, ${reason}` : 'Não vou', keep_clock: true });
        result.no++;
      } else {
        result.silent++;
      }
    });
    advanceMinutes(3);
    logEvent('resposta', `Respostas simuladas: ${result.yes} vão, ${result.no} não vão, ${result.silent} sem resposta`);
  });
  return result;
}

/** O apresentador pode ter feito o passo à mão no celular: aí o atalho não repete nada. */
export function anaSaysNo(): void {
  if (pendingTripsOf('st_ana', today()).at(-1)?.status === 'nao_vai') return;
  handleInbound({ student_id: 'st_ana', text: 'Não vou, a aula foi cancelada' });
}

const openOrPaidBooking = (studentId: string) =>
  one('avulsa_bookings', "student_id = ? AND status IN ('reservado', 'pago') AND date >= ?", studentId, today());

export function carlaReserves(): void {
  if (!openOrPaidBooking('st_carla')) handleInbound({ student_id: 'st_carla', text: 'Reservar' });
}

/** Carla pega a oferta que recebeu, ou pede uma, e paga. */
export function carlaBuysSeat(): void {
  if (openOrPaidBooking('st_carla')) return payOpenBooking('st_carla');
  const hasOffer = sql("SELECT 1 FROM messages WHERE student_id = 'st_carla' AND direction = 'out' AND buttons LIKE '%Reservar%' AND created_at >= ?", addMinutes(now(), -180)).length > 0;
  if (!hasOffer) handleInbound({ student_id: 'st_carla', text: 'quero vaga avulsa quinta' });
  handleInbound({ student_id: 'st_carla', text: 'Reservar' });
  payOpenBooking('st_carla');
}

export function payOpenBooking(studentId: string): void {
  const booking = one<{ pix_txid: string; price: number }>('avulsa_bookings', "student_id = ? AND status = 'reservado' ORDER BY id DESC", studentId);
  if (!booking) return;
  handlePixWebhook({ txid: booking.pix_txid, amount: booking.price });
}

const USUALLY_LATE = ['st_diego', 'st_vinicius', 'st_otavio'];

/** Paga tudo que está em aberto, menos três cobranças do mês mais recente. */
export function payAllButThree(): { paid: number; left: number } {
  const open = all<Invoice>('invoices', "operator_id = ? AND status IN ('pendente', 'atrasada') ORDER BY reference_month DESC, id", MAIN_OPERATOR);
  if (!open.length) throw new HttpError(409, 'Não há cobranças em aberto. Avance para o dia 1 para gerar as do mês.');
  const latest = open[0].reference_month;
  const candidates = open.filter((i) => i.reference_month === latest);
  const keep = [...candidates.filter((i) => USUALLY_LATE.includes(i.student_id)), ...candidates.filter((i) => !USUALLY_LATE.includes(i.student_id))].slice(0, 3);
  const toPay = open.filter((i) => !keep.includes(i));
  tx(() => {
    for (const invoice of toPay) handlePixWebhook({ txid: invoice.pix_txid, amount: invoice.amount });
  });
  logEvent('pagamento', `${toPay.length} cobranças pagas, ${keep.length} continuam em aberto`);
  return { paid: toPay.length, left: keep.length };
}

export function extendTrial(): void {
  for (const operator of all<{ id: string }>('operators')) {
    update('operators', operator.id, { trial_ends_at: at(addDays(today(), 30), '23:59') });
  }
  remove('alerts', "kind = 'teste_fim'");
  logEvent('assinatura', 'Teste grátis estendido em 30 dias pela Central da demo');
}

export const SCENARIOS: Array<{ id: string; label: string; hint: string }> = [
  { id: 'quarta_antes_das_21h', label: 'Quarta à noite, antes das confirmações', hint: 'Quarta 11/11, 20h55. O ponto de partida do roteiro.' },
  { id: 'quinta_17h', label: 'Quinta 17h, hora da saída', hint: 'Respostas dadas, Ana fora, Carla dentro, lista fechada.' },
  { id: 'comeco_mes', label: 'Começo do mês, cobranças', hint: 'Terça 1/12, 7h55. Às 8h saem as cobranças de dezembro.' },
  { id: 'teste_acabando', label: 'Teste grátis acabando', hint: 'Quarta 25/11. Falta 1 dia e os envios pausam se não assinar.' },
];

export function loadScenario(id: string): void {
  if (!SCENARIOS.some((s) => s.id === id)) throw new HttpError(404, 'Cenário não encontrado.');
  loadSeed();
  tx(() => {
    if (id === 'quinta_17h') {
      advanceTo(at('2026-11-11', '21:00'));
      anaSaysNo();
      simulateReplies(undefined, 80);
      carlaBuysSeat();
      advanceTo(at('2026-11-12', '17:00'));
    }
    if (id === 'comeco_mes') advanceTo(at('2026-12-01', '07:55'));
    if (id === 'teste_acabando') {
      updateDemoState({ protect_trial: false });
      advanceTo(at('2026-11-25', '20:55'));
    }
    updateDemoState({ scenario: id });
    const scenario = SCENARIOS.find((s) => s.id === id)!;
    logEvent('demo', `Cenário carregado: ${scenario.label}`);
  });
}

export const demoState = () => {
  const state = one<{ now: string; scenario: string; protect_trial: boolean }>('demo_state', 'id = 1')!;
  return { ...state, time: timeOf(state.now), date: dateOf(state.now), weekday: weekdayOf(dateOf(state.now)) };
};
