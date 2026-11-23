#!/usr/bin/env python3
"""Gera dados-demo/seed.json e dados-demo/alunos-exemplo.csv para o protótipo VanFlow.

Todos os nomes, telefones, placas, endereços e chaves Pix são FICTÍCIOS.
Coordenadas das cidades e faculdades são APROXIMADAS (servem só para o mapa esquemático
e para ordenar paradas). Rode de novo após ajustar: python3 gerar_seed.py
"""
import csv, json, random, os
from datetime import date, datetime, timedelta

random.seed(2026)
HERE = os.path.dirname(os.path.abspath(__file__))

NOW = "2026-11-11T20:55:00-03:00"   # quarta-feira, 5 min antes das confirmações de quinta
SEMESTER = {"id": "2026/2", "start": "2026-08-03", "end": "2026-12-12"}

def crc16(s):
    c = 0xFFFF
    for b in s.encode():
        c ^= b << 8
        for _ in range(8):
            c = ((c << 1) ^ 0x1021) if c & 0x8000 else c << 1
            c &= 0xFFFF
    return f"{c:04X}"

def emv(i, v):
    return f"{i}{len(v):02d}{v}"

def pix_payload(chave, nome, cidade, valor, txid):
    mai = emv("00", "br.gov.bcb.pix") + emv("01", chave)
    p = (emv("00", "01") + emv("01", "12") + emv("26", mai) + emv("52", "0000") + emv("53", "986")
         + emv("54", f"{valor:.2f}") + emv("58", "BR") + emv("59", nome) + emv("60", cidade)
         + emv("62", emv("05", txid)) + "6304")
    return p + crc16(p)

assert crc16("123456789") == "29B1"

faculties = [
    {"id": "fac_ufscar", "name": "UFSCar", "full_name": "Universidade Federal de São Carlos", "campus": "Campus Sorocaba", "lat": -23.5813, "lng": -47.5243, "approx": True},
    {"id": "fac_uniso", "name": "Uniso", "full_name": "Universidade de Sorocaba", "campus": "Cidade Universitária", "lat": -23.5170, "lng": -47.4120, "approx": True},
    {"id": "fac_facens", "name": "Facens", "full_name": "Centro Universitário Facens", "campus": "Sorocaba", "lat": -23.4706, "lng": -47.4291, "approx": True},
]
CITY = {"Itu": (-23.2642, -47.2992), "Salto": (-23.2003, -47.2869), "Votorantim": (-23.5446, -47.4388), "Sorocaba": (-23.5015, -47.4526)}

def jitter(city, k=0.011):
    la, ln = CITY[city]
    return round(la + random.uniform(-k, k), 5), round(ln + random.uniform(-k, k), 5)

operators = [
    {"id": "op_ze", "name": "José Almeida Fretados", "trade_name": "Van do Seu Zé", "owner_name": "José Almeida",
     "whatsapp": "(15) 90000-0001", "city": "Itu", "pix_key": "vanflow.demo@exemplo.com", "pix_key_type": "email",
     "pix_merchant_name": "JOSE ALMEIDA FRETADOS", "pix_city": "ITU",
     "created_at": "2026-10-27T10:00:00-03:00", "trial_ends_at": "2026-11-26T23:59:00-03:00", "status": "trial"},
    {"id": "op_rita", "name": "Rita Moraes Transportes", "trade_name": "Rita Transportes", "owner_name": "Rita Moraes",
     "whatsapp": "(15) 90000-0002", "city": "Salto", "pix_key": "rita.demo@exemplo.com", "pix_key_type": "email",
     "pix_merchant_name": "RITA MORAES TRANSPORTES", "pix_city": "SALTO",
     "created_at": "2026-11-04T15:00:00-03:00", "trial_ends_at": "2026-12-04T23:59:00-03:00", "status": "trial"},
]
operator_settings = [
    {"operator_id": o["id"], "confirmation_time": "21:00", "reminder_time": "22:30", "reminder_enabled": True,
     "close_minutes_before_departure": 180, "close_time_morning": "05:30", "no_answer_counts_as_going": True,
     "invoice_day": 1, "due_day": 5, "avulsa_hold_minutes": 30, "avulsa_auto_offer": True}
    for o in operators]
