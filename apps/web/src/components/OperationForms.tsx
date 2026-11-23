/** Formulários de van, linha, motorista e Pix: usados em Configurações e no assistente. */
import { useState, type FormEvent } from 'react';
import { pixText } from '@vanflow/domain';
import { patch, post } from '../lib/api.ts';
import { useAct, useOperator } from '../lib/context.tsx';
import { Field, Modal } from './ui.tsx';

export function VanModal({ van, onClose }: { van?: any; onClose: () => void }) {
  const act = useAct();
  const { operatorId, shell } = useOperator();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = { ...Object.fromEntries(new FormData(event.currentTarget)), operator_id: operatorId };
    const done = await act(() => (van ? patch(`/vans/${van.id}`, data) : post('/vans', data)), 'Van salva.');
    if (done) onClose();
  };
  return (
    <Modal title={van ? 'Editar van' : 'Nova van'} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="full"><Field label="Nome da van"><input name="nickname" required defaultValue={van?.nickname} placeholder="Van 1 · Itu" /></Field></div>
        <Field label="Placa"><input name="plate" required defaultValue={van?.plate} placeholder="ABC1D23" /></Field>
        <Field label="Lugares"><input type="number" name="seats" min="1" max="30" required defaultValue={van?.seats ?? 15} /></Field>
        <Field label="Modelo"><input name="model" defaultValue={van?.model ?? 'Van 15 lugares'} /></Field>
        <Field label="Motorista">
          <select name="driver_id" defaultValue={van?.driver_id ?? shell.drivers[0]?.id}>{shell.drivers.map((d: any) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        </Field>
        <div className="full modal-actions"><button type="submit" className="btn primary">Salvar van</button></div>
      </form>
    </Modal>
  );
}

export function LineModal({ line, onClose }: { line?: any; onClose: () => void }) {
  const act = useAct();
  const { shell } = useOperator();
  const [shift, setShift] = useState<string>(line?.shift ?? 'noite');
  const [faculties, setFaculties] = useState<string[]>(line?.destinations ?? []);
  const prices = line?.price_table ?? { plan_5: 420, plan_3: 300, plan_2: 220, avulsa_round: 20, avulsa_one_way: 12 };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const body = {
      name: form.name, van_id: form.van_id, shift, departure_time: form.departure_time, return_time: form.return_time, destinations: faculties,
      origin: line?.origin ?? { label: form.origin_label, city: form.origin_city },
      price_table: { plan_5: form.plan_5, plan_3: form.plan_3, plan_2: form.plan_2, avulsa_round: form.avulsa_round, avulsa_one_way: form.avulsa_one_way },
    };
    const done = await act(() => (line ? patch(`/lines/${line.id}`, body) : post('/lines', body)), 'Linha salva.');
    if (done) onClose();
  };

  return (
    <Modal title={line ? 'Editar linha' : 'Nova linha'} onClose={onClose} wide>
      <form onSubmit={submit} className="form-grid">
        <div className="full"><Field label="Nome da linha"><input name="name" required defaultValue={line?.name} placeholder="Itu e Salto → Sorocaba" /></Field></div>
        <Field label="Van"><select name="van_id" required defaultValue={line?.van_id}>{shell.vans.map((v: any) => <option key={v.id} value={v.id}>{v.nickname}</option>)}</select></Field>
        <div>
          <p className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Turno</p>
          <div className="segmented" role="group" aria-label="Turno">
            <button type="button" aria-pressed={shift === 'manha'} onClick={() => setShift('manha')}>Manhã</button>
            <button type="button" aria-pressed={shift === 'noite'} onClick={() => setShift('noite')}>Noite</button>
          </div>
        </div>
        <Field label="Saída (ida)"><input type="time" name="departure_time" required defaultValue={line?.departure_time ?? '17:40'} /></Field>
        <Field label="Saída (volta)"><input type="time" name="return_time" required defaultValue={line?.return_time ?? '22:50'} /></Field>
        {!line && (
          <>
            <Field label="Ponto de saída"><input name="origin_label" required placeholder="Garagem" /></Field>
            <Field label="Cidade da saída"><input name="origin_city" required defaultValue={shell.operator.city} /></Field>
          </>
        )}
        <div className="full">
          <p className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Faculdades atendidas</p>
          <div className="day-picks">
            {shell.faculties.map((f: any) => (
              <button key={f.id} type="button" className="day-pick" aria-pressed={faculties.includes(f.id)} onClick={() => setFaculties(faculties.includes(f.id) ? faculties.filter((x) => x !== f.id) : [...faculties, f.id])}>{f.name}</button>
            ))}
          </div>
        </div>
        <Field label="Plano 5 dias"><input type="number" step="0.01" name="plan_5" defaultValue={prices.plan_5} /></Field>
        <Field label="Plano 3 dias"><input type="number" step="0.01" name="plan_3" defaultValue={prices.plan_3} /></Field>
        <Field label="Plano 2 dias"><input type="number" step="0.01" name="plan_2" defaultValue={prices.plan_2} /></Field>
        <Field label="Avulsa ida e volta"><input type="number" step="0.01" name="avulsa_round" defaultValue={prices.avulsa_round} /></Field>
        <Field label="Avulsa só ida ou só volta"><input type="number" step="0.01" name="avulsa_one_way" defaultValue={prices.avulsa_one_way} /></Field>
        <div className="full modal-actions"><button type="submit" className="btn primary" disabled={!faculties.length}>Salvar linha</button></div>
      </form>
    </Modal>
  );
}

