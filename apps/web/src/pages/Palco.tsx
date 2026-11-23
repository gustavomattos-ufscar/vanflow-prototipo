/** Modo apresentação: celular do aluno, painel do operador e o roteiro passo a passo. */
import { ChevronRight, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { brl, firstName, fmtClock, fmtKm, fmtWeekdayDate, plural } from '@vanflow/domain';
import { Chat } from '../components/Chat.tsx';
import { RoutePreview } from '../components/RoutePreview.tsx';
import { Loading, Pill, QrImage, Stat } from '../components/ui.tsx';
import { post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';
import { HojeBoard } from './panel/Hoje.tsx';

type View = 'hoje' | 'rota' | 'cobrancas';

interface Step { title: string; text: string; student: string; view: View; run?: () => Promise<unknown> }

const advance = (preset: string) => () => post('/demo/advance', { preset });

const INITIAL_NOW = '2026-11-11T20:55:00-03:00';
const STEP_KEY = 'vanflow.palco.passo';

function savedStep(): number {
  try {
    return Number(sessionStorage.getItem(STEP_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveStep(index: number): void {
  try {
    sessionStorage.setItem(STEP_KEY, String(index));
  } catch {
    /* sem armazenamento, o passo vale até recarregar */
  }
}

const STEPS: Step[] = [
  { title: 'Quarta, 20h55', text: 'A grade já sabe quem tem aula amanhã. Ninguém leu grupo de WhatsApp.', student: 'st_ana', view: 'hoje' },
  { title: '21h: a confirmação', text: 'A VanFlow pergunta só para quem tem aula na quinta.', student: 'st_ana', view: 'hoje', run: advance('21h') },
  { title: 'Ana avisa que não vai', text: 'O lugar é liberado sem recarregar a tela. O motivo vai junto.', student: 'st_ana', view: 'hoje', run: () => post('/demo/ana-nao-vai') },
  { title: 'Os outros respondem', text: 'O Seu Zé não leu nenhuma mensagem.', student: 'st_bruno', view: 'hoje', run: () => post('/demo/simulate-replies', { pct_yes: 80, quiet: true }) },
  { title: 'A Carla recebe a oferta', text: 'Ela não tem plano. O lugar de quem faltou vira oferta no WhatsApp.', student: 'st_carla', view: 'hoje' },
  {
    title: 'Carla reserva', text: 'A vaga fica segura por 30 minutos, com Pix copia e cola e QR Code.', student: 'st_carla', view: 'hoje',
    run: () => post('/demo/carla-reserva'),
  },
  { title: 'Carla paga e entra na lista', text: 'O lugar de quem faltou virou R$ 20 para o operador.', student: 'st_carla', view: 'hoje', run: () => post('/demo/pagar-reserva/st_carla') },
  { title: 'Quinta, 17h30: a rota', text: 'A VanFlow ordena, o Maps e o Waze navegam. Sem a casa da Ana.', student: 'st_carla', view: 'rota', run: advance('quinta-17h30') },
  { title: 'Dia 1: as cobranças saem sozinhas', text: 'Cada aluno recebe o Pix do mês no WhatsApp, com a chave do operador.', student: 'st_ana', view: 'cobrancas', run: advance('dia-1') },
  { title: 'Quase todos pagam', text: 'A baixa é automática e o recibo vai na hora.', student: 'st_ana', view: 'cobrancas', run: () => post('/demo/pagar-menos-3') },
  { title: 'Dia 8: quem não pagou', text: 'Ninguém precisou cobrar ninguém: os lembretes saíram sozinhos.', student: 'st_diego', view: 'cobrancas', run: advance('dia-8') },
];

function RotaPanel() {
  const { data } = useLive<any>('/operators/op_ze/driver?van=van_itu');
  if (!data) return <Loading />;
  if (!data.route) return <p className="note">Nenhuma viagem da van de Itu nos próximos dias.</p>;
  const route = data.route;
  const going = route.stops.filter((s: any) => s.kind === 'aluno');
  return (
    <div className="stack">
      <div className="spread">
        <div><p className="eyebrow">Rota do dia · {fmtWeekdayDate(route.date)}</p><h2>{route.line_name}</h2></div>
        <div className="savings"><span>{fmtKm(route.km)}</span><span>{fmtKm(route.saved_km)} a menos</span></div>
      </div>
      <RoutePreview route={route} height={400} />
      <div className="card">
        <div className="pax-list" style={{ marginTop: 0 }}>
          {going.map((s: any, i: number) => (
            <div key={s.order} className="pax"><span><b className="mono">{i + 1}.</b> {firstName(s.name)}<small>{s.label}</small></span><span className="stop-eta">{s.eta}</span></div>
          ))}
        </div>
      </div>
    </div>
  );
}

function CobrancasPanel() {
  const state = useLive<any>('/demo/state');
  const month = state.data?.date?.slice(0, 7);
  const { data } = useLive<any>(month ? `/invoices?operator=op_ze&month=${month}` : null);
  if (!data) return <Loading />;
  const open = data.rows.filter((r: any) => r.status !== 'paga');
  const sample = open[0] ?? data.rows[0];
  return (
    <div className="stack">
      <div className="grid g3">
        <Stat label="Recebido" value={brl(data.totals.received)} tone="ok" />
        <Stat label="A receber" value={brl(data.totals.receivable)} tone="warn" />
        <Stat label="Atrasado" value={brl(data.totals.late)} hint={plural(data.totals.late_count, 'cobrança', 'cobranças')} tone="bad" />
      </div>
      <div className="grid g2">
        <div className="card">
          <h3 className="card-title">{open.length ? 'Em aberto' : 'Tudo pago'}</h3>
          <div className="dash-list">
            {open.slice(0, 7).map((r: any) => <div key={r.id} className="dash-row"><span>{r.name}</span><Pill status={r.status} /></div>)}
          </div>
        </div>
        {sample && (
          <div className="card" style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
            <QrImage payload={sample.pix_payload} size={190} />
            <span className="small muted">Pix de {firstName(sample.name)}, {brl(sample.amount)}. Lê em qualquer banco.</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function PalcoPage() {
  const act = useAct();
  const demo = useLive<any>('/demo/state');
  const conversations = useLive<any[]>('/whatsapp/conversations');
  const [index, setIndexState] = useState(savedStep);
  const [student, setStudent] = useState(() => STEPS[savedStep()].student);
  const [view, setView] = useState<View>(() => STEPS[savedStep()].view);
  const running = useRef(false);
  const setIndex = useCallback((value: number) => {
    saveStep(value);
    setIndexState(value);
  }, []);

  // Reset feito fora daqui (npm run reset, Central da demo): o roteiro volta ao começo.
  // Olha a mudança do relógio, não o valor: logo depois de "Próximo passo" o relógio
  // ainda mostra 20h55 por um instante, e isso não é reset.
  const lastNow = useRef<string | undefined>(undefined);
  useEffect(() => {
    const now = demo.data?.now;
    if (!now || now === lastNow.current) return;
    lastNow.current = now;
    if (now === INITIAL_NOW && savedStep() > 0) {
      setIndex(0);
      setStudent(STEPS[0].student);
      setView(STEPS[0].view);
    }
  }, [demo.data?.now, setIndex]);

  useEffect(() => {
    document.title = 'Modo apresentação · VanFlow';
  }, []);

  const next = useCallback(async () => {
    if (running.current || index >= STEPS.length - 1) return;
    running.current = true;
    const step = STEPS[index + 1];
    setStudent(step.student);
    setView(step.view);
    if (step.run) await act(step.run);
    setIndex(index + 1);
    running.current = false;
  }, [act, index, setIndex]);

  const reset = useCallback(async () => {
    await act(() => post('/demo/reset'), 'Demo resetada.');
    setIndex(0);
    setStudent('st_ana');
    setView('hoje');
  }, [act, setIndex]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement).matches('input,textarea,select')) return;
      if (event.key === 'ArrowRight') next();
      if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey) reset();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [next, reset]);

  const step = STEPS[index];
  const panels: Record<View, ReactNode> = {
    hoje: <HojeBoard operatorId="op_ze" vanId="van_itu" compact autoDay />, rota: <RotaPanel />, cobrancas: <CobrancasPanel />,
  };

  return (
    <div className="stage">
      <div className="stage-main">
        <div className="stage-phone">
          <select aria-label="Celular de qual aluno" value={student} onChange={(e) => setStudent(e.target.value)}>
            {(conversations.data ?? []).filter((c) => c.operator_id === 'op_ze').sort((a, b) => a.name.localeCompare(b.name)).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <Chat studentId={student} />
        </div>
        <div className="stage-panel">{panels[view]}</div>
      </div>
      <div className="stage-bar">
        <span className="time">{demo.data ? `${fmtWeekdayDate(demo.data.now)} · ${fmtClock(demo.data.now)}` : ''}</span>
        <div className="stage-caption"><b>{step.title}</b>{step.text}</div>
        <span className="stage-step">Passo {index + 1} de {STEPS.length}</span>
        <button type="button" className="btn ghost small" onClick={reset} title="Atalho: R"><RotateCcw size={16} />Reset</button>
        <button type="button" className="btn primary" onClick={next} disabled={index >= STEPS.length - 1} title="Atalho: seta para a direita">Próximo passo<ChevronRight size={18} /></button>
        <Link to="/demo" className="btn ghost small">Sair</Link>
      </div>
    </div>
  );
}
