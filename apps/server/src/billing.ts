/** Cobrança da mensalidade: geração, envio, lembretes, baixa pelo webhook do Pix. */
import {
  addDays, brl, dueDateFor, documentAlertThreshold, fmtDayMonth, invoiceStatusOn, invoiceTxid, monthName, monthOf, msg, normalizeIso,
  reminderDueOn, type Enrollment, type ReminderKind,
} from '@vanflow/domain';
import { all, byId, insert, one, sql, update } from './db.ts';
import {
  addAlert, HttpError, isPaused, logEvent, now, operatorOf, settingsOf, studentOf, today,
  type Booking, type Invoice, type Operator, type Student,
} from './context.ts';
import { pix, whatsapp } from './integrations.ts';
import { confirmBookingPaid } from './avulsas.ts';
import { freeSeats } from './avulsas.ts';
import { lineOf } from './context.ts';

/** Endereço que aparece nas mensagens. A tela troca pelo host real ao abrir (celular na mesma rede). */
const BASE_URL = `http://localhost:${process.env.PORT ?? 5173}`;
export const studentLink = (student: Pick<Student, 'token'>) => `${BASE_URL}/a/${student.token}`;

const pixBlock = (invoice: Invoice) => ({
  invoice_id: invoice.id, pix_payload: invoice.pix_payload, txid: invoice.pix_txid, amount: invoice.amount,
  title: `Mensalidade de ${monthName(invoice.reference_month)}`,
});

function sendInvoice(invoice: Invoice): void {
  const student = studentOf(invoice.student_id);
  const operator = operatorOf(invoice.operator_id);
  whatsapp.send({
    operator_id: invoice.operator_id, student_id: student.id, kind: 'cobranca',
    body: msg.invoice(student.name, invoice.reference_month, operator.trade_name, invoice.amount, invoice.due_date),
    buttons: [], payload: { ...pixBlock(invoice), link: studentLink(student) },
  });
  update('invoices', invoice.id, { sent_at: now() });
}

/** Uma cobrança por matrícula ativa no mês. Rodar de novo não duplica. */
export function generateInvoices(operatorId: string, month: string, send = true): number {
  const operator = operatorOf(operatorId);
  if (!operator.pix_key) throw new HttpError(400, 'Cadastre a chave Pix antes de gerar as cobranças.');
  const settings = settingsOf(operatorId);
  const firstDay = `${month}-01`;
  const enrollments = sql<Enrollment & { operator_id: string }>(
    `SELECT e.id, e.student_id, e.monthly_price, s.operator_id FROM enrollments e JOIN students s ON s.id = e.student_id
     WHERE s.operator_id = ? AND e.status = 'ativa' AND e.start_date <= ? AND e.end_date >= ?`, operatorId, `${month}-31`, firstDay,
  );
  let created = 0;
  for (const enrollment of enrollments) {
    if (one('invoices', 'enrollment_id = ? AND reference_month = ?', enrollment.id, month)) continue;
    const txid = invoiceTxid(month, enrollment.student_id);
    const charge = pix.createCharge(operator as Operator & { pix_key: string; pix_merchant_name: string; pix_city: string }, enrollment.monthly_price, txid);
    const invoice: Invoice = {
      id: `inv_${month.replace('-', '')}_${enrollment.student_id}`, operator_id: operatorId, enrollment_id: enrollment.id,
      student_id: enrollment.student_id, reference_month: month, amount: enrollment.monthly_price,
      due_date: dueDateFor(month, settings.due_day), status: 'pendente', pix_txid: charge.txid, pix_payload: charge.payload,
      sent_at: null, paid_at: null, paid_via: null, paid_note: null, reminders: [],
    };
    insert('invoices', invoice);
    if (send) sendInvoice(invoice);
    created++;
  }
  if (created) logEvent('cobranca', `${created} cobranças de ${monthName(month)} geradas e enviadas (${operator.trade_name})`);
  return created;
}

function sendReminder(invoice: Invoice, kind: ReminderKind | 'manual'): void {
  const student = studentOf(invoice.student_id);
  const late = invoice.status === 'atrasada' || today() > invoice.due_date;
  let body: string;
  if (late) body = msg.invoiceLate(student.name, invoice.reference_month, invoice.due_date);
  else if (invoice.due_date === today()) body = msg.invoiceBefore(invoice.amount, 'hoje');
  else if (invoice.due_date === addDays(today(), 1)) body = msg.invoiceBefore(invoice.amount, 'amanhã');
  else if (invoice.due_date === addDays(today(), 2)) body = msg.invoiceBefore(invoice.amount, 'em 2 dias');
  else body = msg.invoiceBefore(invoice.amount, `em ${fmtDayMonth(invoice.due_date)}`);
  whatsapp.send({ operator_id: invoice.operator_id, student_id: student.id, kind: 'lembrete', body, payload: pixBlock(invoice) });
  update('invoices', invoice.id, { reminders: [...invoice.reminders, { kind, sent_at: now() }] });
}

