# 11 · Roteiro da demo (5 a 7 minutos)

Este é o caminho que precisa funcionar sem falhas, com o Wi-Fi desligado. Ensaiado com `npm run reset` antes de cada vez.

**Preparação:** notebook em 1366×768 ou maior, navegador em tela cheia, abas abertas: `/` (landing), `/demo/palco`, `/motorista` (em modo celular do DevTools ou em um celular na mesma rede), `/startup`. Relógio da demo em **quarta, 11/11/2026, 20h55** (cenário padrão).

### 1. A promessa (30 s) · landing `/`
"Esta é a página que os operadores veem. Saiba quem vai amanhã antes de ligar a van. 30 dias grátis, R$ 59,90 por van." Role até os diferenciais e o preço. Clique em "Quero meus 30 dias grátis", preencha e envie: o lead foi gravado.

### 2. A grade de aulas (45 s) · painel `/painel/grade`
"O aluno informa a grade uma vez. Por isso a VanFlow já sabe que amanhã, quinta, 14 dos 15 lugares da van de Itu estão previstos." Mostre a ficha da Ana: plano 3 dias, grade seg, qua, qui.

### 3. 21h, a confirmação (90 s) · `/demo/palco`
Clique em **"Ir para 21h"**. As mensagens chegam ao simulador (só para quem tem aula amanhã). No celular da Ana, toque em **"Não vou"** e digite "a aula foi cancelada". Do lado do operador, sem recarregar: "13 de 14 vão", Ana em "não vai" com o motivo, **1 vaga livre**. Clique em "Simular respostas dos alunos": o contador sobe sozinho.
"O Seu Zé não leu nenhuma mensagem."

### 4. A vaga avulsa (60 s) · palco
A Carla (sem plano) recebe a oferta: "Abriu vaga na van de qui...". Ela toca em **Reservar**, recebe o Pix copia e cola e o QR, toca em **Simular pagamento**. Ela entra na lista. "O lugar de quem faltou virou R$ 20 para o operador."

### 5. A rota (45 s) · `/motorista`
Avance para **quinta 17h30**. O motorista vê a lista na ordem das paradas, sem a casa da Ana. "Abrir rota" mostra o link do Google Maps com as paradas e o do Waze. "A VanFlow ordena, o Maps e o Waze navegam." Mostre o resumo de km economizados.

### 6. A cobrança (60 s) · `/demo` + `/painel/cobrancas`
Clique em **"Ir para dia 1/12"**: as cobranças de dezembro são geradas e enviadas. Mostre o Pix com QR (se quiser, leia com o app do banco para provar que é um Pix válido, sem pagar). "Pagar todas menos 3". Avance para **8/12**: os 3 atrasados receberam lembrete e aparecem em destaque. "Ninguém precisou cobrar ninguém."

### 7. O negócio (45 s) · `/startup`
Funil AARRR, o lead que entrou no passo 1, MRR, meta de 30 vans. "Validamos com 87 estudantes e 7 operadores; os 7 querem testar."

### Perguntas prováveis do professor (tenha a resposta na ponta da língua)
- "E se o aluno não responder?" → conta como vai, marcado como sem resposta (configurável).
- "Por que não um app para o aluno?" → 89% confirmariam pelo WhatsApp; ninguém instala mais um app.
- "A Van360 é mais barata." → vagas avulsas e planos geram receita nova; foco universitário.
- "Isso é real ou simulado?" → regras reais; WhatsApp, Pix e mapas simulados atrás de interfaces, com a integração real indicada (WhatsApp Business Cloud API, PSP Pix, Google Routes API).
- "O que é propriedade da VanFlow?" → marca e registro do software no INPI (`docs/13`).

### Plano B (recomendação do material de pitch do professor: leve 2 backups)
- Um vídeo da demo gravado (gere com o próprio roteiro).
- O `npm run demo` também rodando em um segundo notebook ou um build estático com dados em memória (`npm run demo:static`, P2) em um pendrive.
