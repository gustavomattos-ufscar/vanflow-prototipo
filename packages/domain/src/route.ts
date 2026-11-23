/**
 * Ordem das paradas, offline: vizinho mais próximo + 2-opt, com distância haversine
 * e fator de estrada. A navegação fica com o Google Maps ou o Waze.
 */
export interface Coord { lat: number; lng: number }

export const ROAD_FACTOR = 1.3;
const URBAN_KMH = 40;
const HIGHWAY_KMH = 80;
const HIGHWAY_LEG_KM = 5;
export const MAPS_MAX_WAYPOINTS = 9;

const rad = (deg: number) => (deg * Math.PI) / 180;

export function haversineKm(a: Coord, b: Coord): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export const roadKm = (a: Coord, b: Coord) => haversineKm(a, b) * ROAD_FACTOR;

export function pathKm(points: Coord[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += roadKm(points[i - 1], points[i]);
  return total;
}

export function nearestNeighbor<T extends Coord>(start: Coord, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let current = start;
  while (remaining.length) {
    let best = 0;
    for (let i = 1; i < remaining.length; i++) {
      if (roadKm(current, remaining[i]) < roadKm(current, remaining[best])) best = i;
    }
    current = remaining[best];
    ordered.push(remaining[best]);
    remaining.splice(best, 1);
  }
  return ordered;
}

/** 2-opt mantendo o começo fixo e, se houver, o fim fixo. Repete até não melhorar. */
export function twoOpt<T extends Coord>(start: Coord, stops: T[], end?: Coord): T[] {
  let order = [...stops];
  const total = (list: T[]) => pathKm([start, ...list, ...(end ? [end] : [])]);
  let best = total(order);
  let improved = true;
  while (improved) {
    improved = false;
    for (let i = 0; i < order.length - 1; i++) {
      for (let j = i + 1; j < order.length; j++) {
        const candidate = [...order.slice(0, i), ...order.slice(i, j + 1).reverse(), ...order.slice(j + 1)];
        const length = total(candidate);
        if (length < best - 1e-9) {
          order = candidate;
          best = length;
          improved = true;
        }
      }
    }
  }
  return order;
}

export const optimizeStops = <T extends Coord>(start: Coord, stops: T[], end?: Coord): T[] =>
  twoOpt(start, nearestNeighbor(start, stops), end);

/** Tempo do trecho: estrada a 80 km/h e cidade a 40 km/h. */
export function legMinutes(km: number): number {
  return (km / (km > HIGHWAY_LEG_KM ? HIGHWAY_KMH : URBAN_KMH)) * 60;
}

/** Minutos acumulados desde a saída até cada ponto. O primeiro é sempre 0. */
export function cumulativeMinutes(points: Coord[]): number[] {
  const out = [0];
  for (let i = 1; i < points.length; i++) out.push(out[i - 1] + legMinutes(roadKm(points[i - 1], points[i])));
  return out;
}

const pair = (p: Coord) => `${p.lat},${p.lng}`;

/** Links do Google Maps: até 9 paradas intermediárias por link; acima disso, trechos encadeados. */
export function googleMapsLinks(points: Coord[]): string[] {
  if (points.length < 2) return [];
  const links: string[] = [];
  const perLink = MAPS_MAX_WAYPOINTS + 1;
  for (let from = 0; from < points.length - 1; from += perLink) {
    const to = Math.min(from + perLink, points.length - 1);
    const waypoints = points.slice(from + 1, to).map(pair).join('%7C');
    links.push(
      `https://www.google.com/maps/dir/?api=1&origin=${pair(points[from])}&destination=${pair(points[to])}` +
        (waypoints ? `&waypoints=${waypoints}` : '') + '&travelmode=driving',
    );
  }
  return links;
}

export const wazeLink = (p: Coord) => `https://waze.com/ul?ll=${pair(p)}&navigate=yes`;

/**
 * Prévia da rota dentro da página, com o próprio Google Maps, sem chave de API.
 * As paradas vão na ordem da VanFlow (saddr + daddr com "+to:"), então a prévia mostra
 * exatamente o caminho que o motorista vai abrir.
 */
export function googleMapsEmbedUrl(points: Coord[]): string | null {
  if (points.length < 2) return null;
  const [first, ...rest] = points;
  return `https://maps.google.com/maps?saddr=${pair(first)}&daddr=${rest.map(pair).join('+to:')}&hl=pt-BR&output=embed`;
}
