# CLAUDE.md · Briefing do protótipo VanFlow

Você (Claude Code) vai construir o **protótipo funcional completo da VanFlow**, uma startup criada por três estudantes da UFSCar Sorocaba na disciplina de Empreendedorismo (Prof. Alexandre Alvaro). O protótipo será **apresentado ao professor rodando 100% offline em um notebook**. Ele precisa parecer um produto de verdade e cada botão visível precisa funcionar.

Leia este arquivo inteiro antes de começar. Depois leia, nesta ordem:

1. `docs/01-visao-geral.md` (o que é a VanFlow, em 2 minutos)
2. `docs/08-regras-de-negocio.md` (como o sistema deve se comportar)
3. `docs/09-modelo-de-dados.md` e `docs/10-telas.md` (o que construir)
4. `identidade-visual/guia.md` (como deve parecer)
5. `docs/11-roteiro-da-demo.md` (o que precisa funcionar na frente do professor)
6. O resto de `docs/` quando precisar de contexto.

`referencias/paginas/landing-page-v3.html` é a landing page oficial já aprovada pela equipe. **Ela é a fonte de verdade visual e de texto.** Abra no navegador para ver o estilo (atenção: ela carrega fontes do Google Fonts; no protótipo, use as fontes locais de `identidade-visual/fonts/`).

---

## 1. Objetivo

Um site completo da VanFlow, rodando em `localhost`, com:

- **Landing page** (porta fiel da v3, com formulários que salvam os contatos localmente).
- **Painel do operador** (o dono da van): lista do dia, alunos e grade, cobranças Pix, vagas avulsas, rota, documentos, financeiro, configurações e assinatura VanFlow.
- **Visão do motorista** no celular: lista do dia, marcar embarque, abrir rota.
- **Simulador de WhatsApp** do aluno: recebe a confirmação das 21h, responde "Vou" / "Não vou", recebe a cobrança com Pix copia e cola, compra vaga avulsa.
- **Página do aluno** (link aberto no navegador, sem app): plano, grade, 2ª via do Pix, onde está a van.
- **Central da demo**: relógio simulado e botões que disparam os eventos do dia (21h, respostas, vencimento, pagamento), para mostrar em 5 minutos o que acontece em um mês.
- **Painel da startup** (visão VanFlow): leads da landing, operadores em teste, MRR, funil AARRR.

Ninguém de fora da equipe vai usar este protótipo. É uma demonstração. Mas a lógica de negócio deve ser real (não telas estáticas): se o aluno responde "Não vou" no simulador, a lista do operador muda na hora, a vaga aparece como livre e pode ser vendida como avulsa.

## 2. Restrições obrigatórias

1. **Offline total depois do `npm install`.** Nenhuma chamada a internet em tempo de execução: nada de CDN, Google Fonts, Google Maps API, APIs de WhatsApp, Pix ou geocoding. Fontes, ícones e ilustrações ficam no repositório.
2. **Um comando para rodar:** `npm install` (com internet, uma vez) e depois `npm run demo` (sem internet), que sobe tudo em `http://localhost:5173` (ou uma porta só). Inclua também `npm run dev` para desenvolvimento e `npm run reset` para recriar o banco a partir do seed.
3. **Integrações externas são simuladas atrás de interfaces** (`WhatsAppGateway`, `PixProvider`, `MapsProvider`, `Clock`). A implementação de demo é local; a interface deixa claro onde entraria a API real (WhatsApp Business Cloud API, PSP Pix como Efí/Asaas, Google Routes API). Documente isso no README do projeto.
4. **Nada de "Em breve", "em construção", lorem ipsum ou botão morto.** Regra da equipe. Se algo não for implementado, não aparece na interface.
5. **Não use o travessão "—" em nenhum texto da interface.** Regra da equipe. Use vírgula, dois pontos ou ponto.
6. **Português do Brasil**, linguagem simples, falando com o operador por "você". Sem jargão técnico na interface (escreva "lista do dia", não "manifesto"; "cobrança", não "invoice").
7. **Dados de demonstração fictícios.** Use `dados-demo/seed.json`. Nunca use os nomes dos entrevistados reais da pesquisa (estão em `docs/04-validacao.md` só como contexto).
8. **Valores em reais com `Intl.NumberFormat('pt-BR', {style:'currency', currency:'BRL'})`, datas em `pt-BR`, fuso `America/Sao_Paulo`.**
9. Responsivo: painel do operador bom em notebook (1366×768 é a tela da apresentação) e usável no celular; motorista e aluno pensados para celular (360 a 414 px).
10. Acessível: contraste AA, foco visível, `prefers-reduced-motion` respeitado, tema claro e escuro (tokens prontos em `identidade-visual/tokens.css`).

