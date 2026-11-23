import type { CSSProperties } from 'react';

export function Dores() {
  return (
    <>
<div className="wrap">
  <section className="block" aria-labelledby="dor">
    <div className="head" data-reveal>
      <p className="eyebrow">Você reconhece isso?</p>
      <h2 id="dor">O dia de quem faz fretado universitário começa no improviso.</h2>
    </div>
    <div className="pains">
      <article className="pain" data-reveal style={{ '--d': '.0s' } as CSSProperties}>
        <svg viewBox="0 0 260 130" aria-hidden="true">
          <rect className="ill-fill" x="96" y="14" width="68" height="104" rx="12"/>
          <rect className="ill-soft" x="104" y="28" width="52" height="78" rx="4"/>
          <rect className="ill-fill" x="110" y="36" width="34" height="10" rx="5"/><rect className="ill-fill" x="116" y="52" width="34" height="10" rx="5"/><rect className="ill-fill" x="110" y="68" width="30" height="10" rx="5"/><rect className="ill-fill" x="118" y="84" width="32" height="10" rx="5"/>
          <circle className="ill-amber" cx="164" cy="18" r="16"/><text className="ill-text" x="164" y="24" textAnchor="middle" fontSize="15">40</text>
          <path className="ill-line" d="M50 46 q10 -12 22 0 M58 30 q14 -14 30 0" opacity=".5"/>
          <text className="ill-mono" x="196" y="70" fontSize="12">21:00</text>
        </svg>
        <p className="time">21h, na véspera</p><h3>"Quem vai amanhã?"</h3><p className="muted">Aula cancelada, prova, feriado. A presença muda todo dia e você descobre lendo dezenas de mensagens no grupo.</p>
      </article>
      <article className="pain" data-reveal style={{ '--d': '.12s' } as CSSProperties}>
        <svg viewBox="0 0 260 130" aria-hidden="true">
          <circle className="ill-fill" cx="78" cy="64" r="42"/>
          <path className="ill-line" d="M78 64 L78 34 M78 64 L102 76" strokeWidth="3.5"/>
          <circle className="ill-ink" cx="78" cy="64" r="4"/>
          <g transform="translate(140 46) scale(.85)"><path className="v-body" d="M8 44 V22 Q8 12 18 12 H82 Q92 12 98 20 L110 32 Q114 36 114 42 V46 H8 Z"/><path className="v-win" d="M20 18 H44 V30 H16 V22 Q16 18 20 18Z"/><rect className="v-win" x="48" y="18" width="22" height="12" rx="2"/><path className="v-win" d="M74 18 H86 Q91 18 95 23 L101 30 H74Z"/><circle className="v-wheel" cx="30" cy="46" r="9"/><circle className="v-hub" cx="30" cy="46" r="3.5"/><circle className="v-wheel" cx="92" cy="46" r="9"/><circle className="v-hub" cx="92" cy="46" r="3.5"/></g>
          <text className="ill-mono" x="166" y="36" fontSize="12">esperando…</text>
        </svg>
        <p className="time">6h40, na saída</p><h3>Parada à toa</h3><p className="muted">Você passa na casa de quem não ia e ainda monta a rota de cabeça, gastando tempo e combustível.</p>
      </article>
      <article className="pain" data-reveal style={{ '--d': '.24s' } as CSSProperties}>
        <svg viewBox="0 0 260 130" aria-hidden="true">
          <rect className="ill-fill" x="54" y="22" width="92" height="92" rx="12"/>
          <rect className="ill-amber" x="54" y="22" width="92" height="24" rx="12"/><rect className="ill-amber" x="54" y="34" width="92" height="12"/>
          <text className="ill-text" x="100" y="96" textAnchor="middle" fontSize="44">10</text>
          <circle className="ill-teal" cx="176" cy="74" r="28"/><text className="ill-white" x="176" y="81" textAnchor="middle" fontSize="18">Pix</text>
          <path className="ill-line" d="M196 30 l10 10 m0 -10 l-10 10" strokeWidth="3"/>
        </svg>
        <p className="time">Dia 10, no vencimento</p><h3>Cobrar um por um</h3><p className="muted">Conferir Pix, mandar lembrete, cobrar de novo. Todo mês, para cada aluno.</p>
      </article>
    </div>
  </section>
</div>
    </>
  );
}
