import { useState } from 'react';
import { brl, FLEET_PRICE_PER_VAN, fmtDate, plural, PRICE_PER_VAN, subscriptionMonthly } from '@vanflow/domain';
import { Modal, PageHead, Stat } from '../../components/ui.tsx';
import { post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';

export function Assinatura() {
  const act = useAct();
  const { shell, operatorId } = useOperator();
  const [plan, setPlan] = useState<'padrao' | 'frotista'>(shell.subscription.plan);
  const [canceling, setCanceling] = useState(false);
  const vans = shell.vans.length;
  const fleet = vans >= 4;
  const chosen = fleet ? plan : 'padrao';
  const monthly = subscriptionMonthly(vans, chosen);
  const active = shell.subscription.status === 'active';

  return (
    <>
      <PageHead eyebrow="Assinatura" title={active ? 'Sua assinatura está ativa' : 'Continue depois do teste'}>
        Um valor por van, alunos ilimitados, sem fidelidade e sem taxa sobre a mensalidade.
      </PageHead>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="ticket-app">
          <div className="ticket-left"><b>{active ? 'OK' : shell.trial_days_left}</b><span>{active ? 'assinatura ativa' : shell.trial_days_left === 1 ? 'dia grátis' : 'dias grátis'}</span></div>
          <div className="ticket-right">
            <p className="eyebrow">{active ? 'Tudo liberado' : 'Teste sem risco'}</p>
            <h2>{active ? `Desde ${fmtDate(shell.subscription.started_at)}` : `Até ${fmtDate(shell.operator.trial_ends_at)}`}</h2>
            <p className="muted small">Todas as funções liberadas. Cancele quando quiser, sem multa.</p>
          </div>
        </div>
        <section className="card stack">
          <div className="spread">
            <div><p className="eyebrow">{plural(vans, 'van', 'vans')}</p><h2>{brl(monthly)} por mês</h2></div>
          </div>
          <p className="muted small">{chosen === 'frotista'
            ? `${brl(PRICE_PER_VAN)} por van até a 3ª e ${brl(FLEET_PRICE_PER_VAN)} a partir da 4ª.`
            : `${brl(PRICE_PER_VAN)} por van por mês.`}</p>
          {fleet && (
            <div className="segmented" role="group" aria-label="Plano">
              <button type="button" aria-pressed={plan === 'padrao'} onClick={() => setPlan('padrao')}>Padrão</button>
              <button type="button" aria-pressed={plan === 'frotista'} onClick={() => setPlan('frotista')}>Frotista</button>
            </div>
          )}
          {!fleet && <p className="small muted">A partir da 4ª van, o plano frotista baixa para {brl(FLEET_PRICE_PER_VAN)} por van adicional.</p>}
          {active ? (
            <div><button type="button" className="btn danger small" onClick={() => setCanceling(true)}>Cancelar assinatura</button></div>
          ) : (
            <div><button type="button" className="btn primary" disabled={vans === 0} onClick={() => act(() => post(`/operators/${operatorId}/subscribe`, { plan: chosen }), 'Assinatura ativa. Obrigado!')}>Assinar agora</button></div>
          )}
          <p className="small muted">Na demonstração nada é cobrado de verdade.</p>
        </section>
        <Stat label="Conta que convence" value="menos de 2%" hint="do que uma van com 12 a 15 alunos fatura no mês (estimativa Efí Bank)." />
        <Stat label="Vendendo 1/3 dos lugares vazios" value={`cerca de ${brl(175)}`} hint="por van por mês em avulsas, quase três vezes a assinatura." tone="ok" />
      </div>
      {canceling && (
        <Modal title="Cancelar a assinatura?" onClose={() => setCanceling(false)}>
          <p>Sem multa. Os envios automáticos param, mas você continua vendo seus dados.</p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setCanceling(false)}>Manter assinatura</button>
            <button type="button" className="btn primary" onClick={() => { setCanceling(false); act(() => post(`/operators/${operatorId}/cancel-subscription`), 'Assinatura cancelada.'); }}>Cancelar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
