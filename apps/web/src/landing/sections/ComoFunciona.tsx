import type { CSSProperties } from 'react';

export function ComoFunciona() {
  return (
    <>
<div className="dark" id="como-funciona">
  <div className="wrap">
    <section className="block" aria-labelledby="como">
      <div className="head" data-reveal>
        <p className="eyebrow">Como funciona</p>
        <h2 id="como">Três passos, e o WhatsApp que todo mundo já usa.</h2>
      </div>
      <div className="steps">
        <article className="step" data-reveal style={{ '--d': '0s' } as CSSProperties}>
          <span className="n">1</span>
          <svg viewBox="0 0 280 140" aria-hidden="true">
            <text className="dk-text" x="44" y="26" textAnchor="middle">SEG</text><text className="dk-text" x="92" y="26" textAnchor="middle">TER</text><text className="dk-text" x="140" y="26" textAnchor="middle">QUA</text><text className="dk-text" x="188" y="26" textAnchor="middle">QUI</text><text className="dk-text" x="236" y="26" textAnchor="middle">SEX</text>
            <g><rect className="dk-class" x="24" y="36" width="40" height="22" rx="5"/><rect className="dk-cell" x="72" y="36" width="40" height="22" rx="5"/><rect className="dk-class" x="120" y="36" width="40" height="22" rx="5"/><rect className="dk-class" x="168" y="36" width="40" height="22" rx="5"/><rect className="dk-cell" x="216" y="36" width="40" height="22" rx="5"/>
            <rect className="dk-cell" x="24" y="64" width="40" height="22" rx="5"/><rect className="dk-class" x="72" y="64" width="40" height="22" rx="5"/><rect className="dk-cell" x="120" y="64" width="40" height="22" rx="5"/><rect className="dk-class" x="168" y="64" width="40" height="22" rx="5"/><rect className="dk-class" x="216" y="64" width="40" height="22" rx="5"/>
            <rect className="dk-cell" x="24" y="92" width="40" height="22" rx="5"/><rect className="dk-cell" x="72" y="92" width="40" height="22" rx="5"/><rect className="dk-class" x="120" y="92" width="40" height="22" rx="5"/><rect className="dk-cell" x="168" y="92" width="40" height="22" rx="5"/><rect className="dk-cell" x="216" y="92" width="40" height="22" rx="5"/></g>
            <rect className="dk-today" x="163" y="31" width="50" height="88" rx="8"/>
          </svg>
          <h3>O aluno informa a grade do semestre</h3><p className="muted">Uma vez só. A VanFlow já sabe em que dias e horários cada um vai.</p>
        </article>
        <article className="step" data-reveal style={{ '--d': '.12s' } as CSSProperties}>
          <span className="n">2</span>
          <svg viewBox="0 0 280 140" aria-hidden="true">
            <rect className="dk-bubble" x="22" y="18" width="190" height="40" rx="14"/><text className="dk-bubble-text" x="36" y="43">Amanhã tem aula 19h. Vai?</text>
            <rect className="dk-teal" x="22" y="66" width="90" height="26" rx="9"/><text x="67" y="84" textAnchor="middle" fontFamily="DM Sans, Arial, sans-serif" fontWeight="700" fontSize="13" fill="#13233A">Vou</text>
            <rect x="120" y="66" width="92" height="26" rx="9" fill="none" stroke="#6CC2C8" strokeWidth="2"/><text x="166" y="84" textAnchor="middle" fontFamily="DM Sans, Arial, sans-serif" fontWeight="700" fontSize="13" fill="#6CC2C8">Não vou</text>
            <rect className="dk-bubble-me" x="150" y="100" width="108" height="30" rx="12"/><text className="dk-bubble-text" x="164" y="120">Vou!</text>
            <path d="M222 115 l5 5 9 -10" fill="none" stroke="#1D6B74" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h3>Confirmação na noite anterior</h3><p className="muted">O aluno recebe uma mensagem no WhatsApp e só responde quando alguma coisa muda.</p>
        </article>
        <article className="step" data-reveal style={{ '--d': '.24s' } as CSSProperties}>
          <span className="n">3</span>
          <svg viewBox="0 0 280 140" aria-hidden="true">
            <rect className="dk-fill" x="20" y="16" width="120" height="110" rx="12"/>
            <rect x="34" y="34" width="70" height="8" rx="4" fill="#F3F1EC"/>
            <circle className="dk-teal" cx="40" cy="60" r="5"/><rect x="52" y="56" width="70" height="8" rx="4" fill="#C0CAD6"/>
            <circle className="dk-teal" cx="40" cy="80" r="5"/><rect x="52" y="76" width="60" height="8" rx="4" fill="#C0CAD6"/>
            <circle className="dk-teal" cx="40" cy="100" r="5"/><rect x="52" y="96" width="66" height="8" rx="4" fill="#C0CAD6"/>
            <rect x="150" y="16" width="110" height="110" rx="12" fill="#24395A"/>
            <path d="M150 60 H260 M150 96 H260 M190 16 V126 M230 16 V126" stroke="#2F4A70" strokeWidth="6"/>
            <path d="M166 110 C 190 100, 186 70, 210 64 S 240 40, 246 30" fill="none" stroke="#F2A62F" strokeWidth="3.5" strokeDasharray="6 6" strokeLinecap="round"/>
            <circle className="dk-teal" cx="166" cy="110" r="6"/><circle className="dk-teal" cx="210" cy="64" r="6"/>
            <path d="M246 18 c-6 0 -10 4 -10 10 c0 8 10 18 10 18 s10 -10 10 -18 c0 -6 -4 -10 -10 -10z" className="dk-amber"/><circle cx="246" cy="28" r="3.5" fill="#13233A"/>
          </svg>
          <h3>Lista e rota prontas</h3><p className="muted">Você abre o app, vê quem vai e toca em "Abrir rota" para seguir no Google Maps ou no Waze.</p>
        </article>
      </div>
      <div className="track" aria-hidden="true">
        <div className="lane"></div>
        <svg className="runner" viewBox="0 0 122 56"><path className="v-body" d="M8 44 V22 Q8 12 18 12 H82 Q92 12 98 20 L110 32 Q114 36 114 42 V46 H8 Z"/><path className="v-win" d="M20 18 H44 V30 H16 V22 Q16 18 20 18Z"/><rect className="v-win" x="48" y="18" width="22" height="12" rx="2"/><path className="v-win" d="M74 18 H86 Q91 18 95 23 L101 30 H74Z"/><circle className="v-wheel" cx="30" cy="46" r="9"/><circle className="v-hub" cx="30" cy="46" r="3.5"/><circle className="v-wheel" cx="92" cy="46" r="9"/><circle className="v-hub" cx="92" cy="46" r="3.5"/><circle className="v-light" cx="111" cy="38" r="2.4"/></svg>
      </div>
    </section>
  </div>
</div>
    </>
  );
}
