import { TZ, weekdayOf } from './time.ts';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' });
const dayMonthFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, day: '2-digit', month: '2-digit' });
const clockFmt = new Intl.DateTimeFormat('pt-BR', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });

export const WEEKDAY_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const WEEKDAY_LONG = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
export const MONTHS = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** Intl usa espaço não separável; trocamos por espaço comum para o texto do WhatsApp ser copiável. */
export const brl = (value: number) => currency.format(value).replace(/ /g, ' ');

const asInstant = (dateOrIso: string) => new Date(dateOrIso.length === 10 ? `${dateOrIso}T12:00:00-03:00` : dateOrIso);

export const fmtDate = (d: string) => dateFmt.format(asInstant(d));
export const fmtDayMonth = (d: string) => dayMonthFmt.format(asInstant(d));
export const fmtClock = (iso: string) => clockFmt.format(asInstant(iso));
export const fmtWeekdayDate = (date: string) => `${WEEKDAY_SHORT[weekdayOf(date.slice(0, 10))]}, ${fmtDayMonth(date)}`;

/** "19:00" vira "19h", "17:40" vira "17h40". */
export function fmtHour(hhmm: string): string {
  const [h, m] = hhmm.split(':');
  return `${Number(h)}h${m === '00' ? '' : m}`;
}

const kmFmt = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
export const fmtKm = (km: number) => `${kmFmt.format(km)} km`;

export const monthName = (month: string) => MONTHS[Number(month.slice(5, 7)) - 1];
export const monthLabel = (month: string) => `${monthName(month)} de ${month.slice(0, 4)}`;
export const firstName = (name: string) => name.trim().split(/\s+/)[0];
export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;
