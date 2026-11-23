# 10 · Telas

Rotas sugeridas entre parênteses. Todas usam os tokens e componentes de `identidade-visual/guia.md`. Toda tela tem estado vazio com texto útil (nunca "Em breve").

## 0. Entrada da demo (`/entrar`)

Cartões grandes: **Sou operador** (Seu Zé), **Sou motorista** (Edson), **Sou estudante** (abre o simulador de WhatsApp), **Central da demo**, **Painel da startup**, **Ver a landing page**. Logo VanFlow no topo, faixa da rota ilustrada embaixo. Sem senha.

## 1. Landing page (`/`)

Porta fiel de `referencias/paginas/landing-page-v3.html`, componentizada em React. Mesma ordem: faixa "30 dias grátis", nav fixa, hero com chat animado e selo girando, faixa da rota (Itu, Salto, Votorantim → campus Sorocaba), 3 dores, 3 passos, bento de diferenciais, antes e depois, ingresso "30 dias grátis", linha do tempo de preço, FAQ, cartões de participação, rodapé.
- Os CTAs "Quero meus 30 dias grátis" e "Responder a pesquisa" abrem **modais com formulário** (operador e estudante) que gravam em `leads` e mostram "Recebemos! A gente chama você no WhatsApp."
- Adicione na nav um link discreto "Entrar" para `/entrar`.

## 2. Painel do operador (`/painel/...`)

Layout: barra lateral em navy (`--navy`) com o logo e os itens; topo com nome da operação, seletor de van, relógio da demo (pequeno, em mono) e banner do teste grátis. No celular, a barra vira menu inferior.

**2.1 Hoje (`/painel`)** · a tela mais importante
- Cartão por viagem do dia e de amanhã: "Amanhã · qui 12/11 · Itu e Salto → Sorocaba · saída 17h40".
- Contador grande estilo landing: **"11 de 14 vão"**, barra de progresso com segmentos (confirmados teal, sem resposta cinza, não vão âmbar-escuro, avulsos âmbar).
- Lista de passageiros com status em pílula (`vai`, `não vai`, `sem resposta`, `avulso`), bairro, faculdade e horário de aula. Motivo da falta aparece em itálico.
- Ações: "Mandar confirmações agora" (se ainda não foi), "Lembrar quem não respondeu", "Fechar lista", "Oferecer vagas livres", "Ver rota".
- Coluna lateral: cobranças atrasadas, documentos vencendo, vagas avulsas vendidas hoje, últimas mensagens (feed ao vivo via SSE com animação suave de entrada).

**2.2 Alunos (`/painel/alunos`)**: tabela com busca e filtro por van, plano, faculdade, status. Ficha do aluno: dados, ponto no mapa esquemático, **grade semanal** (grade visual seg a sáb com blocos coloridos por faculdade), plano e dias, histórico de presença (mini calendário), cobranças, conversa do WhatsApp. Botão "Importar planilha" (P2).

**2.3 Grade (`/painel/grade`)**: visão da semana por linha: para cada dia, quantos alunos têm aula e a ocupação prevista da van (mapa de calor simples). Mostra o diferencial: "quinta é o dia mais cheio; sexta tem 6 lugares sobrando para avulsas".

**2.4 Cobranças (`/painel/cobrancas`)**: seletor de mês; totais (a receber, recebido, atrasado) em cartões; tabela com status e ações (lembrar, ver Pix, marcar como paga). Botão "Gerar cobranças do mês".

**2.5 Vagas avulsas (`/painel/avulsas`)**: próximos 7 dias × linhas, vagas livres por viagem, reservas e vendas, receita das avulsas no mês, lista de interessados. Botão "Oferecer vaga" escolhe interessados e envia a oferta.

**2.6 Rota (`/painel/rota/:tripId`)**: mapa esquemático SVG + lista ordenada com horários; resumo "38 km, 1h05, 6 km a menos que a rota completa"; botões Google Maps (trechos) e Waze (próxima parada) + copiar link.

**2.7 Documentos (`/painel/documentos`)**: cartões por van e motorista com barra de dias até vencer; cadastro e edição.

