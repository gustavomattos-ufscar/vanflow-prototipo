/** A tela de Alunos: frequência, alertas, pedido de grade, pausa, falta marcada, mensagens e ações em grupo. */
import './helpers.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { at } from '@vanflow/domain';
import { all, one, update } from '../src/db.ts';
import { advance } from '../src/demo.ts';
import { handleInbound } from '../src/inbound.ts';
import { pauseEnrollment, resumeEnrollment } from '../src/pauses.ts';
import { advanceTo } from '../src/scheduler.ts';
import { loadSeed } from '../src/seed.ts';
import {
  bulkAction, markAbsence, offerAvulsaTo, requestGrade, resendPix, sendOperatorMessage, submitGradeByStudent,
} from '../src/students.ts';
import { tripOf, tripView } from '../src/trips.ts';
import { studentDetail, studentsView } from '../src/views.ts';

const THU = 'trip_itu_noite_2026-11-12_ida';
const LINE = 'line_itu_noite';
const lastMessage = (student: string) => all<any>('messages', 'student_id = ? ORDER BY seq', student).at(-1);
const row = (id: string) => studentsView('op_ze').find((s) => s.id === id)!;
const inList = (student: string, trip = THU) => tripView(tripOf(trip)).passengers.some((p) => p.student_id === student && p.status !== 'nao_vai');

beforeEach(() => loadSeed());

describe('frequência e alertas', () => {
  it('mostra a presença das últimas 4 semanas', () => {
    const ana = row('st_ana').presence;
    expect(ana.total).toBeGreaterThanOrEqual(4);
    expect(ana.pct).toBe(Math.round((ana.went / ana.total) * 100));
  });

  it('alerta de mensalidade atrasada', () => {
    expect(row('st_diego').alerts.map((a) => a.kind)).toContain('atrasada');
    expect(row('st_ana').alerts).toEqual([]);
  });

  it('alerta de quem faltou sem avisar 2 vezes', () => {
    // Como se o motorista tivesse marcado "Não apareceu" em duas idas da semana passada.
    for (const date of ['2026-11-09', '2026-11-10']) {
      update('trip_passengers', `tp_trip_itu_noite_${date}_ida_st_bruno`, { status: 'nao_apareceu' });
    }
    const bruno = row('st_bruno');
    expect(bruno.presence.missed).toBe(2);
    expect(bruno.alerts).toContainEqual({ kind: 'faltou', tone: 'bad', label: 'faltou sem avisar 2x' });
  });

  it('alerta de sem grade e de aula fora do plano', () => {
    submitGradeByStudent('st_ana', [
      { weekday: 1, faculty_id: 'fac_uniso', start: '19:00', end: '22:40' },
      { weekday: 3, faculty_id: 'fac_uniso', start: '19:00', end: '22:40' },
      { weekday: 4, faculty_id: 'fac_uniso', start: '19:00', end: '22:40' },
      { weekday: 5, faculty_id: 'fac_uniso', start: '19:00', end: '22:40' },
    ]);
    expect(row('st_ana').alerts.map((a) => a.label)).toContain('aula fora do plano: sex');
  });

  it('lista de interessados tem compras e gasto', () => {
    const carla = row('st_carla');
    expect(carla.status).toBe('interessado_avulsa');
    expect(carla.avulsas.count).toBe(3);
    expect(carla.avulsas.total).toBe(60);
  });
});

describe('pedir a grade pelo WhatsApp', () => {
  it('manda o link que abre o formulário e registra o pedido', () => {
    requestGrade('st_ana');
    const message = lastMessage('st_ana');
    expect(message.body).toMatch(/preencha sua grade de aulas deste semestre neste link: http:\/\/localhost:\d+\/a\/ana-[a-z0-9]+\?grade=1$/);
    expect(one<any>('students', "id = 'st_ana'").grade_requested_at).toBeTruthy();
  });

  it('a grade preenchida pelo aluno muda a lista e avisa o operador, com o alerta do plano', () => {
    submitGradeByStudent('st_ana', [
      { weekday: 1, faculty_id: 'fac_uniso', start: '19:00', end: '22:40' },
      { weekday: 3, faculty_id: 'fac_uniso', start: '19:00', end: '22:40' },
    ]);
    expect(inList('st_ana')).toBe(false);
    const alert = one<any>('alerts', "kind = 'grade_aluno'");
    expect(alert.body).toContain('Ana preencheu a grade pelo link.');
    expect(alert.body).toContain('Sem aula na grade em: quinta');
    expect(lastMessage('st_ana').body).toBe('Recebemos sua grade (seg, qua). Obrigado! A confirmação chega na véspera de cada aula.');
    expect(one<any>('students', "id = 'st_ana'").grade_updated_at).toBeTruthy();
  });

  it('grade vazia é recusada', () => {
    expect(() => submitGradeByStudent('st_ana', [])).toThrow(/pelo menos um dia/);
  });
});

