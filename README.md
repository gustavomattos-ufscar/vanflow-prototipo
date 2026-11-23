# VanFlow · protótipo funcional

Protótipo completo da VanFlow, 100% offline depois do `npm install`. A lógica de negócio é real; WhatsApp, Pix e mapas são simulados atrás de interfaces.

## Como rodar

Precisa do **Node.js 22.13 ou mais recente**. Internet só na primeira vez.

```bash
npm install        # uma vez, com internet
npm run demo       # sem internet: compila e sobe tudo em http://localhost:5173
```

| Comando | O que faz |
|---|---|
| `npm run demo` | Compila a web e serve web e API em uma porta só (5173) |
| `npm run dev` | Desenvolvimento: Vite na 5173 e API na 5174, com recarga automática |
| `npm run reset` | Volta tudo para quarta, 11/11, 20h55. Funciona com o servidor ligado: as telas abertas se atualizam sozinhas |
| `npm test` | Testes do domínio e o roteiro da demo de ponta a ponta |
| `npm run typecheck` | Confere os tipos dos três pacotes |

O banco fica em `data/vanflow.db` (SQLite embutido no Node, sem compilação nativa). Para usar outra porta: `PORT=8080 npm run demo`.

## Link público no Render (gratuito)

O arquivo `render.yaml` já configura tudo. Para publicar: entre em [render.com](https://render.com) com a conta do GitHub, clique em **New**, **Blueprint**, escolha este repositório e confirme. A cada `git push` na `main`, o Render publica de novo sozinho.

No plano gratuito:
- O serviço **dorme depois de 15 minutos sem acesso**. O primeiro acesso depois disso leva até 1 minuto. Abra o link uns minutos antes de mostrar.
- O disco é temporário: quando o serviço dorme ou reinicia, **a demo volta para quarta, 11/11, 20h55**.
- A demo é **uma só para todo mundo**: se duas pessoas usarem ao mesmo tempo, uma vê o que a outra fez. Use **Resetar demo** na Central da demo para recomeçar.

Para a apresentação, prefira rodar local com `npm run demo`: funciona sem internet e ninguém mexe nos dados no meio.

## Perfis de entrada

Abra `http://localhost:5173/entrar`. Não há senha.

| Perfil | Endereço | O que mostra |
|---|---|---|
| Operador (Seu Zé) | `/painel` | Hoje, alunos, grade, cobranças, vagas avulsas, rota, documentos, financeiro, mensagens, configurações, assinatura |
| Motorista | `/motorista` | Mostra a próxima viagem da operação: de manhã a do Edson, à tarde a do Seu Zé. O seletor no topo fixa uma van |
| Estudante | `/whatsapp` | Simulador de WhatsApp com todas as conversas. A página do aluno é `/a/{token}`, com link na ficha do aluno |
| Central da demo | `/demo` | Relógio, cenários, atalhos e linha do tempo |
| Modo apresentação | `/demo/palco` | Celular, painel e relógio em uma tela. `→` avança o roteiro, `R` reseta |
| Painel da startup | `/startup` | Contatos, funil AARRR, MRR, meta do SOM e validação |
| Landing | `/` | Porta fiel da landing v3, com os formulários gravando no banco local |

## Roteiro da demo, resumido

Passo a passo completo em `docs/11-roteiro-da-demo.md`. O caminho mais curto é abrir `/demo/palco` e apertar `→`.

1. **Landing:** "Quero meus 30 dias grátis" grava o contato.
2. **Grade:** `/painel/grade` mostra que quinta é o dia mais cheio, antes de qualquer mensagem.
3. **21h:** as confirmações saem só para quem tem aula na quinta. Ana toca em "Não vou" e digita o motivo. O painel muda sem recarregar.
4. **Vaga avulsa:** Carla recebe a oferta, toca em "Reservar", recebe o Pix e toca em "Simular pagamento". Ela entra na lista e na rota.
5. **Rota:** quinta 17h30, em `/motorista`. "Abrir rota" mostra os links do Google Maps e do Waze.
6. **Cobrança:** dia 1 gera e envia. "Pagar todas menos 3" e dia 8 mostram os 3 atrasados, com os lembretes já enviados.
7. **Negócio:** `/startup` mostra o contato do passo 1, o funil e a meta de 30 vans.

Pode tocar no celular à mão ou usar o `→`: se um passo já foi feito à mão, o `→` não repete. Antes de ensaiar de novo, rode `npm run reset`.

### Para provar que o Pix é de verdade

O QR e o copia e cola seguem o padrão EMV do Banco Central, com CRC válido. A chave do seed (`vanflow.demo@exemplo.com`) é fictícia, então o app do banco lê o QR mas avisa que a chave não existe. Para a demonstração ao vivo, ponha uma chave real da equipe em **Configurações, Chave Pix** e gere as cobranças depois disso, sem pagar.

## Onde cada integração real entraria

Tudo em `apps/server/src/integrations.ts`. Para ir a produção, troque só a implementação.

| Interface | Na demo | Em produção |
|---|---|---|
| `WhatsAppGateway` | Grava em `messages`, e o simulador lê de lá | **WhatsApp Business Cloud API**: `send` chama a API com template aprovado e botões; `POST /api/whatsapp/inbound` vira o webhook da Meta |
| `PixProvider` | Gera o BR Code localmente | **PSP como Efí ou Asaas**: cobrança imediata pela API. `POST /api/webhooks/pix` já é a rota que o PSP chamaria, e "Simular pagamento" passa por ela |
| `MapsProvider` | Vizinho mais próximo + 2-opt, offline | **Google Routes API** com `optimizeWaypointOrder`. A navegação segue no Maps ou no Waze |

**Prévia da rota no Google Maps.** Em `/painel/rota`, no palco e em `/motorista`, a prévia é o próprio Google Maps embutido, com as paradas na ordem calculada pela VanFlow (sem chave de API). A tela testa se o Google responde; sem internet, mostra o mapa esquemático offline, e o botão "Mapa offline" troca a qualquer momento. Com internet, essas telas fazem requisições ao Google: no teste "nenhuma requisição fora de localhost", rode com o Wi-Fi desligado. A caixa do Google mostra a distância e o tempo dele, que podem diferir da estimativa offline da VanFlow.
| `Clock` | Relógio guardado no banco, movido pela Central da demo | Relógio do sistema. O agendador (`scheduler.ts`) fica igual |

## Estrutura

```
apps/web/         React + Vite: landing, painel, motorista, simulador, aluno, demo, palco, startup
apps/server/      Express + SQLite: API, eventos ao vivo (SSE), agendador, seed
packages/domain/  Regras puras e testadas: Pix, parser, presença, cobrança, rota, mensagens
```

## Decisões onde os documentos divergiam

| Assunto | O que os documentos dizem | O que o protótipo faz |
|---|---|---|
| Vagas depois do "Não vou" da Ana | O roteiro diz "1 vaga livre"; a fórmula da docs/08 e o exemplo da docs/07 dão 2 (15 lugares, 13 vão) | Segue a fórmula e mostra "2 vagas livres: Ana liberou o lugar" |
| Quem ainda não respondeu | A fórmula de vagas não cita `aguardando`; a van pareceria vazia às 21h e venderia lugar de quem vai | `aguardando` ocupa lugar |
| O que o contador conta | O roteiro diz "13 de 14" com ninguém mais respondendo, e depois "o contador sobe" | "13 de 14" conta quem vai (sem resposta conta como vai, regra da docs/08). O que sobe é "N confirmados", logo abaixo |
| Teste grátis e dezembro | O teste acaba em 26/11, e os envios pausariam antes das cobranças do roteiro | Na demo o teste se estende sozinho e registra isso na linha do tempo. O cenário "Teste grátis acabando" desliga a extensão e mostra a pausa de verdade |
| "Avançar para dia 5 gera cobranças" | A docs/08 gera no dia 1 | A geração é no dia 1. Ir para o dia 5 passa pelo dia 1, então as duas formas funcionam |
| Motorista "Edson" | O passo 5 mostra a van de Itu, que é do Seu Zé | `/motorista` segue a próxima viagem da operação |
| txid das cobranças da Rita | O seed usa `RITA_1`, e o BR Code só aceita letras e números | O Pix é refeito ao carregar o seed |
| "Rota de cabeça" | "Sem otimizar" | Todos os previstos, indo sempre ao ponto mais perto, sem revisar a ordem. Usar a ordem do cadastro daria uma economia irreal, porque ninguém zigue-zagueia entre Itu e Salto |

---

# Pacote de contexto

Este pacote reúne tudo sobre a VanFlow (o negócio, a validação, as regras do produto e a identidade visual) para que o **Claude Code** construa um protótipo completo e funcional do MVP, rodando **offline** no notebook, para apresentar ao Prof. Alexandre Alvaro na disciplina de Empreendedorismo da UFSCar Sorocaba.

**Equipe:** Mateus Baú (negócio e burocracia), Gustavo Rodrigues (produto e desenvolvimento), Nasser Shuqair (dados e rotas).

## O que é a VanFlow

O app de gestão do pequeno operador de fretado universitário da região de Sorocaba. Confirma pelo WhatsApp quem vai na van amanhã, monta a lista do dia a partir da grade de aulas de cada aluno, cobra a mensalidade no Pix sozinha e vende o lugar de quem faltou como vaga avulsa. R$ 59,90 por van por mês, 30 dias grátis, sem fidelidade.

> Saiba quem vai amanhã antes de ligar a van.

## Como usar com o Claude Code

1. Descompacte o zip em uma pasta vazia, que vai virar o repositório do protótipo (por exemplo `vanflow-prototipo/`).
2. Abra o Claude Code nessa pasta. O arquivo `CLAUDE.md` é lido automaticamente e tem o briefing completo: objetivo, restrições (offline, sem "—", sem "Em breve"), stack, prioridades P0/P1/P2, critérios de aceite e o mapa dos arquivos.
3. Peça, por exemplo: *"Leia o CLAUDE.md e os docs e construa o protótipo completo, começando pelo P0. Rode os testes e siga o roteiro da demo no final."*
4. Requisitos na máquina: Node.js 22.13 ou mais recente e internet só para o primeiro `npm install`. Depois, `npm run demo` funciona sem internet.

## Conteúdo

| Pasta | O que tem |
|---|---|
| `CLAUDE.md` | Briefing para o Claude Code |
| `docs/` | 14 documentos: visão geral, personas, proposta de valor, **dados reais da validação**, mercado, concorrentes, MVP e fluxos, regras de negócio (incluindo o padrão do Pix copia e cola), modelo de dados, telas, roteiro da demo, histórico acadêmico, propriedade intelectual e guia de pitch |
| `identidade-visual/` | Guia de marca, `guia-visual.html` (abra no navegador), tokens CSS e JSON, fontes locais, logo, van e as ilustrações da landing em SVG |
| `dados-demo/` | `seed.json` com operadores, vans, alunos, grades, cobranças, documentos e leads fictícios; CSV de exemplo; o script que gerou tudo |
| `referencias/paginas/` | Cópias das páginas já publicadas: landing page v3, Canvas da Proposta de Valor e Validação de Mercado e MVP |

## Cuidados

- Os dados de `dados-demo/` são fictícios. Os números da pesquisa e das entrevistas em `docs/04-validacao.md` são reais e aparecem só de forma agregada no protótipo.
- As páginas em `referencias/` carregam fontes do Google Fonts quando abertas com internet; o protótipo deve usar as fontes de `identidade-visual/fonts/`.
- Na landing publicada, os botões vão apontar para Google Forms; no protótipo offline, os formulários gravam no banco local.
