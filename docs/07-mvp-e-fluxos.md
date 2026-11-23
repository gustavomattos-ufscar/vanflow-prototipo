# 07 · MVP e fluxos ponta a ponta

## O MVP definido na validação

O menor produto que já resolve as dores confirmadas e pode gerar receita. Não é uma versão com menos telas: é o fluxo completo de um dia de trabalho, só que estreito.

**Entra no MVP:** cadastro dos alunos e da grade; confirmação no WhatsApp na noite anterior; lista do dia; cobrança Pix com lembrete; oferta das vagas livres como avulsas.
**Depois:** rota no Maps/Waze, localização ao vivo, painel de lucro, fretado de funcionários e escolar.

Plano de execução real (fora do protótipo): semanas 1 e 2 em modo **concierge** com 3 operadores (a equipe faz tudo à mão), semanas 3 e 4 automação mínima, mês 2 cobrança Pix e planos, depois decisão de **perseverar ou pivotar**.

**No protótipo da apresentação** mostramos o produto como ele será depois do MVP automatizado, incluindo os itens P1 (rota, painel de lucro, documentos), porque o objetivo é que o professor veja o sistema completo funcionando. Deixe claro na central da demo, com um selo discreto, quais módulos são "MVP" e quais são "Próxima versão" (isso não é "Em breve": os dois funcionam).

## Fluxo A · Onboarding do operador (P0)

1. Operador chega pela landing e clica em "Quero meus 30 dias grátis".
2. Formulário curto: nome, WhatsApp, cidade, quantas vans, faculdades que atende. Grava um `lead`.
3. (Na demo) "Criar conta a partir deste lead" → cria `operator` com `trial_ends_at = hoje + 30 dias`.
4. Assistente de configuração em 4 passos: (1) vans e linhas, (2) alunos (manual ou CSV), (3) grade de cada aluno (o operador preenche ou manda um link para o aluno preencher), (4) preços, vencimento e chave Pix.
5. Tela final: "Pronto. Hoje às 21h a VanFlow manda a primeira confirmação."

## Fluxo B · Noite anterior, confirmação (P0, o coração da demo)

1. Às **21h** da véspera, o agendador pega cada viagem do dia seguinte e calcula os **previstos**: alunos com plano ativo naquele dia da semana, com aula na grade, sem exceção (feriado, falta já avisada). Avulsos já pagos entram direto.
2. Envia a mensagem com botões para cada previsto: *"Oi, Ana! Amanhã (qui) você tem aula às 19h na Uniso. Vai na van?"* [Vou] [Não vou].
3. Respostas atualizam `trip_passengers.status` em tempo real. O painel mostra "11 de 14 vão", quem não respondeu e quem liberou o lugar.
4. "Não vou" → lugar liberado → vira **vaga livre** da viagem → oferta automática para a lista de interesse de avulsos (P0 com envio manual pelo operador; P1 automático).
5. Às **22h30**, lembrete para quem não respondeu. Às **5h30** (manhã) ou **3h antes da saída** (noite), a lista **fecha**: quem não respondeu conta como "vai" (o aluno só avisa quando algo muda), marcado como "sem resposta" para o motorista saber.
6. Mudança depois do fechamento: o aluno ainda pode responder; o operador recebe alerta "Ana avisou que não vai (20 min antes da saída)".

## Fluxo C · Dia da viagem, motorista (P1)

1. Motorista abre a visão do motorista: lista na ordem das paradas, com nome, ponto, horário estimado e status.
2. "Abrir rota" → Google Maps (até 9 paradas por trecho) ou Waze (próxima parada).
3. Marca "Embarcou" ou "Não apareceu" em cada parada. Ao marcar embarque, o aluno pode receber aviso (P2).
4. "Cheguei na faculdade" fecha a viagem de ida.

## Fluxo D · Vaga avulsa (P0)

1. Estudante sem plano naquele dia manda "quero vaga avulsa quinta" no WhatsApp (ou abre o link da página do aluno).
2. VanFlow responde com as viagens com vaga livre: *"Quinta, 12/11: Itu → Sorocaba, saída 17h40, 2 vagas. Ida e volta R$ 20,00. Quer reservar?"* [Reservar].
3. Reserva segura a vaga por **30 minutos** e manda o Pix copia e cola.
4. Pagamento confirmado → `avulsa_booking.status = pago`, aluno entra na lista e na rota, recibo enviado.
5. Sem pagamento em 30 minutos → reserva expira e a vaga volta.

## Fluxo E · Cobrança mensal (P0)

1. No **dia 1** de cada mês (configurável), gera as cobranças do mês para cada matrícula ativa, com vencimento no **dia 5** (configurável: 5 ou 10).
2. Envia no WhatsApp: valor, vencimento, Pix copia e cola e link do QR.
3. Lembretes: **2 dias antes**, **no dia** (manhã) e **1 e 3 dias depois** do vencimento.
4. Pagamento (webhook simulado) → baixa automática, recibo, painel atualizado.
5. A partir de 1 dia de atraso, o status é "atrasada"; o operador vê a lista de atrasados com botão "Mandar lembrete agora".

## Fluxo F · Documentos (P1)

Cada van e cada motorista têm documentos com vencimento. Alertas 30, 15 e 7 dias antes no painel e uma mensagem ao operador. Documento vencido fica vermelho no topo do painel.

## Fluxo G · Fechamento do mês (P1)

Painel financeiro por van: mensalidades recebidas + avulsas − gastos lançados (combustível, manutenção, seguro, parcela) = lucro. Gráfico simples de barras por mês.

## Fluxo H · Assinatura VanFlow (P1)

Banner "Faltam 23 dias do seu teste grátis". Tela de assinatura: R$ 59,90 × vans, sem fidelidade. Na demo, "Assinar" registra a assinatura (sem pagamento real) e alimenta o MRR do Painel da startup.