describe('pausar plano', () => {
  it('sai da lista e das cobranças e volta sozinho na data, com aviso', () => {
    pauseEnrollment('st_ana', '2026-12-10', 'Férias');
    expect(lastMessage('st_ana').body).toBe('Seu plano foi pausado e volta na quinta (10/12). Até lá você não recebe confirmações nem cobranças.');
    expect(inList('st_ana')).toBe(false);
    advance({ preset: '21h' });
    expect(all('messages', "student_id = 'st_ana' AND kind = 'confirmacao' AND created_at LIKE '2026-11-11T21%'")).toHaveLength(0);
    expect(row('st_ana')).toMatchObject({ enrollment_status: 'pausada', paused_until: '2026-12-10', pause_reason: 'Férias' });

    advanceTo(at('2026-12-01', '09:00'));
    expect(one('invoices', "student_id = 'st_ana' AND reference_month = '2026-12'")).toBeUndefined();
    expect(one('invoices', "student_id = 'st_bruno' AND reference_month = '2026-12'")).toBeTruthy();

    advanceTo(at('2026-12-10', '01:00'));
    expect(row('st_ana').enrollment_status).toBe('ativa');
    expect(lastMessage('st_ana').body).toBe('Seu plano voltou! A confirmação chega de novo na véspera de cada aula.');
    expect(one<any>('alerts', "kind = 'plano_volta'").body).toBe('O plano de Ana voltou hoje.');
  });

  it('retomar na mão e pausar sem data', () => {
    pauseEnrollment('st_ana', null, 'Estágio');
    expect(lastMessage('st_ana').body).toBe('Seu plano foi pausado. Você não recebe confirmações nem cobranças até ele voltar.');
    resumeEnrollment('st_ana');
    expect(inList('st_ana')).toBe(true);
    expect(() => resumeEnrollment('st_ana')).toThrow(/não está pausado/);
  });

  it('não aceita data de volta no passado nem aluno sem plano', () => {
    expect(() => pauseEnrollment('st_ana', '2026-11-01', '')).toThrow(/depois de hoje/);
    expect(() => pauseEnrollment('st_carla', null, '')).toThrow(/não tem plano/);
  });
});

describe('ações rápidas', () => {
  it('marcar falta libera o lugar, avisa o aluno e oferece a vaga', () => {
    advance({ preset: '21h' });
    const before = tripView(tripOf(THU)).summary.free;
    markAbsence('st_bruno', LINE, '2026-11-12', 'ligou avisando');
    expect(one<any>('trip_passengers', "trip_id = ? AND student_id = 'st_bruno'", THU)).toMatchObject({ status: 'nao_vai', reason: 'ligou avisando' });
    expect(tripView(tripOf(THU)).summary.free).toBe(before + 1);
    expect(lastMessage('st_bruno').body).toBe('Anotamos que você não vai na quinta (12/11). Seu lugar foi liberado.');
    expect(lastMessage('st_carla').kind).toBe('oferta_avulsa');
    expect(() => markAbsence('st_bruno', LINE, '2026-11-12')).toThrow(/não está na lista/);
  });

  it('falta na volta de hoje diz que é só a volta', () => {
    advance({ preset: '21h' });
    const todayVolta = studentDetail('st_bruno').upcoming[0];
    expect(todayVolta).toMatchObject({ date: '2026-11-11', directions: ['volta'], label: 'só a volta', today: true });
    markAbsence('st_bruno', LINE, '2026-11-11');
    expect(lastMessage('st_bruno').body).toBe('Anotamos que você não vai na volta de hoje (11/11). Seu lugar foi liberado.');
  });

  it('a ficha lista os dias em que dá para marcar falta', () => {
    const days = studentDetail('st_ana').upcoming.map((u) => u.date);
    expect(days).toContain('2026-11-12');
    expect(days).not.toContain('2026-11-13');
  });

  it('mensagem do operador chega no WhatsApp e não aceita texto vazio', () => {
    sendOperatorMessage('st_ana', 'Amanhã a van sai 10 minutos mais cedo.');
    expect(lastMessage('st_ana')).toMatchObject({ direction: 'out', body: 'Amanhã a van sai 10 minutos mais cedo.' });
    expect(() => sendOperatorMessage('st_ana', '   ')).toThrow(/Escreva/);
  });

  it('reenviar Pix só quando há cobrança em aberto', () => {
    resendPix('st_diego');
    expect(lastMessage('st_diego').kind).toBe('pix');
    expect(() => resendPix('st_ana')).toThrow(/não tem cobrança em aberto/);
    expect(studentDetail('st_diego').has_open_charge).toBe(true);
    expect(studentDetail('st_ana').has_open_charge).toBe(false);
  });

  it('oferecer vaga para um interessado', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_ana', text: 'não vou' });
    offerAvulsaTo('st_felipe');
    expect(lastMessage('st_felipe')).toMatchObject({ kind: 'oferta_avulsa', buttons: ['Reservar'] });
  });
});

describe('ações em grupo', () => {
  it('lembrar cobrança pula quem está em dia', () => {
    const result = bulkAction(['st_diego', 'st_ana', 'st_vinicius'], 'remind');
    expect(result.done).toBe(2);
    expect(result.skipped).toEqual([{ name: 'Ana Beatriz Rocha', reason: 'sem cobrança em aberto' }]);
    expect(lastMessage('st_diego').kind).toBe('lembrete');
  });

  it('mensagem e pedido de grade para vários', () => {
    expect(bulkAction(['st_ana', 'st_bruno'], 'message', 'Aviso: feriado na sexta 20/11.').done).toBe(2);
    expect(lastMessage('st_bruno').body).toBe('Aviso: feriado na sexta 20/11.');
    expect(bulkAction(['st_ana', 'st_bruno'], 'grade').done).toBe(2);
    expect(lastMessage('st_bruno').body).toContain('?grade=1');
    expect(() => bulkAction([], 'grade')).toThrow(/Selecione/);
    expect(() => bulkAction(['st_ana'], 'message', '')).toThrow(/Escreva/);
  });
});
