import {
  BadgeDollarSign, CalendarDays, CreditCard, FileCheck2, Home, LayoutGrid, Menu, MessagesSquare, MonitorPlay, Route, Settings, Ticket, Users, Wallet,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { fmtDate, plural } from '@vanflow/domain';
import { ClockChip, Loading, Logo, ThemeButton } from '../../components/ui.tsx';
import { useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

const NAV = [
  { to: '/painel', end: true, icon: Home, label: 'Hoje' },
  { to: '/painel/alunos', icon: Users, label: 'Alunos' },
  { to: '/painel/grade', icon: CalendarDays, label: 'Grade' },
  { to: '/painel/cobrancas', icon: BadgeDollarSign, label: 'Cobranças' },
  { to: '/painel/avulsas', icon: Ticket, label: 'Vagas avulsas' },
  { to: '/painel/rota', icon: Route, label: 'Rota' },
  { to: '/painel/documentos', icon: FileCheck2, label: 'Documentos' },
  { to: '/painel/financeiro', icon: Wallet, label: 'Financeiro' },
  { to: '/painel/mensagens', icon: MessagesSquare, label: 'Mensagens' },
  { to: '/painel/configuracoes', icon: Settings, label: 'Configurações' },
  { to: '/painel/assinatura', icon: CreditCard, label: 'Assinatura' },
];

const MOBILE_MAIN = NAV.slice(0, 4);

export function TrialBanner({ shell }: { shell: any }) {
  if (shell.subscription.status === 'active') return null;
  if (shell.subscription.status === 'canceled') {
    return <div className="trial-bar bad"><span>Assinatura cancelada. Os envios automáticos estão pausados.</span><Link to="/painel/assinatura">Assinar de novo</Link></div>;
  }
  if (shell.paused) {
    return <div className="trial-bar bad"><span>Seu teste grátis acabou. Os envios automáticos pausaram, mas você continua vendo tudo.</span><Link to="/painel/assinatura">Assinar agora</Link></div>;
  }
  const days = shell.trial_days_left;
  return (
    <div className="trial-bar">
      <span>{days === 0 ? 'Hoje é o último dia do seu teste grátis.' : `${days === 1 ? 'Falta' : 'Faltam'} ${plural(days, 'dia', 'dias')} do seu teste grátis, até ${fmtDate(shell.operator.trial_ends_at)}.`}</span>
      <Link to="/painel/assinatura">Ver assinatura</Link>
    </div>
  );
}

export function PanelLayout() {
  const { shell, operatorId, setOperatorId, vanId, setVanId } = useOperator();
  const operators = useLive<any[]>('/operators');
  const demo = useLive('/demo/state');
  const location = useLocation();
  const navigate = useNavigate();
  const [more, setMore] = useState(false);

  useEffect(() => setMore(false), [location.pathname]);
  useEffect(() => {
    document.title = shell ? `${shell.operator.trade_name} · VanFlow` : 'VanFlow';
    if (shell && !shell.operator.onboarded && location.pathname !== '/painel/comecar') navigate('/painel/comecar');
  }, [shell, location.pathname, navigate]);

  return (
    <div className="app">
      <aside className="side">
        <Logo onNavy />
        <nav aria-label="Painel do operador">
          {NAV.map(({ to, end, icon: Icon, label }) => (
            <NavLink key={to} to={to} end={end} className="nav-item"><Icon size={18} />{label}</NavLink>
          ))}
        </nav>
        <div className="side-foot">
          <Link to="/demo">Central da demo</Link>
          <Link to="/entrar">Trocar de perfil</Link>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{shell?.operator.trade_name ?? ''}</span>
          {shell && shell.vans.length > 1 && (
            <select aria-label="Van" value={vanId} onChange={(e) => setVanId(e.target.value)}>
              <option value="">Todas as vans</option>
              {shell.vans.map((v: any) => <option key={v.id} value={v.id}>{v.nickname}</option>)}
            </select>
          )}
          {(operators.data?.length ?? 0) > 1 && (
            <select className="account-picker" aria-label="Conta" value={operatorId} onChange={(e) => setOperatorId(e.target.value)}>
              {operators.data!.map((o) => <option key={o.id} value={o.id}>{o.trade_name}</option>)}
            </select>
          )}
          <ClockChip now={demo.data?.now} />
          <Link to="/demo" className="icon-btn" aria-label="Central da demo" title="Central da demo"><MonitorPlay size={18} /></Link>
          <ThemeButton />
        </div>
        {shell && <TrialBanner shell={shell} />}
        <main className="content">{shell ? <Outlet /> : <Loading />}</main>
      </div>
      <nav className="mobile-nav" aria-label="Menu">
        {MOBILE_MAIN.map(({ to, end, icon: Icon, label }) => <NavLink key={to} to={to} end={end}><Icon size={20} />{label}</NavLink>)}
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more}><Menu size={20} />Mais</button>
      </nav>
      {more && (
        <div className="more-menu">
          {NAV.slice(4).map(({ to, icon: Icon, label }) => <Link key={to} to={to}><Icon size={18} />{label}</Link>)}
          <Link to="/demo"><LayoutGrid size={18} />Central da demo</Link>
        </div>
      )}
    </div>
  );
}
