import { describe, expect, it } from 'vitest';
import {
  checkPlanAgainstGrade, daysLate, documentAlert, documentAlertThreshold, dueDateFor, invoiceStatusOn, planPrice,
  reminderDueOn, subscriptionMonthly,
} from '../src/index.ts';

describe('cobrança', () => {
  it('monta o vencimento a partir do dia configurado', () => {
    expect(dueDateFor('2026-12', 5)).toBe('2026-12-05');
    expect(dueDateFor('2026-12', 10)).toBe('2026-12-10');
  });

  it('lembretes saem em D-2, D0, D+1 e D+3, uma vez cada', () => {
    const due = '2026-12-05';
    expect(reminderDueOn(due, '2026-12-03', [])).toBe('d-2');
    expect(reminderDueOn(due, '2026-12-05', [])).toBe('d0');
    expect(reminderDueOn(due, '2026-12-06', [])).toBe('d+1');
    expect(reminderDueOn(due, '2026-12-08', [])).toBe('d+3');
    expect(reminderDueOn(due, '2026-12-04', [])).toBeNull();
    expect(reminderDueOn(due, '2026-12-09', [])).toBeNull();
    expect(reminderDueOn(due, '2026-12-03', [{ kind: 'd-2' }])).toBeNull();
  });

  it('fica atrasada só a partir de D+1', () => {
    expect(invoiceStatusOn('pendente', '2026-12-05', '2026-12-05')).toBe('pendente');
    expect(invoiceStatusOn('pendente', '2026-12-05', '2026-12-06')).toBe('atrasada');
    expect(invoiceStatusOn('paga', '2026-12-05', '2026-12-06')).toBe('paga');
    expect(daysLate('2026-12-05', '2026-12-08')).toBe(3);
  });
});

describe('documentos', () => {
  it('marca vencido, aviso e ok', () => {
    expect(documentAlert('2026-11-08', '2026-11-11')).toMatchObject({ level: 'vencido', label: 'venceu há 3 dias' });
    expect(documentAlert('2026-11-23', '2026-11-11')).toMatchObject({ level: 'aviso', days: 12 });
    expect(documentAlert('2026-12-11', '2026-11-11')).toMatchObject({ level: 'ok', days: 30 });
    expect(documentAlert('2026-11-11', '2026-11-11').label).toBe('vence hoje');
  });

  it('dispara alerta 30, 15 e 7 dias antes', () => {
    expect(documentAlertThreshold('2026-12-11', '2026-11-11')).toBe(30);
    expect(documentAlertThreshold('2026-11-26', '2026-11-11')).toBe(15);
    expect(documentAlertThreshold('2026-11-18', '2026-11-11')).toBe(7);
    expect(documentAlertThreshold('2026-11-19', '2026-11-11')).toBeNull();
  });
});

describe('planos e assinatura', () => {
  const table = { plan_5: 420, plan_3: 300, plan_2: 220, avulsa_round: 20, avulsa_one_way: 12 };

  it('escolhe o preço pelo número de dias', () => {
    expect([2, 3, 5].map((d) => planPrice(table, d))).toEqual([220, 300, 420]);
  });

  it('grade com um dia a mais sugere o plano maior', () => {
    const check = checkPlanAgainstGrade(2, [1, 3], [1, 3, 4]);
    expect(check).toMatchObject({ ok: true, suggestedPlan: 3 });
    expect(check.message).toContain('quinta');
  });

  it('recusa dia sem aula e quantidade errada', () => {
    expect(checkPlanAgainstGrade(2, [1, 2], [1, 3]).ok).toBe(false);
    expect(checkPlanAgainstGrade(3, [1, 3], [1, 3, 4]).ok).toBe(false);
    expect(checkPlanAgainstGrade(3, [1, 3, 4], [1, 3, 4])).toEqual({ ok: true });
  });

  it('calcula a assinatura padrão e a frotista', () => {
    expect(subscriptionMonthly(2)).toBe(119.8);
    expect(subscriptionMonthly(4, 'frotista')).toBe(224.6);
    expect(subscriptionMonthly(3, 'frotista')).toBe(179.7);
  });
});
