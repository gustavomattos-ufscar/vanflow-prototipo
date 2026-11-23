# 02 · Segmento e personas

## Segmento de clientes (ajustado após o feedback do BMC)

O BMC original tinha três segmentos ao mesmo tempo (escolar, universitário e funcionários). O professor pediu para ajustar, e a equipe focou em **um**:

> **Pequeno operador de fretado universitário (1 a 3 vans) da região de Sorocaba.**

É um modelo multilateral:

| Papel | Quem | O que faz na VanFlow |
|---|---|---|
| Quem paga, decide e usa | Operador (dono da van, quase sempre também o motorista) | Assina, cadastra alunos, vê a lista, recebe as mensalidades |
| Usa | Motorista contratado (quando o operador tem mais de uma van) | Vê a lista do dia, marca embarque, abre a rota |
| Usa e influencia | Estudante universitário | Informa a grade, confirma presença pelo WhatsApp, paga pelo Pix, compra vaga avulsa |

Fora do foco: grandes empresas de transporte (já usam sistemas pesados) e, por enquanto, escolar e funcionários.

## Personas para o protótipo (fictícias, baseadas na pesquisa)

Use estas personas nos textos de exemplo, nas telas vazias e no seed. **Não são as pessoas reais entrevistadas.**

### José "Seu Zé" Almeida, operador (persona principal)

- 52 anos, mora em Itu, tem **2 vans de 15 lugares**: uma faz Itu e Salto → Sorocaba à noite (motorista é ele) e outra faz Votorantim → Sorocaba de manhã (motorista contratado, o Edson).
- Leva cerca de 26 alunos de UFSCar, Uniso e Facens. Mensalidade entre R$ 280 e R$ 450, conforme o plano.
- Hoje: grupo de WhatsApp por van, planilha no celular do filho, Pix na chave CPF, caderno com documentos.
- Toda noite, das 21h às 21h45, lê o grupo para saber quem vai. Odeia cobrar ("parece que estou pedindo favor").
- Usa Waze no celular preso no painel. Não quer aprender sistema complicado.
- O que ele quer ouvir: "você não precisa mudar nada no seu jeito de trabalhar; a VanFlow lê o WhatsApp por você".
- Na landing, a van dele aparece como "Van do Seu Zé".

### Edson Pereira, motorista contratado

- Dirige a van da manhã. Só quer a lista de quem vai e a ordem das paradas, com letra grande, no celular.

### Ana Beatriz, estudante (persona do chat da landing)

- 20 anos, mora no Jardim Paulista em Itu, faz Administração na Uniso à noite, **3 dias por semana** (seg, qua, qui) porque o resto é EAD.
- Hoje paga o mês cheio e se sente lesada. Com a VanFlow, fica no **plano 3 dias**.
- Responde a confirmação em segundos. Quando a aula é cancelada, responde "Não vou, a aula foi cancelada".

### Bruno, estudante de 5 dias

- Engenharia na Facens, vai todos os dias. Quase nunca falta. Recebe a confirmação e só responde quando muda algo.

### Carla, estudante avulsa

- Mora em Salto, tem carro mas em dia de prova prefere a van. Não tem plano: **compra vaga avulsa** pelo WhatsApp quando precisa (R$ 20 ida e volta).

## Contexto de uso

- **Turnos:** a maior parte do fretado universitário da região é **noturno** (saída por volta das 17h30, aula das 19h às 22h40, volta por volta das 23h). Também existe turno da **manhã** (saída por volta das 6h30) para cursos integrais.
- **Ida e volta:** uma "viagem" no sistema é um trecho (ida ou volta). A presença é confirmada para o dia; o aluno pode dizer que só vai na ida ou só na volta (P1).
- **Dispositivos:** operador e motorista usam celular Android simples; o painel completo também é usado no notebook. O estudante só usa WhatsApp e, eventualmente, um link no navegador.
