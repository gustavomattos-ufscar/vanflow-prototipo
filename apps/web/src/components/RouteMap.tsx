/** Mapa esquemático em SVG, sem nada de internet: paradas numeradas, estrada, van e faculdade. */
import { useId, useMemo } from 'react';
import { fmtHour } from '@vanflow/domain';
import { useWidth } from '../lib/useWidth.ts';

interface Stop { order: number; kind: string; name: string; label: string; lat: number; lng: number; eta: string; offset_minutes: number; status?: string; source?: string }
interface Skipped { name: string; lat: number; lng: number }
interface Point { x: number; y: number }

interface Size { W: number; H: number }

const MIN_GAP = 34;
/** No celular o mapa fica mais alto em proporção, para caber as paradas sem amontoar. */
const sizeFor = (width: number): Size => ({
  W: width,
  H: width < 600 ? Math.round(Math.max(300, width * 0.95)) : Math.round(Math.min(440, Math.max(340, width * 0.45))),
});

/** Mistura posição real com ordem: as cidades ficam longe e, sem isso, as casas viram um só borrão. */
/** `radius` de cada ponto: o prédio da faculdade é largo e precisa de mais espaço que uma parada. */
function project(all: Array<{ lat: number; lng: number; radius?: number }>, { W, H }: Size): Point[] {
  const PAD = W < 600 ? 34 : 54;
  const axis = (values: number[]) => {
    const min = Math.min(...values);
    const span = Math.max(...values) - min || 1;
    const sorted = [...values].sort((a, b) => a - b);
    return values.map((v) => {
      const linear = (v - min) / span;
      const rank = values.length > 1 ? sorted.indexOf(v) / (values.length - 1) : 0.5;
      return linear * 0.45 + rank * 0.55;
    });
  };
  const xs = axis(all.map((p) => p.lng));
  const ys = axis(all.map((p) => -p.lat));
  const points = all.map((_, i) => ({ x: PAD + xs[i] * (W - PAD * 2), y: PAD + ys[i] * (H - PAD * 2) }));
  for (let pass = 0; pass < 60; pass++) {
    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const dx = points[j].x - points[i].x;
        const dy = points[j].y - points[i].y;
        const distance = Math.hypot(dx, dy) || 1;
        const gap = Math.max(MIN_GAP, (all[i].radius ?? 17) + (all[j].radius ?? 17));
        if (distance >= gap) continue;
        const push = (gap - distance) / 2;
        const ux = dx / distance;
        const uy = dy / distance;
        points[i].x -= ux * push; points[i].y -= uy * push;
        points[j].x += ux * push; points[j].y += uy * push;
      }
    }
  }
  for (const p of points) {
    p.x = Math.min(W - 30, Math.max(30, p.x));
    p.y = Math.min(H - 30, Math.max(30, p.y));
  }
  return points;
}

type Segment = [Point, Point, Point, Point];

/** Catmull-Rom em curvas de Bézier: a estrada passa por todas as paradas. */
function segments(points: Point[]): Segment[] {
  const out: Segment[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    out.push([
      p1,
      { x: p1.x + (p2.x - p0.x) / 6, y: p1.y + (p2.y - p0.y) / 6 },
      { x: p2.x - (p3.x - p1.x) / 6, y: p2.y - (p3.y - p1.y) / 6 },
      p2,
    ]);
  }
  return out;
}

