import { Plus, Printer, Trash2 } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { brl, fmtDayMonth, monthLabel, monthName } from '@vanflow/domain';
import { FinanceChart } from '../../components/FinanceChart.tsx';
import { ErrorNote, Field, Loading, Modal, PageHead, Stat } from '../../components/ui.tsx';
import { del, post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

const CATEGORIES: Record<string, string> = {
  combustivel: 'Combustível', manutencao: 'Manutenção', seguro: 'Seguro', parcela: 'Parcela', outros: 'Outros',
};

function ExpenseModal({ month, onClose }: { month: string; onClose: () => void }) {
  const act = useAct();
  const { operatorId, shell, vanId } = useOperator();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (await act(() => post('/expenses', { ...data, operator_id: operatorId }), 'Gasto lançado.')) onClose();
  };
  return (
    <Modal title="Lançar gasto" onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <Field label="Van"><select name="van_id" defaultValue={vanId} required>{shell.vans.map((v: any) => <option key={v.id} value={v.id}>{v.nickname}</option>)}</select></Field>
        <Field label="Categoria"><select name="category">{Object.entries(CATEGORIES).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></Field>
        <Field label="Data"><input type="date" name="date" required defaultValue={`${month}-15`} /></Field>
        <Field label="Valor"><input type="number" name="amount" step="0.01" min="0.01" required /></Field>
        <div className="full"><Field label="Descrição"><input name="description" placeholder="Troca de óleo" /></Field></div>
        <div className="full modal-actions"><button type="submit" className="btn primary">Lançar</button></div>
      </form>
    </Modal>
  );
}

export function Financeiro() {
  const act = useAct();
  const { operatorId, vanId } = useOperator();
  const [month, setMonth] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const query = new URLSearchParams();
  if (vanId) query.set('van', vanId);
  if (month) query.set('month', month);
  const { data, error } = useLive(`/operators/${operatorId}/finance?${query}`);
  if (error) return <ErrorNote text={error} />;
  if (!data) return <Loading />;
  const series = data.series.filter((s: any) => s.revenue > 0 || s.costs > 0 || s.month === data.month);
  const t = data.totals;

  return (
    <>
      <PageHead eyebrow="Financeiro" title={`Fechamento de ${monthName(data.month)}`} actions={<>
        <select className="input" style={{ width: 'auto' }} aria-label="Mês" value={data.month} onChange={(e) => setMonth(e.target.value)}>
          {series.map((s: any) => <option key={s.month} value={s.month}>{monthLabel(s.month)}</option>)}
        </select>
        <button type="button" className="btn ghost small" onClick={() => window.print()}><Printer size={16} />Relatório do mês</button>
        <button type="button" className="btn primary small" onClick={() => setAdding(true)}><Plus size={16} />Lançar gasto</button>
      </>}>
        Mensalidades recebidas mais avulsas, menos os gastos lançados.
      </PageHead>
      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Mensalidades" value={brl(t.fees)} />
        <Stat label="Avulsas" value={brl(t.avulsas)} />
        <Stat label="Gastos" value={brl(t.costs)} />
        <Stat label="Lucro" value={brl(t.profit)} tone={t.profit >= 0 ? 'ok' : 'bad'} />
      </div>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <section className="card">
          <h2 className="card-title">Mês a mês</h2>
          <FinanceChart series={series} selected={data.month} onSelect={setMonth} />
        </section>
        <section className="card flat">
          <div className="table-wrap">
            <table className="data cards">
              <thead><tr><th>Van</th><th className="num">Receita</th><th className="num">Gastos</th><th className="num">Lucro</th></tr></thead>
              <tbody>
                {data.by_van.map((v: any) => <tr key={v.id}><td className="span"><b>{v.nickname}</b></td><td data-label="Receita" className="num">{brl(v.revenue)}</td><td data-label="Gastos" className="num">{brl(v.costs)}</td><td data-label="Lucro" className="num"><b>{brl(v.profit)}</b></td></tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
      <section className="card flat" style={{ marginTop: 16 }}>
        <div className="table-wrap">
          <table className="data cards">
            <thead><tr><th>Mês</th><th className="num">Mensalidades</th><th className="num">Avulsas</th><th className="num">Gastos</th><th className="num">Lucro</th></tr></thead>
            <tbody>
              {series.map((s: any) => <tr key={s.month}><td className="span"><b>{monthName(s.month)}</b></td><td data-label="Mensalidades" className="num">{brl(s.fees)}</td><td data-label="Avulsas" className="num">{brl(s.avulsas)}</td><td data-label="Gastos" className="num">{brl(s.costs)}</td><td data-label="Lucro" className="num"><b>{brl(s.profit)}</b></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
      <section className="card" style={{ marginTop: 16 }}>
        <h2 className="card-title">Gastos de {monthName(data.month)}</h2>
        {data.expenses.length === 0 ? <p className="muted small">Nenhum gasto lançado neste mês.</p> : (
          <div className="dash-list">
            {data.expenses.map((e: any) => (
              <div key={e.id} className="dash-row">
                <span>{e.description || CATEGORIES[e.category]}<small>{fmtDayMonth(e.date)} · {CATEGORIES[e.category]} · {e.van}</small></span>
                <span className="row-gap">
                  <span className="mono">{brl(e.amount)}</span>
                  <button type="button" className="icon-btn no-print" aria-label="Remover gasto" onClick={() => act(() => del(`/expenses/${e.id}`), 'Gasto removido.')}><Trash2 size={16} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
      {adding && <ExpenseModal month={data.month} onClose={() => setAdding(false)} />}
    </>
  );
}
