/** O cartão mais importante do produto: "11 de 14 vão". */
import { Bell, Lock, Megaphone, Printer, Route, Send } from 'lucide-react';
import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fmtDayMonth, fmtHour, plural, timeOf, WEEKDAY_SHORT, weekdayOf } from '@vanflow/domain';
import { post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import { Pill } from './ui.tsx';

function SeatBar({ s }: { s: any }) {
  const parts: Array<[number, string, string]> = [
    [s.confirmed, 'var(--teal)', 'confirmados'], [s.avulsos, 'var(--amber)', 'avulsos'], [s.reserved, 'var(--amber-soft)', 'reservas'],
    [s.pending + s.noAnswer, 'var(--muted)', 'sem resposta'], [s.notGoing, 'var(--amber-ink)', 'não vão'],
  ];
  const capacity = Math.max(s.capacity, s.total + s.reserved);
  return (
    <div className="seat-bar" role="img" aria-label={`${s.confirmed} confirmados, ${s.avulsos} avulsos, ${s.pending + s.noAnswer} sem resposta, ${s.notGoing} não vão, ${s.free} lugares livres`}>
      {parts.filter(([n]) => n > 0).map(([n, color, label]) => <i key={label} style={{ width: `${(n / capacity) * 100}%`, background: color }} />)}
    </div>
  );
}

function summaryText(s: any): string {
  const parts = [
    plural(s.confirmed, 'confirmado', 'confirmados'),
    s.avulsos ? plural(s.avulsos, 'avulso', 'avulsos') : '',
    s.reserved ? plural(s.reserved, 'reserva', 'reservas') : '',
    s.pending ? plural(s.pending, 'aguardando', 'aguardando') : '',
    s.noAnswer ? `${s.noAnswer} sem resposta` : '',
    s.notGoing ? `${s.notGoing} não ${s.notGoing === 1 ? 'vai' : 'vão'}` : '',
    plural(s.free, 'lugar livre', 'lugares livres'),
  ];
  return parts.filter(Boolean).join(' · ');
}

const dayLabel = (date: string, today: string) => {
  const prefix = date === today ? 'Hoje' : 'Amanhã';
  return `${prefix} · ${WEEKDAY_SHORT[weekdayOf(date)]} ${fmtDayMonth(date)}`;
};

export function TripCard({ card, today, compact }: { card: any; today: string; compact?: boolean }) {
  const act = useAct();
  const [direction, setDirection] = useState<'ida' | 'volta'>('ida');
  const seen = useRef(new Map<string, string>());
  const trip = card[direction] ?? card.ida ?? card.volta;
  const s = trip.summary;
  const notSent = trip.status === 'planejada';
  const open = ['planejada', 'confirmacoes_enviadas'].includes(trip.status);

  const changed = (id: string, status: string) => {
    const before = seen.current.get(id);
    seen.current.set(id, status);
    return before !== undefined && before !== status;
  };

  const released: string[] = trip.released ?? [];
  const finished = trip.status === 'concluida';

  return (
    <article className="trip-card">
      <div className="trip-top">
        <div style={{ minWidth: 0 }}>
          <p className="eyebrow">{dayLabel(trip.date, today)} · {direction === 'ida' ? 'saída' : 'volta'} {fmtHour(trip.departure_time)}</p>
          <h2 style={{ marginTop: 4 }}>{card.line_name}</h2>
          <p className="muted small">{card.van}</p>
        </div>
        <div className="row-gap">
          {finished && <span className="pill p-ok">viagem feita</span>}
          {trip.status === 'lista_fechada' && <span className="pill p-neu">lista fechada</span>}
          {trip.status === 'em_andamento' && <span className="pill p-warn">na estrada</span>}
          {card.ida && card.volta && (
            <div className="segmented" role="group" aria-label="Ida ou volta">
              <button type="button" aria-pressed={direction === 'ida'} onClick={() => setDirection('ida')}>Ida</button>
              <button type="button" aria-pressed={direction === 'volta'} onClick={() => setDirection('volta')}>Volta</button>
            </div>
          )}
        </div>
      </div>

      <div className="big-count" aria-live="polite">
        {notSent ? <>{s.total}<span>previstos pela grade</span></> : <>{s.going}<span>de {s.total} vão</span></>}
      </div>
      <SeatBar s={s} />
      <p className="seat-note">{notSent
        ? `A grade já sabe: ${plural(s.total, 'aluno tem', 'alunos têm')} aula neste dia. ${plural(s.free, 'lugar sobrando', 'lugares sobrando')} na van. As confirmações saem às ${fmtHour(timeOf(trip.confirmation_at))} da véspera.`
        : summaryText(s)}</p>
      {!notSent && open && s.free > 0 && released.length > 0 && (
        <p className="seat-free pop">
          {plural(s.free, 'vaga livre', 'vagas livres')}: {released.length === 1 ? `${released[0]} liberou o lugar` : `${released.length} alunos liberaram o lugar`}
        </p>
      )}

      {!compact || !notSent ? (
        <div className="pax-list">
          {trip.passengers.map((p: any) => (
            <div key={p.id} className={`pax${changed(p.id, p.status) ? ' flash' : ''}`}>
              <span style={{ minWidth: 0 }}>
                <Link to={`/painel/alunos/${p.student_id}`} style={{ textDecoration: 'none', fontWeight: 600 }}>{p.first_name} · {p.neighborhood}</Link>
                <small>{p.faculty}{p.class_start ? `, ${fmtHour(p.class_start)}` : ''}</small>
                {p.reason && <em>{p.reason}</em>}
              </span>
              <Pill status={p.status} source={p.source} />
            </div>
          ))}
        </div>
      ) : null}

      {!finished && (
        <div className="trip-actions">
          {notSent && s.total > 0 && (
            <button type="button" className="btn primary small" onClick={() => act(() => post(`/trips/${trip.id}/send-confirmations`), 'Confirmações enviadas.')}><Send size={16} />Mandar confirmações agora</button>
          )}
          {trip.status === 'confirmacoes_enviadas' && s.pending > 0 && (
            <button type="button" className="btn quiet small" onClick={() => act(() => post(`/trips/${trip.id}/remind`), 'Lembrete enviado.')}><Bell size={16} />Lembrar quem não respondeu</button>
          )}
          {open && s.total > 0 && (
            <button type="button" className="btn quiet small" onClick={() => act(() => post(`/trips/${trip.id}/close`), 'Lista fechada.')}><Lock size={16} />Fechar lista</button>
          )}
          {card.free_to_sell > 0 && card.interested > 0 && (
            <button type="button" className="btn quiet small" onClick={() => act(() => post(`/trips/${trip.id}/offer`), 'Oferta enviada para os interessados.')}><Megaphone size={16} />Oferecer vagas livres</button>
          )}
          <Link className="btn dark small" to={`/painel/rota/${trip.id}`}><Route size={16} />Ver rota</Link>
          <button type="button" className="btn quiet small no-print" onClick={() => window.print()}><Printer size={16} />Imprimir lista</button>
        </div>
      )}
    </article>
  );
}
