/** Assistente de configuração (Fluxo A): vans e linhas, alunos, grade, preços e Pix. */
import { Check, Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fmtHour } from '@vanflow/domain';
import { LineModal, PixForm, VanModal } from '../../components/OperationForms.tsx';
import { GradeModal, PlanModal, StudentModal } from '../../components/StudentForms.tsx';
import { Loading, PageHead } from '../../components/ui.tsx';
import { post } from '../../lib/api.ts';
import { useAct, useOperator } from '../../lib/context.tsx';
import { useLive } from '../../lib/live.ts';

const STEPS = ['Vans e linhas', 'Alunos', 'Grade de cada aluno', 'Preços e Pix'];

function StudentRow({ student }: { student: any }) {
  const { data } = useLive(`/students/${student.id}`);
  const [modal, setModal] = useState<'grade' | 'plan' | null>(null);
  if (!data) return null;
  const hasGrade = data.schedule.length > 0;
  return (
    <div className="dash-row">
      <span>{student.name}<small>{hasGrade ? `${data.schedule.length} dias de aula` : 'Sem grade ainda'}{data.enrollment ? `, plano de ${data.enrollment.plan_days} dias` : ''}</small></span>
      <span className="row-gap">
        <button type="button" className={`btn small ${hasGrade ? 'quiet' : 'dark'}`} onClick={() => setModal('grade')}>Grade</button>
        <button type="button" className={`btn small ${data.enrollment ? 'quiet' : hasGrade ? 'dark' : 'quiet'}`} onClick={() => setModal('plan')}>Plano</button>
      </span>
      {modal === 'grade' && <GradeModal student={data.student} schedule={data.schedule} onClose={() => setModal(null)} />}
      {modal === 'plan' && <PlanModal student={data.student} enrollment={data.enrollment} schedule={data.schedule} onClose={() => setModal(null)} />}
    </div>
  );
}

export function Comecar() {
  const act = useAct();
  const navigate = useNavigate();
  const { shell, operatorId } = useOperator();
  const students = useLive<any[]>(`/operators/${operatorId}/students`);
  const [step, setStep] = useState(0);
  const [modal, setModal] = useState<'van' | 'line' | 'student' | null>(null);
  const [finished, setFinished] = useState(false);
  if (!students.data) return <Loading />;

  const canContinue = [shell.lines.length > 0, students.data.length > 0, true, !!shell.operator.pix_key][step];
  const finish = async () => {
    if (await act(() => post(`/operators/${operatorId}/finish-onboarding`))) setFinished(true);
  };

  if (finished) {
    return (
      <div className="card" style={{ maxWidth: 560, margin: '40px auto', textAlign: 'center' }}>
        <p className="eyebrow">Tudo certo</p>
        <h1 style={{ margin: '8px 0' }}>Pronto. Hoje às {fmtHour(shell.settings.confirmation_time)} a VanFlow manda a primeira confirmação.</h1>
        <button type="button" className="btn primary" onClick={() => navigate('/painel')}>Ver a lista do dia</button>
      </div>
    );
  }

  return (
    <>
      <PageHead eyebrow="Bem-vindo" title={`Vamos configurar a ${shell.operator.trade_name}`}>
        São 4 passos e você pode voltar quando quiser. Seus 30 dias grátis já estão valendo.
      </PageHead>
      <ol className="wizard-steps" style={{ listStyle: 'none', padding: 0 }}>
        {STEPS.map((label, i) => (
          <li key={label} className={`wizard-step${i === step ? ' on' : i < step ? ' done' : ''}`}>{i < step ? <Check size={15} /> : <span>{i + 1}</span>}{label}</li>
        ))}
      </ol>
      <section className="card stack" style={{ maxWidth: 760 }}>
        {step === 0 && (
          <>
            <div className="spread"><h2>Suas vans</h2><button type="button" className="btn quiet small" onClick={() => setModal('van')}><Plus size={16} />Nova van</button></div>
            <div className="dash-list">{shell.vans.length ? shell.vans.map((v: any) => <div key={v.id} className="dash-row"><span>{v.nickname}<small>{v.plate} · {v.seats} lugares</small></span></div>) : <p className="muted small">Cadastre a primeira van.</p>}</div>
            <div className="spread"><h2>Suas linhas</h2><button type="button" className="btn quiet small" disabled={!shell.vans.length} onClick={() => setModal('line')}><Plus size={16} />Nova linha</button></div>
            <div className="dash-list">{shell.lines.length ? shell.lines.map((l: any) => <div key={l.id} className="dash-row"><span>{l.name}<small>saída {fmtHour(l.departure_time)}, volta {fmtHour(l.return_time)}</small></span></div>) : <p className="muted small">Linha é o trajeto fixo de um turno, como "Itu e Salto → Sorocaba".</p>}</div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="spread"><h2>Seus alunos</h2><button type="button" className="btn quiet small" onClick={() => setModal('student')}><Plus size={16} />Novo aluno</button></div>
            <div className="dash-list">{students.data.length ? students.data.map((s) => <div key={s.id} className="dash-row"><span>{s.name}<small>{s.neighborhood}, {s.city}</small></span></div>) : <p className="muted small">Cadastre os alunos aqui. Depois, em Alunos, dá para importar a sua planilha.</p>}</div>
          </>
        )}
        {step === 2 && (
          <>
            <h2>Grade e plano de cada aluno</h2>
            <p className="muted small">A grade é o que monta a lista do dia. O plano diz em quais dias o aluno paga para ir.</p>
            <div className="dash-list">{students.data.map((s) => <StudentRow key={s.id} student={s} />)}</div>
          </>
        )}
        {step === 3 && (
          <>
            <h2>Chave Pix</h2>
            <p className="muted small">Os preços ficam na linha, e o vencimento padrão é dia {shell.settings.due_day}. O dinheiro cai direto na sua chave.</p>
            <PixForm key={shell.operator.pix_key ?? 'novo'} />
          </>
        )}
        <div className="spread">
          <button type="button" className="btn ghost small" disabled={step === 0} onClick={() => setStep(step - 1)}>Voltar</button>
          {step < 3
            ? <button type="button" className="btn primary" disabled={!canContinue} onClick={() => setStep(step + 1)}>Continuar</button>
            : <button type="button" className="btn primary" disabled={!canContinue} onClick={finish}>Terminar</button>}
        </div>
      </section>
      {modal === 'van' && <VanModal onClose={() => setModal(null)} />}
      {modal === 'line' && <LineModal onClose={() => setModal(null)} />}
      {modal === 'student' && <StudentModal onClose={() => setModal(null)} />}
    </>
  );
}