subscriptions = [
    {"operator_id": "op_ze", "price_per_van": 59.90, "vans_count": 2, "started_at": None, "status": "trial", "plan": "padrao"},
    {"operator_id": "op_rita", "price_per_van": 59.90, "vans_count": 1, "started_at": None, "status": "trial", "plan": "padrao"},
]
drivers = [
    {"id": "drv_ze", "operator_id": "op_ze", "name": "José Almeida", "phone": "(15) 90000-0001", "is_owner": True},
    {"id": "drv_edson", "operator_id": "op_ze", "name": "Edson Pereira", "phone": "(15) 90000-0003", "is_owner": False},
    {"id": "drv_rita", "operator_id": "op_rita", "name": "Rita Moraes", "phone": "(15) 90000-0002", "is_owner": True},
]
vans = [
    {"id": "van_itu", "operator_id": "op_ze", "nickname": "Van 1 · Itu", "plate": "FRT2A26", "model": "Van 15 lugares", "seats": 15, "color": "Branca", "driver_id": "drv_ze"},
    {"id": "van_voto", "operator_id": "op_ze", "nickname": "Van 2 · Votorantim", "plate": "FRT4C71", "model": "Van 15 lugares", "seats": 15, "color": "Prata", "driver_id": "drv_edson"},
    {"id": "van_rita", "operator_id": "op_rita", "nickname": "Van da Rita", "plate": "FRT7E19", "model": "Van 12 lugares", "seats": 12, "color": "Branca", "driver_id": "drv_rita"},
]
lines = [
    {"id": "line_itu_noite", "van_id": "van_itu", "name": "Itu e Salto → Sorocaba", "shift": "noite",
     "departure_time": "17:40", "return_time": "22:50",
     "origin": {"label": "Garagem · Itu", "lat": -23.2705, "lng": -47.3061},
     "destinations": ["fac_uniso", "fac_facens", "fac_ufscar"],
     "price_table": {"plan_5": 420.00, "plan_3": 300.00, "plan_2": 220.00, "avulsa_round": 20.00, "avulsa_one_way": 12.00}},
    {"id": "line_voto_manha", "van_id": "van_voto", "name": "Votorantim → Sorocaba", "shift": "manha",
     "departure_time": "06:30", "return_time": "12:20",
     "origin": {"label": "Ponto inicial · Votorantim Centro", "lat": -23.5440, "lng": -47.4400},
     "destinations": ["fac_facens", "fac_ufscar"],
     "price_table": {"plan_5": 320.00, "plan_3": 240.00, "plan_2": 170.00, "avulsa_round": 16.00, "avulsa_one_way": 10.00}},
    {"id": "line_rita_noite", "van_id": "van_rita", "name": "Salto → Sorocaba", "shift": "noite",
     "departure_time": "17:50", "return_time": "22:50",
     "origin": {"label": "Garagem · Salto", "lat": -23.2050, "lng": -47.2900},
     "destinations": ["fac_uniso", "fac_facens"],
     "price_table": {"plan_5": 400.00, "plan_3": 290.00, "plan_2": 210.00, "avulsa_round": 20.00, "avulsa_one_way": 12.00}},
]
LINE = {l["id"]: l for l in lines}

