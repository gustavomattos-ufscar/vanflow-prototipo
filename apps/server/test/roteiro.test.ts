/** O roteiro da demo (docs/11) de ponta a ponta, sobre o mesmo código que o servidor roda. */
import './helpers.ts';
import { beforeEach, describe, expect, it } from 'vitest';
import { at, isValidPixPayload } from '@vanflow/domain';
import { all, one, sql, update } from '../src/db.ts';
import { lineOf, now, settingsOf, type Booking, type Invoice, type Trip } from '../src/context.ts';
import { handlePixWebhook, markPaidManually, remindNow } from '../src/billing.ts';
import { advance, anaSaysNo, carlaBuysSeat, carlaReserves, extendTrial, loadScenario, payAllButThree, payOpenBooking, simulateReplies } from '../src/demo.ts';
import { handleInbound } from '../src/inbound.ts';
import { routeView } from '../src/route.ts';
import { advanceTo } from '../src/scheduler.ts';
import { loadSeed } from '../src/seed.ts';
import { book, freeSeats, interestedFor } from '../src/avulsas.ts';
import { tripOf, tripView } from '../src/trips.ts';

const THU = 'trip_itu_noite_2026-11-12_ida';
const THU_BACK = 'trip_itu_noite_2026-11-12_volta';
const summary = (id = THU) => tripView(tripOf(id)).summary;
const messagesOf = (student: string) => all<any>('messages', 'student_id = ? ORDER BY seq', student);
const lastMessage = (student: string) => messagesOf(student).at(-1);
const passenger = (student: string, trip = THU) => one<any>('trip_passengers', 'trip_id = ? AND student_id = ?', trip, student);

beforeEach(() => loadSeed());

describe('estado inicial', () => {
  it('começa na quarta 20h55 com 14 previstos na quinta e sem confirmação enviada', () => {
    expect(now()).toBe('2026-11-11T20:55:00-03:00');
    expect(summary()).toMatchObject({ total: 14, capacity: 15, pending: 14 });
    expect(tripOf(THU).status).toBe('planejada');
  });

  it('tem histórico e o dia de hoje já resolvido', () => {
    expect(tripOf('trip_itu_noite_2026-11-11_ida').status).toBe('concluida');
    expect(tripOf('trip_itu_noite_2026-11-11_volta').status).toBe('lista_fechada');
    expect(tripOf('trip_itu_noite_2026-11-10_ida').status).toBe('concluida');
  });

  it('nenhum Pix do seed fica com txid inválido', () => {
    for (const i of all<Invoice>('invoices')) {
      expect(i.pix_txid).toMatch(/^[A-Z0-9]{1,25}$/);
      expect(isValidPixPayload(i.pix_payload)).toBe(true);
    }
  });
});

