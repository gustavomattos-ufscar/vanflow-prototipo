/** Entende o texto livre que o aluno digita no WhatsApp (docs/08, seção 4). */

export type ReplyIntent = 'vai' | 'nao_vai' | 'so_ida' | 'so_volta' | 'avulsa' | 'reservar' | 'pix' | 'desconhecido';

export interface ParsedReply {
  intent: ReplyIntent;
  /** Texto depois do "não vou", guardado como motivo da falta. */
  reason?: string;
  /** Dia pedido na vaga avulsa: 0 a 6, ou "hoje" e "amanha". */
  day?: number | 'hoje' | 'amanha';
}

export function normalizeReply(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

const DAY_WORDS: Array<[RegExp, number]> = [
  [/\bseg(unda)?\b/, 1], [/\bter(ca)?\b/, 2], [/\bqua(rta)?\b/, 3],
  [/\bqui(nta)?\b/, 4], [/\bsex(ta)?\b/, 5], [/\bsab(ado)?\b/, 6],
];

function parseDay(normalized: string): ParsedReply['day'] {
  if (/\bamanha\b/.test(normalized)) return 'amanha';
  if (/\bhoje\b/.test(normalized)) return 'hoje';
  return DAY_WORDS.find(([pattern]) => pattern.test(normalized))?.[1];
}

// Sem \b no fim: em JavaScript, \b não reconhece letra acentuada ("não" terminaria antes do "o").
const REASON_PREFIX = /^\s*(?:n[ãa]o\s+vou(?:\s+(?:hoje|amanh[ãa]))?|n[ãa]o\s+vai\s+dar|n[ãa]o\s+posso|hoje\s+n[ãa]o|vou\s+faltar|falto|n[ãa]o)(?=$|[\s,.;:!?()-])[\s,.;:!?()-]*/i;

function extractReason(original: string): string | undefined {
  const rest = original.replace(REASON_PREFIX, '').trim();
  return rest && rest !== original.trim() ? rest : undefined;
}

export function parseReply(text: string): ParsedReply {
  if (text.includes('👍')) return { intent: 'vai' };
  if (text.includes('👎')) return { intent: 'nao_vai' };

  const t = normalizeReply(text);
  if (!t) return { intent: 'desconhecido' };

  const saysNotGoing = /^(nao vou|nao vai dar|nao posso|hoje nao|falto|vou faltar)\b/.test(t);
  const startsWithNo = /^nao\b/.test(t);
  const mentionsPayment = /\b(pix|boleto|pagar|pagamento|segunda via|2a via|2 via)\b/.test(t);

  if (saysNotGoing) return { intent: 'nao_vai', reason: extractReason(text) };
  // "não recebi o pix" é um pedido de Pix, não uma falta: não pode liberar o lugar do aluno.
  if (mentionsPayment) return { intent: 'pix' };
  if (startsWithNo && !/\b(avulsa|vaga)\b/.test(t)) return { intent: 'nao_vai', reason: extractReason(text) };

  if (/^reserv/.test(t)) return { intent: 'reservar' };
  if (/\b(avulsa|vaga)\b/.test(t) || /^quero ir\b/.test(t)) return { intent: 'avulsa', day: parseDay(t) };
  if (/\bso (na )?ida\b/.test(t)) return { intent: 'so_ida' };
  if (/\bso (na )?volta\b/.test(t)) return { intent: 'so_volta' };
  if (/^(vou|sim|to indo|estou indo|confirmo|confirmado|ok|okay)\b/.test(t)) return { intent: 'vai' };

  return { intent: 'desconhecido' };
}
