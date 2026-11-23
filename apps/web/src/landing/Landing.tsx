import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Field, Modal } from '../components/ui.tsx';
import { post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import './landing.css';
import { ComoFunciona } from './sections/ComoFunciona.tsx';
import { Diferenciais } from './sections/Diferenciais.tsx';
import { Dores } from './sections/Dores.tsx';
import { Faq } from './sections/Faq.tsx';
import { Oferta } from './sections/Oferta.tsx';
import { Participe } from './sections/Participe.tsx';
import { Topo } from './sections/Topo.tsx';

function LeadForm({ kind, onClose }: { kind: 'operador' | 'estudante'; onClose: () => void }) {
  const act = useAct();
  const [sent, setSent] = useState(false);
  const operator = kind === 'operador';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const result = await act(() => post('/leads', { ...data, kind }));
    if (result) setSent(true);
  };

  if (sent) {
    return (
      <Modal title="Recebemos!" onClose={onClose}>
        <p>A gente chama você no WhatsApp.</p>
        <div className="modal-actions"><button type="button" className="btn primary" onClick={onClose}>Fechar</button></div>
      </Modal>
    );
  }
  return (
    <Modal title={operator ? 'Quero meus 30 dias grátis' : 'Responder a pesquisa'} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="full"><Field label="Seu nome"><input name="name" required autoComplete="name" /></Field></div>
        <Field label="WhatsApp"><input name="whatsapp" required inputMode="tel" placeholder="(15) 9XXXX-XXXX" /></Field>
        <Field label="Cidade"><input name="city" required /></Field>
        {operator ? (
          <>
            <Field label="Quantas vans?"><input name="vans_count" type="number" min="1" max="50" defaultValue="1" required /></Field>
            <Field label="Faculdades que atende"><input name="faculties" placeholder="Uniso, Facens, UFSCar" /></Field>
          </>
        ) : (
          <>
            <Field label="Faculdade"><input name="faculties" placeholder="Uniso, Facens, UFSCar" /></Field>
            <Field label="O que mais incomoda na van?"><input name="message" /></Field>
          </>
        )}
        <div className="full modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>Agora não</button>
          <button type="submit" className="btn primary">{operator ? 'Enviar meu contato' : 'Enviar resposta'}</button>
        </div>
      </form>
    </Modal>
  );
}

export function Landing() {
  const root = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState<'operador' | 'estudante' | null>(null);

  useEffect(() => {
    document.title = 'VanFlow';
    const page = root.current!;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce) page.querySelectorAll('svg').forEach((svg) => svg.pauseAnimations?.());

    const nav = page.querySelector('#nav');
    const onScroll = () => nav?.classList.toggle('scrolled', window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    const items = [...page.querySelectorAll<HTMLElement>('[data-reveal]')];
    let observer: IntersectionObserver | undefined;
    if (!reduce && 'IntersectionObserver' in window) {
      page.classList.add('rv');
      const height = window.innerHeight || 800;
      items.forEach((el) => { if (el.getBoundingClientRect().top < height * 0.95) el.classList.add('in'); });
      observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            observer?.unobserve(entry.target);
          }
        });
      }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 });
      items.forEach((el) => { if (!el.classList.contains('in')) observer?.observe(el); });
    }
    const showAll = () => items.forEach((el) => el.classList.add('in'));
    window.addEventListener('beforeprint', showAll);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('beforeprint', showAll);
      observer?.disconnect();
    };
  }, []);

  return (
    <div className="lp" ref={root}>
      <Topo />
      <Dores />
      <ComoFunciona />
      <Diferenciais />
      <Oferta />
      <Faq />
      <Participe onOperator={() => setForm('operador')} onStudent={() => setForm('estudante')} />
      {form && <LeadForm kind={form} onClose={() => setForm(null)} />}
    </div>
  );
}
