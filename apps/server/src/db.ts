/** Banco SQLite embutido no Node (node:sqlite) e um repositório genérico fino sobre ele. */
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { DatabaseSync as Database } from 'node:sqlite';

// Carregado assim porque o Vite (usado nos testes) não reconhece o prefixo node: deste módulo.
const sqlite = process.getBuiltinModule?.('node:sqlite');
if (!sqlite) {
  console.error(`A VanFlow precisa do Node 22.13 ou mais recente. Esta máquina tem o ${process.version}.`);
  process.exit(1);
}
const { DatabaseSync } = sqlite;

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../..');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS operators (id TEXT PRIMARY KEY, name TEXT, trade_name TEXT, owner_name TEXT, whatsapp TEXT, city TEXT,
  pix_key TEXT, pix_key_type TEXT, pix_merchant_name TEXT, pix_city TEXT, created_at TEXT, trial_ends_at TEXT, status TEXT, onboarded INTEGER DEFAULT 1);
CREATE TABLE IF NOT EXISTS operator_settings (operator_id TEXT PRIMARY KEY, confirmation_time TEXT, reminder_time TEXT, reminder_enabled INTEGER,
  close_minutes_before_departure INTEGER, close_time_morning TEXT, no_answer_counts_as_going INTEGER, invoice_day INTEGER, due_day INTEGER,
  avulsa_hold_minutes INTEGER, avulsa_auto_offer INTEGER);
CREATE TABLE IF NOT EXISTS subscriptions (operator_id TEXT PRIMARY KEY, price_per_van REAL, vans_count INTEGER, started_at TEXT, status TEXT, plan TEXT);
CREATE TABLE IF NOT EXISTS drivers (id TEXT PRIMARY KEY, operator_id TEXT, name TEXT, phone TEXT, is_owner INTEGER);
CREATE TABLE IF NOT EXISTS vans (id TEXT PRIMARY KEY, operator_id TEXT, nickname TEXT, plate TEXT, model TEXT, seats INTEGER, color TEXT, driver_id TEXT);
CREATE TABLE IF NOT EXISTS lines (id TEXT PRIMARY KEY, van_id TEXT, name TEXT, shift TEXT, departure_time TEXT, return_time TEXT,
  origin TEXT, destinations TEXT, price_table TEXT);
CREATE TABLE IF NOT EXISTS faculties (id TEXT PRIMARY KEY, name TEXT, full_name TEXT, campus TEXT, lat REAL, lng REAL, approx INTEGER);
CREATE TABLE IF NOT EXISTS students (id TEXT PRIMARY KEY, operator_id TEXT, name TEXT, phone TEXT, city TEXT, neighborhood TEXT, pickup_label TEXT,
  lat REAL, lng REAL, faculty_id TEXT, course TEXT, status TEXT, guardian_phone TEXT, created_at TEXT, interest_line_id TEXT, token TEXT UNIQUE);
CREATE TABLE IF NOT EXISTS schedules (id TEXT PRIMARY KEY, student_id TEXT, semester TEXT, weekday INTEGER, faculty_id TEXT, "start" TEXT, "end" TEXT);
CREATE TABLE IF NOT EXISTS plans (id TEXT PRIMARY KEY, operator_id TEXT, name TEXT, days_per_week INTEGER);
CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, student_id TEXT, line_id TEXT, plan_days INTEGER, weekdays TEXT, monthly_price REAL,
  start_date TEXT, end_date TEXT, status TEXT);
CREATE TABLE IF NOT EXISTS trips (id TEXT PRIMARY KEY, line_id TEXT, date TEXT, direction TEXT, departure_time TEXT, status TEXT,
  confirmations_sent_at TEXT, reminder_sent_at TEXT, closed_at TEXT, route_cache TEXT, UNIQUE(line_id, date, direction));
CREATE TABLE IF NOT EXISTS trip_passengers (id TEXT PRIMARY KEY, trip_id TEXT, student_id TEXT, source TEXT, status TEXT, reason TEXT, responded_at TEXT,
  stop_order INTEGER, eta TEXT, faculty_id TEXT, class_start TEXT, UNIQUE(trip_id, student_id));
