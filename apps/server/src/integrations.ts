/**
 * Integrações externas atrás de interfaces. Na demo tudo é local e offline.
 * Para ir a produção, troque só a implementação exportada no fim de cada bloco.
 */
import {
  buildPixPayload, cumulativeMinutes, googleMapsEmbedUrl, googleMapsLinks, nearestNeighbor, optimizeStops, pathKm, wazeLink,
  type Coord,
} from '@vanflow/domain';
import { db, insert, one, sql, update } from './db.ts';

/* ---------- Clock ---------- */

/** Em produção: `new Date()`. Na demo: horário guardado no banco, movido pela Central da demo. */
export interface Clock {
  now(): string;
  set(iso: string): void;
}

class DemoClock implements Clock {
  now(): string {
    return one<{ now: string }>('demo_state', 'id = 1')!.now;
  }
  set(iso: string): void {
    db.prepare('UPDATE demo_state SET now = ? WHERE id = 1').run(iso);
  }
}

export const clock: Clock = new DemoClock();

/* ---------- WhatsApp ---------- */

export type MessageKind = 'texto' | 'confirmacao' | 'cobranca' | 'pix' | 'oferta_avulsa' | 'recibo' | 'lembrete';

export interface OutboundMessage {
  operator_id: string; student_id: string; kind: MessageKind; body: string;
  buttons?: string[]; payload?: Record<string, unknown>;
}

export interface Message extends Required<OutboundMessage> {
  id: string; seq: number; direction: 'out' | 'in'; created_at: string; read_at: string | null; phone: string | null;
}

/**
 * Em produção: WhatsApp Business Cloud API. `send` chama POST /{phone_id}/messages com um
 * template aprovado e botões interativos; `POST /api/whatsapp/inbound` vira o webhook da Meta.
 */
export interface WhatsAppGateway {
  send(message: OutboundMessage): void;
  record(inbound: { operator_id: string; student_id: string; body: string; payload?: Record<string, unknown> }): void;
}

function nextSeq(): number {
  return (sql<{ seq: number }>('SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM messages')[0]).seq;
}

class DemoWhatsAppGateway implements WhatsAppGateway {
  send(message: OutboundMessage): void {
    const seq = nextSeq();
    insert('messages', {
      id: `msg_${seq}`, seq, direction: 'out', buttons: [], payload: {}, ...message, created_at: clock.now(),
    });
  }
  record({ operator_id, student_id, body, payload }: { operator_id: string; student_id: string; body: string; payload?: Record<string, unknown> }): void {
    const seq = nextSeq();
    insert('messages', {
      id: `msg_${seq}`, seq, operator_id, student_id, direction: 'in', kind: 'texto', body,
      buttons: [], payload: payload ?? {}, created_at: clock.now(),
    });
  }
}

export const whatsapp: WhatsAppGateway = new DemoWhatsAppGateway();

/* ---------- Pix ---------- */

export interface PixOperator { pix_key: string; pix_merchant_name: string; pix_city: string }
export interface PixCharge { txid: string; payload: string }

/**
 * Em produção: PSP como Efí ou Asaas. `createCharge` chama a API de cobrança imediata (cob)
 * e o PSP avisa o pagamento em POST /api/webhooks/pix, a mesma rota usada por "Simular pagamento".
 * O dinheiro sempre vai direto para a chave do operador.
 */
export interface PixProvider {
  createCharge(operator: PixOperator, amount: number, txid: string): PixCharge;
}

class LocalPixProvider implements PixProvider {
  createCharge(operator: PixOperator, amount: number, txid: string): PixCharge {
    return {
      txid,
      payload: buildPixPayload({
        key: operator.pix_key, merchantName: operator.pix_merchant_name, merchantCity: operator.pix_city, amount, txid,
      }),
    };
  }
}

export const pix: PixProvider = new LocalPixProvider();

/* ---------- Mapas ---------- */

/**
 * Em produção: Google Routes API com `optimizeWaypointOrder: true`, que devolve a mesma ordem
 * considerando trânsito. A navegação continua no app do motorista: Maps ou Waze.
 */
export interface MapsProvider {
  orderStops<T extends Coord>(start: Coord, stops: T[], end?: Coord): T[];
  /** Ordem de quem faz de cabeça: sempre o ponto mais perto, sem revisar a rota. */
  orderByHabit<T extends Coord>(start: Coord, stops: T[]): T[];
  distanceKm(points: Coord[]): number;
  minutesFromStart(points: Coord[]): number[];
  googleMapsLinks(points: Coord[]): string[];
  /** Prévia da rota dentro da página. Em produção, a Maps Embed API com chave faz o mesmo. */
  embedUrl(points: Coord[]): string | null;
  wazeLink(point: Coord): string;
}

class OfflineMapsProvider implements MapsProvider {
  orderStops = optimizeStops;
  orderByHabit = nearestNeighbor;
  distanceKm = pathKm;
  minutesFromStart = cumulativeMinutes;
  googleMapsLinks = googleMapsLinks;
  embedUrl = googleMapsEmbedUrl;
  wazeLink = wazeLink;
}

export const maps: MapsProvider = new OfflineMapsProvider();

export const updateDemoState = (data: Record<string, unknown>) => update('demo_state', '1', data);
