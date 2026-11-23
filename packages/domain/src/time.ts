/**
 * Datas e horas da demo. Todo instante é um texto ISO fixo em -03:00.
 * O Brasil não tem horário de verão desde 2019, então America/Sao_Paulo é sempre -03:00,
 * e textos no mesmo formato podem ser comparados diretamente.
 */
export const TZ = 'America/Sao_Paulo';
const OFFSET_MS = 3 * 3_600_000;

export const toMs = (iso: string) => Date.parse(iso);

export function fromMs(ms: number): string {
  return new Date(ms - OFFSET_MS).toISOString().slice(0, 19) + '-03:00';
}

/** Normaliza qualquer ISO válido para o formato canônico em -03:00. */
export const normalizeIso = (iso: string) => fromMs(toMs(iso));

export const addMinutes = (iso: string, minutes: number) => fromMs(toMs(iso) + minutes * 60_000);
export const dateOf = (iso: string) => iso.slice(0, 10);
export const timeOf = (iso: string) => iso.slice(11, 16);
export const at = (date: string, hhmm: string) => `${date}T${hhmm}:00-03:00`;

export function addDays(date: string, days: number): string {
  return new Date(Date.parse(`${date}T12:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 0 = domingo, 1 = segunda ... 6 = sábado (mesma numeração de schedules.weekday). */
export const weekdayOf = (date: string) => new Date(`${date}T12:00:00Z`).getUTCDay();

export function diffDays(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / 86_400_000);
}

export const minutesBetween = (from: string, to: string) => Math.round((toMs(to) - toMs(from)) / 60_000);

export const monthOf = (date: string) => date.slice(0, 7);

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split('-').map(Number);
  const idx = y * 12 + (m - 1) + n;
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`;
}

/** Próxima data (a partir de amanhã) em que o dia do mês é `day`. */
export function nextDayOfMonth(today: string, day: number): string {
  let month = monthOf(today);
  for (let i = 0; i < 3; i++) {
    const candidate = `${month}-${String(day).padStart(2, '0')}`;
    if (candidate > today) return candidate;
    month = addMonths(month, 1);
  }
  throw new Error('dia do mês inválido');
}
