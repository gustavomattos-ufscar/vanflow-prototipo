import type { PriceTable } from './types.ts';
import { WEEKDAY_LONG } from './format.ts';

export const PLAN_OPTIONS = [2, 3, 5] as const;
export const planPrice = (table: PriceTable, days: number) =>
  days >= 5 ? table.plan_5 : days >= 3 ? table.plan_3 : table.plan_2;

export interface PlanCheck { ok: boolean; message?: string; suggestedPlan?: number }

/**
 * O plano precisa bater com a grade (docs/08, seção 2). Se a grade tiver um dia a mais,
 * avisa e sugere o plano maior ou a avulsa.
 */
export function checkPlanAgainstGrade(planDays: number, weekdays: number[], gradeWeekdays: number[]): PlanCheck {
  if (weekdays.length !== planDays) {
    return { ok: false, message: `O plano é de ${planDays} dias, mas ${weekdays.length} dias foram marcados.` };
  }
  const withoutClass = weekdays.filter((d) => !gradeWeekdays.includes(d));
  if (withoutClass.length) {
    return { ok: false, message: `Sem aula na grade em: ${withoutClass.map((d) => WEEKDAY_LONG[d]).join(', ')}.` };
  }
  const uncovered = gradeWeekdays.filter((d) => !weekdays.includes(d));
  if (uncovered.length) {
    const suggestedPlan = PLAN_OPTIONS.find((p) => p >= gradeWeekdays.length) ?? 5;
    return {
      ok: true, suggestedPlan,
      message: `A grade tem aula também em ${uncovered.map((d) => WEEKDAY_LONG[d]).join(', ')}. Sugira o plano de ${suggestedPlan} dias ou a vaga avulsa nesse dia.`,
    };
  }
  return { ok: true };
}