# (id, nome, cidade, bairro, faculdade, curso, dias do plano, inicio, fim, linha, operador)
NOITE = ("19:00", "22:40")
MANHA = ("08:00", "12:00")
roster = [
    # Van 1 · Itu e Salto (noite). Na quinta 12/11 exatamente 14 previstos.
    ("st_ana", "Ana Beatriz Rocha", "Itu", "Jd. Paulista", "fac_uniso", "Administração", [1, 3, 4], NOITE, "line_itu_noite"),
    ("st_bruno", "Bruno Lima", "Itu", "Centro", "fac_facens", "Engenharia Mecânica", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_diego", "Diego Souza", "Itu", "Rodoviária", "fac_ufscar", "Administração", [2, 4], ("19:00", "23:00"), "line_itu_noite"),
    ("st_julia", "Júlia Martins", "Itu", "Vila Nova", "fac_uniso", "Direito", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_rafael", "Rafael Oliveira", "Salto", "Centro", "fac_facens", "Engenharia de Computação", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_larissa", "Larissa Ferreira", "Salto", "Jd. das Nações", "fac_uniso", "Enfermagem", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_pedro", "Pedro Henrique Alves", "Itu", "Vila Martins", "fac_facens", "Engenharia Civil", [2, 3, 4], NOITE, "line_itu_noite"),
    ("st_mariana", "Mariana Costa", "Salto", "Vila Teixeira", "fac_uniso", "Psicologia", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_lucas", "Lucas Pereira", "Itu", "Parque Industrial", "fac_ufscar", "Ciências Econômicas", [1, 2, 3, 4, 5], ("19:00", "23:00"), "line_itu_noite"),
    ("st_gabriela", "Gabriela Santos", "Itu", "Bairro Brasil", "fac_uniso", "Farmácia", [1, 2, 4], NOITE, "line_itu_noite"),
    ("st_matheus", "Matheus Ribeiro", "Salto", "Jd. Arco-Íris", "fac_facens", "Engenharia Elétrica", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_beatriz", "Beatriz Carvalho", "Itu", "Cidade Nova", "fac_uniso", "Pedagogia", [3, 4], NOITE, "line_itu_noite"),
    ("st_vinicius", "Vinícius Gomes", "Itu", "Jd. Corazza", "fac_facens", "Engenharia de Produção", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_isabela", "Isabela Araújo", "Salto", "Centro", "fac_uniso", "Administração", [1, 2, 3, 4, 5], NOITE, "line_itu_noite"),
    ("st_caio", "Caio Mendes", "Itu", "Centro", "fac_ufscar", "Pedagogia", [1, 3, 5], ("19:00", "23:00"), "line_itu_noite"),
    ("st_leticia", "Letícia Nogueira", "Salto", "Vila Nova", "fac_uniso", "Arquitetura", [1, 2], NOITE, "line_itu_noite"),
    # Van 2 · Votorantim (manhã)
    ("st_amanda", "Amanda Ribeiro", "Votorantim", "Centro", "fac_ufscar", "Engenharia Florestal", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_henrique", "Henrique Tavares", "Votorantim", "Jd. Paraíso", "fac_ufscar", "Ciência da Computação", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_camila", "Camila Freitas", "Votorantim", "Vila Albertina", "fac_facens", "Engenharia Química", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_eduarda", "Eduarda Lopes", "Votorantim", "Itapeva", "fac_ufscar", "Biologia", [2, 4], MANHA, "line_voto_manha"),
    ("st_joao", "João Vitor Cardoso", "Votorantim", "Centro", "fac_facens", "Engenharia Mecânica", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_natalia", "Natália Pires", "Votorantim", "Jd. Toledo", "fac_ufscar", "Física", [1, 3, 5], MANHA, "line_voto_manha"),
    ("st_otavio", "Otávio Ramos", "Votorantim", "Vila Garcia", "fac_ufscar", "Engenharia de Produção", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_sofia", "Sofia Almeida", "Votorantim", "Centro", "fac_facens", "Arquitetura", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_renan", "Renan Duarte", "Votorantim", "Parque Bela Vista", "fac_ufscar", "Química", [2, 3, 4], MANHA, "line_voto_manha"),
    ("st_yara", "Yara Fontes", "Votorantim", "Jd. Clarice", "fac_facens", "Design", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    ("st_daniel", "Daniel Moreira", "Votorantim", "Centro", "fac_ufscar", "Matemática", [1, 2], MANHA, "line_voto_manha"),
    ("st_priscila", "Priscila Teles", "Votorantim", "Vila Nova", "fac_ufscar", "Turismo", [1, 2, 3, 4, 5], MANHA, "line_voto_manha"),
    # Rita (segundo operador, P2)
    ("st_rita_1", "Fernanda Queiroz", "Salto", "Centro", "fac_uniso", "Nutrição", [1, 2, 3, 4, 5], NOITE, "line_rita_noite"),
    ("st_rita_2", "Igor Batista", "Salto", "Jd. Saltense", "fac_facens", "Engenharia Civil", [1, 2, 3, 4, 5], NOITE, "line_rita_noite"),
    ("st_rita_3", "Helena Vidal", "Salto", "Vila Teixeira", "fac_uniso", "Medicina Veterinária", [2, 3, 4], NOITE, "line_rita_noite"),
    ("st_rita_4", "Murilo Antunes", "Salto", "Centro", "fac_uniso", "Educação Física", [1, 2, 3, 4, 5], NOITE, "line_rita_noite"),
    ("st_rita_5", "Paula Siqueira", "Salto", "Jd. Elizabeth", "fac_facens", "Design", [1, 4], NOITE, "line_rita_noite"),
]
# Interessados em vaga avulsa (sem matrícula)
interested = [
    ("st_carla", "Carla Dias", "Salto", "Vila Nova", "fac_uniso", "Relações Internacionais", "line_itu_noite"),
    ("st_felipe", "Felipe Moura", "Itu", "Centro", "fac_facens", "Engenharia de Computação", "line_itu_noite"),
    ("st_tamires", "Tamires Rocha", "Votorantim", "Centro", "fac_ufscar", "Letras", "line_voto_manha"),
]

students, schedules, enrollments = [], [], []
phone_n = 10
def next_phone():
    global phone_n
    phone_n += 1
    return f"(15) 90000-{phone_n:04d}"

op_of_line = {l["id"]: next(v["operator_id"] for v in vans if v["id"] == l["van_id"]) for l in lines}
for (sid, name, city, bairro, fac, course, days, (ini, fim), line_id) in roster:
    la, ln = jitter(city)
    students.append({"id": sid, "operator_id": op_of_line[line_id], "name": name, "phone": next_phone(), "city": city,
                     "neighborhood": bairro, "pickup_label": f"{bairro} · ponto combinado", "lat": la, "lng": ln,
                     "faculty_id": fac, "course": course, "status": "ativo", "guardian_phone": None,
                     "created_at": "2026-08-01T10:00:00-03:00"})
    for wd in days:
        schedules.append({"id": f"sch_{sid}_{wd}", "student_id": sid, "semester": SEMESTER["id"], "weekday": wd,
                          "faculty_id": fac, "start": ini, "end": fim})
    n = len(days)
    plan_days = 5 if n >= 4 else n
    price = LINE[line_id]["price_table"][f"plan_{plan_days}"]
    enrollments.append({"id": f"enr_{sid}", "student_id": sid, "line_id": line_id, "plan_days": plan_days,
                        "weekdays": days, "monthly_price": price, "start_date": "2026-08-01", "end_date": "2026-12-12",
                        "status": "ativa"})
for (sid, name, city, bairro, fac, course, line_id) in interested:
    la, ln = jitter(city)
    students.append({"id": sid, "operator_id": op_of_line[line_id], "name": name, "phone": next_phone(), "city": city,
                     "neighborhood": bairro, "pickup_label": f"{bairro} · ponto combinado", "lat": la, "lng": ln,
                     "faculty_id": fac, "course": course, "status": "interessado_avulsa", "guardian_phone": None,
                     "interest_line_id": line_id, "created_at": "2026-09-15T10:00:00-03:00"})
    # grade completa (para a VanFlow saber em que dias ela teria aula), mas sem plano
    for wd in [2, 4]:
        schedules.append({"id": f"sch_{sid}_{wd}", "student_id": sid, "semester": SEMESTER["id"], "weekday": wd,
                          "faculty_id": fac, "start": NOITE[0] if "noite" in line_id else MANHA[0],
                          "end": NOITE[1] if "noite" in line_id else MANHA[1]})

plans = []
for op in operators:
    for d in (2, 3, 5):
        plans.append({"id": f"plan_{op['id']}_{d}", "operator_id": op["id"], "name": f"{d} dias por semana", "days_per_week": d})

STU = {s["id"]: s for s in students}
OP = {o["id"]: o for o in operators}

# Cobranças: set e out pagas; nov com 4 atrasadas
invoices, payments = [], []
LATE_NOV = {"st_diego", "st_vinicius", "st_otavio", "st_rita_4"}
for month, due in (("2026-09", "2026-09-05"), ("2026-10", "2026-10-05"), ("2026-11", "2026-11-05")):
    for e in enrollments:
        s = STU[e["student_id"]]; op = OP[s["operator_id"]]
        if op["id"] == "op_rita" and month != "2026-11":
            continue
        short = s["id"].replace("st_", "").upper()[:6]
        txid = f"VF{month.replace('-', '')}{short}01"
        payload = pix_payload(op["pix_key"], op["pix_merchant_name"], op["pix_city"], e["monthly_price"], txid)
        late = month == "2026-11" and s["id"] in LATE_NOV
        d0 = date.fromisoformat(due)
        paid_at = None if late else (datetime.combine(d0 - timedelta(days=random.randint(0, 4)), datetime.min.time()) + timedelta(hours=random.randint(8, 21), minutes=random.randint(0, 59))).isoformat() + "-03:00"
        inv_id = f"inv_{month.replace('-', '')}_{s['id']}"
        reminders = [{"kind": "d-2", "sent_at": f"{(d0 - timedelta(days=2)).isoformat()}T08:00:00-03:00"}]
        if late:
            reminders += [{"kind": "d0", "sent_at": f"{due}T08:00:00-03:00"}, {"kind": "d+1", "sent_at": f"{(d0 + timedelta(days=1)).isoformat()}T08:00:00-03:00"}, {"kind": "d+3", "sent_at": f"{(d0 + timedelta(days=3)).isoformat()}T08:00:00-03:00"}]
        invoices.append({"id": inv_id, "operator_id": op["id"], "enrollment_id": e["id"], "student_id": s["id"],
                         "reference_month": month, "amount": e["monthly_price"], "due_date": due,
                         "status": "atrasada" if late else "paga", "pix_txid": txid, "pix_payload": payload,
                         "sent_at": f"{month}-01T08:00:00-03:00", "paid_at": paid_at,
                         "paid_via": None if late else "pix", "reminders": reminders})
        if not late:
            payments.append({"id": f"pay_{inv_id}", "txid": txid, "amount": e["monthly_price"], "paid_at": paid_at,
                             "source": "webhook_simulado", "invoice_id": inv_id, "avulsa_booking_id": None})

# Avulsas já vendidas (histórico para o financeiro)
avulsa_bookings = []
hist = [("2026-10-08", "st_carla"), ("2026-10-15", "st_felipe"), ("2026-10-22", "st_carla"), ("2026-10-29", "st_caio"),
        ("2026-11-03", "st_felipe"), ("2026-11-05", "st_carla"), ("2026-11-10", "st_leticia"), ("2026-10-20", "st_tamires"),
        ("2026-11-04", "st_tamires")]
for i, (d, sid) in enumerate(hist, 1):
    s = STU[sid]; line_id = s.get("interest_line_id") or next(e["line_id"] for e in enrollments if e["student_id"] == sid)
    price = LINE[line_id]["price_table"]["avulsa_round"]; op = OP[s["operator_id"]]
    txid = f"VA{d.replace('-', '')}{i:03d}"
    avulsa_bookings.append({"id": f"av_{i:03d}", "trip_ref": {"line_id": line_id, "date": d}, "student_id": sid,
                            "kind": "ida_volta", "price": price, "status": "pago", "hold_until": None, "pix_txid": txid,
                            "pix_payload": pix_payload(op["pix_key"], op["pix_merchant_name"], op["pix_city"], price, txid),
                            "paid_at": f"{d}T14:{10 + i:02d}:00-03:00"})
    payments.append({"id": f"pay_av_{i:03d}", "txid": txid, "amount": price, "paid_at": f"{d}T14:{10 + i:02d}:00-03:00",
                     "source": "webhook_simulado", "invoice_id": None, "avulsa_booking_id": f"av_{i:03d}"})

# Gastos
expenses = []
for m in ("2026-09", "2026-10", "2026-11"):
    for van_id, fuel in (("van_itu", 2650.0), ("van_voto", 1480.0)):
        k = 0.45 if m == "2026-11" else 1.0   # novembro ainda pela metade
        expenses += [
            {"id": f"exp_{m}_{van_id}_fuel", "operator_id": "op_ze", "van_id": van_id, "date": f"{m}-10", "category": "combustivel", "description": "Diesel do mês", "amount": round(fuel * k + random.uniform(-80, 80), 2)},
            {"id": f"exp_{m}_{van_id}_seg", "operator_id": "op_ze", "van_id": van_id, "date": f"{m}-05", "category": "seguro", "description": "Seguro APP e RCF (parcela)", "amount": 310.00},
        ]
        if m != "2026-11":
            expenses.append({"id": f"exp_{m}_{van_id}_man", "operator_id": "op_ze", "van_id": van_id, "date": f"{m}-18", "category": "manutencao", "description": random.choice(["Troca de óleo e filtros", "Pastilhas de freio", "Alinhamento e balanceamento", "Revisão do ar-condicionado"]), "amount": round(random.uniform(280, 760), 2)})
expenses.append({"id": "exp_2026-10_van_itu_parcela", "operator_id": "op_ze", "van_id": "van_itu", "date": "2026-10-15", "category": "parcela", "description": "Parcela do financiamento", "amount": 1890.00})
expenses.append({"id": "exp_2026-09_van_itu_parcela", "operator_id": "op_ze", "van_id": "van_itu", "date": "2026-09-15", "category": "parcela", "description": "Parcela do financiamento", "amount": 1890.00})

documents = [
    {"id": "doc_itu_crlv", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_itu", "type": "crlv", "number": "CRLV-DEMO-0001", "expires_at": "2027-03-31"},
    {"id": "doc_itu_vist", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_itu", "type": "vistoria", "number": "VIST-DEMO-0001", "expires_at": "2026-11-23"},
    {"id": "doc_itu_seg", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_itu", "type": "seguro", "number": "APOL-DEMO-0001", "expires_at": "2027-05-10"},
    {"id": "doc_itu_artesp", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_itu", "type": "autorizacao_artesp", "number": "ART-DEMO-0001", "expires_at": "2027-02-15"},
    {"id": "doc_voto_crlv", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_voto", "type": "crlv", "number": "CRLV-DEMO-0002", "expires_at": "2027-04-30"},
    {"id": "doc_voto_vist", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_voto", "type": "vistoria", "number": "VIST-DEMO-0002", "expires_at": "2027-01-10"},
    {"id": "doc_voto_seg", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_voto", "type": "seguro", "number": "APOL-DEMO-0002", "expires_at": "2027-06-01"},
    {"id": "doc_voto_artesp", "operator_id": "op_ze", "owner_type": "van", "owner_id": "van_voto", "type": "autorizacao_artesp", "number": "ART-DEMO-0002", "expires_at": "2027-02-15"},
    {"id": "doc_ze_cnh", "operator_id": "op_ze", "owner_type": "driver", "owner_id": "drv_ze", "type": "cnh", "number": "CNH-DEMO-0001", "expires_at": "2028-07-19"},
    {"id": "doc_ze_curso", "operator_id": "op_ze", "owner_type": "driver", "owner_id": "drv_ze", "type": "curso_condutor", "number": "CURSO-DEMO-0001", "expires_at": "2027-09-01"},
    {"id": "doc_edson_cnh", "operator_id": "op_ze", "owner_type": "driver", "owner_id": "drv_edson", "type": "cnh", "number": "CNH-DEMO-0002", "expires_at": "2026-12-02"},
    {"id": "doc_edson_curso", "operator_id": "op_ze", "owner_type": "driver", "owner_id": "drv_edson", "type": "curso_condutor", "number": "CURSO-DEMO-0002", "expires_at": "2026-11-08"},
]

holidays = [
    {"date": "2026-11-02", "name": "Finados"},
    {"date": "2026-11-15", "name": "Proclamação da República"},
    {"date": "2026-11-20", "name": "Dia da Consciência Negra"},
    {"date": "2026-12-25", "name": "Natal"},
]
calendar_exceptions = [
    {"id": "exc_001", "operator_id": "op_ze", "date": "2026-11-13", "scope": "faculdade", "ref_id": "fac_facens", "kind": "sem_aula", "note": "Facens: semana de provas, sem aula na sexta à noite"},
]

# Conversa anterior da Ana (para o simulador não começar vazio)
ana = STU["st_ana"]
ana_inv = next(i for i in invoices if i["student_id"] == "st_ana" and i["reference_month"] == "2026-11")
messages = [
    {"id": "msg_0001", "operator_id": "op_ze", "student_id": "st_ana", "direction": "out", "kind": "cobranca",
     "body": "Oi, Ana! Sua mensalidade de novembro da Van do Seu Zé é R$ 300,00, com vencimento em 05/11. Pix copia e cola:",
     "buttons": ["Copiar código"], "payload": {"invoice_id": ana_inv["id"], "pix_payload": ana_inv["pix_payload"]}, "created_at": "2026-11-01T08:00:00-03:00"},
    {"id": "msg_0002", "operator_id": "op_ze", "student_id": "st_ana", "direction": "out", "kind": "recibo",
     "body": "Recebemos R$ 300,00 referente à mensalidade de novembro. Obrigado!", "buttons": [], "payload": {"invoice_id": ana_inv["id"]}, "created_at": ana_inv["paid_at"]},
    {"id": "msg_0003", "operator_id": "op_ze", "student_id": "st_ana", "direction": "out", "kind": "confirmacao",
     "body": "Oi, Ana! Amanhã (qua) você tem aula às 19h na Uniso. Vai na van?", "buttons": ["Vou", "Não vou"],
     "payload": {"line_id": "line_itu_noite", "date": "2026-11-11"}, "created_at": "2026-11-10T21:00:00-03:00"},
    {"id": "msg_0004", "operator_id": "op_ze", "student_id": "st_ana", "direction": "in", "kind": "texto",
     "body": "Vou", "buttons": [], "payload": {"button": "Vou"}, "created_at": "2026-11-10T21:02:00-03:00"},
    {"id": "msg_0005", "operator_id": "op_ze", "student_id": "st_ana", "direction": "out", "kind": "texto",
     "body": "Combinado! Saída às 17h40 no Jd. Paulista · ponto combinado. Até amanhã.", "buttons": [], "payload": {}, "created_at": "2026-11-10T21:02:00-03:00"},
]

# Leads (linha de base da validação + landing). Contatos reais NÃO estão aqui: só rótulos.
leads = []
for i in range(1, 8):
    leads.append({"id": f"lead_ent_{i}", "kind": "operador", "name": f"Operador entrevistado #{i}", "whatsapp": None,
                  "city": random.choice(["Itu", "Salto", "Votorantim", "Cerquilho", "Tatuí"]), "vans_count": [1, 2, 1, 4, 1, 2, 3][i - 1],
                  "faculties": "UFSCar, Uniso, Facens", "message": None, "source": "entrevista", "created_at": "2026-10-20T12:00:00-03:00", "converted_operator_id": None})
for i in range(1, 19):
    leads.append({"id": f"lead_ind_{i}", "kind": "operador", "name": f"Motorista indicado #{i}", "whatsapp": None,
                  "city": random.choice(["Itu", "Salto", "Votorantim", "Cerquilho", "Tatuí", "Tietê", "Porto Feliz"]), "vans_count": random.choice([1, 1, 1, 2, 2, 3]),
                  "faculties": None, "message": None, "source": "indicacao", "created_at": "2026-10-24T12:00:00-03:00", "converted_operator_id": None})
leads.append({"id": "lead_land_1", "kind": "operador", "name": "José Almeida", "whatsapp": "(15) 90000-0001", "city": "Itu", "vans_count": 2,
              "faculties": "Uniso, Facens, UFSCar", "message": "Quero testar nas duas vans", "source": "landing", "created_at": "2026-10-27T09:40:00-03:00", "converted_operator_id": "op_ze"})
leads.append({"id": "lead_land_2", "kind": "operador", "name": "Rita Moraes", "whatsapp": "(15) 90000-0002", "city": "Salto", "vans_count": 1,
              "faculties": "Uniso, Facens", "message": None, "source": "landing", "created_at": "2026-11-04T14:20:00-03:00", "converted_operator_id": "op_rita"})
for i, (n, c, f) in enumerate([("Marina Lopes", "Itu", "Uniso"), ("Rodrigo Prado", "Votorantim", "UFSCar"), ("Aline Torres", "Salto", "Facens")], 1):
    leads.append({"id": f"lead_est_{i}", "kind": "estudante", "name": n, "whatsapp": f"(15) 90000-09{i:02d}", "city": c, "vans_count": None,
                  "faculties": f, "message": None, "source": "landing", "created_at": f"2026-11-0{i + 5}T19:00:00-03:00", "converted_operator_id": None})

startup_baseline = {
    "fonte": "Validação de mercado, outubro de 2026 (docs/04-validacao.md). Dados reais agregados.",
    "estudantes_responderam": 87, "estudantes_usam_van": 60,
    "operadores_entrevistados": 7, "vans_dos_entrevistados": 14,
    "confirmariam_whatsapp_pct": 89, "usariam_plano_2_3_dias_pct": 82, "pagariam_avulsa_pct": 75,
    "operadores_aceitam_preco": "5 de 7", "operadores_deixaram_contato": "7 de 7", "motoristas_indicados": 18,
    "metas_piloto": {"ativacao": 3, "retencao": "2 de 3", "receita": "2 de 3 pagando", "avulsas_por_van_semana": 1, "indicacao": 1},
    "som": {"vans_meta": 30, "mrr_meta": 1797.00, "arr_meta": 21564.00},
    "mercado": {"tam_empresas": 63923, "tam_rs_ano": 45900000, "sam_empresas": 16607, "sam_rs_ano": 11900000, "som_rs_ano": 21564},
    "preco_por_van": 59.90, "ltv_12_meses": 718.80,
}

seed = {
    "_info": {
        "descricao": "Dados de demonstração do protótipo VanFlow. Tudo fictício, exceto startup_baseline (agregados reais da validação).",
        "gerado_por": "dados-demo/gerar_seed.py", "fuso": "America/Sao_Paulo",
        "cenario_padrao": "Quarta 11/11/2026 20h55. Às 21h saem as confirmações de quinta 12/11. Na Van 1 (Itu e Salto, noite) 14 alunos têm aula na quinta; Ana (st_ana) é a aluna da demo; Carla (st_carla) compra a vaga avulsa.",
        "coordenadas": "aproximadas, só para o mapa esquemático e para ordenar paradas",
    },
    "demo_state": {"now": NOW, "scenario": "quarta_antes_das_21h", "speed": 1},
    "semester": SEMESTER,
    "faculties": faculties, "operators": operators, "operator_settings": operator_settings, "subscriptions": subscriptions,
    "drivers": drivers, "vans": vans, "lines": lines, "plans": plans, "students": students, "schedules": schedules,
    "enrollments": enrollments, "invoices": invoices, "payments": payments, "avulsa_bookings": avulsa_bookings,
    "expenses": expenses, "documents": documents, "holidays": holidays, "calendar_exceptions": calendar_exceptions,
    "messages": messages, "leads": leads, "startup_baseline": startup_baseline,
}

# Verificação do cenário da demo
thu = [e for e in enrollments if e["line_id"] == "line_itu_noite" and 4 in e["weekdays"]]
assert len(thu) == 14, len(thu)
assert any(e["student_id"] == "st_ana" for e in thu)

with open(os.path.join(HERE, "seed.json"), "w", encoding="utf-8") as f:
    json.dump(seed, f, ensure_ascii=False, indent=2)

# CSV de exemplo para a importação (P2): alunos novos, fictícios
with open(os.path.join(HERE, "alunos-exemplo.csv"), "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["nome", "whatsapp", "cidade", "bairro", "faculdade", "curso", "dias", "entrada", "saida", "plano_dias", "mensalidade"])
    rows = [("Renata Campos", "Itu", "Centro", "Uniso", "Contabilidade", "seg;qua;sex", "19:00", "22:40", 3, "300,00"),
            ("Sérgio Fonseca", "Salto", "Jd. Saltense", "Facens", "Engenharia Civil", "seg;ter;qua;qui;sex", "19:00", "22:40", 5, "420,00"),
            ("Bianca Leme", "Itu", "Vila Nova", "UFSCar", "Pedagogia", "ter;qui", "19:00", "23:00", 2, "220,00"),
            ("Henrique Sales", "Itu", "Bairro Brasil", "Uniso", "Direito", "seg;ter;qua;qui;sex", "19:00", "22:40", 5, "420,00"),
            ("Luana Prates", "Salto", "Centro", "Uniso", "Biomedicina", "seg;qua;qui", "19:00", "22:40", 3, "300,00")]
    for i, r in enumerate(rows, 1):
        w.writerow([r[0], f"(15) 90000-08{i:02d}"] + list(r[1:]))

print(f"seed.json: {len(students)} alunos, {len(schedules)} horários de grade, {len(invoices)} cobranças, {len(leads)} leads")