describe('passo 3: a confirmação das 21h', () => {
  it('envia só para quem tem aula na quinta, uma mensagem por aluno', () => {
    advance({ preset: '21h' });
    expect(tripOf(THU).status).toBe('confirmacoes_enviadas');
    const sent = sql<any>("SELECT student_id FROM messages WHERE kind = 'confirmacao' AND created_at = '2026-11-11T21:00:00-03:00' AND payload LIKE '%line_itu_noite%'");
    expect(sent).toHaveLength(14);
    expect(new Set(sent.map((m) => m.student_id)).size).toBe(14);
    expect(sent.map((m) => m.student_id)).not.toContain('st_caio');
    expect(sent.map((m) => m.student_id)).not.toContain('st_leticia');
    expect(sent.map((m) => m.student_id)).not.toContain('st_carla');
    expect(lastMessage('st_ana').body).toBe('Oi, Ana! Amanhã (qui) você tem aula às 19h na Uniso. Vai na van?');
    expect(lastMessage('st_ana').buttons).toEqual(['Vou', 'Não vou']);
  });

  it('não reenvia ao andar o relógio de novo', () => {
    advance({ preset: '21h' });
    const before = messagesOf('st_ana').length;
    advance({ minutes: 30 });
    expect(messagesOf('st_ana').length).toBe(before);
  });

  it('botão "Não vou" e depois o motivo digitado: 13 de 14 e motivo guardado', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_ana', text: 'Não vou', message_id: lastMessage('st_ana').id });
    expect(summary()).toMatchObject({ going: 13, total: 14, notGoing: 1, free: 2 });
    expect(lastMessage('st_ana').body).toBe('Anotado! Seu lugar foi liberado. Até segunda.');
    handleInbound({ student_id: 'st_ana', text: 'a aula foi cancelada' });
    expect(passenger('st_ana').reason).toBe('a aula foi cancelada');
    expect(passenger('st_ana', THU_BACK).status).toBe('nao_vai');
    expect(lastMessage('st_ana').body).not.toContain('Não entendi');
  });

  it('texto livre com motivo funciona de uma vez', () => {
    advance({ preset: '21h' });
    anaSaysNo();
    expect(passenger('st_ana')).toMatchObject({ status: 'nao_vai', reason: 'a aula foi cancelada' });
  });

  it('"Vou" responde com saída e ponto', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_bruno', text: 'vou sim' });
    expect(passenger('st_bruno').status).toBe('confirmado');
    expect(lastMessage('st_bruno').body).toBe('Combinado! Saída às 17h40 no Centro · ponto combinado. Até amanhã.');
  });

  it('resposta sem sentido repete os botões', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_bruno', text: 'qual é a placa da van?' });
    expect(lastMessage('st_bruno').body).toBe('Não entendi. Toque em uma opção:');
    expect(lastMessage('st_bruno').buttons).toEqual(['Vou', 'Não vou']);
    expect(passenger('st_bruno').status).toBe('aguardando');
  });

  it('sem pergunta em aberto, o "não entendi" traz botões que funcionam ao tocar', () => {
    handleInbound({ student_id: 'st_carla', text: 'qual é a placa da van?' });
    const menu = lastMessage('st_carla');
    expect(menu.body).toBe('Não entendi. Toque no que você precisa:');
    expect(menu.buttons).toEqual(['Vaga avulsa', '2ª via do Pix']);
    handleInbound({ student_id: 'st_carla', text: '2ª via do Pix', message_id: menu.id });
    expect(lastMessage('st_carla').body).toContain('nenhuma cobrança em aberto');
    handleInbound({ student_id: 'st_diego', text: 'oi' });
    handleInbound({ student_id: 'st_diego', text: '2ª via do Pix', message_id: lastMessage('st_diego').id });
    expect(lastMessage('st_diego').kind).toBe('pix');
  });

  it('"vou" sem viagem em aberto também traz os botões', () => {
    handleInbound({ student_id: 'st_carla', text: 'vou' });
    expect(lastMessage('st_carla').buttons).toEqual(['Vaga avulsa', '2ª via do Pix']);
  });

  it('simular respostas sobe os confirmados e é repetível', () => {
    advance({ preset: '21h' });
    anaSaysNo();
    const result = simulateReplies(undefined, 80);
    expect(result.yes + result.no + result.silent).toBe(13);
    expect(summary().confirmed).toBe(result.yes);
    loadSeed();
    advance({ preset: '21h' });
    anaSaysNo();
    expect(simulateReplies(undefined, 80)).toEqual(result);
  });

  it('só ida libera a volta', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_julia', text: 'só ida' });
    expect(passenger('st_julia').status).toBe('confirmado');
    expect(passenger('st_julia', THU_BACK).status).toBe('nao_vai');
  });

  it('lembra às 22h30 só quem não respondeu e fecha às 14h40 com "sem resposta"', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_bruno', text: 'vou' });
    advanceTo(at('2026-11-11', '22:30'));
    expect(lastMessage('st_julia').body).toContain('ainda não sabemos');
    expect(lastMessage('st_julia').body).toContain('14h40 de amanhã');
    expect(lastMessage('st_bruno').body).not.toContain('ainda não sabemos');
    advanceTo(at('2026-11-12', '14:40'));
    expect(tripOf(THU).status).toBe('lista_fechada');
    expect(passenger('st_julia').status).toBe('sem_resposta');
    expect(passenger('st_bruno').status).toBe('confirmado');
    expect(summary().going).toBe(14);
  });

  it('sem resposta pode contar como não vai, pela configuração', () => {
    update('operator_settings', 'op_ze', { no_answer_counts_as_going: false }, 'operator_id');
    advance({ preset: '21h' });
    advanceTo(at('2026-11-12', '14:40'));
    expect(passenger('st_julia').status).toBe('nao_vai');
  });

  it('aviso depois do fechamento vira alerta para o operador', () => {
    advance({ preset: '21h' });
    advanceTo(at('2026-11-12', '17:20'));
    handleInbound({ student_id: 'st_ana', text: 'não vou' });
    expect(passenger('st_ana').status).toBe('nao_vai');
    const alert = one<any>('alerts', "kind = 'falta_tardia'");
    expect(alert.body).toBe('Ana avisou que não vai hoje (19 min antes da saída).');
  });

  it('quem liberou o lugar não volta se a van encheu', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_ana', text: 'não vou' });
    const line = lineOf('line_itu_noite');
    book('st_carla', line, '2026-11-12');
    book('st_felipe', line, '2026-11-12');
    expect(freeSeats(line, '2026-11-12')).toBe(0);
    handleInbound({ student_id: 'st_ana', text: 'vou' });
    expect(passenger('st_ana').status).toBe('nao_vai');
    expect(lastMessage('st_ana').body).toContain('van está cheia');
  });
});