const pathOf = (list: Segment[]) =>
  list.length ? `M${list[0][0].x.toFixed(1)} ${list[0][0].y.toFixed(1)}` + list.map(([, a, b, c]) => ` C${a.x.toFixed(1)} ${a.y.toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join('') : '';

function pointOn([a, b, c, d]: Segment, t: number): Point {
  const u = 1 - t;
  const mix = (k: 'x' | 'y') => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k];
  return { x: mix('x'), y: mix('y') };
}

function vanPoint(list: Segment[], stops: Stop[], elapsed: number): Point | null {
  if (!list.length) return null;
  for (let i = 0; i < list.length; i++) {
    const from = stops[i].offset_minutes;
    const to = stops[i + 1].offset_minutes;
    if (elapsed <= to) return pointOn(list[i], to === from ? 1 : Math.max(0, (elapsed - from) / (to - from)));
  }
  return list[list.length - 1][3];
}

interface Label { x: number; y: number; text: string; muted?: boolean }

const CHAR_W = 7.6;
const LABEL_H = 15;

/** Coloca cada rótulo no primeiro lugar livre em volta do ponto, sem cobrir parada nem outro rótulo. */
function placeLabels(items: Array<{ p: Point; text: string; muted?: boolean; radius: number }>, obstacles: Point[], { W, H }: Size): Label[] {
  const placed: Array<{ x: number; y: number; w: number }> = [];
  const hits = (x: number, y: number, w: number) => {
    const box = { left: x - w / 2 - 3, right: x + w / 2 + 3, top: y - LABEL_H, bottom: y + 4 };
    const onStop = obstacles.some((o) => o.x > box.left - 14 && o.x < box.right + 14 && o.y > box.top - 14 && o.y < box.bottom + 14);
    const onLabel = placed.some((l) => Math.abs(l.x - x) < (l.w + w) / 2 + 4 && Math.abs(l.y - y) < LABEL_H + 2);
    return onStop || onLabel;
  };
  return items.map(({ p, text, muted, radius }) => {
    const w = text.length * CHAR_W;
    const d = radius + 16;
    const side = w / 2 + d - 4;
    const spots: Point[] = [];
    // Do mais perto para o mais longe: abaixo, acima e dos lados, em anéis que vão abrindo.
    for (const ring of [0, 18, 36, 54, 72]) {
      for (const dx of [0, side, -side, w / 2, -w / 2]) {
        spots.push({ x: p.x + dx, y: p.y + d + 4 + ring }, { x: p.x + dx, y: p.y - d + 6 - ring });
      }
      spots.push({ x: p.x + side + ring, y: p.y + 4 }, { x: p.x - side - ring, y: p.y + 4 });
    }
    const inside = spots.map((s) => ({ x: Math.min(W - w / 2 - 6, Math.max(w / 2 + 6, s.x)), y: Math.min(H - 8, Math.max(20, s.y)) }));
    const spot = inside.find((s) => !hits(s.x, s.y, w)) ?? inside[0];
    placed.push({ x: spot.x, y: spot.y, w });
    return { x: spot.x, y: spot.y, text, muted };
  });
}

const VAN = (
  <g transform="translate(-30 -30) scale(.5)">
    <path d="M8 44 V22 Q8 12 18 12 H82 Q92 12 98 20 L110 32 Q114 36 114 42 V46 H8 Z" fill="#F2A62F" stroke="#13233A" strokeWidth="3" />
    <path d="M20 18 H44 V30 H16 V22 Q16 18 20 18Z" fill="#13233A" /><rect x="48" y="18" width="22" height="12" rx="2" fill="#13233A" />
    <path d="M74 18 H86 Q91 18 95 23 L101 30 H74Z" fill="#13233A" />
    <circle cx="30" cy="46" r="9" fill="#13233A" /><circle cx="30" cy="46" r="3.5" fill="#F3F1EC" />
    <circle cx="92" cy="46" r="9" fill="#13233A" /><circle cx="92" cy="46" r="3.5" fill="#F3F1EC" />
  </g>
);

export function RouteMap({ stops, skipped = [], elapsed, highlightStudent, label }: {
  stops: Stop[]; skipped?: Skipped[]; elapsed?: number; highlightStudent?: number; label?: string;
}) {
  const pathId = useId().replace(/:/g, '');
  const { ref, width } = useWidth<HTMLDivElement>(900);
  const { W, H } = sizeFor(width);
  const layout = useMemo(() => {
    const size = { W, H };
    const projected = project([...stops.map((s) => ({ ...s, radius: s.kind === 'faculdade' ? 34 : 17 })), ...skipped], size);
    const stopPoints = projected.slice(0, stops.length);
    const skipPoints = projected.slice(stops.length);
    const labels = placeLabels([
      ...stops.flatMap((stop, i) => (stop.kind === 'aluno' ? [] : [{
        p: stopPoints[i], radius: stop.kind === 'faculdade' ? 18 : 10,
        text: `${stop.kind === 'saida' ? 'SAÍDA' : stop.name.toUpperCase()} · ${fmtHour(stop.eta)}`,
      }])),
      ...skipped.map((s, i) => ({ p: skipPoints[i], radius: 9, muted: true, text: `${s.name.split(' ')[0].toUpperCase()} · NÃO VAI` })),
    ], [
      ...stopPoints, ...skipPoints,
      // O prédio da faculdade sobe acima do ponto: o telhado também é obstáculo.
      ...stopPoints.flatMap((p, i) => (stops[i].kind === 'faculdade' ? [{ x: p.x - 18, y: p.y - 26 }, { x: p.x + 18, y: p.y - 26 }] : [])),
    ], size);
    return { stopPoints, skipPoints, labels, segs: segments(stopPoints) };
  }, [stops, skipped, W, H]);
  const grid = [
    ...Array.from({ length: Math.floor(H / 80) }, (_, i) => `M0 ${(i + 1) * 80}H${W}`),
    ...Array.from({ length: Math.floor(W / 140) }, (_, i) => `M${120 + i * 140} 0V${H}`),
  ].join('');

  const { stopPoints, skipPoints, labels, segs } = layout;
  const d = pathOf(segs);
  const total = stops[stops.length - 1]?.offset_minutes ?? 0;
  const moving = elapsed !== undefined && elapsed >= 0 && elapsed <= total;
  const van = moving ? vanPoint(segs, stops, elapsed) : null;
  let number = 0;

  return (
    <div ref={ref} className="route-map-box">
    <svg className="route-map" viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={label ?? `Mapa esquemático com ${stops.length} paradas`}>
      <rect width={W} height={H} fill="var(--surface-2)" />
      <path d={grid} stroke="var(--hair)" strokeWidth="1" fill="none" />
      <path id={pathId} d={d} fill="none" stroke="var(--road)" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#F2A62F" strokeWidth="3" strokeDasharray="2 11" strokeLinecap="round" />

      {skipped.map((s, i) => (
        <g key={s.name}>
          <circle cx={skipPoints[i].x} cy={skipPoints[i].y} r="9" fill="var(--surface)" stroke="#8A8F98" strokeWidth="2" />
          <path d={`M${skipPoints[i].x - 8} ${skipPoints[i].y}h16`} stroke="#8A8F98" strokeWidth="2" />
        </g>
      ))}

      {stops.map((stop, i) => {
        const p = stopPoints[i];
        if (stop.kind === 'saida') {
          return (
            <circle key={i} cx={p.x} cy={p.y} r="10" fill="#F2A62F" stroke="#13233A" strokeWidth="2.2" />
          );
        }
        if (stop.kind === 'faculdade') {
          return (
            <g key={i}>
              <g transform={`translate(${p.x - 24} ${p.y - 36})`}>
                <path d="M-4 18 L24 2 L52 18Z" fill="#1D6B74" stroke="#13233A" strokeWidth="2.2" strokeLinejoin="round" />
                <rect x="2" y="18" width="44" height="24" rx="2" fill="#FDFCF9" stroke="#13233A" strokeWidth="2.2" />
                <rect x="20" y="28" width="8" height="14" fill="#13233A" />
              </g>
            </g>
          );
        }
        number += 1;
        const avulso = stop.source === 'avulsa';
        const mine = highlightStudent === stop.order;
        return (
          <g key={i}>
            {mine && <circle cx={p.x} cy={p.y} r="19" fill="none" stroke="#F2A62F" strokeWidth="3" />}
            <circle cx={p.x} cy={p.y} r="13" fill={avulso ? '#F2A62F' : '#13233A'} stroke={avulso ? '#13233A' : 'none'} strokeWidth="2" />
            <text x={p.x} y={p.y + 4} textAnchor="middle" className="map-num" fill={avulso ? '#13233A' : '#FFFFFF'}>{number}</text>
          </g>
        );
      })}

      {labels.map((l) => <text key={l.text} x={l.x} y={l.y} textAnchor="middle" className={`map-text${l.muted ? ' muted-fill' : ''}`}>{l.text}</text>)}

      {van ? <g className="map-van" style={{ transform: `translate(${van.x}px, ${van.y}px)` }}>{VAN}</g> : d && !moving && (
        <g className="map-van-loop">
          {VAN}
          <animateMotion dur="16s" repeatCount="indefinite"><mpath href={`#${pathId}`} /></animateMotion>
        </g>
      )}
    </svg>
    </div>
  );
}
