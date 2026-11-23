import type { CSSProperties } from 'react';

import { Link } from 'react-router-dom';

export function Participe({ onOperator, onStudent }: { onOperator: () => void; onStudent: () => void }) {
  return (
    <>
<div className="wrap" id="participe">
  <section className="block" aria-labelledby="part-t">
    <div className="head" data-reveal><p className="eyebrow">Participe</p><h2 id="part-t">Estamos escolhendo os primeiros operadores do teste.</h2></div>
    <div className="join">
      <div className="card-join op" data-reveal>
        <span className="free-pill">30 DIAS GRÁTIS</span>
        <h3>Sou motorista ou dono de van</h3>
        <p>Deixe seu contato e a gente configura a VanFlow com você. Leva 1 minuto.</p>
        <div><button type="button" className="lp-btn primary" onClick={onOperator}>Quero meus 30 dias grátis</button></div>
        <svg className="deco" viewBox="0 0 122 56" aria-hidden="true"><path className="v-body" d="M8 44 V22 Q8 12 18 12 H82 Q92 12 98 20 L110 32 Q114 36 114 42 V46 H8 Z"/><path className="v-win" d="M20 18 H44 V30 H16 V22 Q16 18 20 18Z"/><rect className="v-win" x="48" y="18" width="22" height="12" rx="2"/><path className="v-win" d="M74 18 H86 Q91 18 95 23 L101 30 H74Z"/><circle className="v-wheel" cx="30" cy="46" r="9"/><circle className="v-hub" cx="30" cy="46" r="3.5"/><circle className="v-wheel" cx="92" cy="46" r="9"/><circle className="v-hub" cx="92" cy="46" r="3.5"/><circle className="v-light" cx="111" cy="38" r="2.4"/></svg>
      </div>
      <div className="card-join st" data-reveal style={{ '--d': '.12s' } as CSSProperties}>
        <h3>Sou estudante</h3>
        <p className="muted">Usa van ou fretado para ir à faculdade? Responda a nossa pesquisa de 2 minutos e ajude a construir a VanFlow.</p>
        <div><button type="button" className="lp-btn ghost" onClick={onStudent}>Responder a pesquisa</button></div>
      </div>
    </div>
  </section>
</div>

<div className="wrap">
  <footer><span>VanFlow · Menos burocracia, mais segurança em cada viagem.</span><span>Sorocaba, SP · UFSCar · <Link to="/entrar">Entrar</Link></span></footer>
</div>
    </>
  );
}
