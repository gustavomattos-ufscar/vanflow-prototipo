import {
  Bell, CalendarX, Download, ExternalLink, FileUp, ListChecks, MessageSquare, Pause, Pencil, Play, Plus, QrCode, Send, Ticket, UserX, X,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays, brl, firstName, fmtClock, fmtDate, fmtDayMonth, fmtWeekdayDate, monthName, plural, weekdayOf, WEEKDAY_SHORT } from '@vanflow/domain';
import { AbsenceModal, MessageModal, PauseModal } from '../../components/StudentActions.tsx';
import { GradeModal, PlanModal, StudentModal } from '../../components/StudentForms.tsx';
import { Empty, ErrorNote, Field, Loading, Modal, PageHead, Pill } from '../../components/ui.tsx';
import { WeekGrid } from '../../components/WeekGrid.tsx';
import { api, del, post } from '../../lib/api.ts';
import { useAct, useOperator, useToast } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

export const weekdaysText = (days: number[]) => days.map((d) => WEEKDAY_SHORT[d]).join(', ');
const stamp = (iso: string) => `${fmtDayMonth(iso)}, ${fmtClock(iso)}`;

function ImportModal({ onClose }: { onClose: () => void }) {
  const act = useAct();
  const { operatorId, shell } = useOperator();
  const [csv, setCsv] = useState('');
  const [fileName, setFileName] = useState('');
  const [lineId, setLineId] = useState<string>(shell.lines[0]?.id ?? '');
  const [result, setResult] = useState<any>(null);

  const useSample = async () => {
    const sample = await act(() => api('/students-import/sample'));
    if (sample) {
      setCsv(sample.csv);
      setFileName('alunos-exemplo.csv');
    }
  };
  const run = async () => {
    const done = await act(() => post('/students/import', { operator_id: operatorId, line_id: lineId, csv }));
    if (done) setResult(done);
  };

  if (result) {
    return (
      <Modal title="Planilha importada" onClose={onClose}>
        <p><b>{result.imported}</b> {result.imported === 1 ? 'aluno importado' : 'alunos importados'} com grade e plano.</p>
        {result.skipped.length > 0 && (
          <div className="dash-list" style={{ marginTop: 10 }}>
            {result.skipped.map((s: any) => <div key={s.line} className="dash-row"><span>Linha {s.line}: {s.name}</span><span className="muted small">{s.reason}</span></div>)}
          </div>
        )}
        <div className="modal-actions"><button type="button" className="btn primary" onClick={onClose}>Fechar</button></div>
      </Modal>
    );
  }
  return (
    <Modal title="Importar planilha" onClose={onClose}>
      <div className="stack">
        <p className="muted small">Arquivo CSV com as colunas nome, whatsapp, cidade, bairro, faculdade, curso, dias, entrada, saida, plano_dias e mensalidade.</p>
        <Field label="Arquivo">
          <input type="file" accept=".csv,text/csv" onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) { setCsv(await file.text()); setFileName(file.name); }
          }} />
        </Field>
        <button type="button" className="btn quiet small" style={{ alignSelf: 'flex-start' }} onClick={useSample}>Usar a planilha de exemplo</button>
        {fileName && <p className="note teal">Pronto para importar: {fileName}, {csv.trim().split('\n').length - 1} alunos.</p>}
        <Field label="Linha desses alunos">
          <select value={lineId} onChange={(e) => setLineId(e.target.value)}>{shell.lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        </Field>
      </div>
      <div className="modal-actions"><button type="button" className="btn primary" disabled={!csv} onClick={run}>Importar</button></div>
    </Modal>
  );
}

/* ---------- Exportar planilha: as mesmas colunas da importação, mais situação, presença e alertas ---------- */

function situation(s: any): string {
  if (s.status === 'interessado_avulsa') return 'interessado em avulsa';
  if (s.status === 'inativo') return 'inativo';
  return s.enrollment_status === 'pausada' ? 'pausado' : 'ativo';
}

