/** Modais das ações rápidas: mensagem (um aluno ou vários), marcar falta e pausar plano. */
import { useState, type FormEvent } from 'react';
import { fmtWeekdayDate, plural } from '@vanflow/domain';
import { Field, Modal } from './ui.tsx';

const MAX_MESSAGE = 1000;
const SUGGESTIONS = [
  'A van vai atrasar uns 10 minutos hoje.',
  'Amanhã não tem van: é feriado.',
  'Lembrete: a mensalidade vence dia 5.',
];

export function MessageModal({ recipients, onSend, onClose }: {
  /** Nome do aluno, ou a quantidade quando forem vários. */
  recipients: string | number; onSend: (text: string) => Promise<unknown>; onClose: () => void;
}) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setSending(true);
    await onSend(text.trim());
    setSending(false);
  };
  const title = typeof recipients === 'number' ? `Mensagem para ${plural(recipients, 'aluno', 'alunos')}` : `Mensagem para ${recipients}`;
  return (
    <Modal title={title} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <p className="muted small">Chega no WhatsApp do aluno, pela VanFlow.</p>
        <div className="row-gap" style={{ gap: 6 }}>
          {SUGGESTIONS.map((s) => <button key={s} type="button" className="btn quiet small" onClick={() => setText(s)}>{s}</button>)}
        </div>
        <Field label="Mensagem" hint={`${text.length} de ${MAX_MESSAGE}`}>
          <textarea value={text} maxLength={MAX_MESSAGE} required onChange={(e) => setText(e.target.value)} />
        </Field>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary" disabled={sending || !text.trim()}>Enviar</button>
        </div>
      </form>
    </Modal>
  );
}

export function AbsenceModal({ name, upcoming, onSave, onClose }: {
  name: string; upcoming: Array<{ line_id: string; date: string; line_name: string; label: string; today: boolean }>;
  onSave: (lineId: string, date: string, reason: string) => Promise<unknown>; onClose: () => void;
}) {
  const [choice, setChoice] = useState(0);
  const [reason, setReason] = useState('');
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const day = upcoming[choice];
    await onSave(day.line_id, day.date, reason);
  };
  return (
    <Modal title={`Marcar falta de ${name}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <p className="muted small">Para quando o aluno avisou por fora, por ligação ou pessoalmente. O lugar é liberado e o aluno recebe a confirmação no WhatsApp.</p>
        <Field label="Dia">
          <select value={choice} onChange={(e) => setChoice(Number(e.target.value))}>
            {upcoming.map((u, i) => <option key={`${u.line_id}${u.date}`} value={i}>{u.today ? 'Hoje' : fmtWeekdayDate(u.date)}, {u.label} · {u.line_name}</option>)}
          </select>
        </Field>
        <Field label="Motivo (opcional)"><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ligou avisando" /></Field>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary">Marcar falta</button>
        </div>
      </form>
    </Modal>
  );
}

const PAUSE_REASONS = ['Férias', 'Estágio', 'Trancou o semestre', 'Outro'];

export function PauseModal({ name, minDate, onSave, onClose }: {
  name: string; minDate: string; onSave: (until: string | null, reason: string) => Promise<unknown>; onClose: () => void;
}) {
  const [reason, setReason] = useState(PAUSE_REASONS[0]);
  const [other, setOther] = useState('');
  const [until, setUntil] = useState('');
  const [noDate, setNoDate] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await onSave(noDate ? null : until, reason === 'Outro' ? other.trim() : reason);
  };
  return (
    <Modal title={`Pausar o plano de ${name}`} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <p className="muted small">Enquanto estiver pausado, o aluno não entra nas listas, não recebe confirmação e não é cobrado. Na data de volta, o plano volta sozinho.</p>
        <div>
          <p className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Motivo</p>
          <div className="segmented" role="group" aria-label="Motivo">
            {PAUSE_REASONS.map((r) => <button key={r} type="button" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}
          </div>
        </div>
        {reason === 'Outro' && <Field label="Qual?"><input value={other} onChange={(e) => setOther(e.target.value)} required /></Field>}
        <Field label="Volta em">
          <input type="date" value={until} min={minDate} disabled={noDate} required={!noDate} onChange={(e) => setUntil(e.target.value)} />
        </Field>
        <label className="check"><input type="checkbox" checked={noDate} onChange={(e) => setNoDate(e.target.checked)} />Sem data para voltar</label>
        <div className="modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn primary">Pausar plano</button>
        </div>
      </form>
    </Modal>
  );
}
