import { Link } from 'react-router-dom';

export function Topo() {
  return (
    <>
<div className="ribbon"><b>30 dias grátis</b> para os primeiros operadores de fretado universitário da região de Sorocaba. <a href="#participe">Quero testar</a></div>

<nav className="nav" id="nav" aria-label="Principal">
  <div className="wrap nav-in">
    <a className="logo" href="#topo" aria-label="VanFlow, início">
      <svg viewBox="0 0 32 32" aria-hidden="true"><rect x="1" y="1" width="30" height="30" rx="9" fill="#13233A"/><path d="M8 20 C12 20 12 12 16 12 S20 20 24 20" fill="none" stroke="#F2A62F" strokeWidth="3" strokeLinecap="round"/><circle cx="8" cy="20" r="2.5" fill="#F2A62F"/><circle cx="24" cy="20" r="2.5" fill="#F2A62F"/></svg>
      VanFlow
    </a>
    <div className="nav-links">
      <a className="hide-sm" href="#como-funciona">Como funciona</a>
      <a className="hide-sm" href="#diferenciais">Diferenciais</a>
      <a className="hide-sm" href="#preco">Preço</a>
      <Link className="hide-sm" to="/entrar">Entrar</Link>
      <a className="lp-btn primary small" href="#participe">Testar 30 dias grátis</a>
    </div>
  </div>
</nav>

<div className="wrap">
  <header className="hero" id="topo">
    <div className="hero-copy">
      <p className="eyebrow">Para fretado universitário</p>
      <h1>Saiba quem vai amanhã <span className="hl">antes de ligar a van.</span></h1>
      <p className="lead">A VanFlow confirma a presença dos alunos pelo WhatsApp, monta a lista do dia a partir da grade de aulas e cobra a mensalidade no Pix sozinha.</p>
      <div className="ctas">
        <a className="lp-btn primary" href="#participe">Testar grátis <span className="free">30 DIAS</span></a>
        <a className="lp-btn ghost" href="#como-funciona">Ver como funciona</a>
      </div>
      <div className="trust">
        <span><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#1D6B74"/><path d="M4.5 8.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Aluno não precisa baixar app</span>
        <span><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#1D6B74"/><path d="M4.5 8.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Rota no Maps ou no Waze</span>
        <span><svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="8" fill="#1D6B74"/><path d="M4.5 8.2l2.2 2.2 4.8-4.8" fill="none" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>Sem fidelidade</span>
      </div>
    </div>

    <div className="hero-visual">
      <div className="blob" aria-hidden="true"></div>
      <svg className="seal" viewBox="0 0 128 128" role="img" aria-label="Selo: 30 dias grátis, sem fidelidade">
        <circle cx="64" cy="64" r="62" fill="#F2A62F"/>
        <circle cx="64" cy="64" r="40" fill="#13233A"/>
        <defs><path id="sealPath" d="M64 64 m-51 0 a51 51 0 1 1 102 0 a51 51 0 1 1 -102 0"/></defs>
        <g className="spin"><text className="seal-ring"><textPath href="#sealPath">30 DIAS GRÁTIS · SEM FIDELIDADE · TESTE JÁ ·</textPath></text></g>
        <text x="64" y="66" textAnchor="middle" fontFamily="Bricolage Grotesque, DM Sans, Arial, sans-serif" fontWeight="800" fontSize="34" fill="#F2A62F">30</text>
        <text x="64" y="84" textAnchor="middle" fontFamily="IBM Plex Mono, Courier New, monospace" fontWeight="600" fontSize="10" fill="#F3F1EC" letterSpacing="1.5">DIAS GRÁTIS</text>
      </svg>
      <div className="phone" role="img" aria-label="Exemplo no celular: a VanFlow pergunta no WhatsApp se a aluna vai amanhã, ela responde que não, e a lista do dia do motorista é atualizada">
        <div className="screen">
          <div className="notch"><i></i></div>
          <div className="chat-head"><span className="avatar">V</span><div><b>VanFlow · Van do Seu Zé</b><small>Itu → Sorocaba</small></div></div>
          <div className="chat">
            <div className="msg m1">Oi, Ana! Amanhã (qui) você tem aula às 19h na Uniso. Vai na van?<span className="t">21:00</span></div>
            <div className="quick m2"><span>Vou</span><span className="on">Não vou</span></div>
            <div className="msg me m3">Não vou, a aula foi cancelada<span className="t">21:04</span></div>
            <div className="msg m4">Anotado! Seu lugar foi liberado. Até sexta.<span className="t">21:04</span></div>
          </div>
          <div className="list">
            <div className="list-h"><b>Lista de amanhã</b><span className="count">11 de 14 vão</span></div>
            <div className="row"><span>Bruno · Centro</span><span className="ok">vai</span></div>
            <div className="row"><span>Carla · Vila Nova</span><span className="ok">vai</span></div>
            <div className="row ana"><span className="name">Ana · Jd. Paulista</span><span className="st">não vai</span></div>
            <div className="row"><span>Diego · Rodoviária</span><span className="ok">vai</span></div>
            <div className="maps"><svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5c-2.6 0-4.6 2-4.6 4.6 0 3.5 4.6 8.4 4.6 8.4s4.6-4.9 4.6-8.4C12.6 3.5 10.6 1.5 8 1.5z" fill="#F2A62F"/><circle cx="8" cy="6.1" r="1.7" fill="#13233A"/></svg>Abrir rota no Maps</div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <div className="route" data-reveal role="img" aria-label="Ilustração: uma van percorre a estrada passando por Itu, Salto e Votorantim até chegar ao campus em Sorocaba">
    <svg viewBox="0 0 1140 210" aria-hidden="true">
      <path id="roadPath" className="road" d="M20 170 C 200 170, 260 92, 430 96 S 700 168, 860 132 S 1010 82, 1090 84"/>
      <path className="road-dash" d="M20 170 C 200 170, 260 92, 430 96 S 700 168, 860 132 S 1010 82, 1090 84"/>
      
      <g className="tree"><circle cx="300" cy="150" r="14"/><circle cx="318" cy="158" r="10"/><circle cx="620" cy="96" r="12"/><circle cx="960" cy="150" r="15"/><circle cx="978" cy="160" r="9"/><circle cx="80" cy="120" r="11"/></g>
      
      <g transform="translate(150 112)"><path className="house" d="M0 22 L18 6 L36 22 V44 H0 Z"/><path className="roof" d="M-4 24 L18 4 L40 24 L36 26 L18 10 L0 26 Z"/><rect x="13" y="30" width="10" height="14" className="ill-ink"/></g>
      <text className="town-label" x="168" y="200" textAnchor="middle">ITU</text>
      
      <g transform="translate(410 30)"><path className="house" d="M0 22 L18 6 L36 22 V44 H0 Z"/><path className="roof" d="M-4 24 L18 4 L40 24 L36 26 L18 10 L0 26 Z"/><rect x="13" y="30" width="10" height="14" className="ill-ink"/></g>
      <text className="town-label" x="428" y="134" textAnchor="middle">SALTO</text>
      
      <g transform="translate(690 96)"><path className="house" d="M0 22 L18 6 L36 22 V44 H0 Z"/><path className="roof" d="M-4 24 L18 4 L40 24 L36 26 L18 10 L0 26 Z"/><rect x="13" y="30" width="10" height="14" className="ill-ink"/></g>
      <text className="town-label" x="708" y="186" textAnchor="middle">VOTORANTIM</text>
      
      <g transform="translate(1000 6)">
        <path className="campus-roof" d="M0 34 L60 6 L120 34 Z"/>
        <rect className="campus" x="8" y="34" width="104" height="44"/>
        <rect className="ill-ink" x="22" y="42" width="8" height="30"/><rect className="ill-ink" x="44" y="42" width="8" height="30"/><rect className="ill-ink" x="68" y="42" width="8" height="30"/><rect className="ill-ink" x="90" y="42" width="8" height="30"/>
        <path d="M60 6 V-6" className="ill-line"/><path d="M60 -6 L74 -2 L60 2 Z" className="ill-amber"/>
      </g>
      <text className="dest-label" x="1060" y="118" textAnchor="middle">Sorocaba</text>
      
      <g id="routeVan">
        <g transform="translate(-30 -26) scale(.5)">
          <path className="v-body" d="M8 44 V22 Q8 12 18 12 H82 Q92 12 98 20 L110 32 Q114 36 114 42 V46 H8 Z"/>
          <path className="v-win" d="M20 18 H44 V30 H16 V22 Q16 18 20 18Z"/><rect className="v-win" x="48" y="18" width="22" height="12" rx="2"/><path className="v-win" d="M74 18 H86 Q91 18 95 23 L101 30 H74Z"/>
          <rect className="v-stripe" x="8" y="36" width="106" height="3"/>
          <circle className="v-wheel" cx="30" cy="46" r="9"/><circle className="v-hub" cx="30" cy="46" r="3.5"/><circle className="v-wheel" cx="92" cy="46" r="9"/><circle className="v-hub" cx="92" cy="46" r="3.5"/>
          <circle className="v-light" cx="111" cy="38" r="2.4"/>
        </g>
        <animateMotion dur="12s" repeatCount="indefinite" rotate="auto"><mpath href="#roadPath"/></animateMotion>
      </g>
    </svg>
  </div>
</div>
    </>
  );
}
