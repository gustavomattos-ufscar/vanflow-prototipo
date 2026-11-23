import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, fmtClock, fmtDate, fmtWeekdayDate, firstName, plural, timeOf } from '@vanflow/domain';
import { TripCard } from '../../components/TripCard.tsx';
import { Empty, ErrorNote, Loading, PageHead, Pill } from '../../components/ui.tsx';
import { useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

/** Depois das 18h, o que importa é a lista de amanhã. */
const defaultDay = (now: string) => (timeOf(now) >= '18:00' ? 1 : 0);

export function HojeBoard({ operatorId, vanId, compact, autoDay }: { operatorId: string; vanId?: string; compact?: boolean; autoDay?: boolean }) {
  const [chosen, setChosen] = useState<number | null>(null);
  const live = useLive(`/operators/${operatorId}/today${vanId ? `?van=${vanId}` : ''}`);
  const data = live.data;
  if (live.error) return <ErrorNote text={live.error} />;
  if (!data) return <Loading />;
  const index = autoDay || chosen === null ? defaultDay(data.now) : chosen;
  const day = data.days[index];
  return (
    <>
      <div className="segmented day-tabs" role="group" aria-label="Dia">
        {data.days.map((d: any, i: number) => (
          <button key={d.date} type="button" aria-pressed={i === index} onClick={() => setChosen(i)}>{i === 0 ? 'Hoje' : 'Amanhã'} ({fmtWeekdayDate(d.date)})</button>
        ))}
      </div>
      {day.no_service && <p className="note" style={{ marginBottom: 12 }}>{day.no_service}</p>}
      {!day.no_service && day.cards.length === 0 && (
        <div className="card"><Empty title="Nenhuma viagem neste dia.">Nenhum aluno tem aula neste dia pela grade. Se faltar alguém, confira a grade e o plano em Alunos.</Empty></div>
      )}
      {day.cards.map((card: any) => <TripCard key={`${card.line_id}${day.date}`} card={card} today={data.today} compact={compact} />)}
    </>
  );
}

export function Hoje() {
  const { operatorId, vanId } = useOperator();
  const live = useLive(`/operators/${operatorId}/today${vanId ? `?van=${vanId}` : ''}`);
  const data = live.data;
  const expired = data?.documents.filter((d: any) => d.alert.level === 'vencido') ?? [];

  return (
    <>
      <PageHead eyebrow="Lista do dia" title="Quem vai na van" />
      {expired.length > 0 && (
        <p className="error-note" style={{ marginBottom: 14 }}>
          {expired.map((d: any) => `${d.label} de ${firstName(d.owner)}: ${d.alert.label}`).join(' · ')}. <Link to="/painel/documentos">Ver documentos</Link>
        </p>
      )}
      <div className="with-aside">
        <div style={{ minWidth: 0 }}><HojeBoard operatorId={operatorId} vanId={vanId} /></div>
        {data && (
          <aside className="stack">
            {data.alerts.length > 0 && (
              <section className="card">
                <h3 className="card-title">Avisos</h3>
                <div className="dash-list">
                  {data.alerts.map((a: any) => <div key={a.id} className="dash-row"><span>{a.body}<small>{fmtWeekdayDate(a.created_at)}, {fmtClock(a.created_at)}</small></span></div>)}
                </div>
              </section>
            )}
            <section className="card">
              <div className="card-title"><h3>Cobranças atrasadas</h3><Link to="/painel/cobrancas" className="small">Ver todas</Link></div>
              {data.late_invoices.length === 0 ? <p className="muted small">Nenhuma cobrança atrasada. Bom mês!</p> : (
                <div className="dash-list">
                  {data.late_invoices.slice(0, 4).map((i: any) => (
                    <div key={i.id} className="dash-row"><span>{i.name}<small>{plural(i.days_late, 'dia de atraso', 'dias de atraso')}</small></span><b className="mono">{brl(i.amount)}</b></div>
                  ))}
                </div>
              )}
            </section>
            <section className="card">
              <div className="card-title"><h3>Documentos</h3><Link to="/painel/documentos" className="small">Ver todos</Link></div>
              {data.documents.length === 0 ? <p className="muted small">Nenhum vencimento nos próximos 30 dias.</p> : (
                <div className="dash-list">
                  {data.documents.map((d: any) => (
                    <div key={d.id} className="dash-row"><span>{d.label}<small>{d.owner}, {fmtDate(d.expires_at)}</small></span><Pill status={d.alert.level} label={d.alert.label} /></div>
                  ))}
                </div>
              )}
            </section>
            <section className="card">
              <div className="card-title"><h3>Vagas avulsas hoje</h3><Link to="/painel/avulsas" className="small">Ver vagas</Link></div>
              <p className="small">{data.avulsas_today.n === 0 ? 'Nenhuma vaga vendida hoje.' : `${plural(data.avulsas_today.n, 'vaga vendida', 'vagas vendidas')}: ${brl(data.avulsas_today.total)}.`}</p>
            </section>
            <section className="card">
              <div className="card-title"><h3>Últimas mensagens</h3><Link to="/painel/mensagens" className="small">Ver todas</Link></div>
              {data.messages.length === 0 ? <p className="muted small">Ninguém respondeu ainda. As confirmações saem às 21h.</p> : (
                <div className="feed">
                  {data.messages.map((m: any) => (
                    <div key={m.id} className={`feed-item pop${m.direction === 'in' ? ' me' : ''}`}>
                      <time>{fmtClock(m.created_at)}</time>
                      <b>{m.direction === 'in' ? firstName(m.name ?? '') : `VanFlow para ${firstName(m.name ?? '')}`}</b><br />{m.body.length > 88 ? `${m.body.slice(0, 88)}...` : m.body}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </aside>
        )}
      </div>
    </>
  );
}