describe('passo 4: a vaga avulsa', () => {
  beforeEach(() => {
    advance({ preset: '21h' });
    anaSaysNo();
  });

  it('a oferta sai sozinha para a Carla', () => {
    const offer = messagesOf('st_carla').at(-1);
    expect(offer.kind).toBe('oferta_avulsa');
    expect(offer.body).toBe('Abriu vaga na van de qui (12/11): Itu e Salto → Sorocaba, saída 17h40. Ida e volta por R$ 20,00. Quer reservar?');
    expect(offer.buttons).toEqual(['Reservar']);
  });

  it('oferta vai para no máximo 5, a mais recente primeiro, e não repete', () => {
    const offers = sql<any>("SELECT student_id FROM messages WHERE kind = 'oferta_avulsa' ORDER BY seq");
    expect(offers.length).toBeLessThanOrEqual(5);
    expect(offers[0].student_id).toBe('st_leticia');
    handleInbound({ student_id: 'st_julia', text: 'não vou' });
    expect(sql("SELECT 1 FROM messages WHERE kind = 'oferta_avulsa'").length).toBe(offers.length);
  });

  it('reservar segura a vaga, manda Pix válido e pagar coloca na lista e na rota', () => {
    handleInbound({ student_id: 'st_carla', text: 'Reservar', message_id: lastMessage('st_carla').id });
    const booking = one<Booking>('avulsa_bookings', "student_id = 'st_carla' AND status = 'reservado'")!;
    expect(booking.price).toBe(20);
    expect(isValidPixPayload(booking.pix_payload)).toBe(true);
    expect(booking.pix_txid).toMatch(/^VA20261112AV\d+$/);
    expect(summary()).toMatchObject({ reserved: 1, free: 1 });
    expect(lastMessage('st_carla').body).toBe('Vaga reservada por 30 minutos. Pague com o Pix copia e cola abaixo para garantir:');

    handlePixWebhook({ txid: booking.pix_txid, amount: 20 });
    expect(passenger('st_carla')).toMatchObject({ status: 'confirmado', source: 'avulsa' });
    expect(summary()).toMatchObject({ going: 14, total: 15, avulsos: 1, free: 1 });
    const route = routeView(tripOf(THU));
    expect(route.stops.some((s) => s.student_id === 'st_carla')).toBe(true);
    expect(sql("SELECT 1 FROM payments WHERE avulsa_booking_id = ?", booking.id)).toHaveLength(1);
    expect(messagesOf('st_carla').some((m) => m.body.startsWith('Pagamento recebido! Você está na lista de qui.'))).toBe(true);
    expect(lastMessage('st_carla').kind).toBe('recibo');
  });

  it('"sim" logo depois da oferta reserva', () => {
    handleInbound({ student_id: 'st_carla', text: 'sim' });
    expect(one('avulsa_bookings', "student_id = 'st_carla' AND status = 'reservado'")).toBeTruthy();
  });

  it('reserva sem pagamento expira em 30 minutos e a vaga volta', () => {
    handleInbound({ student_id: 'st_carla', text: 'Reservar' });
    expect(summary().free).toBe(1);
    advance({ minutes: 29 });
    expect(summary().free).toBe(1);
    advance({ minutes: 2 });
    expect(summary().free).toBe(2);
    expect(one<Booking>('avulsa_bookings', "student_id = 'st_carla' ORDER BY id DESC")?.status).toBe('expirado');
    expect(lastMessage('st_carla').body).toContain('expirou');
    expect(tripView(tripOf(THU)).passengers.some((p) => p.student_id === 'st_carla')).toBe(false);
  });

  it('dois compradores para o último lugar: o terceiro recebe recusa', () => {
    const line = lineOf('line_itu_noite');
    expect(book('st_carla', line, '2026-11-12').ok).toBe(true);
    expect(book('st_felipe', line, '2026-11-12').ok).toBe(true);
    expect(book('st_caio', line, '2026-11-12').ok).toBe(false);
    expect(lastMessage('st_caio').body).toContain('acabou de ser preenchida');
  });

  it('pedido pelo WhatsApp mostra as vagas do dia certo', () => {
    handleInbound({ student_id: 'st_felipe', text: 'quero vaga avulsa quinta' });
    expect(lastMessage('st_felipe').body).toBe('Quinta, 12/11: Itu e Salto → Sorocaba, saída 17h40, 2 vagas. Ida e volta R$ 20,00. Quer reservar?');
  });

  it('vendas encerram no fechamento', () => {
    advanceTo(at('2026-11-12', '14:40'));
    expect(freeSeats(lineOf('line_itu_noite'), '2026-11-12')).toBe(0);
  });

  it('lista de interesse não inclui quem já está na viagem', () => {
    const ids = interestedFor(lineOf('line_itu_noite'), '2026-11-12').map((s) => s.id);
    expect(ids).toContain('st_carla');
    expect(ids).toContain('st_caio');
    expect(ids).not.toContain('st_bruno');
    expect(ids).not.toContain('st_ana');
  });
});

