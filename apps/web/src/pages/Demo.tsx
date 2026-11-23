import {
  Bell, CalendarClock, CircleDollarSign, FileWarning, MessageCircle, MonitorPlay, Play, RotateCcw, Route, Send, Ticket, UserPlus, Users,
} from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { fmtClock, fmtDate, fmtDayMonth, WEEKDAY_LONG } from '@vanflow/domain';
import { ErrorNote, Field, Loading, Logo, Modal, ThemeButton } from '../components/ui.tsx';
import { post } from '../lib/api.ts';
import { useAct } from '../lib/context.tsx';
import { useLive } from '../lib/live.ts';

export const CLOCK_BUTTONS: Array<[string, string]> = [
  ['+15', '+15 min'], ['+60', '+1 h'], ['20h55', 'Ir para 20h55'], ['21h', 'Ir para 21h'], ['quarta-20h55', 'Ir para quarta 20h55'], ['manha-6h', 'Próxima manhã 6h'],
  ['quinta-17h30', 'Quinta 17h30'], ['dia-1', 'Ir para dia 1'], ['dia-5', 'Ir para dia 5'], ['dia-8', 'Ir para dia 8'],
];

const MODULES: Array<[string, string, 'MVP' | 'Próxima versão']> = [
  ['/painel/grade', 'Lista do dia pela grade', 'MVP'], ['/whatsapp', 'Confirmação no WhatsApp', 'MVP'], ['/painel/cobrancas', 'Cobrança Pix com lembretes', 'MVP'],
  ['/painel/avulsas', 'Vagas avulsas', 'MVP'], ['/painel/alunos', 'Planos por dias', 'MVP'], ['/', 'Landing page', 'MVP'],
  ['/painel/rota', 'Rota no Maps ou no Waze', 'Próxima versão'], ['/motorista', 'Visão do motorista', 'Próxima versão'], ['/painel/financeiro', 'Lucro por van', 'Próxima versão'],
  ['/painel/documentos', 'Documentos e alertas', 'Próxima versão'], ['/a/ana', 'Página do aluno', 'Próxima versão'], ['/startup', 'Painel da startup', 'Próxima versão'],
];

const ICONS: Record<string, typeof Bell> = {
  confirmacao: Send, resposta: MessageCircle, lembrete: Bell, fechamento: Users, oferta: Ticket, avulsa: Ticket, pagamento: CircleDollarSign, cobranca: CircleDollarSign,
  atraso: CalendarClock, documento: FileWarning, assinatura: CircleDollarSign, lead: UserPlus, cadastro: Users, viagem: Route, demo: Play,
};

function WebhookForm() {
  const act = useAct();
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = Object.fromEntries(new FormData(form));
    act(() => post('/webhooks/pix', data), 'Webhook recebido.').then((r) => r && form.reset());
  };
  return (
    <form onSubmit={submit} className="row-gap" style={{ alignItems: 'flex-end' }}>
      <div style={{ flex: 2, minWidth: 180 }}><Field label="txid"><input name="txid" required placeholder="VF202611DIEGO01" className="mono" /></Field></div>
      <div style={{ flex: 1, minWidth: 90 }}><Field label="Valor"><input name="amount" required type="number" step="0.01" min="0" placeholder="220.00" /></Field></div>
      <button type="submit" className="btn quiet small">Enviar webhook</button>
    </form>
  );
}

export function ClockBig({ state }: { state: any }) {
  return (
    <>
      <div className="date">{WEEKDAY_LONG[state.weekday]}, {fmtDate(state.date)}</div>
      <div className="time">{fmtClock(state.now)}</div>
    </>
  );
}

