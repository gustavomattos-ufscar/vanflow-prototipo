import { ExternalLink, FileUp, Pencil, Plus, UserX } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { addDays, brl, firstName, fmtClock, fmtDate, fmtWeekdayDate, monthName, weekdayOf, WEEKDAY_SHORT } from '@vanflow/domain';
import { GradeModal, PlanModal, StudentModal } from '../../components/StudentForms.tsx';
import { Empty, ErrorNote, Field, Loading, Modal, PageHead, Pill } from '../../components/ui.tsx';
import { WeekGrid } from '../../components/WeekGrid.tsx';
import { api, del, post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

export const weekdaysText = (days: number[]) => days.map((d) => WEEKDAY_SHORT[d]).join(', ');

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

export function Alunos() {
  const { operatorId, vanId, shell } = useOperator();
  const navigate = useNavigate();
  const { data, error } = useLive<any[]>(`/operators/${operatorId}/students`);
  const [search, setSearch] = useState('');
  const [plan, setPlan] = useState('');
  const [faculty, setFaculty] = useState('');
  const [status, setStatus] = useState('');
  const [modal, setModal] = useState<'new' | 'import' | null>(null);

  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return (data ?? []).filter((s) =>
      (!vanId || s.van_id === vanId) && (!plan || String(s.plan_days) === plan) && (!faculty || s.faculty_id === faculty) &&
      (status ? s.status === status : s.status !== 'inativo') &&
      (!term || `${s.name} ${s.neighborhood} ${s.city}`.toLowerCase().includes(term)));
  }, [data, search, plan, faculty, status, vanId]);

  return (
    <>
      <PageHead eyebrow="Alunos" title={`${rows.length} ${rows.length === 1 ? 'aluno' : 'alunos'}`} actions={<>
        <button type="button" className="btn ghost small" onClick={() => setModal('import')}><FileUp size={16} />Importar planilha</button>
        <button type="button" className="btn primary small" onClick={() => setModal('new')}><Plus size={16} />Novo aluno</button>
      </>} />
      <div className="filters">
        <input className="input search" placeholder="Buscar por nome ou bairro" aria-label="Buscar" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="input" aria-label="Plano" value={plan} onChange={(e) => setPlan(e.target.value)}>
          <option value="">Todos os planos</option><option value="2">2 dias</option><option value="3">3 dias</option><option value="5">5 dias</option>
        </select>
        <select className="input" aria-label="Faculdade" value={faculty} onChange={(e) => setFaculty(e.target.value)}>
          <option value="">Todas as faculdades</option>{shell.faculties.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
        </select>
        <select className="input" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Ativos e avulsos</option><option value="ativo">Ativos</option><option value="interessado_avulsa">Avulsos</option><option value="inativo">Inativos</option>
        </select>
      </div>
      {error && <ErrorNote text={error} />}
      {!data ? <Loading /> : rows.length === 0 ? (
        <div className="card"><Empty title="Nenhum aluno por aqui.">Cadastre o primeiro ou importe a sua planilha.</Empty></div>
      ) : (
        <div className="card flat table-wrap">
          <table className="data cards">
            <thead><tr><th>Aluno</th><th>Van</th><th>Plano</th><th>Faculdade</th><th>Mês</th><th className="num">Mensalidade</th></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="span"><Link to={`/painel/alunos/${s.id}`}>{s.name}</Link><br /><span className="muted small">{s.neighborhood}, {s.city}</span></td>
                  <td data-label="Van" className="small">{s.van}</td>
                  <td data-label="Plano" className="small">{s.plan_days ? <>{s.plan_days} dias<br /><span className="muted">{weekdaysText(s.weekdays)}</span></> : <Pill status={s.status} />}</td>
                  <td data-label="Faculdade" className="small">{s.faculty}</td>
                  <td data-label="Mês">{s.invoice_status ? <Pill status={s.invoice_status} /> : <span className="muted small">sem cobrança</span>}</td>
                  <td data-label="Mensalidade" className="num">{s.monthly_price ? brl(s.monthly_price) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {modal === 'new' && <StudentModal onClose={() => setModal(null)} onSaved={(id) => navigate(`/painel/alunos/${id}`)} />}
      {modal === 'import' && <ImportModal onClose={() => setModal(null)} />}
    </>
  );
}

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

export function FichaAluno() {
  const { id } = useParams();
  const act = useAct();
  const navigate = useNavigate();
  const { data, error } = useLive(`/students/${id}`);
  const demo = useLive('/demo/state');
  const [modal, setModal] = useState<'edit' | 'grade' | 'plan' | 'remove' | null>(null);
  if (error) return <ErrorNote text={error} />;
  if (!data || !demo.data) return <Loading />;
  const { student, enrollment, schedule, attendance, invoices, messages, line, faculty, bookings } = data;

  return (
    <>
      <PageHead eyebrow={line ? line.name : 'Lista de interesse'} title={student.name} actions={<>
        <a className="btn ghost small" href={`/a/${student.token}`} target="_blank" rel="noreferrer"><ExternalLink size={16} />Link do aluno</a>
        <Link className="btn ghost small" to={`/whatsapp?aluno=${student.id}`}>Abrir conversa</Link>
        <button type="button" className="btn quiet small" onClick={() => setModal('edit')}><Pencil size={16} />Editar</button>
        {student.status !== 'inativo' && <button type="button" className="btn danger small" onClick={() => setModal('remove')}><UserX size={16} />Desativar</button>}
      </>}>
        {student.course}, {faculty} · {student.neighborhood}, {student.city} · {student.phone}
      </PageHead>
      <div className="with-aside">
        <div className="stack" style={{ minWidth: 0 }}>
          <section className="card">
            <div className="card-title"><h2>Grade de aulas</h2><button type="button" className="btn quiet small" onClick={() => setModal('grade')}>Editar grade</button></div>
            {schedule.length ? <WeekGrid entries={schedule} planDays={enrollment?.weekdays} /> : <Empty title="Sem grade ainda.">Sem a grade, a VanFlow não sabe em que dias o aluno vai.</Empty>}
          </section>
          <section className="card">
            <div className="card-title"><h2>Plano</h2><button type="button" className="btn quiet small" onClick={() => setModal('plan')}>{enrollment ? 'Mudar plano' : 'Criar plano'}</button></div>
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
      {modal === 'edit' && <StudentModal student={student} onClose={() => setModal(null)} />}
      {modal === 'grade' && <GradeModal student={student} schedule={schedule} onClose={() => setModal(null)} />}
      {modal === 'plan' && <PlanModal student={student} enrollment={enrollment} schedule={schedule} onClose={() => setModal(null)} />}
      {modal === 'remove' && (
        <Modal title="Desativar aluno?" onClose={() => setModal(null)}>
          <p>{firstName(student.name)} sai das próximas listas e para de receber cobranças. O histórico continua aqui.</p>
          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn primary" onClick={async () => { await act(() => del(`/students/${student.id}`), 'Aluno desativado.'); navigate('/painel/alunos'); }}>Desativar</button>
          </div>
        </Modal>
      )}
    </>
  );
}
