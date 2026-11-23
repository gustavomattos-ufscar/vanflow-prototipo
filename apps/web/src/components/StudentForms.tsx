/** Formulários de aluno, grade e plano, usados na ficha, na lista e no assistente. */
import { useMemo, useState, type FormEvent } from 'react';
import { brl, checkPlanAgainstGrade, PLAN_OPTIONS, planPrice, WEEKDAY_LONG, WEEKDAY_SHORT } from '@vanflow/domain';
import { patch, post, put } from '../lib/api.ts';
import { useAct, useOperator, useToast } from '../lib/context.tsx';
import { Field, Modal } from './ui.tsx';

const WEEKDAYS = [1, 2, 3, 4, 5, 6];

export function StudentModal({ student, onClose, onSaved }: { student?: any; onClose: () => void; onSaved?: (id: string) => void }) {
  const act = useAct();
  const { shell, operatorId } = useOperator();
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    if (student) {
      const done = await act(() => patch(`/students/${student.id}`, data), 'Dados salvos.');
      if (done) onClose();
    } else {
      const created = await act(() => post('/students', { ...data, operator_id: operatorId }), 'Aluno cadastrado.');
      if (created) {
        onClose();
        onSaved?.(created.id);
      }
    }
  };
  return (
    <Modal title={student ? 'Editar aluno' : 'Novo aluno'} onClose={onClose}>
      <form onSubmit={submit} className="form-grid">
        <div className="full"><Field label="Nome"><input name="name" required defaultValue={student?.name} /></Field></div>
        <Field label="WhatsApp"><input name="phone" required defaultValue={student?.phone} placeholder="(15) 9XXXX-XXXX" /></Field>
        <Field label="Cidade"><input name="city" required defaultValue={student?.city} /></Field>
        <Field label="Bairro"><input name="neighborhood" required defaultValue={student?.neighborhood} /></Field>
        <Field label="Ponto de embarque"><input name="pickup_label" defaultValue={student?.pickup_label} placeholder="Praça da Matriz" /></Field>
        <Field label="Faculdade">
          <select name="faculty_id" required defaultValue={student?.faculty_id}>{shell.faculties.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}</select>
        </Field>
        <Field label="Curso"><input name="course" defaultValue={student?.course} /></Field>
        <div className="full modal-actions"><button type="submit" className="btn primary">Salvar</button></div>
      </form>
    </Modal>
  );
}

interface GradeRow { weekday: number; on: boolean; faculty_id: string; start: string; end: string }

export function GradeModal({ student, schedule, onClose }: { student: any; schedule: any[]; onClose: () => void }) {
  const act = useAct();
  const { shell } = useOperator();
  const [rows, setRows] = useState<GradeRow[]>(() => WEEKDAYS.map((weekday) => {
    const entry = schedule.find((s) => s.weekday === weekday);
    return { weekday, on: !!entry, faculty_id: entry?.faculty_id ?? student.faculty_id, start: entry?.start ?? '19:00', end: entry?.end ?? '22:40' };
  }));
  const set = (weekday: number, change: Partial<GradeRow>) => setRows((list) => list.map((r) => (r.weekday === weekday ? { ...r, ...change } : r)));
  const save = async () => {
    const entries = rows.filter((r) => r.on).map(({ weekday, faculty_id, start, end }) => ({ weekday, faculty_id, start, end }));
    const done = await act(() => put(`/students/${student.id}/schedule`, { entries }), 'Grade salva. As próximas listas já seguem a nova grade.');
    if (done) onClose();
  };
  return (
    <Modal title={`Grade de ${student.name}`} onClose={onClose} wide>
      <div className="table-wrap">
        <table className="data cards">
          <thead><tr><th>Dia</th><th>Faculdade</th><th>Início</th><th>Fim</th></tr></thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.weekday}>
                <td className="span"><label className="check"><input type="checkbox" checked={row.on} onChange={(e) => set(row.weekday, { on: e.target.checked })} />{WEEKDAY_LONG[row.weekday]}</label></td>
                <td data-label="Faculdade" className="span"><select className="input" aria-label={`Faculdade de ${WEEKDAY_LONG[row.weekday]}`} disabled={!row.on} value={row.faculty_id} onChange={(e) => set(row.weekday, { faculty_id: e.target.value })}>{shell.faculties.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></td>
                <td data-label="Início"><input className="input" type="time" aria-label="Início" disabled={!row.on} value={row.start} onChange={(e) => set(row.weekday, { start: e.target.value })} /></td>
                <td data-label="Fim"><input className="input" type="time" aria-label="Fim" disabled={!row.on} value={row.end} onChange={(e) => set(row.weekday, { end: e.target.value })} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="modal-actions"><button type="button" className="btn primary" onClick={save}>Salvar grade</button></div>
    </Modal>
  );
}

