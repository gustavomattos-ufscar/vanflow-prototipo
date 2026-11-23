import { BarChart3, Bus, Globe, MessageCircle, MonitorPlay, Truck } from 'lucide-react';
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Logo, ThemeButton, VanArt } from '../components/ui.tsx';

const CARDS = [
  { to: '/painel', icon: Bus, title: 'Sou operador', text: 'Entrar como Seu Zé, da Van do Seu Zé.' },
  { to: '/motorista', icon: Truck, title: 'Sou motorista', text: 'Entrar como Edson: lista do dia e rota.' },
  { to: '/whatsapp', icon: MessageCircle, title: 'Sou estudante', text: 'Abrir o simulador de WhatsApp.' },
  { to: '/demo', icon: MonitorPlay, title: 'Central da demo', text: 'Relógio, cenários e modo apresentação.' },
  { to: '/startup', icon: BarChart3, title: 'Painel da startup', text: 'Contatos, funil, MRR e validação.' },
  { to: '/', icon: Globe, title: 'Ver a landing page', text: 'A página que os operadores veem.' },
];

export function Entrar() {
  useEffect(() => {
    document.title = 'Entrar · VanFlow';
  }, []);
  return (
    <main className="enter">
      <div className="spread" style={{ width: 'min(960px,100%)' }}>
        <Logo />
        <ThemeButton />
      </div>
      <div style={{ textAlign: 'center' }}>
        <p className="eyebrow">Demonstração</p>
        <h1>Quem vai usar a VanFlow agora?</h1>
        <p className="muted" style={{ marginTop: 6 }}>Sem senha. Todos os dados são fictícios.</p>
      </div>
      <div className="enter-grid">
        {CARDS.map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="enter-card"><Icon size={26} /><b>{title}</b><span>{text}</span></Link>
        ))}
      </div>
      <div className="enter-band" aria-hidden="true">
        <svg viewBox="0 0 1140 90">
          <path d="M0 62 H1140" stroke="var(--road)" strokeWidth="16" />
          <path d="M0 62 H1140" stroke="#F2A62F" strokeWidth="3" strokeDasharray="12 12" />
          <g transform="translate(120 12)"><VanArt width={110} /></g>
        </svg>
      </div>
    </main>
  );
}