## 3. Stack recomendada

Você pode escolher outra se tiver um bom motivo, mas esta foi pensada para rodar offline sem dor:

- **TypeScript** em tudo.
- **Monorepo npm workspaces**: `apps/web`, `apps/server`, `packages/domain`.
- **Frontend:** React 18 + Vite + React Router. CSS com os tokens de `identidade-visual/tokens.css` (CSS Modules ou CSS puro; Tailwind só se configurado para usar os tokens). Ícones: `lucide-react` (empacotado, funciona offline). QR Code: `qrcode` (gera no cliente ou servidor, offline).
- **Backend:** Node 22 + Express (ou Fastify). Banco **SQLite** com `node:sqlite` (embutido no Node 22.13+, sem compilação nativa) ou `better-sqlite3`. Se o SQLite der problema na máquina, tenha um fallback em arquivo JSON atrás da mesma interface de repositório.
- **Tempo real:** Server-Sent Events (`/api/events`) para o painel, o motorista e o simulador de WhatsApp se atualizarem sozinhos quando algo muda. Sem WebSocket se não precisar.
- **Domínio puro em `packages/domain`:** regras de presença, cobrança, avulsas, rota e Pix como funções puras e testáveis, sem I/O.
- **Testes:** Vitest para o domínio (geração do Pix com CRC, ordem das paradas, quem recebe confirmação, cálculo de cobrança e atraso, vagas livres).
- `npm run demo` faz o build do web e o servidor serve os estáticos + API em uma porta só.

Não use serviços que precisem de conta (Firebase, Supabase, Auth0). Login é de demonstração: perfis prontos na tela de entrada ("Entrar como operador", "Entrar como motorista", "Entrar como aluno", "Central da demo").

## 4. Integrações simuladas (como cada uma deve funcionar)

**WhatsApp (`WhatsAppGateway`)**
- Toda mensagem enviada a um aluno é gravada na tabela `messages` e aparece no **Simulador de WhatsApp**, uma tela que imita um celular com a conversa do aluno escolhido (lista de conversas à esquerda, chat à direita, visual do chat da landing).
- Mensagens interativas com botões ("Vou" / "Não vou"), como na landing. O aluno também pode digitar texto livre; um parser simples entende "vou", "sim", "vou sim", "não", "nao vou", "não vou, aula cancelada", "quero vaga avulsa", "pix", "2ª via".
- Respostas da VanFlow seguem os modelos de `docs/08-regras-de-negocio.md` (seção Mensagens).

**Pix (`PixProvider`)**
- Gera o **BR Code (Pix copia e cola) estático ou dinâmico de verdade**, no padrão EMV do Banco Central, com CRC16-CCITT, e o QR Code correspondente. Especificação em `docs/08-regras-de-negocio.md`, seção Pix. Um app de banco real deve conseguir ler o QR (não precisa pagar).
- O pagamento é simulado: botão "Simular pagamento" no simulador do aluno ou na central da demo. Isso chama o mesmo caminho que um webhook do PSP chamaria (`POST /api/webhooks/pix`), dá baixa na cobrança e manda o recibo no WhatsApp.
- A chave Pix é a do operador (o dinheiro vai direto para ele; a VanFlow não fica com parte da mensalidade).

