import type { CSSProperties } from 'react';

export function Oferta() {
  return (
    <>
<div className="trial">
  <div className="wrap">
    <section className="block" aria-labelledby="trial-t">
      <div className="ticket" data-reveal>
        <span className="notch-l" aria-hidden="true"></span><span className="notch-r" aria-hidden="true"></span>
        <div className="ticket-l"><span className="big30">30</span><span className="big30-s">dias grátis</span></div>
        <div className="ticket-r">
          <p className="eyebrow" style={{ 'color': '#8E5209' } as CSSProperties}>Teste sem risco</p>
          <h2 id="trial-t">Use a VanFlow por 30 dias sem pagar nada.</h2>
          <ul className="checks">
            <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Todas as funções liberadas</li>
            <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Alunos ilimitados</li>
            <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Configuramos com você pelo WhatsApp</li>
            <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Sem fidelidade</li>
          </ul>
          <div><a className="lp-btn dark" href="#participe">Começar meus 30 dias grátis</a></div>
        </div>
      </div>
    </section>
  </div>
</div>

<div className="wrap" id="preco">
  <section className="block" aria-labelledby="preco-t">
    <div className="head" data-reveal>
      <p className="eyebrow">Preço</p>
      <h2 id="preco-t">Um valor por van. Sem taxa sobre a mensalidade.</h2>
    </div>
    <div className="price-wrap">
      <div className="price" data-reveal>
        <span className="price-badge">30 dias grátis</span>
        <div className="timeline">
          <div className="tl free"><span className="k">Primeiros 30 dias</span><span className="v">R$ 0</span></div>
          <div className="tl paid"><span className="k">Depois</span><span className="v">R$ 59,90 <small>por van/mês</small></span></div>
        </div>
        <ul>
          <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Alunos ilimitados em cada van</li>
          <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Sem fidelidade: cancele quando quiser</li>
          <li><svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="10" fill="#1D6B74"/><path d="M5.5 10.2l3 3 6-6.2" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>Suporte humano pelo WhatsApp</li>
        </ul>
        <a className="lp-btn primary" href="#participe">Testar grátis <span className="free">30 DIAS</span></a>
      </div>
      <div className="math" data-reveal style={{ '--d': '.12s' } as CSSProperties}>
        <p className="eyebrow">Faz a conta</p>
        <p className="big">menos de 2%</p>
        <div className="meter" role="img" aria-label="A assinatura equivale a cerca de 1,5% do faturamento mensal de uma van"><i></i></div>
        <p className="muted">do que uma van com 12 a 15 alunos fatura no mês, que fica entre R$ 4 mil e R$ 9 mil segundo estimativa do Efí Bank. Basta evitar uma mensalidade não paga para a VanFlow se pagar.</p>
      </div>
    </div>
  </section>
</div>
    </>
  );
}
