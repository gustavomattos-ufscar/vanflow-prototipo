import { ArrowLeft, UserPlus } from 'lucide-react';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { firstName, fmtClock } from '@vanflow/domain';
import { Chat } from '../components/Chat.tsx';
import { ClockChip, Field, Loading, Modal } from '../components/ui.tsx';
import { post } from '../lib/api.ts';
import { useAct, useOperator } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';

function NewContact({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const act = useAct();
  const { shell } = useOperator();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const result = await act(() => post('/whatsapp/contacts', data));
    if (result) onCreated(result.id);
  };
  return (
    <Modal title="Novo número" onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="full"><Field label="Nome"><input name="name" required /></Field></div>
        <Field label="WhatsApp"><input name="phone" required placeholder="(15) 90000-0999" /></Field>
        <Field label="Cidade"><input name="city" defaultValue="Itu" required /></Field>
        <div className="full">
          <Field label="Linha de interesse">
            <select name="line_id" required>{shell?.lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
          </Field>
        </div>
        <div className="full modal-actions"><button type="submit" className="btn primary">Criar contato</button></div>
      </form>
    </Modal>
  );
}

export function WhatsAppPage() {
  const [params, setParams] = useSearchParams();
  const { data } = useLive<any[]>('/whatsapp/conversations');
  const demo = useLive('/demo/state');
  const [search, setSearch] = useState('');
  const [creating, setCreating] = useState(false);
  const selected = params.get('aluno') ?? 'st_ana';

  useEffect(() => {
    document.title = 'Simulador de WhatsApp · VanFlow';
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((c) => !term || c.name.toLowerCase().includes(term));
  }, [data, search]);

  const select = (id: string) => setParams({ aluno: id });

  return (
    <div className="wa-page">
      <aside className="wa-list" aria-label="Conversas">
        <div className="wa-list-head">
          <div className="spread">
            <Link to="/entrar" className="icon-btn" aria-label="Voltar para a entrada"><ArrowLeft size={18} /></Link>
            <ClockChip now={demo.data?.now} />
            <button type="button" className="icon-btn" aria-label="Novo número" title="Novo número" onClick={() => setCreating(true)}><UserPlus size={18} /></button>
          </div>
          <input className="input" placeholder="Buscar aluno" aria-label="Buscar aluno" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="wa-items">
          {!data && <Loading />}
          {filtered.map((c) => (
            <button key={c.id} type="button" className="wa-item" aria-current={c.id === selected} onClick={() => select(c.id)}>
              <span className="wa-avatar" aria-hidden="true">{c.name[0]}</span>
              <span className="wa-item-main">
                <b>{firstName(c.name)} {c.name.split(' ').at(-1)}</b>
                <span>{c.last_body ?? (c.status === 'interessado_avulsa' ? 'Interessado em vaga avulsa' : 'Sem mensagens')}</span>
              </span>
              <span className="row-gap" style={{ flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
                {c.last_at && <small className="mono muted">{fmtClock(c.last_at)}</small>}
                {c.unread > 0 && c.id !== selected && <span className="wa-badge">{c.unread}</span>}
              </span>
            </button>
          ))}
        </div>
      </aside>
      <div className="wa-stage"><Chat studentId={selected} /></div>
      {creating && <NewContact onClose={() => setCreating(false)} onCreated={(id) => { setCreating(false); select(id); }} />}
    </div>
  );
}
