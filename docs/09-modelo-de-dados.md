# 09 · Modelo de dados

Sugestão de esquema relacional (SQLite). Nomes em inglês no código, textos em português na interface. IDs em texto curto legível (`op_ze`, `van_itu`, `st_ana`) ajudam na demo e nos logs. Datas em ISO 8601 no fuso America/Sao_Paulo. O `dados-demo/seed.json` segue estes nomes de tabela e campo.

```
operators ──< vans ──< lines ──< trips ──< trip_passengers >── students
    │           │                                   │              │
    │           └──< documents                      │              ├──< schedules (grade)
    │                                               │              ├──< enrollments >── plans
    ├──< drivers ──< documents                      │              └──< avulsa_bookings
    ├──< plans                                      │
    ├──< invoices >── enrollments                   └── avulsa_bookings
    ├──< expenses
    ├──< messages (log do WhatsApp simulado)
    ├── operator_settings
    └── subscription (assinatura VanFlow)
leads, holidays, calendar_exceptions, demo_state, events_log
```

## Tabelas

**operators**: `id, name, trade_name ("Van do Seu Zé"), owner_name, whatsapp, city, pix_key, pix_key_type (cpf|cnpj|email|telefone|aleatoria), pix_merchant_name (≤25), pix_city (≤15), created_at, trial_ends_at, status (trial|active|canceled)`

**operator_settings**: `operator_id, confirmation_time ("21:00"), reminder_time ("22:30"), reminder_enabled, close_minutes_before_departure (180), close_time_morning ("05:30"), no_answer_counts_as_going (true), invoice_day (1), due_day (5), avulsa_hold_minutes (30), avulsa_auto_offer (true)`

**subscription**: `operator_id, price_per_van (59.90), vans_count, started_at, status (trial|active|canceled), plan (padrao|frotista)`

**drivers**: `id, operator_id, name, phone, is_owner`

**vans**: `id, operator_id, nickname ("Van 1 · Itu"), plate (fictícia, "ABC1D23"), model, seats (15), color, driver_id`

**lines** (linha = trajeto fixo de um turno): `id, van_id, name ("Itu e Salto → Sorocaba"), shift (manha|noite), departure_time ("17:40"), return_time ("22:50"), origin {lat,lng,label}, destinations [faculty_id], price_table {plan_5, plan_3, plan_2, avulsa_round, avulsa_one_way}`

**faculties**: `id, name ("Uniso"), full_name, campus, lat, lng` (coordenadas aproximadas)

**students**: `id, operator_id, name, phone, city, neighborhood, pickup_label ("Praça da Matriz"), lat, lng, faculty_id, course, status (ativo|interessado_avulsa|inativo), guardian_phone (opcional), created_at`

**schedules** (grade): `id, student_id, semester ("2026/2"), weekday (1=seg..5=sex, 6=sáb), faculty_id, start ("19:00"), end ("22:40")`

**plans**: `id, operator_id, name ("3 dias por semana"), days_per_week (2|3|5), price` (ou derivado da price_table da linha)

**enrollments** (matrícula do aluno em uma linha): `id, student_id, line_id, plan_days (2|3|5), weekdays [1,3,4], monthly_price, start_date, end_date, status (ativa|pausada|cancelada)`

**trips** (uma viagem concreta): `id, line_id, date, direction (ida|volta), departure_time, status (planejada|confirmacoes_enviadas|lista_fechada|em_andamento|concluida|cancelada), confirmations_sent_at, closed_at, route_cache (json)`

**trip_passengers**: `id, trip_id, student_id, source (plano|avulsa), status (previsto|aguardando|confirmado|nao_vai|sem_resposta|embarcou|nao_apareceu), reason (texto livre), responded_at, stop_order, eta`

**avulsa_bookings**: `id, trip_id (ou par ida/volta), student_id, kind (ida_volta|so_ida|so_volta), price, status (reservado|pago|expirado|cancelado), hold_until, pix_txid, pix_payload, paid_at`

**invoices** (cobrança mensal): `id, operator_id, enrollment_id, student_id, reference_month ("2026-11"), amount, due_date, status (pendente|paga|atrasada|cancelada), pix_txid, pix_payload, sent_at, paid_at, paid_via (pix|manual), reminders [{kind, sent_at}]`

**payments**: `id, txid, amount, paid_at, source (webhook_simulado|manual), invoice_id | avulsa_booking_id`

**expenses**: `id, operator_id, van_id, date, category (combustivel|manutencao|seguro|parcela|outros), description, amount`

**documents**: `id, operator_id, owner_type (van|driver), owner_id, type (cnh|crlv|vistoria|seguro|autorizacao_artesp|curso_condutor), number (fictício), expires_at`

**messages** (log do WhatsApp simulado, a fonte do simulador): `id, operator_id, student_id (ou phone para contatos novos), direction (out|in), kind (texto|confirmacao|cobranca|pix|oferta_avulsa|recibo|lembrete), body, buttons [label], payload (json com trip_id, invoice_id, etc.), created_at (relógio da demo), read_at`

**leads** (formulários da landing): `id, kind (operador|estudante), name, whatsapp, city, vans_count, faculties, message, source (landing|entrevista|indicacao), created_at, converted_operator_id`

**holidays**: `date, name`. **calendar_exceptions**: `id, operator_id, date, scope (faculdade|linha|aluno), ref_id, kind (sem_aula|viagem_cancelada), note`

**demo_state**: `now (data e hora simulada), scenario, speed`. **events_log**: `id, at, type, description` (alimenta a linha do tempo da central da demo).

## Regras de integridade úteis

- Um aluno pode ter mais de uma matrícula (ex.: ida com a van da noite, outra linha no sábado), mas só uma por linha ativa.
- `trip_passengers` é recriado para viagens futuras quando a grade ou a matrícula mudam, preservando respostas já dadas.
- Viagens são geradas sob demanda para os próximos 7 dias a partir do relógio da demo.
- `invoices` únicas por `(enrollment_id, reference_month)`.

## API (sugestão REST)

```
GET  /api/demo/state            POST /api/demo/clock {now}     POST /api/demo/advance {to|minutes}
POST /api/demo/reset            POST /api/demo/scenario/{id}   POST /api/demo/simulate-replies {trip_id, pct_yes}
GET  /api/events  (SSE)
GET  /api/operators/:id/today   GET /api/trips/:id              POST /api/trips/:id/send-confirmations
POST /api/trips/:id/close       GET /api/trips/:id/route        PATCH /api/trip-passengers/:id {status}
CRUD /api/students, /api/schedules, /api/enrollments, /api/vans, /api/lines, /api/documents, /api/expenses
GET  /api/invoices?month=       POST /api/invoices/generate {month}   POST /api/invoices/:id/remind
POST /api/invoices/:id/mark-paid
GET  /api/avulsas/available?date=   POST /api/avulsas/book   POST /api/avulsas/:id/cancel
GET  /api/whatsapp/conversations    GET /api/whatsapp/conversations/:studentId
POST /api/whatsapp/inbound {student_id|phone, text|button}      (o simulador "responde" por aqui)
POST /api/webhooks/pix {txid, amount}
POST /api/leads                 GET /api/startup/metrics
```
