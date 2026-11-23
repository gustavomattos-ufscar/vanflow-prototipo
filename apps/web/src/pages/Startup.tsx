/** "VanFlow por dentro": métricas calculadas do banco, com a validação real como linha de base. */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { brl, fmtDate } from '@vanflow/domain';
import { ErrorNote, Loading, Logo, Pill, Stat, ThemeButton } from '../components/ui.tsx';
import { post } from '../lib/api.ts';
import { useAct, useOperator } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';

/** Dados reais da pesquisa de outubro de 2026 (docs/04-validacao.md). */
const VALIDATION = [
  {
    title: 'Reação à solução', base: 'Base: 87 estudantes (avulsa: 60 usuários de van)', rows: [
      ['Confirmaria pelo WhatsApp', 89], ['Usaria plano de 2 ou 3 dias', 82], ['Pagaria por vaga avulsa', 75],
    ],
  },
  {
    title: 'Problemas que já teve', base: 'Base: 60 usuários de van, múltipla escolha', rows: [
      ['Pagar o mês cheio indo poucos dias', 78], ['Atraso sem aviso', 65], ['Grupo lotado, mensagens perdidas', 50], ['Não saber onde a van está', 42],
    ],
  },
  {
    title: 'Dor citada pelos operadores', base: 'Base: 7 operadores, citação espontânea', rows: [
      ['Saber quem vai', 43], ['Cobrança', 29], ['Rotas', 14], ['Manutenção e fiscalização', 14],
    ],
  },
] as const;

function HBars({ rows }: { rows: ReadonlyArray<readonly [string, number]> }) {
  return (
    <div>
      {rows.map(([label, value]) => (
        <div key={label} className="hbar">
          <span>{label}</span>
          <div className="hbar-track"><i style={{ width: `${value}%` }} /></div>
          <b>{value}%</b>
        </div>
      ))}
    </div>
  );
}

const SOURCE: Record<string, string> = { landing: 'Landing', entrevista: 'Entrevista', indicacao: 'Indicação' };