function downloadCsv(rows: any[]): void {
  const cell = (value: unknown) => {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const head = ['nome', 'whatsapp', 'cidade', 'bairro', 'faculdade', 'curso', 'dias', 'entrada', 'saida', 'plano_dias', 'mensalidade', 'situacao', 'presenca', 'alertas'];
  const lines = rows.map((s) => [
    s.name, s.phone, s.city, s.neighborhood, s.faculty, s.course, s.grade_weekdays.map((d: number) => WEEKDAY_SHORT[d]).join(';'),
    s.grade_start ?? '', s.grade_end ?? '', s.plan_days ?? '', s.monthly_price ? s.monthly_price.toFixed(2).replace('.', ',') : '',
    situation(s), s.presence.pct === null ? '' : `${s.presence.pct}%`, s.alerts.map((a: any) => a.label).join('; '),
  ].map(cell).join(','));
  // A marca BOM no começo faz o Excel abrir os acentos certos.
  const blob = new Blob([`﻿${[head.join(','), ...lines].join('\n')}\n`], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'alunos-vanflow.csv';
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Lista ---------- */

function Alerts({ alerts }: { alerts: any[] }) {
  if (!alerts.length) return null;
  return <span className="alert-chips">{alerts.map((a) => <span key={a.kind} className={`pill ${a.tone === 'bad' ? 'p-bad' : 'p-warn'}`}>{a.label}</span>)}</span>;
}

function Presence({ presence }: { presence: any }) {
  if (presence.pct === null) return <span className="muted small">sem histórico</span>;
  return (
    <span className={presence.pct < 70 ? 'presence low' : 'presence'} title={`${presence.went} foi, ${presence.told} avisou que não ia, ${presence.missed} não apareceu`}>
      <b>{presence.pct}%</b>
      <small>{presence.went} de {plural(presence.total, 'ida', 'idas')}</small>
    </span>
  );
}

type Tab = 'plano' | 'interessados';
type BulkModal = { kind: 'message' } | null;

export function Alunos() {
  const act = useAct();
  const toast = useToast();
  const { operatorId, vanId, shell } = useOperator();
  const navigate = useNavigate();
  const { data, error } = useLive<any[]>(`/operators/${operatorId}/students`);
  const [tab, setTab] = useState<Tab>('plano');
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [faculty, setFaculty] = useState('');
  const [status, setStatus] = useState('');
  const [onlyAlerts, setOnlyAlerts] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<'new' | 'new-interested' | 'import' | null>(null);
  const [bulk, setBulk] = useState<BulkModal>(null);

  const all = data ?? [];
  const interested = all.filter((s) => s.status === 'interessado_avulsa');
  const enrolled = all.filter((s) => s.status !== 'interessado_avulsa');

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const base = tab === 'plano' ? enrolled : interested;
    return base.filter((s) => {
      if (vanId && s.van_id !== vanId) return false;
      if (term && !`${s.name} ${s.neighborhood} ${s.city}`.toLowerCase().includes(term)) return false;
      if (onlyAlerts && s.alerts.length === 0) return false;
      if (tab === 'interessados') return true;
      if (plan && String(s.plan_days) !== plan) return false;
      if (faculty && s.faculty_id !== faculty) return false;
      if (status === 'pausado') return s.enrollment_status === 'pausada';
      if (status === 'ativo') return s.status === 'ativo' && s.enrollment_status !== 'pausada';
      return status ? s.status === status : s.status !== 'inativo';
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, tab, search, plan, faculty, status, onlyAlerts, vanId]);

  const chosen = rows.filter((s) => selected.has(s.id));
  const allChosen = rows.length > 0 && chosen.length === rows.length;
  const toggle = (id: string) => setSelected((set) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const toggleAll = () => setSelected(allChosen ? new Set() : new Set(rows.map((s) => s.id)));
  const switchTab = (next: Tab) => { setTab(next); setSelected(new Set()); };

  const runBulk = async (action: 'message' | 'remind' | 'grade', text?: string) => {
    const result = await act(() => post('/students/bulk', { ids: chosen.map((s) => s.id), action, text }));
    if (!result) return;
    const done = {
      message: `Mensagem enviada para ${plural(result.done, 'aluno', 'alunos')}.`,
      remind: `Lembrete de cobrança enviado para ${plural(result.done, 'aluno', 'alunos')}.`,
      grade: `Pedido de grade enviado para ${plural(result.done, 'aluno', 'alunos')}.`,
    }[action];
    toast(result.skipped.length ? `${done} ${plural(result.skipped.length, 'ficou de fora', 'ficaram de fora')}: sem cobrança em aberto.` : done);
    setBulk(null);
    setSelected(new Set());
  };

  const withOpenCharge = chosen.filter((s) => s.open_charges > 0).length;

  return (
    <>
      <PageHead eyebrow="Alunos" title={tab === 'plano' ? plural(rows.length, 'aluno', 'alunos') : plural(rows.length, 'interessado', 'interessados')} actions={tab === 'plano' ? <>
        <button type="button" className="btn ghost small" onClick={() => setModal('import')}><FileUp size={16} />Importar planilha</button>
        <button type="button" className="btn primary small" onClick={() => setModal('new')}><Plus size={16} />Novo aluno</button>
      </> : <button type="button" className="btn primary small" onClick={() => setModal('new-interested')}><Plus size={16} />Novo interessado</button>} />

      <div className="segmented day-tabs" role="tablist" aria-label="Tipo de aluno">
        <button type="button" role="tab" aria-pressed={tab === 'plano'} aria-selected={tab === 'plano'} onClick={() => switchTab('plano')}>Com plano ({enrolled.filter((s) => s.status !== 'inativo').length})</button>
        <button type="button" role="tab" aria-pressed={tab === 'interessados'} aria-selected={tab === 'interessados'} onClick={() => switchTab('interessados')}>Interessados em avulsa ({interested.length})</button>
      </div>

      <div className="filters">
        <input className="input search" placeholder="Buscar por nome ou bairro" aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        {tab === 'plano' && <>
          <select className="input" aria-label="Plano" value={plan} onChange={(e) => setPlan(e.target.value)}>
            <option value="">Todos os planos</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option>
          </select>
          <select className="input" aria-label="Faculdade" value={faculty} onChange={(e) => setFaculty(e.target.value)}>
            <option value="">Todas as faculdades</option>{shell.faculties.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          <select className="input" aria-label="Situação" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Ativos e pausados</option><option value="ativo">Só ativos</option><option value="pausado">Pausados</option><option value="inativo">Inativos</option>
          </select>
        </>}
        <label className="check filter-check"><input type="checkbox" checked={onlyAlerts} onChange={(e) => setOnlyAlerts(e.target.checked)} />Só com alerta</label>
      </div>

      {chosen.length > 0 && (
        <div className="bulk-bar" role="region" aria-label="Ações para os selecionados">
          <b>{plural(chosen.length, 'selecionado', 'selecionados')}</b>
          <button type="button" className="btn quiet small" onClick={() => setBulk({ kind: 'message' })}><MessageSquare size={16} />Mandar mensagem</button>
          {tab === 'plano' && (
            <button type="button" className="btn quiet small" disabled={withOpenCharge === 0} title={withOpenCharge ? undefined : 'Nenhum selecionado tem cobrança em aberto'} onClick={() => runBulk('remind')}>
              <Bell size={16} />Lembrar cobrança{withOpenCharge ? ` (${withOpenCharge})` : ''}
            </button>
          )}
          <button type="button" className="btn quiet small" onClick={() => runBulk('grade')}><ListChecks size={16} />Pedir grade</button>
          <button type="button" className="btn quiet small" onClick={() => downloadCsv(chosen)}><Download size={16} />Exportar planilha</button>
          <button type="button" className="icon-btn" aria-label="Limpar seleção" title="Limpar seleção" onClick={() => setSelected(new Set())}><X size={16} /></button>
        </div>
      )}

      {error && <ErrorNote text={error} />}
      {!data ? <Loading /> : rows.length === 0 ? (
        <div className="card">
          {tab === 'plano'
            ? <Empty title={onlyAlerts ? 'Nenhum aluno com alerta. Tudo em dia!' : 'Nenhum aluno por aqui.'}>{onlyAlerts ? undefined : 'Cadastre o primeiro ou importe a sua planilha.'}</Empty>
            : <Empty title="Nenhum interessado ainda.">Quem pede vaga avulsa no WhatsApp entra aqui sozinho. Você também pode cadastrar.</Empty>}
        </div>
      ) : tab === 'plano' ? (
        <div className="card flat table-wrap">
          <table className="data cards">
            <thead><tr>
              <th className="pick"><label className="pick-hit"><input type="checkbox" aria-label="Selecionar todos" checked={allChosen} onChange={toggleAll} /></label></th>
              <th>Aluno</th><th>Van</th><th>Plano</th><th>Presença</th><th>Mês</th><th className="num">Mensalidade</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={selected.has(s.id) ? 'picked' : undefined}>
                  <td className="pick"><label className="pick-hit"><input type="checkbox" aria-label={`Selecionar ${s.name}`} checked={selected.has(s.id)} onChange={() => toggle(s.id)} /></label></td>
                  <td className="span">
                    <Link to={`/painel/alunos/${s.id}`}>{s.name}</Link><br /><span className="muted small">{s.neighborhood}, {s.city} · {s.faculty}</span>
                    <Alerts alerts={s.alerts} />
                  </td>
                  <td data-label="Van" className="small">{s.van}</td>
                  <td data-label="Plano" className="small">
                    {s.enrollment_status === 'pausada'
                      ? <><Pill status="pausada" /><br /><span className="muted">{s.paused_until ? `volta ${fmtDayMonth(s.paused_until)}` : 'sem data'}</span></>
                      : s.plan_days ? <>{s.plan_days} dias<br /><span className="muted">{weekdaysText(s.weekdays)}</span></> : <Pill status={s.status} />}
                  </td>
                  <td data-label="Presença"><Presence presence={s.presence} /></td>
                  <td data-label="Mês">{s.invoice_status ? <Pill status={s.invoice_status} /> : <span className="muted small">sem cobrança</span>}</td>
                  <td data-label="Mensalidade" className="num">{s.monthly_price ? brl(s.monthly_price) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card flat table-wrap">
          <table className="data cards">
            <thead><tr>
              <th className="pick"><label className="pick-hit"><input type="checkbox" aria-label="Selecionar todos" checked={allChosen} onChange={toggleAll} /></label></th>
              <th>Interessado</th><th>Linha</th><th className="num">Compras</th><th className="num">Gasto</th><th>Última compra</th><th>Ação</th>
            </tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className={selected.has(s.id) ? 'picked' : undefined}>
                  <td className="pick"><label className="pick-hit"><input type="checkbox" aria-label={`Selecionar ${s.name}`} checked={selected.has(s.id)} onChange={() => toggle(s.id)} /></label></td>
                  <td className="span"><Link to={`/painel/alunos/${s.id}`}>{s.name}</Link><br /><span className="muted small">{s.neighborhood}, {s.city} · {s.phone}</span></td>
                  <td data-label="Linha" className="small">{s.line_name}</td>
                  <td data-label="Compras" className="num">{s.avulsas.count}</td>
                  <td data-label="Gasto" className="num">{brl(s.avulsas.total)}</td>
                  <td data-label="Última compra" className="small">{s.avulsas.last ? fmtWeekdayDate(s.avulsas.last) : <span className="muted">nunca comprou</span>}</td>
                  <td className="span">
                    <button type="button" className="btn quiet small" onClick={() => act(() => post(`/students/${s.id}/offer-avulsa`), `Vaga aberta enviada para ${firstName(s.name)}.`)}>
                      <Ticket size={16} />Mandar vaga aberta
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal === 'new' && <StudentModal onClose={() => setModal(null)} onSaved={(id) => navigate(`/painel/alunos/${id}`)} />}
      {modal === 'new-interested' && <StudentModal interested onClose={() => setModal(null)} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} />}
      {bulk?.kind === 'message' && <MessageModal recipients={chosen.length} onClose={() => setBulk(null)} onSend={(text) => runBulk('message', text)} />}
    </>
  );
}

/* ---------- Ficha ---------- */

function PresenceCalendar({ attendance, today }: { attendance: any[]; today: string }) {
  const weeks = 5;
  const offset = (weekdayOf(today) + 6) % 7;
  const start = addDays(today, -offset - (weeks - 1) * 7);
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(start, i));
  const byDate = new Map(attendance.map((a) => [a.date, a]));
  const cell = (date: string) => {
    const entry = byDate.get(date);
    if (date > today || !entry) return 'c-off';
    if (entry.status === 'embarcou' || entry.status === 'confirmado') return 'c-go';
    if (entry.status === 'nao_apareceu') return 'c-miss';
    if (entry.status === 'nao_vai') return 'c-no';
    return 'c-off';
  };
  return (
    <>
      <div className="mini-cal">
        {['seg', 'ter', 'qua', 'qui', 'sex', 'sáb', 'dom'].map((d) => <span key={d} className="c-head">{d}</span>)}
        {days.map((date) => <span key={date} className={cell(date)} title={`${fmtDate(date)}${byDate.get(date)?.reason ? `: ${byDate.get(date).reason}` : ''}`}>{Number(date.slice(8))}</span>)}
      </div>
      <div className="cal-legend"><span className="pill p-ok">foi</span><span className="pill p-warn">avisou que não ia</span><span className="pill p-bad">não apareceu</span></div>
    </>
  );
}

type FichaModal = 'edit' | 'grade' | 'plan' | 'remove' | 'message' | 'absence' | 'pause' | null;

export function FichaAluno() {
  const { id } = useParams();
  const act = useAct();
  const navigate = useNavigate();
  const { data, error } = useLive(`/students/${id}`);
  const demo = useLive('/demo/state');
  const [modal, setModal] = useState<FichaModal>(null);
  if (error) return <ErrorNote text={error} />;
  if (!data || !demo.data) return <Loading />;
  const { student, enrollment, schedule, attendance, invoices, messages, line, faculty, bookings, presence, alerts, upcoming, has_open_charge: hasOpenCharge } = data;
  const isInterested = student.status === 'interessado_avulsa';
  const paused = enrollment?.status === 'pausada';
  const close = () => setModal(null);
  const run = async (action: () => Promise<unknown>, done: string) => {
    if (await act(action, done)) close();
  };

  return (
    <>
      <PageHead eyebrow={line ? line.name : 'Interessado em vaga avulsa'} title={student.name} actions={<>
        <a className="btn ghost small" href={`/a/${student.token}`} target="_blank" rel="noreferrer"><ExternalLink size={16} />Link do aluno</a>
        <Link className="btn ghost small" to={`/whatsapp?aluno=${student.id}`}>Abrir conversa</Link>
        <button type="button" className="btn quiet small" onClick={() => setModal('edit')}><Pencil size={16} />Editar</button>
        {student.status !== 'inativo' && <button type="button" className="btn danger small" onClick={() => setModal('remove')}><UserX size={16} />Desativar</button>}
      </>}>
        {student.course}, {faculty} · {student.neighborhood}, {student.city} · {student.phone}
      </PageHead>

      <div className="quick-actions" role="group" aria-label="Ações rápidas">
        <button type="button" className="btn dark small" onClick={() => setModal('message')}><MessageSquare size={16} />Mandar mensagem</button>
        <button type="button" className="btn quiet small" disabled={!hasOpenCharge} title={hasOpenCharge ? undefined : 'Sem cobrança em aberto'} onClick={() => act(() => post(`/students/${student.id}/pix`), 'Pix reenviado no WhatsApp.')}>
          <QrCode size={16} />Reenviar Pix
        </button>
        {!isInterested && (
          <button type="button" className="btn quiet small" disabled={!upcoming.length} title={upcoming.length ? undefined : 'O aluno não está em nenhuma lista dos próximos dias'} onClick={() => setModal('absence')}>
            <CalendarX size={16} />Marcar falta
          </button>
        )}
        <button type="button" className="btn quiet small" onClick={() => act(() => post(`/students/${student.id}/request-grade`), 'Pedido de grade enviado no WhatsApp.')}><Send size={16} />Pedir grade</button>
        {isInterested && (
          <button type="button" className="btn quiet small" onClick={() => act(() => post(`/students/${student.id}/offer-avulsa`), 'Vaga aberta enviada no WhatsApp.')}><Ticket size={16} />Mandar vaga aberta</button>
        )}
        {alerts.length > 0 && <Alerts alerts={alerts} />}
      </div>

      <div className="with-aside">
        <div className="stack" style={{ minWidth: 0 }}>
          <section className="card">
            <div className="card-title">
              <div>
                <h2>Grade de aulas</h2>
                {student.grade_updated_at
                  ? <p className="muted small">Preenchida pelo aluno em {stamp(student.grade_updated_at)}.</p>
                  : student.grade_requested_at ? <p className="muted small">Pedido enviado em {stamp(student.grade_requested_at)}. Esperando o aluno preencher.</p> : null}
              </div>
              <button type="button" className="btn quiet small" onClick={() => setModal('grade')}>Editar grade</button>
            </div>
            {schedule.length ? <WeekGrid entries={schedule} planDays={enrollment?.weekdays} /> : (
              <Empty title="Sem grade ainda." action={<button type="button" className="btn primary small" onClick={() => act(() => post(`/students/${student.id}/request-grade`), 'Pedido de grade enviado no WhatsApp.')}><Send size={16} />Pedir para o aluno preencher</button>}>
                Sem a grade, a VanFlow não sabe em que dias o aluno vai. Mande o link e ele mesmo preenche.
              </Empty>
            )}
          </section>
          <section className="card">
            <div className="card-title">
              <h2>Plano</h2>
              <span className="row-gap">
                {enrollment && (paused
                  ? <button type="button" className="btn quiet small" onClick={() => act(() => post(`/students/${student.id}/resume`), 'Plano retomado.')}><Play size={16} />Retomar plano</button>
                  : <button type="button" className="btn quiet small" onClick={() => setModal('pause')}><Pause size={16} />Pausar plano</button>)}
                <button type="button" className="btn quiet small" onClick={() => setModal('plan')}>{enrollment ? 'Mudar plano' : 'Criar plano'}</button>
              </span>
            </div>
            {paused && (
              <p className="note" style={{ marginBottom: 10 }}>
                Plano pausado{enrollment.pause_reason ? ` (${enrollment.pause_reason})` : ''}. {enrollment.paused_until ? `Volta sozinho ${fmtWeekdayDate(enrollment.paused_until)}.` : 'Sem data para voltar.'} Enquanto isso, {firstName(student.name)} não entra nas listas e não é cobrado.
              </p>
            )}
            {enrollment ? (
              <p>Plano de <b>{enrollment.plan_days} dias por semana</b> ({weekdaysText(enrollment.weekdays)}), <b>{brl(enrollment.monthly_price)}</b> por mês.</p>
            ) : <p className="muted">Sem plano: compra vaga avulsa quando precisa.</p>}
          </section>
          <section className="card">
            <h2 className="card-title">Cobranças</h2>
            {invoices.length === 0 ? <p className="muted small">Nenhuma cobrança ainda.</p> : (
              <div className="dash-list">
                {invoices.map((i: any) => <div key={i.id} className="dash-row"><span>{monthName(i.reference_month)}<small>vence {fmtDate(i.due_date)}</small></span><span className="row-gap"><span className="mono">{brl(i.amount)}</span><Pill status={i.status} /></span></div>)}
              </div>
            )}
            {bookings.length > 0 && (
              <>
                <h3 style={{ margin: '14px 0 6px' }}>Vagas avulsas</h3>
                <p className="muted small" style={{ marginBottom: 6 }}>{plural(data.avulsas.count, 'compra', 'compras')}, {brl(data.avulsas.total)} no total.</p>
                <div className="dash-list">
                  {bookings.map((b: any) => <div key={b.id} className="dash-row"><span>{fmtWeekdayDate(b.date)}</span><span className="row-gap"><span className="mono">{brl(b.price)}</span><Pill status={b.status} /></span></div>)}
                </div>
              </>
            )}
          </section>
        </div>
        <aside className="stack">
          <section className="card">
            <h3>Presença</h3>
            <p className="small" style={{ marginTop: 4 }}>
              {presence.pct === null ? 'Ainda sem viagens para contar.' : <><b>{presence.pct}%</b> nas últimas 4 semanas: foi em {presence.went} de {plural(presence.total, 'ida', 'idas')}{presence.missed ? `, ${presence.missed} sem avisar` : ''}.</>}
            </p>
            <PresenceCalendar attendance={attendance} today={demo.data.date} />
          </section>
          <section className="card">
            <h3 className="card-title">Conversa</h3>
            {messages.length === 0 ? <p className="muted small">Nenhuma mensagem ainda.</p> : (
              <div className="feed">
                {messages.slice(-6).map((m: any) => (
                  <div key={m.id} className={`feed-item${m.direction === 'in' ? ' me' : ''}`}>
                    <time>{fmtClock(m.created_at)}</time><b>{m.direction === 'in' ? firstName(student.name) : 'VanFlow'}</b><br />{m.body}
                  </div>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      {modal === 'edit' && <StudentModal student={student} onClose={close} />}
      {modal === 'grade' && <GradeModal student={student} schedule={schedule} onClose={close} />}
      {modal === 'plan' && <PlanModal student={student} enrollment={enrollment} schedule={schedule} onClose={close} />}
      {modal === 'message' && (
        <MessageModal recipients={firstName(student.name)} onClose={close}
          onSend={(text) => run(() => post(`/students/${student.id}/message`, { text }), 'Mensagem enviada no WhatsApp.')} />
      )}
      {modal === 'absence' && (
        <AbsenceModal name={firstName(student.name)} upcoming={upcoming} onClose={close}
          onSave={(lineId, date, reason) => run(() => post(`/students/${student.id}/absence`, { line_id: lineId, date, reason }), 'Falta marcada. O lugar foi liberado.')} />
      )}
      {modal === 'pause' && (
        <PauseModal name={firstName(student.name)} minDate={addDays(demo.data.date, 1)} onClose={close}
          onSave={(until, reason) => run(() => post(`/students/${student.id}/pause`, { until, reason }), 'Plano pausado.')} />
      )}
      {modal === 'remove' && (
        <Modal title="Desativar aluno?" onClose={close}>
          <p>{firstName(student.name)} sai das próximas listas e para de receber cobranças. O histórico continua aqui.</p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={close}>Cancelar</button>
            <button type="button" className="btn primary" onClick={async () => { await act(() => del(`/students/${student.id}`), 'Aluno desativado.'); navigate('/painel/alunos'); }}>Desativar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
