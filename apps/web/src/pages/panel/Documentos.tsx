import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { fmtDate } from '@vanflow/domain';
import { Empty, ErrorNote, Field, Loading, Modal, PageHead, Pill } from '../../components/ui.tsx';
import { del, patch, post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

const TYPES: Array<[string, string, 'van' | 'driver']> = [
  ['cnh', 'CNH (com EAR)', 'driver'], ['curso_condutor', 'Curso de transporte coletivo', 'driver'], ['crlv', 'CRLV', 'van'], ['vistoria', 'Vistoria', 'van'],
  ['seguro', 'Seguro APP e RCF', 'van'], ['autorizacao_artesp', 'Autorização de fretamento da Artesp', 'van'],
];

function DocumentModal({ doc, onClose }: { doc?: any; onClose: () => void }) {
  const act = useAct();
  const { operatorId, shell } = useOperator();
  const [type, setType] = useState<string>(doc?.type ?? 'cnh');
  const ownerType = TYPES.find(([id]) => id === type)![2];
  const owners = ownerType === 'van' ? shell.vans.map((v: any) => [v.id, v.nickname]) : shell.drivers.map((d: any) => [d.id, d.name]);
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = { ...Object.fromEntries(new FormData(event.currentTarget)), type, owner_type: ownerType, operator_id: operatorId };
    const done = await act(() => (doc ? patch(`/documents/${doc.id}`, data) : post('/documents', data)), 'Documento salvo.');
    if (done) onClose();
  };
  return (
    <Modal title={doc ? 'Editar documento' : 'Novo documento'} onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Field label="Tipo"><select value={type} onChange={(e) => setType(e.target.value)}>{TYPES.map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
        <Field label={ownerType === 'van' ? 'Van' : 'Motorista'}>
          <select name="owner_id" defaultValue={doc?.owner_id} required>{owners.map(([id, label]: string[]) => <option key={id} value={id}>{label}</option>)}</select>
        </Field>
        <Field label="Número"><input name="number" defaultValue={doc?.number} /></Field>
        <Field label="Vencimento"><input type="date" name="expires_at" required defaultValue={doc?.expires_at} /></Field>
        <div className="modal-actions"><button type="submit" className="btn primary">Salvar</button></div>
      </form>
    </Modal>
  );
}

function DocCard({ doc, onEdit, onRemove }: { doc: any; onEdit: () => void; onRemove: () => void }) {
  const { level, days, label } = doc.alert;
  const width = level === 'vencido' ? 100 : Math.max(4, Math.min(100, (days / 180) * 100));
  const color = level === 'vencido' ? 'var(--danger)' : level === 'aviso' ? 'var(--amber)' : 'var(--teal)';
  return (
    <article className={`card doc-card${level !== 'ok' ? ' pop' : ''}`} style={level === 'vencido' ? { borderColor: 'var(--danger)' } : level === 'aviso' ? { borderColor: 'var(--amber)' } : undefined}>
      <div className="spread">
        <h3>{doc.label}</h3>
        <Pill status={level} label={label} />
      </div>
      <p className="small muted">{doc.owner} · {doc.number} · {fmtDate(doc.expires_at)}</p>
      <div className="doc-track" role="img" aria-label={label}><i style={{ width: `${width}%`, background: color }} /></div>
      <div className="row-gap" style={{ justifyContent: 'flex-end' }}>
        <button type="button" className="icon-btn" aria-label={`Editar ${doc.label}`} onClick={onEdit}><Pencil size={16} /></button>
        <button type="button" className="icon-btn" aria-label={`Remover ${doc.label}`} onClick={onRemove}><Trash2 size={16} /></button>
      </div>
    </article>
  );
}

export function Documentos() {
  const act = useAct();
  const { operatorId, vanId, shell } = useOperator();
  const { data, error } = useLive<any[]>(`/operators/${operatorId}/documents`);
  const [editing, setEditing] = useState<any>(null);
  if (error) return <ErrorNote text={error} />;
  if (!data) return <Loading />;
  const driverOfVan = shell.vans.find((v: any) => v.id === vanId)?.driver_id;
  const docs = data.filter((d) => !vanId || d.owner_id === vanId || d.owner_id === driverOfVan);
  const attention = docs.filter((d) => d.alert.level !== 'ok');
  const rest = docs.filter((d) => d.alert.level === 'ok');
  const card = (doc: any) => <DocCard key={doc.id} doc={doc} onEdit={() => setEditing(doc)} onRemove={() => act(() => del(`/documents/${doc.id}`), 'Documento removido.')} />;

  return (
    <>
      <PageHead eyebrow="Documentos" title="Vencimentos da van e do motorista" actions={
        <button type="button" className="btn primary small" onClick={() => setEditing('new')}><Plus size={16} />Novo documento</button>
      }>
        Lembrete 30, 15 e 7 dias antes de cada vencimento. Não substitui a conferência com o órgão responsável.
      </PageHead>
      {docs.length === 0 && <div className="card"><Empty title="Nenhum documento cadastrado.">Cadastre CNH, CRLV, vistoria, seguro e autorização da Artesp.</Empty></div>}
      {attention.length > 0 && (
        <section style={{ marginBottom: 18 }}>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Vencem em menos de 30 dias</p>
          <div className="grid g3">{attention.map(card)}</div>
        </section>
      )}
      {rest.length > 0 && (
        <section>
          <p className="eyebrow" style={{ marginBottom: 8 }}>Em dia</p>
          <div className="grid g3">{rest.map(card)}</div>
        </section>
      )}
      {editing && <DocumentModal doc={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
    </>
  );
}
