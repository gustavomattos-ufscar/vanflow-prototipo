import { Bell, Check, QrCode, Receipt, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { brl, fmtDayMonth, monthLabel, plural } from '@vanflow/domain';
import { Empty, ErrorNote, Field, Loading, Modal, PageHead, Pill, PixPanel, Stat } from '../../components/ui.tsx';
import { post } from '../../lib/api.ts';
import { useAct, useOperator, useToast } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

function PaidModal({ invoice, onClose }: { invoice: any; onClose: () => void }) {
  const act = useAct();
  const [note, setNote] = useState('recebi em dinheiro');
  const save = async () => {
    if (await act(() => post(`/invoices/${invoice.id}/mark-paid`, { note }), 'Cobrança marcada como paga.')) onClose();
  };
  return (
    <Modal title={`Marcar como paga: ${invoice.name}`} onClose={onClose}>
      <Field label="Motivo"><input value={note} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="modal-actions">
        <button type="button" className="btn ghost" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn primary" onClick={save}>Marcar como paga</button>
      </div>
    </Modal>
  );
}

export function Cobrancas() {
  const act = useAct();
  const toast = useToast();
  const { operatorId, vanId } = useOperator();
  const [month, setMonth] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showPix, setShowPix] = useState<any>(null);
  const [paying, setPaying] = useState<any>(null);
  const state = useLive('/demo/state');
  const current = state.data?.date?.slice(0, 7) ?? null;
  const selected = month ?? current;
  const { data, error } = useLive(selected ? `/invoices?operator=${operatorId}&month=${selected}` : null);

  if (error) return <ErrorNote text={error} />;
  if (!data) return <Loading />;
  const rows = data.rows.filter((r: any) => (!vanId || r.van_id === vanId) && (!filter || r.status === filter));
  const pending = data.rows.length === 0;

  return (
    <>
      <PageHead eyebrow="Cobranças" title={`Cobranças de ${monthLabel(data.month).split(' de ')[0]}`} actions={<>
        <select className="input" style={{ width: 'auto' }} aria-label="Mês" value={data.month} onChange={(e) => setMonth(e.target.value)}>
          {data.months.map((m: string) => <option key={m} value={m}>{monthLabel(m)}</option>)}
        </select>
        <button type="button" className="btn primary small" onClick={async () => {
          const result = await act(() => post('/invoices/generate', { operator_id: operatorId, month: data.month }));
          if (!result) return;
          setFilter('');
          toast(result.created ? `${plural(result.created, 'cobrança gerada e enviada', 'cobranças geradas e enviadas')}.` : 'As cobranças deste mês já foram geradas.');
        }}><Receipt size={16} />Gerar cobranças do mês</button>
      </>}>
        O Pix vai direto para a sua chave. A VanFlow não fica com parte da mensalidade.
      </PageHead>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        <Stat label="Recebido" value={brl(data.totals.received)} tone="ok" />
        <Stat label="A receber" value={brl(data.totals.receivable)} tone="warn" />
        <Stat label="Atrasado" value={brl(data.totals.late)} hint={plural(data.totals.late_count, 'cobrança', 'cobranças')} tone={data.totals.late_count ? 'bad' : undefined} />
      </div>
      <div className="filters">
        <div className="segmented" role="group" aria-label="Filtrar por status">
          {[['', 'Todas'], ['atrasada', 'Atrasadas'], ['pendente', 'Pendentes'], ['paga', 'Pagas']].map(([value, label]) => (
            <button key={value} type="button" aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </div>
      {pending ? (
        <div className="card"><Empty title="Nenhuma cobrança neste mês ainda.">As cobranças saem sozinhas no dia configurado. Se preferir, gere agora.</Empty></div>
      ) : rows.length === 0 ? (
        <div className="card"><Empty title={filter === 'atrasada' ? 'Nenhuma cobrança atrasada. Bom mês!' : 'Nada com esse filtro.'} /></div>
      ) : (
        <div className="card flat table-wrap">
          <table className="data cards">
            <thead><tr><th>Aluno</th><th>Plano</th><th>Vencimento</th><th>Status</th><th>Lembretes</th><th className="num">Valor</th><th>Ações</th></tr></thead>
            <tbody>
              {rows.map((r: any) => {
                const open = r.status === 'pendente' || r.status === 'atrasada';
                return (
                  <tr key={r.id} className={r.status === 'atrasada' ? 'late-row' : undefined}>
                    <td className="span"><Link to={`/painel/alunos/${r.student_id}`}>{r.name}</Link></td>
                    <td data-label="Plano" className="small">{r.plan_days} dias</td>
                    <td data-label="Vencimento" className="mono small">{fmtDayMonth(r.due_date)}</td>
                    <td data-label="Status"><Pill status={r.status} label={r.status === 'atrasada' ? `atrasada ${r.days_late}d` : undefined} /></td>
                    <td data-label="Lembretes" className="small muted">{r.reminders.length ? plural(r.reminders.length, 'enviado', 'enviados') : ''}</td>
                    <td data-label="Valor" className="num">{brl(r.amount)}</td>
                    <td className="span">
                      <div className="row-gap" style={{ gap: 4, flexWrap: 'nowrap' }}>
                        <button type="button" className="icon-btn" title="Ver Pix" aria-label={`Ver Pix de ${r.name}`} onClick={() => setShowPix(r)}><QrCode size={16} /></button>
                        {open && <button type="button" className="icon-btn" title="Mandar lembrete agora" aria-label={`Mandar lembrete para ${r.name}`} onClick={() => act(() => post(`/invoices/${r.id}/remind`), 'Lembrete enviado.')}><Bell size={16} /></button>}
                        {open && <button type="button" className="icon-btn" title="Marcar como paga" aria-label={`Marcar ${r.name} como paga`} onClick={() => setPaying(r)}><Check size={16} /></button>}
                        {open && <button type="button" className="icon-btn" title="Cancelar cobrança" aria-label={`Cancelar cobrança de ${r.name}`} onClick={() => act(() => post(`/invoices/${r.id}/cancel`), 'Cobrança cancelada.')}><X size={16} /></button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {showPix && (
        <Modal title={`Pix de ${showPix.name}`} onClose={() => setShowPix(null)} wide>
          <PixPanel payload={showPix.pix_payload} amount={showPix.amount} title={`Mensalidade de ${monthLabel(showPix.reference_month)}`} />
        </Modal>
      )}
      {paying && <PaidModal invoice={paying} onClose={() => setPaying(null)} />}
    </>
  );
}
