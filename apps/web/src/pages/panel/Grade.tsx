import { Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { fmtDate, fmtWeekdayDate, WEEKDAY_SHORT } from '@vanflow/domain';
import { ErrorNote, Field, Loading, Modal, PageHead } from '../../components/ui.tsx';
import { del, post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

/** Mapa de calor em um tom só: quanto mais cheia a van, mais escuro. */
function heatStyle(count: number, seats: number) {
  const ratio = Math.min(1, count / seats);
  if (count === 0) return { background: 'var(--surface-2)', color: 'var(--muted)' };
  return {
    background: `color-mix(in srgb, var(--amber) ${Math.round(14 + ratio * 86)}%, var(--surface))`,
    color: ratio > 0.45 ? '#13233A' : 'var(--ink)',
  };
}

function ExceptionModal({ onClose }: { onClose: () => void }) {
  const act = useAct();
  const { operatorId, shell } = useOperator();
  const [kind, setKind] = useState<'sem_aula' | 'viagem_cancelada'>('sem_aula');
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const body = { ...data, operator_id: operatorId, kind, scope: kind === 'sem_aula' ? 'faculdade' : 'linha' };
    if (await act(() => post('/exceptions', body), 'Exceção cadastrada. A lista já mudou.')) onClose();
  };
  return (
    <Modal title="Nova exceção" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <div className="segmented" role="group" aria-label="Tipo">
          <button type="button" aria-pressed={kind === 'sem_aula'} onClick={() => setKind('sem_aula')}>Faculdade sem aula</button>
          <button type="button" aria-pressed={kind === 'viagem_cancelada'} onClick={() => setKind('viagem_cancelada')}>Viagem cancelada</button>
        </div>
        <Field label="Data"><input type="date" name="date" required /></Field>
        <Field label={kind === 'sem_aula' ? 'Faculdade' : 'Linha'}>
          <select name="ref_id" required>
            {(kind === 'sem_aula' ? shell.faculties : shell.lines).map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </Field>
        <Field label="Observação"><input name="note" placeholder="Semana de provas" /></Field>
        <div className="modal-actions"><button type="submit" className="btn primary">Salvar</button></div>
      </form>
    </Modal>
  );
}

export function Grade() {
  const act = useAct();
  const { operatorId, vanId, shell } = useOperator();
  const { data, error } = useLive(`/operators/${operatorId}/grade`);
  const [adding, setAdding] = useState(false);
  if (error) return <ErrorNote text={error} />;
  if (!data) return <Loading />;
  const vanName = shell.vans.find((v: any) => v.id === vanId)?.nickname;
  const lines = data.lines.filter((l: any) => !vanName || l.van === vanName);

  return (
    <>
      <PageHead eyebrow="Grade de aulas" title="A semana pela grade">
        O aluno informa a grade uma vez. A VanFlow já sabe quem vai em cada dia, antes de qualquer mensagem.
      </PageHead>
      <div className="stack">
        {lines.map((line: any) => (
          <section key={line.id} className="card">
            <div className="card-title">
              <div><h2>{line.name}</h2><p className="muted small">{line.van} · {line.seats} lugares</p></div>
            </div>
            <div className="heat">
              {line.days.map((d: any) => <span key={d.weekday} className="heat-day">{WEEKDAY_SHORT[d.weekday]}</span>)}
              {line.days.map((d: any) => (
                <div key={d.weekday} className="heat-cell" style={heatStyle(d.count, line.seats)} title={d.names.join(', ')}>
                  <b>{d.count}</b><span>de {line.seats} lugares</span>
                </div>
              ))}
            </div>
            <p className="note" style={{ marginTop: 12 }}>{line.insight}</p>
          </section>
        ))}
        <section className="card">
          <div className="card-title">
            <h2>Feriados e exceções</h2>
            <button type="button" className="btn quiet small" onClick={() => setAdding(true)}><Plus size={16} />Nova exceção</button>
          </div>
          <p className="muted small" style={{ marginBottom: 8 }}>Em feriado não há viagem nem confirmação. Com exceção, quem não tem aula nem recebe a pergunta.</p>
          <div className="dash-list">
            {data.holidays.map((h: any) => (
              <div key={h.date} className="dash-row"><span>{h.name}<small>{fmtWeekdayDate(h.date)}, {fmtDate(h.date)}</small></span><span className="pill p-neu">feriado</span></div>
            ))}
            {data.exceptions.map((e: any) => (
              <div key={e.id} className="dash-row">
                <span>{e.note || (e.kind === 'sem_aula' ? 'Sem aula' : 'Viagem cancelada')}<small>{fmtWeekdayDate(e.date)} · {e.target}</small></span>
                <button type="button" className="icon-btn" aria-label="Remover exceção" onClick={() => act(() => del(`/exceptions/${e.id}`), 'Exceção removida.')}><Trash2 size={16} /></button>
              </div>
            ))}
          </div>
        </section>
      </div>
      {adding && <ExceptionModal onClose={() => setAdding(false)} />}
    </>
  );
}
