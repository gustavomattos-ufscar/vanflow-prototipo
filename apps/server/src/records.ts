/** Cadastro: alunos, grade, plano, vans, linhas, leads e importação da planilha. */
import {
  addDays, at, checkPlanAgainstGrade, normalizeReply, planPrice, type Enrollment, type Line, type PlanCheck, type PriceTable, type ScheduleEntry,
} from '@vanflow/domain';
import { all, byId, insert, one, remove, update } from './db.ts';
import {
  HttpError, linesOf, logEvent, now, operatorOf, semester, studentOf, today, vansOf, type Student,
} from './context.ts';
import { resyncOperator } from './trips.ts';
import { hash, studentToken } from './seed.ts';

const CITY_CENTERS: Record<string, [number, number]> = {
  itu: [-23.2642, -47.2992], salto: [-23.2003, -47.2869], votorantim: [-23.5446, -47.4388], sorocaba: [-23.5015, -47.4526],
  cerquilho: [-23.1665, -47.7437], tatui: [-23.3487, -47.8461], tiete: [-23.1101, -47.7164], 'porto feliz': [-23.2093, -47.5251],
};

/** Sem geocodificação offline: o ponto nasce perto do centro da cidade, sempre no mesmo lugar para o mesmo aluno. */
function approximatePoint(city: string, seedText: string): { lat: number; lng: number } {
  const [lat, lng] = CITY_CENTERS[normalizeReply(city)] ?? CITY_CENTERS.sorocaba;
  const h = hash(seedText);
  const spread = (n: number) => ((n % 2000) / 1000 - 1) * 0.011;
  return { lat: Math.round((lat + spread(h)) * 1e5) / 1e5, lng: Math.round((lng + spread(h >>> 11)) * 1e5) / 1e5 };
}

const slug = (text: string) => normalizeReply(text).replace(/\s+/g, '_').slice(0, 24);

function uniqueId(table: string, base: string): string {
  let id = base;
  for (let i = 2; byId(table, id); i++) id = `${base}_${i}`;
  return id;
}

export interface StudentInput {
  operator_id: string; name: string; phone: string; city: string; neighborhood: string; pickup_label?: string; faculty_id: string; course?: string;
  status?: string; interest_line_id?: string | null;
}

export function createStudent(input: StudentInput): Student {
  if (!input.name?.trim() || !input.phone?.trim()) throw new HttpError(400, 'Preencha nome e WhatsApp.');
  if (one('students', 'operator_id = ? AND phone = ?', input.operator_id, input.phone.trim())) throw new HttpError(409, 'Já existe um aluno com esse WhatsApp.');
  const id = uniqueId('students', `st_${slug(input.name.split(' ')[0])}`);
  const student = {
    id, operator_id: input.operator_id, name: input.name.trim(), phone: input.phone.trim(), city: input.city?.trim() ?? '', neighborhood: input.neighborhood?.trim() ?? '',
    pickup_label: input.pickup_label?.trim() || `${input.neighborhood?.trim() || input.city} · ponto combinado`,
    ...approximatePoint(input.city ?? '', id), faculty_id: input.faculty_id, course: input.course?.trim() ?? '', status: input.status ?? 'ativo',
    guardian_phone: null, created_at: now(), interest_line_id: input.interest_line_id ?? null, token: studentToken(id, input.name),
  };
  insert('students', student);
  logEvent('cadastro', `${student.name} cadastrado`);
  return student as Student;
}

export function updateStudent(id: string, data: Partial<Student>): void {
  const student = studentOf(id);
  const patch: Partial<Student> = {};
  for (const key of ['name', 'phone', 'city', 'neighborhood', 'pickup_label', 'faculty_id', 'course', 'status', 'interest_line_id'] as const) {
    if (data[key] !== undefined) (patch as any)[key] = data[key];
  }
  if (data.city && data.city !== student.city) Object.assign(patch, approximatePoint(data.city, id));
  update('students', id, patch);
  resyncOperator(student.operator_id);
}

/** Troca a grade do semestre. As viagens futuras acompanham, sem perder respostas já dadas. */
export function replaceSchedule(studentId: string, entries: Array<Pick<ScheduleEntry, 'weekday' | 'faculty_id' | 'start' | 'end'>>): void {
  const student = studentOf(studentId);
  const term = semester().id;
  for (const entry of entries) {
    if (entry.start >= entry.end) throw new HttpError(400, 'O fim da aula precisa ser depois do início.');
  }
  remove('schedules', 'student_id = ? AND semester = ?', studentId, term);
  for (const entry of entries) {
    insert('schedules', { id: `sch_${studentId}_${entry.weekday}`, student_id: studentId, semester: term, ...entry });
  }
  resyncOperator(student.operator_id);
  logEvent('cadastro', `Grade de ${student.name} atualizada`);
}

export interface EnrollmentInput { line_id: string; plan_days: number; weekdays: number[]; monthly_price?: number; status?: Enrollment['status'] }