/** D-2, D0, D+1 e D+3, às 8h. Depois disso só manual. */
export function runInvoiceReminders(operatorId: string): void {
  const date = today();
  const open = all<Invoice>('invoices', "operator_id = ? AND status IN ('pendente', 'atrasada')", operatorId);
  const byKind = new Map<string, number>();
  for (const invoice of open) {
    const kind = reminderDueOn(invoice.due_date, date, invoice.reminders);
    if (!kind) continue;
    sendReminder(invoice, kind);
    byKind.set(kind, (byKind.get(kind) ?? 0) + 1);
  }
  for (const [kind, count] of byKind) {
    logEvent('lembrete', `Lembrete de cobrança ${kind.toUpperCase()} enviado para ${count} ${count === 1 ? 'aluno' : 'alunos'} (${operatorOf(operatorId).trade_name})`);
  }
}

export function markOverdue(): void {
  const date = today();
  const operators = new Map<string, number>();
  for (const invoice of all<Invoice>('invoices', "status = 'pendente' AND due_date < ?", date)) {
    if (invoiceStatusOn('pendente', invoice.due_date, date) !== 'atrasada') continue;
    update('invoices', invoice.id, { status: 'atrasada' });
    operators.set(invoice.operator_id, (operators.get(invoice.operator_id) ?? 0) + 1);
  }
  for (const [operatorId, count] of operators) {
    addAlert(operatorId, 'atraso', msg.alertLateInvoices(count));
    logEvent('atraso', `${msg.alertLateInvoices(count)} (${operatorOf(operatorId).trade_name})`);
  }
}

export function remindNow(id: string): void {
  const invoice = byId<Invoice>('invoices', id);
  if (!invoice) throw new HttpError(404, 'Cobrança não encontrada.');
  if (!['pendente', 'atrasada'].includes(invoice.status)) throw new HttpError(409, 'Essa cobrança não está em aberto.');
  sendReminder(invoice, 'manual');
  logEvent('lembrete', `Lembrete manual para ${studentOf(invoice.student_id).name}`);
}

function settleInvoice(invoice: Invoice, paidAt: string, via: 'pix' | 'manual', note?: string): string {
  const paymentId = `pay_${invoice.id}`;
  update('invoices', invoice.id, { status: 'paga', paid_at: paidAt, paid_via: via, paid_note: note ?? null });
  insert('payments', {
    id: paymentId, txid: invoice.pix_txid, amount: invoice.amount, paid_at: paidAt,
    source: via === 'pix' ? 'webhook_simulado' : 'manual', invoice_id: invoice.id, avulsa_booking_id: null,
  }, 'INSERT OR REPLACE');
  return paymentId;
}

function sendReceipt(operatorId: string, studentId: string, amount: number, description: string, paymentId: string): void {
  const student = studentOf(studentId);
  whatsapp.send({
    operator_id: operatorId, student_id: studentId, kind: 'recibo',
    body: msg.receipt(amount, description, `${studentLink(student)}/recibo/${paymentId}`), payload: { payment_id: paymentId },
  });
}

export function markPaidManually(id: string, note: string): void {
  const invoice = byId<Invoice>('invoices', id);
  if (!invoice) throw new HttpError(404, 'Cobrança não encontrada.');
  if (invoice.status === 'paga') throw new HttpError(409, 'Essa cobrança já está paga.');
  const paymentId = settleInvoice(invoice, now(), 'manual', note);
  const description = `mensalidade de ${monthName(invoice.reference_month)}`;
  sendReceipt(invoice.operator_id, invoice.student_id, invoice.amount, description, paymentId);
  logEvent('pagamento', `Baixa manual: ${studentOf(invoice.student_id).name} (${note})`);
}

export function cancelInvoice(id: string): void {
  const invoice = byId<Invoice>('invoices', id);
  if (!invoice) throw new HttpError(404, 'Cobrança não encontrada.');
  if (invoice.status === 'paga') throw new HttpError(409, 'Cobrança paga não pode ser cancelada.');
  update('invoices', id, { status: 'cancelada' });
  logEvent('cobranca', `Cobrança de ${studentOf(invoice.student_id).name} cancelada`);
}

export interface PixWebhook { txid: string; amount: number; paid_at?: string }

/**
 * O mesmo caminho de um webhook real do PSP. É idempotente: o PSP pode repetir o aviso.
 * Não confia no valor do cliente: compara com o que foi cobrado.
 */