export function StartupPage() {
  const act = useAct();
  const navigate = useNavigate();
  const { setOperatorId } = useOperator();
  const { data, error } = useLive('/startup/metrics');
  const [allLeads, setAllLeads] = useState(false);

  useEffect(() => {
    document.title = 'Painel da startup · VanFlow';
  }, []);

  if (error) return <div className="demo-page"><ErrorNote text={error} /></div>;
  if (!data) return <Loading />;
  const { funnel, baseline } = data;
  const goal = baseline.som.vans_meta;
  const leads = allLeads ? data.leads : data.leads.filter((l: any) => l.source === 'landing');

  const createAccount = async (id: string) => {
    const result = await act(() => post(`/leads/${id}/convert`), 'Conta de teste criada: 30 dias grátis.');
    if (result) {
      setOperatorId(result.operator_id);
      navigate('/painel/comecar');
    }
  };

  const steps = [
    ['Aquisição', funnel.acquisition.value, `contatos de operadores (${funnel.acquisition.base} na validação)`],
    ['Ativação', funnel.activation.value, `mandaram a 1ª confirmação (meta ${funnel.activation.target})`],
    ['Retenção', funnel.retention.value, `usam a lista há 4 semanas (meta ${funnel.retention.target} de 3)`],
    ['Receita', funnel.revenue.value, `pagam depois do teste (meta ${funnel.revenue.target} de 3)`],
    ['Indicação', funnel.referral.value, `motoristas indicados (meta ${funnel.referral.target})`],
  ];

  return (
    <div className="demo-page">
      <div className="demo-top">
        <Logo />
        <div className="row-gap">
          <Link className="btn ghost small" to="/demo">Central da demo</Link>
          <ThemeButton />
        </div>
      </div>
      <p className="eyebrow">VanFlow por dentro</p>
      <h1 style={{ marginBottom: 16 }}>Validamos com 87 estudantes e 7 operadores. Os 7 querem testar.</h1>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="MRR" value={brl(data.mrr)} hint={`meta do 1º ano: ${brl(baseline.som.mrr_meta)}`} />
        <Stat label="ARR" value={brl(data.arr)} hint={`meta: ${brl(baseline.som.arr_meta)}`} />
        <Stat label="Em teste" value={data.operators_trial} hint={`${data.vans_trial} vans, ${brl(data.potential_mrr)} de MRR possível`} />
        <Stat label="Assinantes" value={data.operators_active} hint={`${data.vans_active} vans ativas`} tone={data.operators_active ? 'ok' : undefined} />
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="spread" style={{ marginBottom: 8 }}>
          <h2>Meta do SOM: {goal} vans</h2>
          <span className="mono small">{data.vans_active} assinantes + {data.vans_trial} em teste</span>
        </div>
        <div className="goal-meter" role="img" aria-label={`${data.vans_active} vans assinantes e ${data.vans_trial} em teste, de ${goal}`}>
          <i style={{ width: `${(data.vans_active / goal) * 100}%`, background: 'var(--teal)' }} />
          <i style={{ width: `${(data.vans_trial / goal) * 100}%`, background: 'var(--amber)' }} />
        </div>
        <div className="chart-legend" style={{ marginTop: 8, marginBottom: 0 }}>
          <span><i style={{ background: 'var(--teal)' }} />Assinantes</span><span><i style={{ background: 'var(--amber)' }} />Em teste</span>
        </div>
      </section>

      <p className="eyebrow" style={{ marginBottom: 8 }}>Funil AARRR</p>
      <div className="funnel" style={{ marginBottom: 16 }}>
        {steps.map(([name, value, text]) => (
          <div key={name as string} className="funnel-step"><span className="stat-label">{name}</span><b>{value}</b><p>{text}</p></div>
        ))}
      </div>

      <div className="grid g4" style={{ marginBottom: 16 }}>
        <Stat label="Conversão" value={`${Math.round(data.conversion * 100)}%`} hint="teste para pago" />
        <Stat label="Churn" value={`${Math.round(data.churn * 100)}%`} hint="cancelados sobre assinantes" />
        <Stat label="LTV por van" value={brl(data.ltv)} hint={`${brl(data.price)} × 12 meses`} />
        <Stat label="Avulsas por van" value={funnel.revenue.avulsas_per_van_week.toFixed(1).replace('.', ',')} hint="na última semana (meta 1)" />
      </div>

      <section className="card flat" style={{ marginBottom: 16 }}>
        <div className="spread" style={{ padding: '16px 18px 4px' }}>
          <h2>Contatos ({leads.length})</h2>
          <div className="segmented" role="group" aria-label="Contatos">
            <button type="button" aria-pressed={!allLeads} onClick={() => setAllLeads(false)}>Da landing</button>
            <button type="button" aria-pressed={allLeads} onClick={() => setAllLeads(true)}>Todos</button>
          </div>
        </div>
        <div className="table-wrap" style={{ maxHeight: 340, overflowY: 'auto' }}>
          <table className="data cards">
            <thead><tr><th>Nome</th><th>Tipo</th><th>Cidade</th><th>Vans</th><th>Origem</th><th>Quando</th><th>Conta</th></tr></thead>
            <tbody>
              {leads.map((lead: any) => (
                <tr key={lead.id}>
                  <td className="span">{lead.name}<br /><span className="muted small">{lead.whatsapp ?? ''}</span></td>
                  <td data-label="Tipo" className="small">{lead.kind === 'operador' ? 'Operador' : 'Estudante'}</td>
                  <td data-label="Cidade" className="small">{lead.city}</td>
                  <td data-label="Vans" className="small">{lead.vans_count ?? ''}</td>
                  <td data-label="Origem" className="small">{SOURCE[lead.source] ?? lead.source}</td>
                  <td data-label="Quando" className="mono small">{fmtDate(lead.created_at)}</td>
                  <td className="span">
                    {lead.converted_operator_id ? <Pill status="ok" label="com conta" /> : lead.kind === 'operador'
                      ? <button type="button" className="btn quiet small" onClick={() => createAccount(lead.id)}>Criar conta de teste</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="eyebrow" style={{ marginBottom: 8 }}>Validação de mercado, outubro de 2026</p>
      <div className="grid g3" style={{ marginBottom: 16 }}>
        {VALIDATION.map((block) => (
          <section key={block.title} className="card">
            <h3>{block.title}</h3>
            <p className="muted small" style={{ marginBottom: 8 }}>{block.base}</p>
            <HBars rows={block.rows} />
          </section>
        ))}
      </div>
      <div className="grid g3">
        <Stat label="TAM, Brasil" value="R$ 45,9 mi/ano" hint={`${baseline.mercado.tam_empresas.toLocaleString('pt-BR')} empresas`} />
        <Stat label="SAM, São Paulo" value="R$ 11,9 mi/ano" hint={`${baseline.mercado.sam_empresas.toLocaleString('pt-BR')} empresas`} />
        <Stat label="SOM, região de Sorocaba" value="R$ 21,6 mil/ano" hint={`${goal} vans no 1º ano`} />
      </div>
    </div>
  );
}
