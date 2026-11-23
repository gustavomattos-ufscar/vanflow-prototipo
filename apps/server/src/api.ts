/** API REST (docs/09) e o canal de eventos ao vivo. */
import { Router, type Request, type Response } from 'express';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildPixPayload, monthOf, subscriptionMonthly, type Line } from '@vanflow/domain';
import { all, byId, db, insert, one, remove, ROOT, tx, update } from './db.ts';
import {
  countRows, HttpError, lineOf, logEvent, now, operatorIdOfLine, operatorOf, studentOf, today, vansOf,
} from './context.ts';
import { book, cancelBooking, offerSeats, availability } from './avulsas.ts';
import {
  cancelInvoice, generateInvoices, handlePixWebhook, markPaidManually, remindNow, sendPixAgain,
} from './billing.ts';
import {
  advance, anaSaysNo, carlaBuysSeat, carlaReserves, demoState, extendTrial, loadScenario, payAllButThree, payOpenBooking, SCENARIOS, simulateReplies,
} from './demo.ts';
import { handleInbound } from './inbound.ts';
import { whatsapp } from './integrations.ts';
import { applyAnswer, closeList, sendConfirmations, sendReminders } from './presence.ts';
import {
  convertLead, createLead, createStudent, deleteStudent, importCsv, replaceSchedule, saveEnrollment, saveLine, saveVan, updateStudent,
} from './records.ts';
import { routeView } from './route.ts';
import { finishTrip, lastEvents } from './scheduler.ts';
import { loadSeed } from './seed.ts';
import { resyncOperator, tripOf } from './trips.ts';
import * as views from './views.ts';

const clients = new Set<Response>();

export function notifyClients(event = 'change'): void {
  for (const client of clients) client.write(`event: ${event}\ndata: {}\n\n`);
}

const api = Router();

type Handler = (req: Request) => unknown;

const read = (path: string, handler: Handler) =>
  api.get(path, (req, res, next) => {
    try {
      res.json(handler(req));
    } catch (error) {
      next(error);
    }
  });

/** Toda escrita roda em uma transação e avisa as telas abertas. */
const write = (method: 'post' | 'put' | 'patch' | 'delete', path: string, handler: Handler) =>
  api[method](path, (req, res, next) => {
    try {
      const result = tx(() => handler(req));
      res.json(result ?? { ok: true });
      notifyClients();
    } catch (error) {
      next(error);
    }
  });

const param = (req: Request, name: string) => String(req.params[name]);
const query = (req: Request, name: string) => (typeof req.query[name] === 'string' && req.query[name] ? (req.query[name] as string) : undefined);

/* ---------- Eventos ao vivo ---------- */

