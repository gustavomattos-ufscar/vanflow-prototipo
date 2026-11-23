/**
 * BR Code (Pix copia e cola) no padrão EMV MPM do Banco Central.
 * Funções puras: nada aqui fala com banco ou PSP.
 */

export interface PixInput {
  key: string; merchantName: string; merchantCity: string; amount: number;
  txid?: string; description?: string; reusable?: boolean;
}

/** CRC-16/CCITT-FALSE: polinômio 0x1021, início 0xFFFF, sem reflexão, sem XOR final. */
export function crc16(text: string): string {
  let crc = 0xffff;
  for (const byte of new TextEncoder().encode(text)) {
    crc ^= byte << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

export const emv = (id: string, value: string) => `${id}${String(value.length).padStart(2, '0')}${value}`;

const stripAccents = (text: string) => text.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Nome e cidade do recebedor: maiúsculas, sem acento, só caracteres simples. */
export function pixText(text: string, maxLength: number): string {
  return stripAccents(text).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength).trim();
}

/** txid do BR Code: até 25 caracteres, só letras e números. */
export const pixTxid = (text: string) => stripAccents(text).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 25);

export function buildPixPayload({ key, merchantName, merchantCity, amount, txid, description, reusable }: PixInput): string {
  const account = emv('00', 'br.gov.bcb.pix') + emv('01', key) + (description ? emv('02', pixText(description, 40)) : '');
  const body =
    emv('00', '01') +
    emv('01', reusable ? '11' : '12') +
    emv('26', account) +
    emv('52', '0000') +
    emv('53', '986') +
    emv('54', amount.toFixed(2)) +
    emv('58', 'BR') +
    emv('59', pixText(merchantName, 25)) +
    emv('60', pixText(merchantCity, 15)) +
    emv('62', emv('05', txid ? pixTxid(txid) : '***')) +
    '6304';
  return body + crc16(body);
}

export interface EmvField { id: string; value: string }

export function parseEmv(payload: string): EmvField[] {
  const fields: EmvField[] = [];
  for (let i = 0; i < payload.length; ) {
    const id = payload.slice(i, i + 2);
    const size = Number(payload.slice(i + 2, i + 4));
    if (Number.isNaN(size)) throw new Error('Campo EMV inválido');
    fields.push({ id, value: payload.slice(i + 4, i + 4 + size) });
    i += 4 + size;
  }
  return fields;
}

export function isValidPixPayload(payload: string): boolean {
  if (payload.length < 8 || payload.slice(-8, -4) !== '6304') return false;
  return crc16(payload.slice(0, -4)) === payload.slice(-4);
}

/** Mensalidade: VF + AAAAMM + id curto do aluno + sequência. Ex.: VF202611ANA01. */
export function invoiceTxid(month: string, studentId: string, sequence = 1): string {
  const short = pixTxid(studentId.replace(/^st_/, '')).slice(0, 8);
  return pixTxid(`VF${month.replace('-', '')}${short}${String(sequence).padStart(2, '0')}`);
}

/** Avulsa: VA + AAAAMMDD + id. */
export const avulsaTxid = (date: string, id: string) => pixTxid(`VA${date.replaceAll('-', '')}${id}`);