export function DriverModal({ onClose }: { onClose: () => void }) {
  const act = useAct();
  const { operatorId } = useOperator();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = { ...Object.fromEntries(new FormData(event.currentTarget)), operator_id: operatorId };
    if (await act(() => post('/drivers', data), 'Motorista cadastrado.')) onClose();
  };
  return (
    <Modal title="Novo motorista" onClose={onClose}>
      <form onSubmit={submit} className="stack">
        <Field label="Nome"><input name="name" required /></Field>
        <Field label="WhatsApp"><input name="phone" placeholder="(15) 9XXXX-XXXX" /></Field>
        <div className="modal-actions"><button type="submit" className="btn primary">Salvar</button></div>
      </form>
    </Modal>
  );
}

export function PixForm({ onSaved }: { onSaved?: () => void }) {
  const act = useAct();
  const { shell, operatorId } = useOperator();
  const op = shell.operator;
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget)) as Record<string, string>;
    const body = { ...data, pix_merchant_name: pixText(data.pix_merchant_name, 25), pix_city: pixText(data.pix_city, 15) };
    if (await act(() => patch(`/operators/${operatorId}`, body), 'Chave Pix salva.')) onSaved?.();
  };
  return (
    <form onSubmit={submit} className="form-grid">
      <Field label="Tipo da chave">
        <select name="pix_key_type" defaultValue={op.pix_key_type ?? 'cpf'}>
          <option value="cpf">CPF</option><option value="cnpj">CNPJ</option><option value="email">E-mail</option><option value="telefone">Telefone</option><option value="aleatoria">Aleatória</option>
        </select>
      </Field>
      <Field label="Chave Pix"><input name="pix_key" required defaultValue={op.pix_key ?? ''} /></Field>
      <Field label="Nome do recebedor" hint="Até 25 letras, sem acento"><input name="pix_merchant_name" required maxLength={25} defaultValue={op.pix_merchant_name ?? pixText(op.name, 25)} /></Field>
      <Field label="Cidade" hint="Até 15 letras, sem acento"><input name="pix_city" required maxLength={15} defaultValue={op.pix_city ?? pixText(op.city ?? '', 15)} /></Field>
      <div className="full"><button type="submit" className="btn dark small">Salvar chave Pix</button></div>
    </form>
  );
}