**Mapas (`MapsProvider`)**
- A ordem das paradas é calculada **offline**: vizinho mais próximo a partir do ponto de saída + melhoria 2-opt, com distância haversine. Só entram os alunos confirmados (e avulsos) daquela viagem.
- Mapa **esquemático em SVG** (sem tiles da internet): pontos projetados a partir de lat/lng, estrada tracejada âmbar entre as paradas, van âmbar animada, faculdade no fim. Estilo das ilustrações da landing.
- Botões "Abrir no Google Maps" e "Abrir no Waze" geram os links reais (formatos em `docs/08`). Offline, eles abrem uma nova aba que não carrega; por isso mostre também o link com botão "Copiar" e um aviso discreto quando `navigator.onLine` for falso. O Maps aceita até 9 paradas intermediárias por trecho: divida em trechos se passar disso. O Waze aceita um destino por vez: mostre a lista "próxima parada".

**Relógio (`Clock`)**
- O servidor tem um relógio simulado (data e hora da demo) guardado no banco. Todas as regras usam esse relógio, nunca `Date.now()` direto.
- Um agendador verifica eventos sempre que o relógio avança: confirmações das 21h, lembrete para quem não respondeu, fechamento da lista, geração de cobranças, lembretes de vencimento, alertas de documentos.

## 5. Escopo e prioridades

Construa nesta ordem. Só passe para a próxima faixa quando a anterior estiver funcionando de ponta a ponta.

**P0: o MVP validado (precisa estar perfeito)**
1. Cadastro de vans, linhas (viagem de ida e volta, turno, horário de saída), alunos com endereço/ponto e **grade de aulas do semestre**.
2. **Lista do dia a partir da grade** (o diferencial principal): para cada viagem, quem deveria ir segundo a grade e o plano.
3. **Confirmação pelo WhatsApp às 21h da véspera** + leitura das respostas + lista atualizada em tempo real ("11 de 14 vão").
4. **Cobrança da mensalidade via Pix** com BR Code, lembretes automáticos e baixa automática.
5. **Vagas avulsas**: lugar liberado por quem respondeu "Não vou" vira vaga livre; aluno compra pelo WhatsApp ou pela página do aluno; paga no Pix; entra na lista.
6. **Planos por dias** (2, 3 ou 5 dias por semana).
7. Landing page com formulário de operador e de estudante salvando leads.
8. Central da demo com relógio e cenário pronto.

**P1: o que completa a demo**
9. Rota do dia: ordem das paradas, mapa esquemático, links Maps/Waze, visão do motorista.
10. Painel financeiro por van: receita (mensalidades + avulsas), gastos lançados (combustível, manutenção), lucro.
11. Documentos com vencimento (CNH, CRLV, vistoria, seguro, autorização de fretamento da Artesp) e alertas.
12. Página do aluno (link sem app): plano, grade, Pix, status da van.
13. Painel da startup: leads, operadores em teste (30 dias grátis), conversão, MRR e funil AARRR.
14. Feriados e exceções (aula cancelada, prova, feriado de 20/11): não envia confirmação para quem não tem aula.

**P2: se sobrar tempo**
15. "Onde está a van" simulado (a van anda no mapa esquemático durante a viagem, com aviso "a van está a 5 min").
16. Importar planilha CSV de alunos (arquivo de exemplo em `dados-demo/alunos-exemplo.csv`).
17. Vários operadores (o seed tem um segundo operador) e troca de conta.
18. Plano frotista (preço menor por van a partir da 4ª) na tela de assinatura.
19. Exportar lista do dia e relatório do mês (PDF pelo `window.print()` com CSS de impressão).

## 6. Critérios de aceite (o professor vai ver isto)

