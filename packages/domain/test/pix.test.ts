import { describe, expect, it } from 'vitest';
import { avulsaTxid, buildPixPayload, crc16, invoiceTxid, isValidPixPayload, parseEmv, pixText, pixTxid } from '../src/index.ts';

describe('Pix copia e cola', () => {
  it('calcula o CRC do valor de teste', () => {
    expect(crc16('123456789')).toBe('29B1');
  });

  it('gera exatamente o vetor de teste da docs/08', () => {
    expect(buildPixPayload({
      key: 'vanflow.demo@exemplo.com', merchantName: 'JOSE ALMEIDA FRETADOS', merchantCity: 'ITU', amount: 320, txid: 'VF202611ANA01',
    })).toBe('00020101021226460014br.gov.bcb.pix0124vanflow.demo@exemplo.com5204000053039865406320.005802BR5921JOSE ALMEIDA FRETADOS6003ITU62170513VF202611ANA01630485D3');
  });

  it('valida o CRC e rejeita payload adulterado', () => {
    const payload = buildPixPayload({ key: 'a@b.com', merchantName: 'X', merchantCity: 'Y', amount: 10, txid: 'T1' });
    expect(isValidPixPayload(payload)).toBe(true);
    expect(isValidPixPayload(payload.replace('10.00', '99.00'))).toBe(false);
  });

  it('limpa nome e cidade: sem acento, maiúsculas, dentro do limite', () => {
    expect(pixText('José Conceição Transportes de São Paulo', 25)).toBe('JOSE CONCEICAO TRANSPORTE');
    expect(pixText('São João da Boa Vista', 15)).toBe('SAO JOAO DA BOA');
  });

  it('usa os tamanhos certos nos campos EMV, com acento na entrada', () => {
    const payload = buildPixPayload({ key: 'a@b.com', merchantName: 'José', merchantCity: 'Itú', amount: 1234.5, txid: 'A' });
    const fields = Object.fromEntries(parseEmv(payload).map((f) => [f.id, f.value]));
    expect(fields['54']).toBe('1234.50');
    expect(fields['59']).toBe('JOSE');
    expect(fields['60']).toBe('ITU');
  });

  it('usa *** quando não há txid e 11 quando é reutilizável', () => {
    const payload = buildPixPayload({ key: 'a@b.com', merchantName: 'X', merchantCity: 'Y', amount: 1, reusable: true });
    expect(payload).toContain('62070503***');
    expect(payload).toContain('010211');
  });

  it('txid só tem letras e números, no máximo 25', () => {
    expect(pixTxid('vf_2026-11 áé')).toBe('VF202611AE');
    expect(invoiceTxid('2026-11', 'st_ana')).toBe('VF202611ANA01');
    expect(invoiceTxid('2026-11', 'st_rita_5')).toMatch(/^[A-Z0-9]{1,25}$/);
    expect(avulsaTxid('2026-11-12', 'av_010')).toBe('VA20261112AV010');
    expect(pixTxid('X'.repeat(40))).toHaveLength(25);
  });
});