export function handlePixWebhook({ txid, amount, paid_at }: PixWebhook): { status: string; message: string } {
  const paidAt = paid_at ? normalizeIso(paid_at) : now();
  const invoice = one<Invoice>('invoices', 'pix_txid = ?', txid);
  if (invoice) {
    if (invoice.status === 'paga') return { status: 'ja_pago', message: 'Essa cobrança já estava paga.' };
    if (invoice.status === 'cancelada') throw new HttpError(409, 'Essa cobrança foi cancelada.');
    if (Math.abs(amount - invoice.amount) > 0.001) throw new HttpError(422, `Valor diferente do cobrado (${brl(invoice.amount)}).`);
    const paymentId = settleInvoice(invoice, paidAt, 'pix');
    const description = `mensalidade de ${monthName(invoice.reference_month)}`;
    sendReceipt(invoice.operator_id, invoice.student_id, invoice.amount, description, paymentId);
    logEvent('pagamento', `${studentOf(invoice.student_id).name} pagou ${brl(invoice.amount)} no Pix (${monthName(invoice.reference_month)})`);
    return { status: 'pago', message: 'Pagamento recebido.' };
  }
  const booking = one<Booking>('avulsa_bookings', 'pix_txid = ?', txid);
  if (!booking) throw new HttpError(404, 'Nenhuma cobrança com esse identificador.');
  if (booking.status === 'pago') return { status: 'ja_pago', message: 'Essa vaga já estava paga.' };
  if (Math.abs(amount - booking.price) > 0.001) throw new HttpError(422, `Valor diferente do cobrado (${brl(booking.price)}).`);

  if (booking.status !== 'reservado' && freeSeats(lineOf(booking.line_id), booking.date, booking.kind as any) === 0) {
    addAlert(booking.operator_id, 'pix_sem_vaga', `${studentOf(booking.student_id).name} pagou ${brl(booking.price)} depois que a reserva expirou e a van encheu. Devolva o Pix.`);
    whatsapp.send({ operator_id: booking.operator_id, student_id: booking.student_id, kind: 'texto', body: msg.seatTaken() });
    return { status: 'sem_vaga', message: 'Reserva expirada e sem vaga: o operador foi avisado para devolver.' };
  }
  insert('payments', {
    id: `pay_${booking.id}`, txid, amount: booking.price, paid_at: paidAt, source: 'webhook_simulado', invoice_id: null, avulsa_booking_id: booking.id,
  }, 'INSERT OR REPLACE');
  confirmBookingPaid(booking, paidAt);
  sendReceipt(booking.operator_id, booking.student_id, booking.price, `vaga avulsa de ${fmtDayMonth(booking.date)}`, `pay_${booking.id}`);
  return { status: 'pago', message: 'Pagamento recebido.' };
}

/** Pix aberto mais antigo do aluno, para a 2ª via. */
export function openChargeOf(studentId: string) {
  const invoice = all<Invoice>('invoices', "student_id = ? AND status IN ('pendente', 'atrasada') ORDER BY due_date", studentId)[0];
  const booking = all<Booking>('avulsa_bookings', "student_id = ? AND status = 'reservado' ORDER BY id DESC", studentId)[0];
  return { invoice, booking };
}

export function sendPixAgain(studentId: string): void {
  const student = studentOf(studentId);
  const { invoice, booking } = openChargeOf(studentId);
  const operator_id = student.operator_id;
  if (booking) {
    const description = `vaga avulsa de ${fmtDayMonth(booking.date)}`;
    whatsapp.send({
      operator_id, student_id: studentId, kind: 'pix', body: msg.pixAgain(booking.price, description),
      payload: { booking_id: booking.id, pix_payload: booking.pix_payload, txid: booking.pix_txid, amount: booking.price, title: `Vaga avulsa de ${fmtDayMonth(booking.date)}` },
    });
  } else if (invoice) {
    whatsapp.send({
      operator_id, student_id: studentId, kind: 'pix',
      body: msg.pixAgain(invoice.amount, `mensalidade de ${monthName(invoice.reference_month)}`), payload: pixBlock(invoice),
    });
  } else {
    whatsapp.send({ operator_id, student_id: studentId, kind: 'texto', body: msg.noOpenInvoice() });
  }
}

export const DOCUMENT_LABELS: Record<string, string> = {
  cnh: 'CNH', crlv: 'CRLV', vistoria: 'Vistoria', seguro: 'Seguro APP e RCF',
  autorizacao_artesp: 'Autorização de fretamento da Artesp', curso_condutor: 'Curso de transporte coletivo',
};

export function ownerLabel(doc: { owner_type: string; owner_id: string }): string {
  if (doc.owner_type === 'van') return byId<{ nickname: string }>('vans', doc.owner_id)?.nickname ?? 'Van';
  return byId<{ name: string }>('drivers', doc.owner_id)?.name ?? 'Motorista';
}

/** Alertas 30, 15 e 7 dias antes do vencimento. */
export function runDocumentAlerts(operatorId: string): void {
  for (const doc of all<{ id: string; type: string; owner_type: string; owner_id: string; expires_at: string }>('documents', 'operator_id = ?', operatorId)) {
    const days = documentAlertThreshold(doc.expires_at, today());
    if (days === null) continue;
    const body = `${DOCUMENT_LABELS[doc.type] ?? doc.type} de ${ownerLabel(doc)}: lembrete, vence em ${days} dias.`;
    addAlert(operatorId, 'documento', body, doc.id);
    logEvent('documento', body);
  }
}

/** Geração do dia configurado, às 8h. */
export function runMonthlyBilling(operatorId: string): void {
  const settings = settingsOf(operatorId);
  if (Number(today().slice(8)) !== settings.invoice_day) return;
  if (isPaused(operatorId) || !operatorOf(operatorId).pix_key) return;
  generateInvoices(operatorId, monthOf(today()));
}
