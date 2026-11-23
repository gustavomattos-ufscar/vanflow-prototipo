import type { InvoiceStatus } from './types.ts';
import { addDays, diffDays } from './time.ts';

export type ReminderKind = 'd-2' | 'd0' | 'd+1' | 'd+3';

export const REMINDER_OFFSETS: Array<{ kind: ReminderKind; offset: number }> = [
  { kind: 'd-2', offset: -2 }, { kind: 'd0', offset: 0 }, { kind: 'd+1', offset: 1 }, { kind: 'd+3', offset: 3 },
];

export const dueDateFor = (month: string, dueDay: number) => `${month}-${String(dueDay).padStart(2, '0')}`;

/** Qual lembrete automático sai em `today`, se algum. Depois de D+3 só manual. */
export function reminderDueOn(dueDate: string, today: string, alreadySent: Array<{ kind: string }>): ReminderKind | null {
  const match = REMINDER_OFFSETS.find(({ offset }) => addDays(dueDate, offset) === today);
  if (!match || alreadySent.some((r) => r.kind === match.kind)) return null;
  return match.kind;
}

/** A partir de D+1 a cobrança aberta vira atrasada. */
export function invoiceStatusOn(status: InvoiceStatus, dueDate: string, today: string): InvoiceStatus {
  return status === 'pendente' && today > dueDate ? 'atrasada' : status;
}

export const daysLate = (dueDate: string, today: string) => Math.max(0, diffDays(dueDate, today));

export interface DocumentAlert { level: 'ok' | 'aviso' | 'vencido'; days: number; label: string }

export function documentAlert(expiresAt: string, today: string): DocumentAlert {
  const days = diffDays(today, expiresAt);
  if (days < 0) return { level: 'vencido', days, label: `venceu há ${-days} ${days === -1 ? 'dia' : 'dias'}` };
  if (days === 0) return { level: 'aviso', days, label: 'vence hoje' };
  if (days < 30) return { level: 'aviso', days, label: `vence em ${days} ${days === 1 ? 'dia' : 'dias'}` };
  return { level: 'ok', days, label: `vence em ${days} dias` };
}

/** Limiar de alerta a disparar hoje: 30, 15 ou 7 dias antes. */
export const documentAlertThreshold = (expiresAt: string, today: string) => {
  const days = diffDays(today, expiresAt);
  return [30, 15, 7].includes(days) ? days : null;
};

/** Plano padrão: R$ 59,90 por van. Frotista (em teste): a partir da 4ª van, R$ 44,90. */
export const PRICE_PER_VAN = 59.9;
export const FLEET_PRICE_PER_VAN = 44.9;

export function subscriptionMonthly(vans: number, plan: 'padrao' | 'frotista' = 'padrao'): number {
  if (plan === 'padrao') return Math.round(vans * PRICE_PER_VAN * 100) / 100;
  const standard = Math.min(vans, 3) * PRICE_PER_VAN;
  const fleet = Math.max(0, vans - 3) * FLEET_PRICE_PER_VAN;
  return Math.round((standard + fleet) * 100) / 100;
}