- [ ] `npm run demo` sobe tudo sem internet (teste com o Wi-Fi desligado) e sem erros no console.
- [ ] Nenhuma requisição para fora de `localhost` na aba Network.
- [ ] A landing é visualmente fiel à v3 (cores, fontes, ilustrações, animações) e o formulário grava o lead, que aparece no painel da startup.
- [ ] Na central da demo, "Ir para quarta 20h55" + "Avançar para 21h" envia as confirmações só para quem tem aula na quinta segundo a grade.
- [ ] No simulador, o aluno responde "Não vou" e, sem recarregar, o painel do operador mostra a lista atualizada, o contador muda e aparece uma vaga livre.
- [ ] Um segundo aluno (sem plano naquele dia) compra a vaga avulsa no simulador, recebe o Pix, "paga" e entra na lista e na rota.
- [ ] A rota mostra a ordem das paradas só com quem vai, e os links do Maps/Waze são gerados corretamente.
- [ ] "Avançar para dia 5" gera e envia as cobranças; o Pix copia e cola tem CRC válido (teste automatizado) e o QR é lido por um app de banco.
- [ ] "Simular pagamento" dá baixa, manda recibo e atualiza o painel; quem não pagou recebe lembrete e aparece como atrasado.
- [ ] Documento que vence em menos de 30 dias aparece em destaque.
- [ ] `npm run reset` volta tudo ao estado inicial em segundos (para ensaiar a apresentação várias vezes).
- [ ] Nenhum texto com "—", "Em breve" ou lorem ipsum (faça um `grep` antes de entregar).
- [ ] Testes do domínio passando (`npm test`).

## 7. Como trabalhar

- Comece criando o esqueleto do monorepo, o seed carregando no banco e a central da demo com o relógio. Sem o relógio não dá para testar nada.
- Depois faça o fluxo P0 de ponta a ponta antes de caprichar nas telas.
- Use os textos e o tom de `docs/` e da landing. Quando precisar inventar um texto, siga `identidade-visual/guia.md` (seção Voz).
- Ao final, escreva no README do projeto: como rodar, perfis de entrada, roteiro da demo resumido e onde cada integração real entraria.
- Teste a demo inteira seguindo `docs/11-roteiro-da-demo.md` com o Wi-Fi desligado antes de dizer que terminou.

## 8. Mapa deste pacote

```
CLAUDE.md                     este briefing
README.md                     explicação para humanos
docs/
  01-visao-geral.md           o que é, problema, solução, pitch
  02-segmento-e-personas.md   para quem é, personas detalhadas
  03-proposta-de-valor.md     VPD, diferenciais, posicionamento
  04-validacao.md             todos os dados reais da pesquisa e das entrevistas
  05-mercado.md               TAM, SAM, SOM e fontes
  06-concorrentes.md          benchmarks e onde a VanFlow ganha
  07-mvp-e-fluxos.md          o que é MVP, fluxos ponta a ponta
  08-regras-de-negocio.md     preços, horários, mensagens, Pix, rota
  09-modelo-de-dados.md       entidades, campos e relações
  10-telas.md                 cada tela, o que mostra e o que faz
  11-roteiro-da-demo.md       a apresentação passo a passo
  12-historico-academico.md   entregas, notas e feedbacks do professor
  13-propriedade-intelectual.md  marca, software e o que proteger
  14-apresentacao-investidor.md  como o professor avalia pitches
identidade-visual/
  guia.md                     cores, tipografia, componentes, ilustração, voz
  guia-visual.html            o guia renderizado (abra no navegador)
  tokens.css / tokens.json    variáveis prontas, tema claro e escuro
  landing-v3.css              CSS completo da landing v3 (componentes, animações)
  fonts/                      woff2 locais (Bricolage Grotesque, DM Sans, IBM Plex Mono)
  assets/                     logo, logo horizontal, van, favicon
  ilustracoes/                faixa da rota, selo 30 dias, dores, passos e diferenciais (SVG)
dados-demo/
  seed.json                   operadores, vans, alunos, grades, cobranças, documentos
  alunos-exemplo.csv          para testar a importação (P2)
  gerar_seed.py               script que gerou o seed (pode ajustar e rodar de novo)
referencias/
  paginas/                    landing v3, canvas da proposta de valor, validação e MVP
```