describe('palco: passo feito à mão no celular', () => {
  it('atalhos não repetem nem dão erro', () => {
    advance({ preset: '21h' });
    handleInbound({ student_id: 'st_ana', text: 'Não vou', message_id: lastMessage('st_ana').id });
    const before = messagesOf('st_ana').length;
    anaSaysNo();
    expect(messagesOf('st_ana')).toHaveLength(before);
    handleInbound({ student_id: 'st_carla', text: 'Reservar' });
    carlaReserves();
    expect(all('avulsa_bookings', "student_id = 'st_carla' AND status = 'reservado'")).toHaveLength(1);
    const booking = one<Booking>('avulsa_bookings', "student_id = 'st_carla' AND status = 'reservado'")!;
    handlePixWebhook({ txid: booking.pix_txid, amount: 20 });
    expect(() => payOpenBooking('st_carla')).not.toThrow();
    expect(() => carlaBuysSeat()).not.toThrow();
    expect(all('payments', 'avulsa_booking_id = ?', booking.id)).toHaveLength(1);
  });
});

describe('passo 5: a rota', () => {
  it('sem a casa da Ana, com Carla, em ordem, com links', () => {
    advance({ preset: '21h' });
    anaSaysNo();
    carlaBuysSeat();
    advance({ preset: 'quinta-17h30' });
    const route = routeView(tripOf(THU));
    expect(route.stops.some((s) => s.student_id === 'st_ana')).toBe(false);
    expect(route.skipped.map((s) => s.name)).toContain('Ana Beatriz Rocha');
    expect(route.stops.some((s) => s.student_id === 'st_carla')).toBe(true);
    expect(route.stops[0].kind).toBe('saida');
    expect(route.stops.at(-1)?.kind).toBe('faculdade');
    expect(route.stops.filter((s) => s.kind === 'aluno')).toHaveLength(14);
    expect(route.maps_links.length).toBeGreaterThanOrEqual(2);
    for (const link of route.maps_links) {
      expect(link).toContain('https://www.google.com/maps/dir/?api=1');
      expect((link.match(/%7C/g) ?? []).length).toBeLessThanOrEqual(8);
    }
    expect(route.waze_links[0].url).toContain('waze.com/ul?ll=');
    expect(route.saved_km).toBeGreaterThan(0);
    expect(route.km).toBeLessThan(route.habit_km);
    const firstFaculty = route.stops.find((s) => s.kind === 'faculdade')!;
    expect(firstFaculty.eta < '19:00').toBe(true);
  });
});

