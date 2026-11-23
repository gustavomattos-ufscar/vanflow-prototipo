import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { brl, firstName, fmtClock, fmtDate, fmtHour, fmtWeekdayDate, monthName, plural, WEEKDAY_SHORT } from '@vanflow/domain';
import { RouteMap } from '../components/RouteMap.tsx';
import { Empty, ErrorNote, Loading, LogoMark, Pill, PixPanel, ThemeButton } from '../components/ui.tsx';
import { WeekGrid } from '../components/WeekGrid.tsx';
import { post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';

const STATUS_TEXT: Record<string, string> = {
  previsto: 'Você está na lista pela sua grade.', aguardando: 'Falta você responder.', confirmado: 'Você confirmou. Até lá!', sem_resposta: 'Você não respondeu, então conta como vai.',
  nao_vai: 'Você avisou que não vai.', reservado: 'Sua reserva espera o Pix.', embarcou: 'Boa viagem!',
};

function VanStatus({ van }: { van: any }) {
  const { route, elapsed, minutes_to_me: toMe, my_stop: stop } = van;
  let text = `Saída às ${fmtHour(route.departure_time)}.`;
  if (van.started && elapsed <= route.minutes) text = 'A van está na estrada.';
  if (van.started && stop && toMe > 0) text = `A van está a ${plural(toMe, 'minuto', 'minutos')} do seu ponto.`;
  if (van.started && stop && toMe <= 0) text = 'A van já passou pelo seu ponto.';
  return (
    <section className="card stack" style={{ gap: 10 }}>
      <div className="spread"><h2>Onde está a van</h2><span className="pill p-warn">{route.direction}</span></div>
      <p style={{ fontWeight: 600 }}>{text}</p>
      <RouteMap stops={route.stops} skipped={[]} elapsed={elapsed} highlightStudent={stop?.order} />
    </section>
  );
}

export function AlunoPage() {
  const { token } = useParams();
  const act = useAct();
  const { data, error } = useLive(`/aluno/${token}`);
  const [kind, setKind] = useState<'ida_volta' | 'so_ida' | 'so_volta'>('ida_volta');

  useEffect(() => {
    document.title = 'Minha van · VanFlow';
  }, []);

  if (error) return <div className="student-page"><ErrorNote text={error} /></div>;
  if (!data) return <Loading />;
  const { student, operator, enrollment, schedule, next_trip: next, open_invoice: invoice, open_booking: booking, payments, offers, line, van } = data;
  const canAnswer = next && next.source === 'plano' && ['planejada', 'confirmacoes_enviadas', 'lista_fechada', 'em_andamento'].includes(next.status) && !['embarcou'].includes(next.p_status);
  const respond = (answer: string) => act(() => post(`/aluno/${token}/respond`, { line_id: next.line_id, date: next.date, answer }), 'Resposta registrada.');
  const pay = (txid: string, amount: number) => act(() => post('/webhooks/pix', { txid, amount }), 'Pagamento recebido.');

  return (
    <main className="student-page">
      <div className="student-top">
        <span className="row-gap"><LogoMark size={28} /><b>{operator.trade_name}</b></span>
        <ThemeButton />
      </div>

      <section className="student-hero">
        <p className="eyebrow">Oi, {firstName(student.name)}</p>
        {next ? (
          <>
            <h1>{fmtWeekdayDate(next.date)}, saída {fmtHour(next.departure_time)}</h1>
            <p style={{ marginTop: 6 }}>{student.pickup_label}</p>
            <p style={{ marginTop: 6, fontWeight: 600 }}>{STATUS_TEXT[next.p_status] ?? ''}{next.reason ? ` ${next.reason}.` : ''}</p>
            {canAnswer && (
              <div className="student-answer">
                <button type="button" className="btn primary" disabled={next.p_status === 'confirmado'} onClick={() => respond('vai')}>Vou</button>
                <button type="button" className="btn ghost" disabled={next.p_status === 'nao_vai'} onClick={() => respond('nao_vai')}>Não vou</button>
              </div>
            )}
          </>
        ) : <h1>Nenhuma viagem nos próximos dias.</h1>}
      </section>

      {booking && (
        <section className="card stack" style={{ gap: 10 }}>
          <h2>Sua reserva de {fmtWeekdayDate(booking.date)}</h2>
          <p className="small muted">Pague até {fmtClock(booking.hold_until)} para garantir a vaga.</p>
          <PixPanel payload={booking.pix_payload} amount={booking.price} title="Vaga avulsa">
            <button type="button" className="btn demo small" onClick={() => pay(booking.pix_txid, booking.price)}>Simular pagamento</button>
          </PixPanel>
        </section>
      )}

      {invoice && (
        <section className="card stack" style={{ gap: 10 }}>
          <div className="spread"><h2>Mensalidade de {monthName(invoice.reference_month)}</h2><Pill status={invoice.status} /></div>
          <p className="small muted">Vencimento em {fmtDate(invoice.due_date)}.</p>
          <PixPanel payload={invoice.pix_payload} amount={invoice.amount} title="2ª via do Pix">
            <button type="button" className="btn demo small" onClick={() => pay(invoice.pix_txid, invoice.amount)}>Simular pagamento</button>
          </PixPanel>
        </section>
      )}

      {van && <VanStatus van={van} />}

      <section className="card stack" style={{ gap: 10 }}>
        <h2>Minha grade</h2>
        {enrollment && <p className="small">Plano de {enrollment.plan_days} dias por semana ({enrollment.weekdays.map((d: number) => WEEKDAY_SHORT[d]).join(', ')}), {brl(enrollment.monthly_price)} por mês.</p>}
        {!enrollment && <p className="small muted">Você compra vaga avulsa quando precisa.</p>}
        <WeekGrid entries={schedule} planDays={enrollment?.weekdays} />
      </section>

      <section className="card stack" style={{ gap: 10 }}>
        <h2>Comprar vaga avulsa</h2>
        {line && (
          <div className="segmented" role="group" aria-label="Tipo de vaga">
            <button type="button" aria-pressed={kind === 'ida_volta'} onClick={() => setKind('ida_volta')}>Ida e volta</button>
            <button type="button" aria-pressed={kind === 'so_ida'} onClick={() => setKind('so_ida')}>Só ida</button>
            <button type="button" aria-pressed={kind === 'so_volta'} onClick={() => setKind('so_volta')}>Só volta</button>
          </div>
        )}
        {offers.length === 0 ? <Empty title="Sem vaga livre agora.">Assim que abrir, avisamos no WhatsApp.</Empty> : (
          <div className="dash-list">
            {offers.map((o: any) => (
              <div key={`${o.line_id}${o.date}`} className="dash-row">
                <span>{fmtWeekdayDate(o.date)}, saída {fmtHour(o.departure_time)}<small>{plural(o.free, 'vaga', 'vagas')} · {brl(kind === 'ida_volta' ? o.price_round : o.price_one_way)}</small></span>
                <button type="button" className="btn dark small" onClick={() => act(() => post(`/aluno/${token}/book`, { line_id: o.line_id, date: o.date, kind }), 'Vaga reservada por 30 minutos.')}>Reservar</button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card">
        <h2 className="card-title">Pagamentos</h2>
        {payments.length === 0 ? <p className="muted small">Nenhum pagamento ainda.</p> : (
          <div className="dash-list">
            {payments.map((p: any) => (
              <div key={p.id} className="dash-row">
                <span>{p.reference_month ? `Mensalidade de ${monthName(p.reference_month)}` : `Vaga avulsa de ${fmtWeekdayDate(p.booking_date)}`}<small>{fmtDate(p.paid_at)}</small></span>
                <span className="row-gap"><span className="mono small">{brl(p.amount)}</span><Link className="small" to={`/a/${token}/recibo/${p.id}`}>Recibo</Link></span>
              </div>
            ))}
          </div>
        )}
      </section>
      <p className="muted small" style={{ textAlign: 'center' }}>VanFlow · Dúvidas? Fale com {operator.trade_name}: {operator.whatsapp}</p>
    </main>
  );
}

export function ReciboPage() {
  const { token, paymentId } = useParams();
  const { data, error } = useLive(`/aluno/${token}/recibo/${paymentId}`);
  if (error) return <div className="receipt"><ErrorNote text={error} /></div>;
  if (!data) return <Loading />;
  const { payment } = data;
  return (
    <main className="receipt">
      <section className="card stack">
        <div className="spread"><span className="row-gap"><LogoMark size={28} /><b>Recibo</b></span><Pill status="paga" /></div>
        <p className="pix-amount">{brl(payment.amount)}</p>
        <div className="dash-list">
          <div className="dash-row"><span>Pagador</span><b>{data.student_name}</b></div>
          <div className="dash-row"><span>Recebedor</span><b>{data.operator}</b></div>
          <div className="dash-row"><span>Referente a</span><b>{data.month ? `Mensalidade de ${monthName(data.month)}` : data.description}</b></div>
          <div className="dash-row"><span>Data</span><b>{fmtDate(payment.paid_at)}, {fmtClock(payment.paid_at)}</b></div>
          <div className="dash-row"><span>Identificador</span><b className="mono small">{payment.txid}</b></div>
        </div>
        <div className="row-gap no-print">
          <button type="button" className="btn primary small" onClick={() => window.print()}>Imprimir</button>
          <Link className="btn ghost small" to={`/a/${token}`}>Voltar</Link>
        </div>
      </section>
    </main>
  );
}
