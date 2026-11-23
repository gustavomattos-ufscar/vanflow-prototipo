import { describe, expect, it } from 'vitest';
import { cumulativeMinutes, googleMapsEmbedUrl, googleMapsLinks, haversineKm, nearestNeighbor, optimizeStops, pathKm, twoOpt, wazeLink, type Coord } from '../src/index.ts';

const p = (lat: number, lng: number): Coord => ({ lat, lng });

describe('rota', () => {
  it('haversine Itu a Sorocaba fica na casa de 30 km', () => {
    const km = haversineKm(p(-23.2642, -47.2992), p(-23.5015, -47.4526));
    expect(km).toBeGreaterThan(28);
    expect(km).toBeLessThan(33);
  });

  it('vizinho mais próximo vai sempre para o ponto mais perto', () => {
    const stops = [p(0, 3), p(0, 1), p(0, 2)];
    expect(nearestNeighbor(p(0, 0), stops).map((s) => s.lng)).toEqual([1, 2, 3]);
  });

  it('2-opt desfaz cruzamento e nunca piora', () => {
    const start = p(0, 0);
    const crossed = [p(0, 1), p(1, 2), p(0, 2), p(1, 1)];
    const fixed = twoOpt(start, crossed);
    expect(pathKm([start, ...fixed])).toBeLessThan(pathKm([start, ...crossed]));
  });

  it('respeita o fim fixo', () => {
    const start = p(0, 0);
    const end = p(0, 10);
    const order = optimizeStops(start, [p(0, 9), p(0, 2), p(0, 5)], end);
    expect(order.map((s) => s.lng)).toEqual([2, 5, 9]);
  });

  it('mantém todas as paradas', () => {
    const stops = Array.from({ length: 14 }, (_, i) => p(Math.sin(i), Math.cos(i * 2)));
    expect(optimizeStops(p(0, 0), stops)).toHaveLength(14);
  });

  it('horários acumulados começam em zero e só crescem', () => {
    const minutes = cumulativeMinutes([p(-23.27, -47.3), p(-23.2, -47.28), p(-23.5, -47.41)]);
    expect(minutes[0]).toBe(0);
    expect(minutes[2]).toBeGreaterThan(minutes[1]);
  });
});

describe('links de navegação', () => {
  it('monta o link do Maps com %7C entre as paradas', () => {
    const [link] = googleMapsLinks([p(1, 1), p(2, 2), p(3, 3), p(4, 4)]);
    expect(link).toBe('https://www.google.com/maps/dir/?api=1&origin=1,1&destination=4,4&waypoints=2,2%7C3,3&travelmode=driving');
  });

  it('sem paradas intermediárias não manda waypoints', () => {
    expect(googleMapsLinks([p(1, 1), p(2, 2)])[0]).not.toContain('waypoints');
  });

  it('até 9 paradas cabe em um link', () => {
    const points = Array.from({ length: 11 }, (_, i) => p(i, i));
    expect(googleMapsLinks(points)).toHaveLength(1);
  });

  it('acima de 9 paradas divide em trechos encadeados', () => {
    const points = Array.from({ length: 17 }, (_, i) => p(i, i));
    const links = googleMapsLinks(points);
    expect(links).toHaveLength(2);
    for (const link of links) expect((new URL(link).searchParams.get('waypoints') ?? '').split('|').length).toBeLessThanOrEqual(9);
    expect(links[0]).toContain('destination=10,10');
    expect(links[1]).toContain('origin=10,10');
    expect(links[1]).toContain('destination=16,16');
  });

  it('monta a prévia do Google Maps na ordem das paradas', () => {
    expect(googleMapsEmbedUrl([p(1, 1), p(2, 2), p(3, 3)])).toBe('https://maps.google.com/maps?saddr=1,1&daddr=2,2+to:3,3&hl=pt-BR&output=embed');
    expect(googleMapsEmbedUrl([p(1, 1)])).toBeNull();
  });

  it('gera o link do Waze', () => {
    expect(wazeLink(p(-23.5, -47.4))).toBe('https://waze.com/ul?ll=-23.5,-47.4&navigate=yes');
  });
});