export function PlanModal({ student, enrollment, schedule, onClose }: { student: any; enrollment: any; schedule: any[]; onClose: () => void }) {
  const act = useAct();
  const toast = useToast();
  const { shell } = useOperator();
  const grade = useMemo(() => [...new Set(schedule.map((s) => s.weekday))].sort(), [schedule]);
  const [lineId, setLineId] = useState<string>(enrollment?.line_id ?? student.interest_line_id ?? shell.lines[0]?.id);
  const [planDays, setPlanDays] = useState<number>(enrollment?.plan_days ?? 3);
  const [weekdays, setWeekdays] = useState<number[]>(enrollment?.weekdays ?? grade.slice(0, 3));
  const line = shell.lines.find((l: any) => l.id === lineId);
  const check = checkPlanAgainstGrade(planDays, weekdays, grade);
  const suggested = line ? planPrice(line.price_table, planDays) : 0;
  const [price, setPrice] = useState<string>(enrollment ? String(enrollment.monthly_price) : '');

  const toggle = (day: number) => setWeekdays((list) => (list.includes(day) ? list.filter((d) => d !== day) : [...list, day]));
  const save = async () => {
    const result = await act(() => put(`/students/${student.id}/enrollment`, {
      line_id: lineId, plan_days: planDays, weekdays, monthly_price: price ? Number(price) : suggested,
    }));
    if (result) {
      toast('Plano salvo.');
      onClose();
    }
  };

  if (!grade.length) {
    return (
      <Modal title="Plano" onClose={onClose}>
        <p>Cadastre a grade de aulas primeiro. O plano precisa bater com os dias de aula.</p>
        <div className="modal-actions"><button type="button" className="btn primary" onClick={onClose}>Entendi</button></div>
      </Modal>
    );
  }

  return (
    <Modal title={`Plano de ${student.name}`} onClose={onClose}>
      <div className="stack">
        <Field label="Linha">
          <select value={lineId} onChange={(e) => setLineId(e.target.value)}>{shell.lines.map((l: any) => <option key={l.id} value={l.id}>{l.name}</option>)}</select>
        </Field>
        <div>
          <p className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Dias por semana</p>
          <div className="segmented" role="group" aria-label="Dias por semana">
            {PLAN_OPTIONS.map((d) => <button key={d} type="button" aria-pressed={planDays === d} onClick={() => { setPlanDays(d); setPrice(''); }}>{d} dias</button>)}
          </div>
        </div>
        <div>
          <p className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Quais dias</p>
          <div className="day-picks">
            {WEEKDAYS.map((d) => <button key={d} type="button" className="day-pick" aria-pressed={weekdays.includes(d)} onClick={() => toggle(d)}>{WEEKDAY_SHORT[d]}</button>)}
          </div>
        </div>
        {check.message && <p className={check.ok ? 'note' : 'error-note'}>{check.message}</p>}
        <Field label="Mensalidade" hint={`Tabela da linha: ${brl(suggested)}`}>
          <input type="number" step="0.01" min="0" value={price} placeholder={suggested.toFixed(2)} onChange={(e) => setPrice(e.target.value)} />
        </Field>
      </div>
      <div className="modal-actions"><button type="button" className="btn primary" disabled={!check.ok} onClick={save}>Salvar plano</button></div>
    </Modal>
  );
}