CREATE TABLE IF NOT EXISTS avulsa_bookings (id TEXT PRIMARY KEY, operator_id TEXT, line_id TEXT, date TEXT, student_id TEXT, kind TEXT, price REAL, status TEXT,
  hold_until TEXT, pix_txid TEXT, pix_payload TEXT, paid_at TEXT);
CREATE TABLE IF NOT EXISTS avulsa_offers (trip_key TEXT, student_id TEXT, sent_at TEXT, PRIMARY KEY (trip_key, student_id));
CREATE TABLE IF NOT EXISTS invoices (id TEXT PRIMARY KEY, operator_id TEXT, enrollment_id TEXT, student_id TEXT, reference_month TEXT, amount REAL, due_date TEXT,
  status TEXT, pix_txid TEXT, pix_payload TEXT, sent_at TEXT, paid_at TEXT, paid_via TEXT, paid_note TEXT, reminders TEXT, UNIQUE(enrollment_id, reference_month));
CREATE TABLE IF NOT EXISTS payments (id TEXT PRIMARY KEY, txid TEXT, amount REAL, paid_at TEXT, source TEXT, invoice_id TEXT, avulsa_booking_id TEXT);
CREATE TABLE IF NOT EXISTS expenses (id TEXT PRIMARY KEY, operator_id TEXT, van_id TEXT, date TEXT, category TEXT, description TEXT, amount REAL);
CREATE TABLE IF NOT EXISTS documents (id TEXT PRIMARY KEY, operator_id TEXT, owner_type TEXT, owner_id TEXT, type TEXT, number TEXT, expires_at TEXT);
CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, seq INTEGER, operator_id TEXT, student_id TEXT, phone TEXT, direction TEXT, kind TEXT, body TEXT,
  buttons TEXT, payload TEXT, created_at TEXT, read_at TEXT);
CREATE TABLE IF NOT EXISTS leads (id TEXT PRIMARY KEY, kind TEXT, name TEXT, whatsapp TEXT, city TEXT, vans_count INTEGER, faculties TEXT, message TEXT,
  source TEXT, created_at TEXT, converted_operator_id TEXT);