api.get('/events', (req, res) => {
  res.set({ 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
  res.flushHeaders();
  res.write('retry: 1500\n\n');
  clients.add(res);
  const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000);
  req.on('close', () => {
    clearInterval(heartbeat);
    clients.delete(res);
  });
});

/* ---------- Central da demo ---------- */

read('/demo/state', () => ({ ...demoState(), scenarios: SCENARIOS, events: lastEvents(40) }));
write('post', '/demo/advance', (req) => advance(req.body));
write('post', '/demo/clock', (req) => advance({ to: req.body.now }));
write('post', '/demo/reset', () => loadSeed());
write('post', '/demo/scenario/:id', (req) => loadScenario(param(req, 'id')));
write('post', '/demo/simulate-replies', (req) => simulateReplies(req.body.trip_id, Number(req.body.pct_yes ?? 80), req.body.quiet === true));
write('post', '/demo/ana-nao-vai', () => anaSaysNo());
write('post', '/demo/carla-compra', () => carlaBuysSeat());
write('post', '/demo/carla-reserva', () => carlaReserves());
write('post', '/demo/pagar-menos-3', () => payAllButThree());
write('post', '/demo/estender-teste', () => extendTrial());
write('post', '/demo/pagar-reserva/:studentId', (req) => payOpenBooking(param(req, 'studentId')));

/* ---------- Operador ---------- */

read('/operators', () => all('operators', '1=1 ORDER BY created_at').map((o: any) => ({ id: o.id, trade_name: o.trade_name, owner_name: o.owner_name, onboarded: o.onboarded })));
read('/operators/:id/shell', (req) => views.shell(param(req, 'id')));
read('/operators/:id/today', (req) => views.todayView(param(req, 'id'), query(req, 'van')));
read('/operators/:id/grade', (req) => views.gradeView(param(req, 'id')));
read('/operators/:id/students', (req) => views.studentsView(param(req, 'id')));
read('/operators/:id/avulsas', (req) => views.avulsasView(param(req, 'id')));
read('/operators/:id/documents', (req) => views.documentsView(param(req, 'id')));
read('/operators/:id/finance', (req) => views.financeView(param(req, 'id'), query(req, 'van'), query(req, 'month') ?? monthOf(today())));
read('/operators/:id/messages', (req) => views.messagesView(param(req, 'id'), { kind: query(req, 'kind'), student_id: query(req, 'student') }));
read('/operators/:id/routes', (req) => views.routeOptions(param(req, 'id')));
read('/operators/:id/driver', (req) => views.driverView(param(req, 'id'), query(req, 'van')));
read('/operators/:id/pix-preview', (req) => {
  const operator = operatorOf(param(req, 'id'));
  if (!operator.pix_key) return { payload: null };
  return {
    payload: buildPixPayload({
      key: operator.pix_key, merchantName: operator.pix_merchant_name ?? operator.name, merchantCity: operator.pix_city ?? operator.city,
      amount: 300, txid: 'VFEXEMPLO01',
    }),
  };
});

write('patch', '/operators/:id', (req) => {
  const id = param(req, 'id');
  operatorOf(id);
  const { trade_name, owner_name, whatsapp: phone, city, pix_key, pix_key_type, pix_merchant_name, pix_city } = req.body;
  update('operators', id, { trade_name, owner_name, whatsapp: phone, city, pix_key, pix_key_type, pix_merchant_name, pix_city });
});
write('patch', '/operators/:id/settings', (req) => {
  const id = param(req, 'id');
  const allowed = ['confirmation_time', 'reminder_time', 'reminder_enabled', 'close_minutes_before_departure', 'close_time_morning', 'no_answer_counts_as_going', 'due_day', 'invoice_day', 'avulsa_hold_minutes', 'avulsa_auto_offer'];
  const patch = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  if (patch.confirmation_time && ((patch.confirmation_time as string) < '19:00' || (patch.confirmation_time as string) > '22:00')) {
    throw new HttpError(400, 'O envio da confirmação precisa ficar entre 19h e 22h.');
  }
  update('operator_settings', id, patch, 'operator_id');
});
write('post', '/operators/:id/finish-onboarding', (req) => {
  const id = param(req, 'id');
  update('operators', id, { onboarded: true });
  resyncOperator(id);
  logEvent('cadastro', `${operatorOf(id).trade_name} terminou a configuração`);
});
write('post', '/operators/:id/subscribe', (req) => {
  const id = param(req, 'id');
  const plan = req.body.plan === 'frotista' ? 'frotista' : 'padrao';
  const vans = vansOf(id).length;
  update('subscriptions', id, { status: 'active', plan, vans_count: vans, started_at: now() }, 'operator_id');
  update('operators', id, { status: 'active' });
  remove('alerts', "operator_id = ? AND kind = 'teste_fim'", id);
  logEvent('assinatura', `${operatorOf(id).trade_name} assinou: ${vans} ${vans === 1 ? 'van' : 'vans'}, ${subscriptionMonthly(vans, plan).toFixed(2).replace('.', ',')} por mês`);
});
write('post', '/operators/:id/cancel-subscription', (req) => {
  const id = param(req, 'id');
  update('subscriptions', id, { status: 'canceled' }, 'operator_id');
  update('operators', id, { status: 'canceled' });
  logEvent('assinatura', `${operatorOf(id).trade_name} cancelou a assinatura`);
});

/* ---------- Vans, linhas, motoristas ---------- */

write('post', '/vans', (req) => ({ id: saveVan(req.body.operator_id, req.body) }));
write('patch', '/vans/:id', (req) => ({ id: saveVan(req.body.operator_id, { ...req.body, id: param(req, 'id') }) }));
write('delete', '/vans/:id', (req) => {
  const id = param(req, 'id');
  if (countRows('lines', 'van_id = ?', id)) throw new HttpError(409, 'Esta van tem linhas. Remova as linhas antes.');
  const van = byId<{ operator_id: string }>('vans', id);
  remove('vans', 'id = ?', id);
  if (van) update('subscriptions', van.operator_id, { vans_count: vansOf(van.operator_id).length }, 'operator_id');
});
write('post', '/lines', (req) => ({ id: saveLine(req.body) }));
write('patch', '/lines/:id', (req) => ({ id: saveLine({ ...req.body, id: param(req, 'id') }) }));
write('delete', '/lines/:id', (req) => {
  const id = param(req, 'id');
  if (countRows('enrollments', "line_id = ? AND status = 'ativa'", id)) throw new HttpError(409, 'Esta linha tem alunos ativos. Mude os alunos de linha antes.');
  remove('trip_passengers', 'trip_id IN (SELECT id FROM trips WHERE line_id = ?)', id);
  remove('trips', 'line_id = ?', id);
  remove('lines', 'id = ?', id);
});
write('post', '/drivers', (req) => {
  if (!req.body.name?.trim()) throw new HttpError(400, 'Informe o nome do motorista.');
  const id = `drv_${Date.now().toString(36)}`;
  insert('drivers', { id, operator_id: req.body.operator_id, name: req.body.name.trim(), phone: req.body.phone ?? '', is_owner: false });
  return { id };
});
write('delete', '/drivers/:id', (req) => {
  const id = param(req, 'id');
  if (countRows('vans', 'driver_id = ?', id)) throw new HttpError(409, 'Este motorista dirige uma van. Troque o motorista da van antes.');
  remove('documents', "owner_type = 'driver' AND owner_id = ?", id);
  remove('drivers', 'id = ?', id);
});

/* ---------- Alunos ---------- */

read('/students/:id', (req) => views.studentDetail(param(req, 'id')));
write('post', '/students', (req) => createStudent(req.body));
write('patch', '/students/:id', (req) => updateStudent(param(req, 'id'), req.body));
write('delete', '/students/:id', (req) => deleteStudent(param(req, 'id')));
write('put', '/students/:id/schedule', (req) => replaceSchedule(param(req, 'id'), req.body.entries));
write('put', '/students/:id/enrollment', (req) => saveEnrollment(param(req, 'id'), req.body));
write('post', '/students/import', (req) => importCsv(req.body.operator_id, req.body.line_id, req.body.csv));
read('/students-import/sample', () => ({ csv: readFileSync(resolve(ROOT, 'dados-demo/alunos-exemplo.csv'), 'utf8') }));

/* ---------- Viagens ---------- */

read('/trips/:id', (req) => views.tripDetail(param(req, 'id')));
read('/trips/:id/route', (req) => routeView(tripOf(param(req, 'id'))));
const lineOfTrip = (req: Request) => {
  const trip = tripOf(param(req, 'id'));
  return { trip, line: lineOf(trip.line_id) as Line };
};
write('post', '/trips/:id/send-confirmations', (req) => {
  const { trip, line } = lineOfTrip(req);
  return { sent: sendConfirmations(line, trip.date) };
});
write('post', '/trips/:id/remind', (req) => {
  const { trip, line } = lineOfTrip(req);
  return { sent: sendReminders(line, trip.date) };
});
write('post', '/trips/:id/close', (req) => {
  const { trip, line } = lineOfTrip(req);
  closeList(line, trip.date);
});
write('post', '/trips/:id/offer', (req) => {
  const { trip, line } = lineOfTrip(req);
  return { sent: offerSeats(line, trip.date, 5, req.body.student_ids) };
});
write('post', '/trips/:id/finish', (req) => {
  const { trip, line } = lineOfTrip(req);
  finishTrip(trip.id);
  logEvent('viagem', `Viagem concluída: ${line.name} (${trip.direction})`);
});
write('patch', '/trip-passengers/:id', (req) => {
  const id = param(req, 'id');
  const status = req.body.status;
  if (!['embarcou', 'nao_apareceu', 'confirmado', 'nao_vai'].includes(status)) throw new HttpError(400, 'Status inválido.');
  const passenger = byId<{ trip_id: string; student_id: string }>('trip_passengers', id);
  if (!passenger) throw new HttpError(404, 'Passageiro não encontrado.');
  update('trip_passengers', id, { status, responded_at: now() });
  const trip = tripOf(passenger.trip_id);
  if (trip.status === 'lista_fechada' && (status === 'embarcou' || status === 'nao_apareceu')) update('trips', trip.id, { status: 'em_andamento' });
  if (status === 'embarcou' || status === 'nao_apareceu') {
    logEvent('viagem', `${studentOf(passenger.student_id).name}: ${status === 'embarcou' ? 'embarcou' : 'não apareceu'}`);
  }
});

/* ---------- Exceções, documentos, gastos ---------- */

write('post', '/exceptions', (req) => {
  const { operator_id, date, scope, ref_id, kind, note } = req.body;
  if (!date || !ref_id) throw new HttpError(400, 'Preencha a data e a quem se aplica.');
  if (date < today()) throw new HttpError(400, 'Escolha uma data de hoje em diante.');
  insert('calendar_exceptions', { id: `exc_${Date.now().toString(36)}`, operator_id, date, scope, ref_id, kind, note: note ?? '' });
  resyncOperator(operator_id);
  logEvent('cadastro', `Exceção em ${date.slice(8)}/${date.slice(5, 7)}: ${note || (kind === 'sem_aula' ? 'sem aula' : 'viagem cancelada')}`);
});
write('delete', '/exceptions/:id', (req) => {
  const id = param(req, 'id');
  const exception = byId<{ operator_id: string }>('calendar_exceptions', id);
  remove('calendar_exceptions', 'id = ?', id);
  if (exception) resyncOperator(exception.operator_id);
});

write('post', '/documents', (req) => {
  const { operator_id, owner_type, owner_id, type, number, expires_at } = req.body;
  if (!expires_at || !owner_id) throw new HttpError(400, 'Preencha o vencimento.');
  insert('documents', { id: `doc_${Date.now().toString(36)}`, operator_id, owner_type, owner_id, type, number: number ?? '', expires_at });
});
write('patch', '/documents/:id', (req) => {
  const { number, expires_at, type, owner_type, owner_id } = req.body;
  update('documents', param(req, 'id'), { number, expires_at, type, owner_type, owner_id });
});
write('delete', '/documents/:id', (req) => remove('documents', 'id = ?', param(req, 'id')));

write('post', '/expenses', (req) => {
  const { operator_id, van_id, date, category, description, amount } = req.body;
  if (!van_id || !date || !(Number(amount) > 0)) throw new HttpError(400, 'Preencha van, data e valor.');
  insert('expenses', { id: `exp_${Date.now().toString(36)}`, operator_id, van_id, date, category, description: description ?? '', amount: Number(amount) });
});
write('delete', '/expenses/:id', (req) => remove('expenses', 'id = ?', param(req, 'id')));

/* ---------- Cobranças ---------- */

read('/invoices', (req) => views.invoicesView(query(req, 'operator') ?? 'op_ze', query(req, 'month') ?? monthOf(today())));
write('post', '/invoices/generate', (req) => ({ created: generateInvoices(req.body.operator_id, req.body.month) }));
write('post', '/invoices/:id/remind', (req) => remindNow(param(req, 'id')));
write('post', '/invoices/:id/mark-paid', (req) => markPaidManually(param(req, 'id'), req.body.note || 'recebi em dinheiro'));
write('post', '/invoices/:id/cancel', (req) => cancelInvoice(param(req, 'id')));

/* ---------- Vagas avulsas ---------- */

read('/avulsas/available', (req) => availability(query(req, 'operator') ?? 'op_ze', query(req, 'date') ?? today()));
write('post', '/avulsas/book', (req) => {
  const result = book(req.body.student_id, lineOf(req.body.line_id), req.body.date, req.body.kind ?? 'ida_volta');
  if (!result.ok) throw new HttpError(409, result.reason);
  return result.booking;
});
write('post', '/avulsas/:id/cancel', (req) => cancelBooking(param(req, 'id')));

/* ---------- WhatsApp ---------- */

read('/whatsapp/conversations', () => views.conversationsView());
read('/whatsapp/conversations/:studentId', (req) => views.conversationView(param(req, 'studentId')));
write('post', '/whatsapp/conversations/:studentId/read', (req) => {
  db.prepare('UPDATE messages SET read_at = ? WHERE student_id = ? AND read_at IS NULL').run(now(), param(req, 'studentId'));
});
write('post', '/whatsapp/inbound', (req) => {
  handleInbound({ student_id: req.body.student_id, text: req.body.text ?? req.body.button, message_id: req.body.message_id });
});
/** Número novo no simulador: entra na lista de interesse da linha escolhida. */
write('post', '/whatsapp/contacts', (req) => {
  const line = lineOf(req.body.line_id);
  const operatorId = operatorIdOfLine(line);
  const faculty = line.destinations[0];
  const student = createStudent({
    operator_id: operatorId, name: req.body.name, phone: req.body.phone, city: req.body.city || 'Itu', neighborhood: req.body.neighborhood || 'Centro',
    faculty_id: faculty, status: 'interessado_avulsa', interest_line_id: line.id,
  });
  whatsapp.send({
    operator_id: operatorId, student_id: student.id, kind: 'texto',
    body: `Oi, ${student.name.split(' ')[0]}! Aqui é a VanFlow da ${operatorOf(operatorId).trade_name}. Para comprar uma vaga, peça "vaga avulsa".`,
  });
  return { id: student.id };
});

write('post', '/webhooks/pix', (req) => {
  const amount = Number(req.body.amount ?? req.body.valor);
  if (!req.body.txid) throw new HttpError(400, 'Informe o txid.');
  return handlePixWebhook({ txid: req.body.txid, amount, paid_at: req.body.paid_at ?? req.body.pago_em });
});

/* ---------- Página do aluno ---------- */

read('/aluno/:token', (req) => views.studentPage(param(req, 'token')));
read('/aluno/:token/recibo/:paymentId', (req) => views.receiptView(param(req, 'token'), param(req, 'paymentId')));
const studentByToken = (req: Request) => {
  const student = one<{ id: string; operator_id: string }>('students', 'token = ?', param(req, 'token'));
  if (!student) throw new HttpError(404, 'Este link não é válido.');
  return student;
};
write('post', '/aluno/:token/respond', (req) => {
  const student = studentByToken(req);
  const { line_id, date, answer } = req.body;
  if (!['vai', 'nao_vai'].includes(answer)) throw new HttpError(400, 'Resposta inválida.');
  applyAnswer(student.id, lineOf(line_id), date, answer);
});
write('post', '/aluno/:token/pix', (req) => sendPixAgain(studentByToken(req).id));
write('post', '/aluno/:token/book', (req) => {
  const result = book(studentByToken(req).id, lineOf(req.body.line_id), req.body.date, req.body.kind ?? 'ida_volta');
  if (!result.ok) throw new HttpError(409, result.reason);
  return result.booking;
});

/* ---------- Painel da startup ---------- */

read('/startup/metrics', () => views.startupMetrics());
write('post', '/leads', (req) => ({ id: createLead(req.body) }));
write('post', '/leads/:id/convert', (req) => ({ operator_id: convertLead(param(req, 'id')) }));

export { api };