describe('passo 6: a cobrança', () => {
  it('dia 1 gera e envia mesmo com o teste grátis vencido no meio do caminho', () => {
    advance({ preset: 'dia-1' });
    expect(now()).toBe('2026-12-01T09:00:00-03:00');
    const dec = all<Invoice>('invoices', "operator_id = 'op_ze' AND reference_month = '2026-12'");
    expect(dec).toHaveLength(28);
    for (const invoice of dec) {
      expect(isValidPixPayload(invoice.pix_payload)).toBe(true);
      expect(invoice).toMatchObject({ status: 'pendente', due_date: '2026-12-05' });
    }
    expect(messagesOf('st_ana').some((m) => m.body === 'Oi, Ana! Sua mensalidade de dezembro da Van do Seu Zé é R$ 300,00, com vencimento em 05/12. Pix copia e cola:')).toBe(true);
  });

  it('não duplica ao avançar mais', () => {
    advance({ preset: 'dia-1' });
    advance({ minutes: 600 });
    expect(all('invoices', "operator_id = 'op_ze' AND reference_month = '2026-12'")).toHaveLength(28);
  });

  it('"Avançar para dia 5" também gera, porque passa pelo dia 1', () => {
    advance({ preset: 'dia-5' });
    expect(all('invoices', "reference_month = '2026-12'").length).toBeGreaterThan(0);
  });

  it('pagar todas menos 3 e ir ao dia 8: 3 atrasados com lembretes', () => {
    advance({ preset: 'dia-1' });
    expect(payAllButThree()).toMatchObject({ left: 3 });
    const open = all<Invoice>('invoices', "operator_id = 'op_ze' AND status IN ('pendente', 'atrasada')");
    expect(open.map((i) => i.student_id).sort()).toEqual(['st_diego', 'st_otavio', 'st_vinicius']);
    advance({ preset: 'dia-8' });
    const late = all<Invoice>('invoices', "operator_id = 'op_ze' AND status = 'atrasada'");
    expect(late).toHaveLength(3);
    expect(late[0].reminders.map((r) => r.kind)).toEqual(['d-2', 'd0', 'd+1', 'd+3']);
    expect(lastMessage('st_diego').body).toContain('venceu em 05/12');
    expect(all('invoices', "operator_id = 'op_ze' AND status = 'paga' AND reference_month = '2026-12'")).toHaveLength(25);
  });

  it('webhook dá baixa, manda recibo, é idempotente e confere o valor', () => {
    advance({ preset: 'dia-1' });
    const invoice = one<Invoice>('invoices', "student_id = 'st_ana' AND reference_month = '2026-12'")!;
    expect(() => handlePixWebhook({ txid: invoice.pix_txid, amount: 1 })).toThrow(/Valor diferente/);
    expect(handlePixWebhook({ txid: invoice.pix_txid, amount: 300 }).status).toBe('pago');
    expect(handlePixWebhook({ txid: invoice.pix_txid, amount: 300 }).status).toBe('ja_pago');
    expect(all('payments', 'invoice_id = ?', invoice.id)).toHaveLength(1);
    expect(lastMessage('st_ana').body).toContain('Recebemos R$ 300,00 referente a mensalidade de dezembro. Obrigado! Recibo:');
    expect(() => handlePixWebhook({ txid: 'NAOEXISTE', amount: 1 })).toThrow();
  });

  it('baixa manual e lembrete manual', () => {
    remindNow('inv_202611_st_diego');
    expect(lastMessage('st_diego').body).toContain('venceu em 05/11');
    markPaidManually('inv_202611_st_diego', 'recebi em dinheiro');
    expect(one<Invoice>('invoices', "id = 'inv_202611_st_diego'")).toMatchObject({ status: 'paga', paid_via: 'manual', paid_note: 'recebi em dinheiro' });
  });

  it('"pix" no WhatsApp manda a 2ª via', () => {
    handleInbound({ student_id: 'st_diego', text: '2ª via' });
    const message = lastMessage('st_diego');
    expect(message.kind).toBe('pix');
    expect(isValidPixPayload(message.payload.pix_payload)).toBe(true);
  });
});

