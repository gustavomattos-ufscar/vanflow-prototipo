import { MapPin, Navigation } from 'lucide-react';
import { useEffect, useState } from 'react';
import { firstName, fmtDayMonth, fmtHour, fmtKm, plural, WEEKDAY_SHORT, weekdayOf } from '@vanflow/domain';
import { NavLinks } from '../components/NavLinks.tsx';
import { RoutePreview } from '../components/RoutePreview.tsx';
import { ClockChip, Empty, Loading, LogoMark, Modal, Pill, ThemeButton } from '../components/ui.tsx';
import { patch, post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';

/** Sem escolha, mostra a próxima viagem da operação: de manhã a do Edson, à tarde a do Seu Zé. */
export function Motorista() {
  const act = useAct();
  const [vanId, setVanId] = useState('');
  const [opening, setOpening] = useState(false);
  const { data } = useLive(`/operators/op_ze/driver${vanId ? `?van=${vanId}` : ''}`);

  useEffect(() => {
    document.title = 'Motorista · VanFlow';
  }, []);

  if (!data) return <Loading />;
  const { trip, route } = data;

  const header = (
    <div className="spread">
      <span className="row-gap"><LogoMark onNavy size={28} /><ClockChip now={data.now} /></span>
      <ThemeButton />
    </div>
  );
  const vanPicker = (
    <select aria-label="Van" value={vanId} onChange={(e) => setVanId(e.target.value)}>
      <option value="">Próxima viagem</option>
      {data.vans.map((v: any) => <option key={v.id} value={v.id}>{v.nickname}, {v.driver}</option>)}
    </select>
  );

  if (!trip) {
    return (
      <div className="driver">
        <div className="driver-head">{header}{vanPicker}</div>
        <div className="driver-list"><Empty title="Nenhuma viagem por agora.">Quando houver lista para os próximos dias, ela aparece aqui.</Empty></div>
      </div>
    );
  }

  const stops = route.stops.filter((s: any) => s.kind === 'aluno');
  const nextStop = stops.find((s: any) => !['embarcou', 'nao_apareceu'].includes(s.status));
  const notGoing = trip.passengers.filter((p: any) => p.status === 'nao_vai');
  const allDone = stops.length > 0 && !nextStop;
  const isIda = trip.direction === 'ida';
  const mark = (id: string, status: string) => act(() => patch(`/trip-passengers/${id}`, { status }));

  return (
    <div className="driver">
      <div className="driver-head">
        {header}
        <div>
          <p className="eyebrow">{WEEKDAY_SHORT[weekdayOf(trip.date)]} {fmtDayMonth(trip.date)} · {trip.direction} · saída {fmtHour(trip.departure_time)}</p>
          <h1>{trip.line_name}</h1>
          <p style={{ fontSize: 15 }}>{data.driver} · {fmtKm(route.km)}{route.saved_km > 0 ? `, ${fmtKm(route.saved_km)} a menos` : ''}</p>
        </div>
        {vanPicker}
        <button type="button" className="btn primary driver-go" onClick={() => setOpening(true)}><Navigation size={20} />Abrir rota</button>
      </div>
      <div className="driver-list">
        <div style={{ marginTop: 10 }}><RoutePreview route={route} height={300} /></div>
        {stops.map((s: any, i: number) => {
          const done = s.status === 'embarcou' || s.status === 'nao_apareceu';
          return (
            <article key={s.passenger_id} className={`driver-stop${s === nextStop ? ' next' : ''}${done ? ' done' : ''}`}>
              <div className="driver-stop-top">
                <span className={`stop-n${s.source === 'avulsa' ? ' av' : ''}`}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b>{firstName(s.name)}</b>
                  <small>{s.label}</small>
                </div>
                <span className="stop-eta" style={{ fontSize: 17 }}>{fmtHour(s.eta)}</span>
              </div>
              {done ? <div style={{ marginTop: 8 }}><Pill status={s.status} /></div> : (
                <>
                  {s.status === 'sem_resposta' && <div style={{ marginTop: 8 }}><Pill status="sem_resposta" /></div>}
                  {s.source === 'avulsa' && <div style={{ marginTop: 8 }}><Pill status="confirmado" source="avulsa" /></div>}
                  <div className="driver-btns">
                    <button type="button" className="btn dark" onClick={() => mark(s.passenger_id, 'embarcou')}>Embarcou</button>
                    <button type="button" className="btn quiet" onClick={() => mark(s.passenger_id, 'nao_apareceu')}>Não apareceu</button>
                  </div>
                </>
              )}
            </article>
          );
        })}
        {notGoing.length > 0 && (
          <details className="driver-skip">
            <summary>{plural(notGoing.length, 'aluno não vai', 'alunos não vão')}</summary>
            <ul>{notGoing.map((p: any) => <li key={p.id}>{p.first_name} · {p.neighborhood}</li>)}</ul>
          </details>
        )}
        {allDone && (
          <button type="button" className="btn primary driver-go" style={{ marginTop: 12 }} onClick={() => act(() => post(`/trips/${trip.id}/finish`), 'Viagem concluída.')}>
            <MapPin size={20} />{isIda ? 'Cheguei na faculdade' : 'Terminei a volta'}
          </button>
        )}
      </div>
      <div className="driver-foot">{plural(trip.summary.going, 'vai', 'vão')} · {plural(trip.summary.free, 'vaga livre', 'vagas livres')}</div>
      {opening && (
        <Modal title="Abrir rota" onClose={() => setOpening(false)}>
          <p className="muted small" style={{ marginBottom: 10 }}>A VanFlow ordena as paradas. O Google Maps e o Waze navegam, com trânsito em tempo real.</p>
          <NavLinks route={route} nextOrder={nextStop?.order} />
        </Modal>
      )}
    </div>
  );
}