export function saveEnrollment(studentId: string, input: EnrollmentInput): PlanCheck {
  const student = studentOf(studentId);
  const line = byId<Line>('lines', input.line_id);
  if (!line) throw new HttpError(400, 'Escolha uma linha.');
  const grade = all<ScheduleEntry>('schedules', 'student_id = ?', studentId).map((s) => s.weekday);
  const check = checkPlanAgainstGrade(input.plan_days, input.weekdays, grade);
  if (!check.ok) throw new HttpError(400, check.message ?? 'O plano não bate com a grade.');
  const term = semester();
  const data = {
    student_id: studentId, line_id: line.id, plan_days: input.plan_days, weekdays: [...input.weekdays].sort(),
    monthly_price: input.monthly_price ?? planPrice(line.price_table, input.plan_days), status: input.status ?? 'ativa',
    start_date: today(), end_date: term.end,
  };
  const existing = one<Enrollment>('enrollments', "student_id = ? AND status <> 'cancelada'", studentId);
  if (existing) update('enrollments', existing.id, { ...data, start_date: existing.start_date });
  else insert('enrollments', { id: uniqueId('enrollments', `enr_${studentId}`), ...data });
  update('students', studentId, { status: 'ativo' });
  resyncOperator(student.operator_id);
  logEvent('cadastro', `Plano de ${student.name}: ${input.plan_days} dias por semana`);
  return check;
}

export function deleteStudent(id: string): void {
  const student = studentOf(id);
  update('students', id, { status: 'inativo' });
  for (const enrollment of all<Enrollment>('enrollments', 'student_id = ?', id)) update('enrollments', enrollment.id, { status: 'cancelada' });
  resyncOperator(student.operator_id);
  logEvent('cadastro', `${student.name} desativado`);
}

/* ---------- Vans e linhas ---------- */

export function saveVan(operatorId: string, data: any): string {
  const id = data.id ?? uniqueId('vans', `van_${slug(data.nickname ?? 'nova')}`);
  const van = {
    id, operator_id: operatorId, nickname: data.nickname, plate: data.plate?.toUpperCase() ?? '', model: data.model ?? 'Van 15 lugares',
    seats: Number(data.seats) || 15, color: data.color ?? 'Branca', driver_id: data.driver_id ?? null,
  };
  if (!van.nickname?.trim()) throw new HttpError(400, 'Dê um nome para a van.');
  if (data.id) update('vans', id, van);
  else insert('vans', van);
  update('subscriptions', operatorId, { vans_count: vansOf(operatorId).length }, 'operator_id');
  return id;
}

export function saveLine(data: any): string {
  if (!data.name?.trim() || !data.van_id) throw new HttpError(400, 'Preencha o nome da linha e a van.');
  const existing = data.id ? byId<Line>('lines', data.id) : undefined;
  const prices: PriceTable = {
    plan_5: Number(data.price_table?.plan_5) || 420, plan_3: Number(data.price_table?.plan_3) || 300, plan_2: Number(data.price_table?.plan_2) || 220,
    avulsa_round: Number(data.price_table?.avulsa_round) || 20, avulsa_one_way: Number(data.price_table?.avulsa_one_way) || 12,
  };
  const origin = data.origin?.label && data.origin?.lat == null
    ? { label: data.origin.label, ...approximatePoint(data.origin.city ?? data.origin.label, data.origin.label) }
    : data.origin ?? existing?.origin;
  const id = existing?.id ?? uniqueId('lines', `line_${slug(data.name)}`);
  const line = {
    id, van_id: data.van_id, name: data.name.trim(), shift: data.shift ?? 'noite', departure_time: data.departure_time, return_time: data.return_time,
    origin, destinations: data.destinations ?? existing?.destinations ?? [], price_table: prices,
  };
  if (!line.origin) throw new HttpError(400, 'Informe o ponto de saída.');
  if (!line.destinations.length) throw new HttpError(400, 'Escolha ao menos uma faculdade.');
  if (existing) update('lines', id, line);
  else insert('lines', line);
  const operatorId = byId<{ operator_id: string }>('vans', data.van_id)!.operator_id;
  resyncOperator(operatorId);
  logEvent('cadastro', `Linha ${line.name} salva`);
  return id;
}

/* ---------- Leads ---------- */

export function createLead(data: any): string {
  if (!data.name?.trim() || !data.whatsapp?.trim()) throw new HttpError(400, 'Preencha seu nome e WhatsApp.');
  const id = uniqueId('leads', `lead_web_${hash(`${data.whatsapp}${now()}`).toString(36)}`);
  insert('leads', {
    id, kind: data.kind === 'estudante' ? 'estudante' : 'operador', name: data.name.trim(), whatsapp: data.whatsapp.trim(), city: data.city?.trim() ?? null,
    vans_count: data.vans_count ? Number(data.vans_count) : null, faculties: data.faculties?.trim() ?? null, message: data.message?.trim() ?? null,
    source: 'landing', created_at: now(), converted_operator_id: null,
  });
  logEvent('lead', `Novo contato da landing: ${data.name.trim()} (${data.kind === 'estudante' ? 'estudante' : 'operador'})`);
  return id;
}