describe('feriados e exceções', () => {
  it('sexta 13/11: Facens sem aula não recebe confirmação', () => {
    advanceTo(at('2026-11-12', '21:00'));
    const list = tripView(tripOf('trip_itu_noite_2026-11-13_ida')).passengers.map((p) => p.student_id);
    expect(list).not.toContain('st_bruno');
    expect(list).toContain('st_julia');
    expect(lastMessage('st_julia').body).toContain('Amanhã (sex)');
  });

  it('feriado 20/11: nenhuma viagem e nenhuma confirmação na véspera', () => {
    advanceTo(at('2026-11-19', '23:00'));
    expect(one<Trip>('trips', "date = '2026-11-20'")).toBeUndefined();
    expect(sql("SELECT 1 FROM messages WHERE kind = 'confirmacao' AND created_at LIKE '2026-11-19%'")).toHaveLength(0);
  });

  it('sábado sem aluno com aula não tem viagem nem vaga à venda', () => {
    expect(one<Trip>('trips', "date = '2026-11-14'")).toBeUndefined();
    expect(freeSeats(lineOf('line_itu_noite'), '2026-11-14')).toBe(0);
  });

  it('segunda recebe confirmação no domingo à noite', () => {
    advanceTo(at('2026-11-15', '21:00'));
    expect(lastMessage('st_julia').body).toContain('Amanhã (seg)');
  });
});

describe('teste grátis', () => {
  it('no cenário "acabando", os envios pausam depois do fim e voltam ao estender', () => {
    loadScenario('teste_acabando');
    advanceTo(at('2026-11-27', '21:30'));
    expect(sql("SELECT 1 FROM messages WHERE kind = 'confirmacao' AND student_id = 'st_julia' AND created_at LIKE '2026-11-27%'")).toHaveLength(0);
    expect(one('alerts', "operator_id = 'op_ze' AND kind = 'teste_fim'")).toBeTruthy();
    extendTrial();
    advanceTo(at('2026-11-29', '21:30'));
    expect(sql("SELECT 1 FROM messages WHERE kind = 'confirmacao' AND student_id = 'st_julia' AND created_at LIKE '2026-11-29%'")).toHaveLength(1);
    expect(one('alerts', "kind = 'teste_fim' AND operator_id = 'op_ze'")).toBeUndefined();
  });
});

describe('cenários e desempenho', () => {
  it('quinta 17h deixa tudo pronto', () => {
    loadScenario('quinta_17h');
    expect(now()).toBe('2026-11-12T17:00:00-03:00');
    expect(tripOf(THU).status).toBe('lista_fechada');
    expect(passenger('st_carla').status).toBe('confirmado');
  });

  it('o salto de um mês leva poucos segundos e o reset volta tudo', () => {
    const start = Date.now();
    advance({ preset: 'dia-8' });
    expect(Date.now() - start).toBeLessThan(5000);
    const resetStart = Date.now();
    loadSeed();
    expect(Date.now() - resetStart).toBeLessThan(2000);
    expect(now()).toBe('2026-11-11T20:55:00-03:00');
    expect(settingsOf('op_ze').due_day).toBe(5);
  });
});