export function DemoPage() {
  const act = useAct();
  const { data, error } = useLive('/demo/state');
  const [pct, setPct] = useState(80);
  const [confirmReset, setConfirmReset] = useState(false);
  const [busy, setBusy] = useState(false);
  const ana = useLive<any>('/whatsapp/conversations/st_ana');

  useEffect(() => {
    document.title = 'Central da demo · VanFlow';
  }, []);

  const run = async (path: string, body: unknown = {}, done?: string) => {
    setBusy(true);
    await act(() => post(path, body), done);
    setBusy(false);
  };

  if (error) return <div className="demo-page"><ErrorNote text={error} /></div>;
  if (!data) return <Loading />;

  return (
    <div className="demo-page">
      <div className="demo-top">
        <Logo />
        <div className="row-gap">
          <Link className="btn primary small" to="/demo/palco"><MonitorPlay size={16} />Modo apresentação</Link>
          <Link className="btn ghost small" to="/painel">Painel</Link>
          <Link className="btn ghost small" to="/whatsapp">WhatsApp</Link>
          <ThemeButton />
        </div>
      </div>
      <div className="demo-grid">
        <div className="stack">
          <section className="big-clock" aria-label="Relógio da demo">
            <ClockBig state={data} />
            <div className="clock-btns">
              {CLOCK_BUTTONS.map(([preset, label]) => (
                <button key={preset} type="button" className="btn small" disabled={busy} onClick={() => run('/demo/advance', { preset })}>{label}</button>
              ))}
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Ações</h2>
            <div className="stack" style={{ gap: 12 }}>
              <div className="row-gap">
                <label className="check" style={{ flex: 1, minWidth: 180 }}>
                  <span className="small nowrap">{pct}% vão</span>
                  <input type="range" min="0" max="100" step="10" value={pct} onChange={(e) => setPct(Number(e.target.value))} style={{ flex: 1, accentColor: 'var(--amber)' }} aria-label="Porcentagem de quem vai" />
                </label>
                <button type="button" className="btn dark small" disabled={busy} onClick={() => run('/demo/simulate-replies', { pct_yes: pct }, 'Respostas simuladas.')}>Simular respostas dos alunos</button>
              </div>
              <div className="row-gap">
                <button type="button" className="btn quiet small" disabled={busy} onClick={() => run('/demo/ana-nao-vai', {}, 'Ana respondeu Não vou.')}>Ana responde Não vou</button>
                <button type="button" className="btn quiet small" disabled={busy} onClick={() => run('/demo/carla-compra', {}, 'Carla comprou a vaga.')}>Carla compra a vaga avulsa</button>
                <button type="button" className="btn quiet small" disabled={busy} onClick={() => run('/demo/pagar-menos-3', {}, 'Pagamentos registrados.')}>Pagar todas as cobranças menos 3</button>
                <button type="button" className="btn quiet small" disabled={busy} onClick={() => run('/demo/estender-teste', {}, 'Teste estendido em 30 dias.')}>Estender o teste grátis</button>
              </div>
              <WebhookForm />
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">Cenários</h2>
            {data.scenarios.map((s: any) => (
              <div key={s.id} className="scenario">
                <span><b>{s.label}</b><br /><span className="muted small">{s.hint}</span></span>
                <button type="button" className="btn ghost small" disabled={busy} onClick={() => run(`/demo/scenario/${s.id}`, {}, 'Cenário carregado.')}>{data.scenario === s.id ? 'Recarregar' : 'Carregar'}</button>
              </div>
            ))}
            <div className="row-gap" style={{ marginTop: 12 }}>
              <button type="button" className="btn danger small" onClick={() => setConfirmReset(true)}><RotateCcw size={16} />Resetar demo</button>
            </div>
          </section>

          <section className="card">
            <h2 className="card-title">O que é MVP e o que vem depois</h2>
            <p className="muted small" style={{ marginBottom: 8 }}>Tudo aqui funciona. O selo mostra o que entra no MVP validado e o que chega na versão seguinte.</p>
            <div className="module-list">
              {MODULES.map(([to, label, tag]) => (
                <div key={label} className="module">
                  <Link to={to === '/a/ana' ? `/a/${ana.data?.student.token ?? ''}` : to}>{label}</Link>
                  <span className={`chip ${tag === 'MVP' ? 'mvp' : 'next'}`}>{tag}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="card">
          <h2 className="card-title">Linha do tempo</h2>
          <div className="events">
            {data.events.map((event: any) => {
              const Icon = ICONS[event.type] ?? Play;
              return (
                <div key={event.id} className="tl-item">
                  <time>{fmtDayMonth(event.at)} {fmtClock(event.at)}</time>
                  <Icon size={16} />
                  <span>{event.description}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
      {confirmReset && (
        <Modal title="Resetar a demo?" onClose={() => setConfirmReset(false)}>
          <p>Tudo volta para quarta, 11/11, 20h55. Contatos e mudanças feitas na demo serão apagados.</p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setConfirmReset(false)}>Cancelar</button>
            <button type="button" className="btn primary" onClick={() => { setConfirmReset(false); run('/demo/reset', {}, 'Demo resetada.'); }}>Resetar</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
