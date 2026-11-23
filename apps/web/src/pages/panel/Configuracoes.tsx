import { Pencil, Plus, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { brl, fmtHour } from '@vanflow/domain';
import { DriverModal, LineModal, PixForm, VanModal } from '../../components/OperationForms.tsx';
import { CopyButton, Field, PageHead, QrImage } from '../../components/ui.tsx';
import { del, patch } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

function RulesForm() {
  const act = useAct();
  const { shell, operatorId } = useOperator();
  const s = shell.settings;
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    act(() => patch(`/operators/${operatorId}/settings`, {
      confirmation_time: form.get('confirmation_time'), reminder_time: form.get('reminder_time'), reminder_enabled: form.get('reminder_enabled') === 'on',
      close_time_morning: form.get('close_time_morning'), close_minutes_before_departure: Number(form.get('close_hours')) * 60,
      no_answer_counts_as_going: form.get('no_answer') === 'vai', due_day: Number(form.get('due_day')), avulsa_auto_offer: form.get('auto_offer') === 'on',
      avulsa_hold_minutes: Number(form.get('hold')),
    }), 'Configurações salvas.');
  };
  return (
    <form onSubmit={submit} className="form-grid" key={operatorId}>
      <Field label="Envio da confirmação" hint="Entre 19h e 22h, na véspera"><input type="time" name="confirmation_time" min="19:00" max="22:00" required defaultValue={s.confirmation_time} /></Field>
      <Field label="Lembrete para quem não respondeu"><input type="time" name="reminder_time" required defaultValue={s.reminder_time} /></Field>
      <div className="full"><label className="check"><input type="checkbox" name="reminder_enabled" defaultChecked={s.reminder_enabled} />Mandar o lembrete</label></div>
      <Field label="Fechamento da lista (manhã)"><input type="time" name="close_time_morning" required defaultValue={s.close_time_morning} /></Field>
      <Field label="Fechamento da lista (noite)" hint="Horas antes da saída"><input type="number" name="close_hours" min="1" max="12" required defaultValue={s.close_minutes_before_departure / 60} /></Field>
      <Field label="Quem não responde até o fechamento">
        <select name="no_answer" defaultValue={s.no_answer_counts_as_going ? 'vai' : 'nao'}><option value="vai">Conta como vai</option><option value="nao">Conta como não vai</option></select>
      </Field>
      <Field label="Vencimento da mensalidade">
        <select name="due_day" defaultValue={s.due_day}><option value="5">Dia 5</option><option value="10">Dia 10</option></select>
      </Field>
      <Field label="Reserva de vaga avulsa" hint="Minutos para pagar"><input type="number" name="hold" min="5" max="120" required defaultValue={s.avulsa_hold_minutes} /></Field>
      <div style={{ alignSelf: 'center' }}><label className="check"><input type="checkbox" name="auto_offer" defaultChecked={s.avulsa_auto_offer} />Oferecer vagas livres sozinha</label></div>
      <div className="full"><button type="submit" className="btn primary small">Salvar configurações</button></div>
    </form>
  );
}

export function Configuracoes() {
  const act = useAct();
  const { shell, operatorId } = useOperator();
  const preview = useLive(`/operators/${operatorId}/pix-preview`);
  const [modal, setModal] = useState<{ kind: 'van' | 'line' | 'driver'; item?: any } | null>(null);
  const driverName = (id: string) => shell.drivers.find((d: any) => d.id === id)?.name ?? 'Sem motorista';

  return (
    <>
      <PageHead eyebrow="Configurações" title="Do seu jeito de trabalhar" />
      <div className="stack">
        <section className="card">
          <h2 className="card-title">Horários e regras</h2>
          <RulesForm />
        </section>
        <section className="card">
          <h2 className="card-title">Chave Pix</h2>
          <p className="muted small" style={{ marginBottom: 12 }}>O dinheiro das mensalidades e das avulsas cai direto nesta chave.</p>
          <PixForm key={shell.operator.pix_key} />
          {preview.data?.payload && (
            <div className="pix-panel" style={{ marginTop: 16 }}>
              <QrImage payload={preview.data.payload} size={120} />
              <div className="pix-panel-body">
                <p className="eyebrow">Prévia de um Pix de R$ 300,00</p>
                <code className="pix-code">{preview.data.payload}</code>
                <div><CopyButton text={preview.data.payload} label="Copiar código" /></div>
              </div>
            </div>
          )}
        </section>
        <section className="card">
          <div className="card-title"><h2>Vans</h2><button type="button" className="btn quiet small" onClick={() => setModal({ kind: 'van' })}><Plus size={16} />Nova van</button></div>
          <div className="dash-list">
            {shell.vans.map((v: any) => (
              <div key={v.id} className="dash-row">
                <span>{v.nickname}<small>{v.plate} · {v.seats} lugares · {driverName(v.driver_id)}</small></span>
                <span className="row-gap">
                  <button type="button" className="icon-btn" aria-label={`Editar ${v.nickname}`} onClick={() => setModal({ kind: 'van', item: v })}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn" aria-label={`Remover ${v.nickname}`} onClick={() => act(() => del(`/vans/${v.id}`), 'Van removida.')}><Trash2 size={16} /></button>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-title"><h2>Linhas e preços</h2><button type="button" className="btn quiet small" disabled={!shell.vans.length} onClick={() => setModal({ kind: 'line' })}><Plus size={16} />Nova linha</button></div>
          <div className="dash-list">
            {shell.lines.map((l: any) => (
              <div key={l.id} className="dash-row">
                <span>{l.name}<small>{l.shift === 'manha' ? 'Manhã' : 'Noite'}, saída {fmtHour(l.departure_time)}, volta {fmtHour(l.return_time)} · 5 dias {brl(l.price_table.plan_5)} · 3 dias {brl(l.price_table.plan_3)} · 2 dias {brl(l.price_table.plan_2)} · avulsa {brl(l.price_table.avulsa_round)}</small></span>
                <span className="row-gap">
                  <button type="button" className="icon-btn" aria-label={`Editar ${l.name}`} onClick={() => setModal({ kind: 'line', item: l })}><Pencil size={16} /></button>
                  <button type="button" className="icon-btn" aria-label={`Remover ${l.name}`} onClick={() => act(() => del(`/lines/${l.id}`), 'Linha removida.')}><Trash2 size={16} /></button>
                </span>
              </div>
            ))}
          </div>
        </section>
        <section className="card">
          <div className="card-title"><h2>Motoristas</h2><button type="button" className="btn quiet small" onClick={() => setModal({ kind: 'driver' })}><Plus size={16} />Novo motorista</button></div>
          <div className="dash-list">
            {shell.drivers.map((d: any) => (
              <div key={d.id} className="dash-row">
                <span>{d.name}<small>{d.phone}{d.is_owner ? ' · dono' : ''}</small></span>
                {!d.is_owner && <button type="button" className="icon-btn" aria-label={`Remover ${d.name}`} onClick={() => act(() => del(`/drivers/${d.id}`), 'Motorista removido.')}><Trash2 size={16} /></button>}
              </div>
            ))}
          </div>
        </section>
      </div>
      {modal?.kind === 'van' && <VanModal van={modal.item} onClose={() => setModal(null)} />}
      {modal?.kind === 'line' && <LineModal line={modal.item} onClose={() => setModal(null)} />}
      {modal?.kind === 'driver' && <DriverModal onClose={() => setModal(null)} />}
    </>
  );
}