CREATE TABLE IF NOT EXISTS holidays (date TEXT PRIMARY KEY, name TEXT);
CREATE TABLE IF NOT EXISTS calendar_exceptions (id TEXT PRIMARY KEY, operator_id TEXT, date TEXT, scope TEXT, ref_id TEXT, kind TEXT, note TEXT);
CREATE TABLE IF NOT EXISTS demo_state (id INTEGER PRIMARY KEY CHECK (id = 1), now TEXT, scenario TEXT, speed INTEGER, protect_trial INTEGER);
CREATE TABLE IF NOT EXISTS events_log (id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT, type TEXT, description TEXT);
CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, operator_id TEXT, kind TEXT, body TEXT, ref TEXT, created_at TEXT);
CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT);
CREATE INDEX IF NOT EXISTS idx_tp_trip ON trip_passengers(trip_id);
CREATE INDEX IF NOT EXISTS idx_tp_student ON trip_passengers(student_id);
CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);
CREATE INDEX IF NOT EXISTS idx_messages_student ON messages(student_id, seq);
CREATE INDEX IF NOT EXISTS idx_invoices_month ON invoices(operator_id, reference_month);
`;

const JSON_COLUMNS: Record<string, string[]> = {
  lines: ['origin', 'destinations', 'price_table'], enrollments: ['weekdays'], trips: ['route_cache'],
  invoices: ['reminders'], messages: ['buttons', 'payload'],
};
const BOOL_COLUMNS: Record<string, string[]> = {
  operator_settings: ['reminder_enabled', 'no_answer_counts_as_going', 'avulsa_auto_offer'],
  drivers: ['is_owner'], faculties: ['approx'], operators: ['onboarded'], demo_state: ['protect_trial'],
};

function open(): Database {
  const file = process.env.VANFLOW_DB ?? resolve(ROOT, 'data/vanflow.db');
  if (file !== ':memory:') mkdirSync(dirname(file), { recursive: true });
  const database = new DatabaseSync(file);
  database.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;');
  database.exec(SCHEMA);
  return database;
}

export const db = open();

type Row = Record<string, any>;
const columnCache = new Map<string, string[]>();

function columns(table: string): string[] {
  let cached = columnCache.get(table);
  if (!cached) {
    cached = (db.prepare(`PRAGMA table_info(${table})`).all() as Row[]).map((c) => c.name);
    columnCache.set(table, cached);
  }
  return cached;
}

function decode<T>(table: string, row: Row): T {
  const out: Row = { ...row };
  for (const c of JSON_COLUMNS[table] ?? []) out[c] = out[c] == null ? null : JSON.parse(out[c]);
  for (const c of BOOL_COLUMNS[table] ?? []) out[c] = !!out[c];
  return out as T;
}

function encodeValue(table: string, column: string, value: unknown): any {
  if (value === undefined || value === null) return null;
  if (JSON_COLUMNS[table]?.includes(column)) return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 1 : 0;
  return value;
}

/** Linhas de uma tabela. `where` é SQL com parâmetros "?"; `all('trips', 'date = ?', d)`. */
export function all<T = Row>(table: string, where = '1=1', ...params: any[]): T[] {
  return (db.prepare(`SELECT * FROM ${table} WHERE ${where}`).all(...params) as Row[]).map((r) => decode<T>(table, r));
}

export function one<T = Row>(table: string, where: string, ...params: any[]): T | undefined {
  const row = db.prepare(`SELECT * FROM ${table} WHERE ${where} LIMIT 1`).get(...params) as Row | undefined;
  return row ? decode<T>(table, row) : undefined;
}

export const byId = <T = Row>(table: string, id: string) => one<T>(table, 'id = ?', id);

export function insert(table: string, data: Row, mode: 'INSERT' | 'INSERT OR REPLACE' | 'INSERT OR IGNORE' = 'INSERT'): void {
  const cols = columns(table).filter((c) => data[c] !== undefined);
  const sql = `${mode} INTO ${table} (${cols.map((c) => `"${c}"`).join(',')}) VALUES (${cols.map(() => '?').join(',')})`;
  db.prepare(sql).run(...cols.map((c) => encodeValue(table, c, data[c])));
}

/** Atualiza as linhas do `where`, ou a linha de `id` se `where` for só o id. */
export function update(table: string, id: string, data: Row, key = 'id'): void {
  const cols = columns(table).filter((c) => data[c] !== undefined && c !== key);
  if (!cols.length) return;
  const sql = `UPDATE ${table} SET ${cols.map((c) => `"${c}" = ?`).join(',')} WHERE "${key}" = ?`;
  db.prepare(sql).run(...cols.map((c) => encodeValue(table, c, data[c])), id);
}

export function remove(table: string, where: string, ...params: any[]): void {
  db.prepare(`DELETE FROM ${table} WHERE ${where}`).run(...params);
}

export function sql<T = Row>(query: string, ...params: any[]): T[] {
  return db.prepare(query).all(...params) as T[];
}

let depth = 0;

/** Transação com aninhamento: um avanço de relógio inteiro é tudo ou nada. */
export function tx<T>(fn: () => T): T {
  if (depth > 0) return fn();
  db.exec('BEGIN');
  depth++;
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  } finally {
    depth--;
  }
}

const TABLES = [
  'operators', 'operator_settings', 'subscriptions', 'drivers', 'vans', 'lines', 'faculties', 'students', 'schedules', 'plans',
  'enrollments', 'trips', 'trip_passengers', 'avulsa_bookings', 'avulsa_offers', 'invoices', 'payments', 'expenses', 'documents',
  'messages', 'leads', 'holidays', 'calendar_exceptions', 'demo_state', 'events_log', 'alerts', 'meta',
];

export function clearAll(): void {
  for (const table of TABLES) db.exec(`DELETE FROM ${table}`);
}

export function metaGet<T>(key: string): T {
  const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key) as { value: string } | undefined;
  if (!row) throw new Error(`meta ausente: ${key}`);
  return JSON.parse(row.value) as T;
}

export function metaSet(key: string, value: unknown): void {
  db.prepare('INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)').run(key, JSON.stringify(value));
}
