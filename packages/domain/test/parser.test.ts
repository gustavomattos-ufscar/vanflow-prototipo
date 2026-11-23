import { describe, expect, it } from 'vitest';
import { normalizeReply, parseReply } from '../src/index.ts';

describe('parser de resposta livre', () => {
  it.each(['vou', 'Vou!', 'sim', 'vou sim', 'to indo', 'tô indo', 'confirmo', 'ok', 'OK.', '👍'])('"%s" é vai', (text) => {
    expect(parseReply(text).intent).toBe('vai');
  });

  it.each(['não', 'nao', 'não vou', 'nao vou', 'NÃO VOU!', 'hoje nao', 'nao vai dar', 'falto', 'vou faltar'])('"%s" é não vai', (text) => {
    expect(parseReply(text).intent).toBe('nao_vai');
  });

  it('guarda o motivo depois do não vou', () => {
    expect(parseReply('não vou, a aula foi cancelada')).toEqual({ intent: 'nao_vai', reason: 'a aula foi cancelada' });
    expect(parseReply('Nao vou hoje: prova na outra sala').reason).toBe('prova na outra sala');
    expect(parseReply('não vou').reason).toBeUndefined();
  });

  it.each(['pix', 'boleto', 'segunda via', '2a via', '2ª via', 'quero pagar', 'manda a 2ª via do pix'])('"%s" pede o Pix', (text) => {
    expect(parseReply(text).intent).toBe('pix');
  });

  it('"não recebi o pix" não libera o lugar do aluno', () => {
    expect(parseReply('não recebi o pix').intent).toBe('pix');
  });

  it('entende vaga avulsa com o dia', () => {
    expect(parseReply('quero vaga avulsa quinta')).toEqual({ intent: 'avulsa', day: 4 });
    expect(parseReply('quero vaga avulsa').intent).toBe('avulsa');
    expect(parseReply('avulsa amanhã')).toEqual({ intent: 'avulsa', day: 'amanha' });
    expect(parseReply('quero ir sexta')).toEqual({ intent: 'avulsa', day: 5 });
  });

  it('entende os botões do menu', () => {
    expect(parseReply('Vaga avulsa').intent).toBe('avulsa');
    expect(parseReply('2ª via do Pix').intent).toBe('pix');
  });

  it('entende só ida e só volta', () => {
    expect(parseReply('só ida').intent).toBe('so_ida');
    expect(parseReply('so volta').intent).toBe('so_volta');
    expect(parseReply('vou só na ida').intent).toBe('so_ida');
  });

  it('entende reservar e não adivinha o resto', () => {
    expect(parseReply('Reservar').intent).toBe('reservar');
    expect(parseReply('a aula foi cancelada').intent).toBe('desconhecido');
    expect(parseReply('qual o horário?').intent).toBe('desconhecido');
    expect(parseReply('   ').intent).toBe('desconhecido');
  });

  it('normaliza minúsculas, acento e pontuação', () => {
    expect(normalizeReply('  NÃO, Vou!!! ')).toBe('nao vou');
    expect(normalizeReply('2ª via')).toBe('2a via');
  });
});