**2.8 Financeiro (`/painel/financeiro`)**: por van e por mês: mensalidades, avulsas, gastos, lucro; gráfico de barras (receita vs gastos) e linha do lucro; lançar gasto.

**2.9 Mensagens (`/painel/mensagens`)**: todas as conversas, somente leitura, com filtro por tipo.

**2.10 Configurações (`/painel/configuracoes`)**: horários, regras de sem resposta, vencimento, preços por linha, chave Pix (com prévia de um Pix gerado), vans e linhas, motoristas.

**2.11 Assinatura (`/painel/assinatura`)**: ingresso "30 dias grátis" com dias restantes, R$ 59,90 × vans, sem fidelidade, botão "Assinar agora" (demo).

## 3. Motorista (`/motorista`) · mobile

- Cabeçalho navy com a viagem atual e um botão grande âmbar **"Abrir rota"** (escolha Maps ou Waze).
- Lista em ordem de parada, letra grande: número da parada, nome, ponto, horário estimado, botão "Embarcou" / "Não apareceu". Quem respondeu "não vai" aparece riscado no fim, recolhido.
- Rodapé: "11 vão · 2 vagas livres".

## 4. Simulador de WhatsApp (`/whatsapp`)

- Moldura de celular no centro (ou à esquerda no modo apresentação). Lista de conversas (alunos e contatos avulsos) e chat no estilo da landing: cabeçalho "VanFlow · Van do Seu Zé", bolhas `--chat` (recebidas) e `--chat-me` (enviadas pelo aluno), horário em mono pequeno, botões de resposta rápida dentro da bolha.
- Campo de digitação funcional (texto livre passa pelo parser).
- Bloco Pix dentro da conversa: valor, código copia e cola truncado, botão "Copiar", miniatura do QR e, só no simulador, botão âmbar tracejado **"Simular pagamento"** (marcado como ação de demo).
- Indicador "digitando..." de 600 ms antes das respostas automáticas da VanFlow.

## 5. Página do aluno (`/a/:token`) · mobile, sem login

Link que a VanFlow manda no WhatsApp. Mostra: próxima viagem e status, botão "Vou" / "Não vou", grade do semestre, plano, mensalidade do mês com Pix e QR, histórico de pagamentos, comprar vaga avulsa, "Onde está a van" (P2 com a van andando no mapa esquemático).

## 6. Central da demo (`/demo`)

A ferramenta do apresentador. Painel com:
- **Relógio** grande em mono: data e hora simulada, com botões `+15 min`, `+1 h`, `Ir para 20h55`, `Ir para 21h`, `Próxima manhã 6h`, `Ir para dia 1`, `Ir para dia 5`, `Ir para dia 8`.
- **Cenários:** "Quarta à noite, antes das confirmações" (padrão), "Quinta 17h, hora da saída", "Começo do mês, cobranças", "Teste grátis acabando".
- **Ações:** "Simular respostas dos alunos" (com controle de % que vai, padrão 80%), "Ana responde Não vou", "Carla compra a vaga avulsa", "Pagar todas as cobranças menos 3", "Webhook Pix" manual por txid.
- **Linha do tempo** dos eventos (events_log) com ícones.
- Botão **"Resetar demo"** com confirmação.
- **Modo apresentação** (`/demo/palco`): tela dividida para o projetor: celular do aluno (simulador) à esquerda, painel do operador "Hoje" à direita, barra do relógio embaixo. Tudo se atualiza ao vivo.
- Atalhos de teclado no palco: `→` próximo passo do roteiro, `R` reset.

## 7. Painel da startup (`/startup`)

Visão "VanFlow por dentro", pensada para o professor de empreendedorismo:
- Funil AARRR com os números atuais do banco + linha de base da validação (25 contatos, 7/7 interessados).
- MRR, ARR, operadores em teste e assinantes, vans ativas, conversão teste → pago, churn, LTV com fórmula visível.
- Leads da landing (tabela) com botão "Criar conta de teste".
- Seção "Validação" com os gráficos de barras horizontais da pesquisa (mesmo estilo da página de validação).
- Meta do SOM: 30 vans, barra de progresso.
