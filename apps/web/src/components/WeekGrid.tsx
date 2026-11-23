import { fmtHour, WEEKDAY_SHORT } from '@vanflow/domain';

interface Entry { weekday: number; faculty: string; faculty_id: string; start: string; end: string }

const COLORS: Record<string, string> = { fac_uniso: 'wg-teal', fac_facens: 'wg-amber', fac_ufscar: 'wg-navy' };

/** Grade semanal seg a sáb, com blocos coloridos por faculdade. */
export function WeekGrid({ entries, planDays }: { entries: Entry[]; planDays?: number[] }) {
  return (
    <div className="week-grid">
      {[1, 2, 3, 4, 5, 6].map((weekday) => {
        const list = entries.filter((e) => e.weekday === weekday);
        const outOfPlan = planDays && list.length > 0 && !planDays.includes(weekday);
        return (
          <div key={weekday} className="wg-day">
            <span className="wg-label">{WEEKDAY_SHORT[weekday]}</span>
            {list.length ? list.map((e) => (
              <div key={e.start} className={`wg-block ${COLORS[e.faculty_id] ?? 'wg-teal'}`}>
                <b>{e.faculty}</b>
                <span>{fmtHour(e.start)} às {fmtHour(e.end)}</span>
                {outOfPlan && <small>fora do plano</small>}
              </div>
            )) : <div className="wg-empty">sem aula</div>}
          </div>
        );
      })}
    </div>
  );
}
