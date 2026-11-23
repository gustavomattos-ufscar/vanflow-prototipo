/** Tipos compartilhados entre servidor e web. Nomes de campo seguem docs/09-modelo-de-dados.md. */

export type Shift = 'manha' | 'noite';
export type Direction = 'ida' | 'volta';
export type TripStatus = 'planejada' | 'confirmacoes_enviadas' | 'lista_fechada' | 'em_andamento' | 'concluida' | 'cancelada';
export type PassengerStatus =
  | 'previsto' | 'aguardando' | 'confirmado' | 'nao_vai' | 'sem_resposta'
  | 'embarcou' | 'nao_apareceu' | 'reservado' | 'expirado';
export type InvoiceStatus = 'pendente' | 'paga' | 'atrasada' | 'cancelada';
export type BookingStatus = 'reservado' | 'pago' | 'expirado' | 'cancelado';
export type BookingKind = 'ida_volta' | 'so_ida' | 'so_volta';

export interface GeoPoint { lat: number; lng: number; label?: string }

export interface PriceTable {
  plan_5: number; plan_3: number; plan_2: number; avulsa_round: number; avulsa_one_way: number;
}

export interface Semester { id: string; start: string; end: string }

export interface Line {
  id: string; van_id: string; name: string; shift: Shift;
  departure_time: string; return_time: string;
  origin: GeoPoint; destinations: string[]; price_table: PriceTable;
}

export interface Enrollment {
  id: string; student_id: string; line_id: string; plan_days: number; weekdays: number[];
  monthly_price: number; start_date: string; end_date: string; status: 'ativa' | 'pausada' | 'cancelada';
  /** Plano pausado: a data em que ele volta sozinho (ou null, sem data). */
  paused_until?: string | null; pause_reason?: string | null;
}

export interface ScheduleEntry {
  id: string; student_id: string; semester: string; weekday: number;
  faculty_id: string; start: string; end: string;
}

export interface Holiday { date: string; name: string }

export interface CalendarException {
  id: string; operator_id: string; date: string;
  scope: 'faculdade' | 'linha' | 'aluno'; ref_id: string;
  kind: 'sem_aula' | 'viagem_cancelada'; note: string;
}

export interface OperatorSettings {
  operator_id: string; confirmation_time: string; reminder_time: string; reminder_enabled: boolean;
  close_minutes_before_departure: number; close_time_morning: string; no_answer_counts_as_going: boolean;
  invoice_day: number; due_day: number; avulsa_hold_minutes: number; avulsa_auto_offer: boolean;
}

export interface PassengerLike { status: PassengerStatus; source: 'plano' | 'avulsa' }

export interface SeatSummary {
  /** Todos na lista, incluindo quem avisou que não vai ("14" em "11 de 14 vão"). */
  total: number;
  /** Quem conta como indo ("11" em "11 de 14 vão"). */
  going: number;
  confirmed: number; pending: number; noAnswer: number; notGoing: number;
  avulsos: number; reserved: number; occupied: number; free: number; capacity: number;
}