/** "Criar conta de teste": o lead vira operador com 30 dias grátis. */
export function convertLead(id: string): string {
  const lead = byId<any>('leads', id);
  if (!lead) throw new HttpError(404, 'Contato não encontrado.');
  if (lead.kind !== 'operador') throw new HttpError(400, 'Só operadores têm conta.');
  if (lead.converted_operator_id) return lead.converted_operator_id;
  const operatorId = uniqueId('operators', `op_${slug(lead.name.split(' ')[0])}`);
  const trialEnds = at(addDays(today(), 30), '23:59');
  insert('operators', {
    id: operatorId, name: lead.name, trade_name: `Van de ${lead.name.split(' ')[0]}`, owner_name: lead.name, whatsapp: lead.whatsapp ?? '', city: lead.city ?? '',
    pix_key: null, pix_key_type: null, pix_merchant_name: null, pix_city: null, created_at: now(), trial_ends_at: trialEnds, status: 'trial', onboarded: false,
  });
  const defaults = one<any>('operator_settings', "operator_id = 'op_ze'") ?? {};
  insert('operator_settings', {
    ...defaults, operator_id: operatorId, confirmation_time: '21:00', reminder_time: '22:30', reminder_enabled: true, close_minutes_before_departure: 180,
    close_time_morning: '05:30', no_answer_counts_as_going: true, invoice_day: 1, due_day: 5, avulsa_hold_minutes: 30, avulsa_auto_offer: true,
  });
  insert('subscriptions', { operator_id: operatorId, price_per_van: 59.9, vans_count: 0, started_at: null, status: 'trial', plan: 'padrao' });
  insert('drivers', { id: uniqueId('drivers', `drv_${slug(lead.name.split(' ')[0])}`), operator_id: operatorId, name: lead.name, phone: lead.whatsapp ?? '', is_owner: true });
  update('leads', id, { converted_operator_id: operatorId });
  logEvent('lead', `Conta de teste criada para ${lead.name}: 30 dias grátis`);
  return operatorId;
}

/* ---------- Importação da planilha ---------- */

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cell = '';
  let row: string[] = [];
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell.replace(/\r$/, '')); rows.push(row); row = []; cell = ''; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell.replace(/\r$/, '')); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim()));
}

const DAY_CODES: Record<string, number> = { seg: 1, ter: 2, qua: 3, qui: 4, sex: 5, sab: 6 };

export interface ImportResult { imported: number; skipped: Array<{ line: number; name: string; reason: string }> }

export function importCsv(operatorId: string, lineId: string, csv: string): ImportResult {
  operatorOf(operatorId);
  const line = linesOf(operatorId).find((l) => l.id === lineId);
  if (!line) throw new HttpError(400, 'Escolha a linha dos alunos da planilha.');
  const rows = parseCsv(csv.replace(/^﻿/, ''));
  const header = (rows.shift() ?? []).map((h) => normalizeReply(h).replace(/ /g, '_'));
  const required = ['nome', 'whatsapp', 'cidade', 'faculdade', 'dias'];
  const missing = required.filter((c) => !header.includes(c));
  if (missing.length) throw new HttpError(400, `Faltam colunas na planilha: ${missing.join(', ')}.`);
  const faculties = all<{ id: string; name: string }>('faculties');
  const result: ImportResult = { imported: 0, skipped: [] };
  rows.forEach((cells, index) => {
    const get = (column: string) => cells[header.indexOf(column)]?.trim() ?? '';
    const name = get('nome');
    const skip = (reason: string) => result.skipped.push({ line: index + 2, name, reason });
    const faculty = faculties.find((f) => normalizeReply(f.name) === normalizeReply(get('faculdade')));
    if (!faculty) return skip(`Faculdade não encontrada: ${get('faculdade')}`);
    const days = get('dias').split(/[;,/ ]+/).map((d) => DAY_CODES[normalizeReply(d).slice(0, 3)]).filter(Boolean);
    if (!days.length) return skip('Dias da semana não reconhecidos');
    if (one('students', 'operator_id = ? AND phone = ?', operatorId, get('whatsapp'))) return skip('Já cadastrado');
    const student = createStudent({
      operator_id: operatorId, name, phone: get('whatsapp'), city: get('cidade'), neighborhood: get('bairro'), faculty_id: faculty.id, course: get('curso'),
    });
    replaceSchedule(student.id, days.map((weekday) => ({
      weekday, faculty_id: faculty.id, start: get('entrada') || '19:00', end: get('saida') || '22:40',
    })));
    const planDays = Number(get('plano_dias')) || days.length;
    const price = Number(get('mensalidade').replace(/\./g, '').replace(',', '.')) || undefined;
    saveEnrollment(student.id, { line_id: lineId, plan_days: planDays, weekdays: days, monthly_price: price });
    result.imported++;
  });
  logEvent('cadastro', `Planilha importada: ${result.imported} alunos`);
  return result;
}

