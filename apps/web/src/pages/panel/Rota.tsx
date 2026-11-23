import { useNavigate, useParams } from 'react-router-dom';
import { firstName, fmtHour, fmtKm, fmtWeekdayDate, plural } from '@vanflow/domain';
import { NavLinks } from '../../components/NavLinks.tsx';
import { RoutePreview } from '../../components/RoutePreview.tsx';
import { Empty, ErrorNote, Loading, PageHead, Pill, Stat } from '../../components/ui.tsx';
import { useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

export function hoursText(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h${String(m).padStart(2, '0')}` : `${m} min`;
}

export function Rota() {
  const { tripId } = useParams();
  const navigate = useNavigate();
  const { operatorId } = useOperator();
  const options = useLive<any[]>(`/operators/${operatorId}/routes`);
  const firstOpen = options.data?.find((o) => !['concluida'].includes(o.status));
  const selected = tripId ?? firstOpen?.id ?? null;
  const { data, error } = useLive(selected ? `/trips/${selected}` : null);

  if (error) return <ErrorNote text={error} />;
  if (options.data && !selected) {
    return (
      <>
        <PageHead eyebrow="Rota do dia" title="Rota" />
        <div className="card"><Empty title="Nenhuma viagem nos próximos dias.">Assim que houver alunos na lista, a ordem das paradas aparece aqui.</Empty></div>
      </>
    );
  }
  if (!data) return <Loading />;
  const { route } = data;
  const students = route.stops.filter((s: any) => s.kind === 'aluno');
  let number = 0;

  return (
    <>
      <PageHead eyebrow={`Rota do dia · ${fmtWeekdayDate(route.date)} · ${route.direction}`} title={route.line_name} actions={
        <select className="input" style={{ width: 'auto', maxWidth: 320 }} aria-label="Viagem" value={selected ?? ''} onChange={(e) => navigate(`/painel/rota/${e.target.value}`)}>
          {options.data?.map((o) => <option key={o.id} value={o.id}>{fmtWeekdayDate(o.date)} · {fmtHour(o.departure_time)} · {o.direction} · {o.line_name}</option>)}
        </select>
      }>
        A VanFlow ordena as paradas de quem vai. A navegação fica com o app que você já usa.
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Distância" value={fmtKm(route.km)} />
        <Stat label="Tempo" value={hoursText(route.minutes)} hint={`saída ${fmtHour(route.departure_time)}`} />
        <Stat label="Paradas" value={students.length} hint={route.skipped.length ? `${plural(route.skipped.length, 'casa a menos', 'casas a menos')}` : 'todos os previstos'} />
        <Stat label="Economia" value={fmtKm(route.saved_km)} hint={`rota de cabeça: ${fmtKm(route.habit_km)}`} tone="ok" />
      </div>
      <div className="with-aside wide-aside">
        <div className="stack" style={{ minWidth: 0 }}>
          <RoutePreview route={route} />
          <section className="card">
            <h3 className="card-title">Abrir a rota</h3>
            {students.length ? <NavLinks route={route} /> : <p className="muted small">Sem paradas para navegar nesta viagem.</p>}
          </section>
        </div>
        <section className="card">
          <h3 className="card-title">Ordem das paradas</h3>
          {route.stops.map((s: any) => {
            if (s.kind === 'aluno') number += 1;
            return (
              <div key={s.order} className="stop-row">
                <span className={`stop-n${s.source === 'avulsa' ? ' av' : ''}${s.kind !== 'aluno' ? ' end' : ''}`}>{s.kind === 'aluno' ? number : s.kind === 'saida' ? 'S' : 'F'}</span>
                <span className="stop-main">{s.kind === 'aluno' ? firstName(s.name) : s.name}<small>{s.label}</small></span>
                {s.status && s.status !== 'confirmado' && <Pill status={s.status} />}
                {s.source === 'avulsa' && s.status === 'confirmado' && <Pill status="confirmado" source="avulsa" />}
                <span className="stop-eta">{fmtHour(s.eta)}</span>
              </div>
            );
          })}
          {route.skipped.length > 0 && (
            <p className="muted small" style={{ marginTop: 10 }}>Fora da rota: {route.skipped.map((s: any) => firstName(s.name)).join(', ')}.</p>
          )}
        </section>
      </div>
    </>
  );
}
