import { Megaphone } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, fmtDayMonth, fmtWeekdayDate, monthName, plural, WEEKDAY_SHORT, weekdayOf } from '@vanflow/domain';
import { Empty, ErrorNote, Loading, Modal, PageHead, Pill, Stat } from '../../components/ui.tsx';
import { post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

const tripIdOf = (lineId: string, date: string) => `trip_${lineId.replace(/^line_/, '')}_${date}_ida`;

function OfferModal({ group, onClose }: { group: any; onClose: () => void }) {
  const act = useAct();
  const candidates = group.people.filter((p: any) => !p.offered);
  const [picked, setPicked] = useState<string[]>(candidates.slice(0, 5).map((p: any) => p.id));
  const send = async () => {
    const done = await act(() => post(`/trips/${tripIdOf(group.line_id, group.date)}/offer`, { student_ids: picked }), 'Oferta enviada no WhatsApp.');
    if (done) onClose();
  };
  return (
    <Modal title={`Oferecer vaga de ${fmtWeekdayDate(group.date)}`} onClose={onClose}>
      <p className="muted small" style={{ marginBottom: 8 }}>{group.line_name}. Primeiro a pagar leva.</p>
      <div className="dash-list">
        {candidates.map((p: any) => (
          <label key={p.id} className="dash-row check">
            <span className="row-gap"><input type="checkbox" checked={picked.includes(p.id)} onChange={(e) => setPicked(e.target.checked ? [...picked, p.id] : picked.filter((id) => id !== p.id))} />{p.name}</span>
            <small className="muted">{p.last_purchase ? `comprou em ${fmtDayMonth(p.last_purchase)}` : 'nunca comprou'}</small>
          </label>
        ))}
      </div>
      <div className="modal-actions"><button type="button" className="btn primary" disabled={!picked.length} onClick={send}>Enviar para {picked.length}</button></div>
    </Modal>
  );
}

export function Avulsas() {
  const act = useAct();
  const { operatorId, vanId } = useOperator();
  const { data, error } = useLive(`/operators/${operatorId}/avulsas`);
  const [offering, setOffering] = useState<any>(null);
  if (error) return <ErrorNote text={error} />;
  if (!data) return <Loading />;
  const grid = data.grid.filter((g: any) => !vanId || g.van_id === vanId);
  const lines = new Set(grid.map((g: any) => g.line_id));
  const openSeats = grid.reduce((n: number, g: any) => n + g.days.reduce((m: number, d: any) => m + d.free, 0), 0);

  return (
    <>
      <PageHead eyebrow="Vagas avulsas" title="O lugar de quem faltou vira receita">
        Quando um aluno responde "Não vou", o lugar aparece aqui e pode ser vendido pelo WhatsApp ou pela página do aluno.
      </PageHead>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label={`Receita em ${monthName(data.month)}`} value={brl(data.revenue.total)} hint={plural(data.revenue.n, 'vaga vendida', 'vagas vendidas')} tone="ok" />
        <Stat label="Lugares à venda" value={openSeats} hint="nos próximos 7 dias" />
        <Stat label="Interessados" value={data.interested.reduce((n: number, g: any) => n + g.people.length, 0)} hint="na próxima viagem com vaga" />
      </div>
      <section className="card" style={{ marginBottom: 16 }}>
        <h2 className="card-title">Próximos 7 dias</h2>
        <div className="table-wrap">
          <div className="slot-grid">
            <span />
            {data.days.map((date: string) => <span key={date} className="slot-head">{WEEKDAY_SHORT[weekdayOf(date)]} {fmtDayMonth(date)}</span>)}
            {grid.map((row: any) => (
              <div key={row.line_id} style={{ display: 'contents' }}>
                <span className="small" style={{ alignSelf: 'center', fontWeight: 600 }}>{row.line_name}<br /><span className="muted">{brl(row.price_round)}</span></span>
                {row.days.map((d: any) => {
                  if (!d.has_trip) return <div key={d.date} className="slot off"><span>sem viagem</span></div>;
                  if (d.closed) return <div key={d.date} className="slot off"><span>lista fechada</span>{d.sold > 0 && <span>{d.sold} vendida{d.sold > 1 ? 's' : ''}</span>}</div>;
                  return (
                    <div key={d.date} className={`slot${d.free > 0 ? ' open' : ''}`}>
                      <b>{d.free}</b><span>{d.free === 1 ? 'vaga' : 'vagas'}</span>
                      {(d.sold > 0 || d.held > 0) && <span className="small">{d.sold > 0 ? `${d.sold} vendida${d.sold > 1 ? 's' : ''}` : ''}{d.held > 0 ? ` ${d.held} reservada${d.held > 1 ? 's' : ''}` : ''}</span>}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </section>
      <div className="grid g2">
        <section className="card">
          <h2 className="card-title">Interessados</h2>
          {data.interested.filter((g: any) => lines.has(g.line_id)).map((group: any) => (
            <div key={group.line_id} style={{ marginBottom: 12 }}>
              <div className="spread">
                <span className="small"><b>{group.line_name}</b>{group.date ? `, ${fmtWeekdayDate(group.date)}` : ''}</span>
                {group.people.some((p: any) => !p.offered) && <button type="button" className="btn quiet small" onClick={() => setOffering(group)}><Megaphone size={16} />Oferecer vaga</button>}
              </div>
              {!group.date ? <p className="muted small">Nenhuma vaga aberta nos próximos dias.</p> : group.people.length === 0 ? <p className="muted small">Ninguém na lista de interesse.</p> : (
                <div className="dash-list">
                  {group.people.map((p: any) => (
                    <div key={p.id} className="dash-row">
                      <span><Link to={`/painel/alunos/${p.id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{p.name}</Link><small>{p.neighborhood}{p.last_purchase ? `, última compra em ${fmtDayMonth(p.last_purchase)}` : ''}</small></span>
                      {p.offered && <span className="pill p-ok">oferta enviada</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
        <section className="card">
          <h2 className="card-title">Reservas e vendas</h2>
          {data.bookings.length === 0 ? <Empty title="Nenhuma venda ainda.">A primeira vaga vendida aparece aqui.</Empty> : (
            <div className="dash-list">
              {data.bookings.slice(0, 12).map((b: any) => (
                <div key={b.id} className="dash-row">
                  <span>{b.name}<small>{fmtWeekdayDate(b.date)} · {b.line_name}</small></span>
                  <span className="row-gap">
                    <span className="mono small">{brl(b.price)}</span>
                    <Pill status={b.status} />
                    {b.status === 'reservado' && <button type="button" className="btn quiet small" onClick={() => act(() => post(`/avulsas/${b.id}/cancel`), 'Reserva cancelada.')}>Cancelar</button>}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {offering && <OfferModal group={offering} onClose={() => setOffering(null)} />}
    </>
  );
}
