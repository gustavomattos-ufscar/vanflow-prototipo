/** Receita e gastos em colunas, lucro em linha, no mesmo eixo em reais. Passar o mouse mostra os valores do mês. */
import { useState } from 'react';
import { brl, monthName } from '@vanflow/domain';
import { useWidth } from '../lib/useWidth.ts';

const H = 270;
const LEFT = 56;
const BOTTOM = 34;
const TOP = 14;
const BAR = 24;

function niceMax(value: number): number {
  const step = 10 ** Math.floor(Math.log10(Math.max(value, 1)));
  return Math.ceil(value / step) * step;
}

const shortMoney = (value: number) => (Math.abs(value) >= 1000 ? `${(value / 1000).toLocaleString('pt-BR')} mil` : String(value));

export function FinanceChart({ series, selected, onSelect }: { series: any[]; selected: string; onSelect: (month: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const { ref, width: W } = useWidth<HTMLDivElement>(520);
  const top = niceMax(Math.max(...series.flatMap((s) => [s.revenue, s.costs, s.profit]), 1));
  const min = Math.min(0, ...series.map((s) => s.profit));
  const bottomValue = min < 0 ? -niceMax(-min) : 0;
  const plotH = H - TOP - BOTTOM;
  const y = (v: number) => TOP + ((top - v) / (top - bottomValue)) * plotH;
  const band = (W - LEFT - 8) / series.length;
  const cx = (i: number) => LEFT + band * i + band / 2;
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((t) => bottomValue + (top - bottomValue) * t);
  const line = series.map((s, i) => `${i ? 'L' : 'M'}${cx(i)} ${y(s.profit)}`).join(' ');
  const column = (x: number, value: number, color: string) => {
    const h = Math.max(0, y(0) - y(value));
    return <path d={`M${x} ${y(0)}V${y(0) - h + 4}q0 -4 4 -4h${BAR - 8}q4 0 4 4V${y(0)}Z`} fill={color} />;
  };

  return (
    <div className="chart-wrap" ref={ref}>
      <div className="chart-legend">
        <span><i style={{ background: 'var(--chart-1)' }} />Receita</span>
        <span><i style={{ background: 'var(--chart-2)' }} />Gastos</span>
        <span><i className="line" style={{ background: 'var(--chart-3)' }} />Lucro</span>
      </div>
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Receita, gastos e lucro por mês. ${series.map((s) => `${monthName(s.month)}: lucro de ${brl(s.profit)}`).join('. ')}.`} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={LEFT} x2={W - 8} y1={y(t)} y2={y(t)} stroke="var(--hair)" strokeWidth="1" />
            <text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="axis-label">{shortMoney(Math.round(t))}</text>
          </g>
        ))}
        {series.map((s, i) => (
          <g key={s.month}>
            {column(cx(i) - BAR - 1, s.revenue, 'var(--chart-1)')}
            {column(cx(i) + 1, s.costs, 'var(--chart-2)')}
            <text x={cx(i)} y={H - 12} textAnchor="middle" className="axis-label" style={s.month === selected ? { fill: 'var(--ink)', fontWeight: 600 } : undefined}>{monthName(s.month)}</text>
          </g>
        ))}
        <path d={line} fill="none" stroke="var(--chart-3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {series.map((s, i) => <circle key={s.month} cx={cx(i)} cy={y(s.profit)} r="5" fill="var(--chart-3)" stroke="var(--surface)" strokeWidth="2" />)}
        {series.map((s, i) => (
          <rect
            key={s.month} x={LEFT + band * i} y={TOP} width={band} height={H - TOP} fill="transparent" style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)} onClick={() => { setHover(i); onSelect(s.month); }}
          />
        ))}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(cx(hover) / W) * 100}%`, top: `${(y(Math.max(series[hover].revenue, series[hover].costs)) / H) * 100}%` }}>
          <div>{monthName(series[hover].month)}</div>
          <div>Receita <b>{brl(series[hover].revenue)}</b></div>
          <div>Gastos <b>{brl(series[hover].costs)}</b></div>
          <div>Lucro <b>{brl(series[hover].profit)}</b></div>
        </div>
      )}
    </div>
  );
}
