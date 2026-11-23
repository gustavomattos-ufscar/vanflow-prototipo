# Identidade visual da VanFlow

A referência viva é a landing page v3 (`../referencias/paginas/landing-page-v3.html`) e o CSS dela extraído em `landing-v3.css`. Este guia explica as decisões para que o protótipo inteiro (painel, motorista, simulador) pareça do mesmo produto. Abra `guia-visual.html` no navegador para ver tudo renderizado com as fontes locais.

## Personalidade

**Prática, calorosa e confiável.** É uma ferramenta para um motorista de 50 anos que trabalha cedo e à noite, não um app de banco. Papel quente em vez de branco hospitalar, navy sério para dar confiança, âmbar da van para energia e ação, teal do WhatsApp para "confirmado, deu certo". Ilustrações planas e simpáticas, nunca fotos de banco de imagem.

## Logo

- **Símbolo:** quadrado navy com cantos de 9/32, uma **estrada em S** âmbar ligando dois pontos (a rota de uma parada à outra). Arquivos: `assets/logo-simbolo.svg`, `assets/logo-simbolo-sobre-navy.svg` (fundo `--navy-2`, para usar sobre navy), `assets/favicon.svg`.
- **Horizontal:** símbolo + "VanFlow" em Bricolage Grotesque 800, convertido em curvas (`assets/logo-horizontal.svg`; versão clara para fundo navy em `logo-horizontal-claro.svg`). No HTML, também dá para escrever "VanFlow" em `font-family:var(--f-display); font-weight:800` ao lado do símbolo, como na nav da landing (símbolo 32 px, gap 10 px, texto 22 px).
- Área de respiro mínima: metade da altura do símbolo. Tamanho mínimo: 20 px de símbolo.
- Não mudar as cores do símbolo, não girar, não colocar sombra, não escrever "Van Flow" separado nem "VANFLOW".

## Cores

| Token | Claro | Escuro | Uso |
|---|---|---|---|
| `--bg` | #F4F2ED | #0D131B | Fundo da página (papel quente) |
| `--surface` | #FDFCF9 | #141D28 | Cartões |
| `--surface-2` | #EAE6DE | #1B2634 | Áreas internas, fundo das ilustrações |
| `--hair` | #D6D0C4 | #2A3646 | Bordas de 1 px, divisores tracejados |
| `--ink` / `--navy` | #13233A | #EAEEF3 / #16243A | Texto principal; faixas, barra lateral, botão escuro |
| `--navy-2` | #1C3150 | #20344F | Cartões sobre navy |
| `--muted` | #4B5667 | #A9B4C2 | Texto secundário |
| `--amber` | #F2A62F | #F2A62F | **A van.** CTA principal, "30 dias grátis", destaque. Texto sobre âmbar é sempre #13233A |
| `--amber-soft` | #FBE3B8 | #4A3712 | Marca-texto (`.hl`), fundos suaves |
| `--amber-ink` | #8E5209 | #F6BC63 | Âmbar como texto: eyebrows, horários, "não vai" |
| `--teal` | #1D6B74 | #6CC2C8 | Confirmação, WhatsApp, ícones de check |
| `--teal-soft` | #CFE7E6 | #173B40 | Fundo de pílula "vai" |
| `--chat` / `--chat-me` | #E3EFEA / #D6F0C6 | #1C2A31 / #24452D | Conversa e bolha do aluno |
| `--road` | #C9C2B4 | #3A4656 | Estrada das ilustrações e do mapa |
| `--danger` | #B3261E | #F2B8B5 | Só para atraso e vencido (use pouco) |

Proporção aproximada em uma tela: 70% papel/superfície, 20% navy, 8% âmbar, 2% teal. O âmbar é o sinal de "aja aqui": um CTA âmbar por área, no máximo.

**Status (pílulas):**
- `vai` / `paga` / `confirmado`: fundo `--teal-soft`, texto `--teal`.
- `não vai` / `pendente` / `vence em X dias`: fundo `--amber-soft`, texto `--amber-ink`.
- `sem resposta`: fundo `--surface-2`, texto `--muted`.
- `avulso`: fundo `--amber`, texto #13233A.
- `atrasada` / `vencido`: fundo `--danger-soft`, texto `--danger`.
Nunca use bolinhas coloridas como único indicador: sempre texto na pílula.

## Tipografia

- **Bricolage Grotesque** (display, 500 a 800): títulos, números grandes ("11 de 14"), logo. Títulos com letter-spacing negativo (-0,03em no h1, -0,02em no h2) e `text-wrap:balance`.
- **DM Sans** (corpo, 400 a 700): texto, botões (700), formulários.
- **IBM Plex Mono** (500 a 600): eyebrows em MAIÚSCULAS com letter-spacing 0,1em e cor `--amber-ink`; horários ("21:04"), valores em tabelas, placas, código Pix, selo, relógio da demo.
- Escala: h1 clamp(40px, 6,2vw, 70px) 800 · h2 clamp(30px, 4vw, 46px) 780 · h3 21px 720 · corpo 17px/1,55 · pequeno 14px · eyebrow 13px. No painel, corpo 15 a 16px e h1 de página 32 a 40px.
- Os arquivos woff2 estão em `fonts/` (licença SIL OFL). `tokens.css` já declara os `@font-face`.

## Forma e superfícies

- Raios: botões e pílulas 999px; cartões 22 a 26px; elementos internos 10 a 14px; moldura de celular 40px (tela 30px).
- Cartões: `--surface`, borda 1px `--hair`, sem sombra parada; no hover sobem 4px e ganham `--shadow-card`.
- Faixas navy alternando com papel dão ritmo às seções (como "Como funciona" na landing).
- Divisores dentro de listas: 1px **tracejado** `--hair` (lembra a estrada).
- Ingresso (ticket) para o "30 dias grátis": lado esquerdo navy com "30" enorme, picote tracejado âmbar, recortes circulares nas laterais.

## Componentes base

- **Botão primário:** âmbar, texto navy 700, pílula, padding 15×26, sombra âmbar suave, hover sobe 2px. Pode ter etiqueta mono "30 DIAS" em navy dentro.
- **Botão fantasma:** borda 2px `--ink`. **Botão escuro:** navy com texto `--on-navy`. **Pequeno:** padding 10×18, 14px.
- **Pílula de confiança:** superfície, borda `--hair`, ícone check teal 14px ("Aluno não precisa baixar app").
- **Eyebrow:** mono 13px maiúsculo `--amber-ink` acima de cada título de seção.
- **Marca-texto:** `background:linear-gradient(transparent 62%, var(--amber-soft) 62%)` em 1 ou 2 palavras do título.
- **Chat (WhatsApp):** cabeçalho teal com avatar âmbar redondo (inicial "V"), fundo `--chat`, bolhas recebidas `--surface` com raio 14 14 14 4, bolhas do aluno `--chat-me` com raio 14 14 4 14, horário mono 11px à direita, respostas rápidas como botões com borda teal dentro da conversa.
- **Lista do dia:** título em display 16px + contador "11 de 14 vão"; linhas com nome à esquerda e pílula de status à direita, divisor tracejado; botão navy "Abrir rota no Maps" no fim.
- **Contador grande:** número em display 800, unidade em mono pequeno.
- **Medidor:** trilho 14px pílula, preenchimento âmbar.
- **Tabelas do painel:** cabeçalho mono 12px maiúsculo `--muted`, linhas 48px, números alinhados à direita em mono.
- **Barra lateral do painel:** navy, itens em `--on-navy-muted`, item ativo com fundo `--navy-2` e um traço âmbar de 3px à esquerda.
- **Moldura de celular** (simulador, motorista no desktop): navy, raio 40, padding 12, leve rotação -2° só em telas de marketing (no simulador, reto).

## Ilustração

- Estilo plano, contorno `#13233A` de 2,2px com cantos arredondados, preenchimentos em `--surface`, `--surface-2`, âmbar e teal. Rótulos em mono.
- **A van** (`assets/van.svg`, viewBox 0 0 122 56) é o personagem: corpo âmbar, janelas navy, faixa navy, rodas navy com cubo claro, farol #FFF3C4. Sempre andando da esquerda para a direita.
- **Estrada:** faixa `--road` com tracejado âmbar no meio (`stroke-dasharray` curto), casas simples, árvores redondas, campus com telhado.
- Rotas: linha tracejada âmbar com pontos de parada em círculos navy contornados de âmbar; destino em círculo âmbar maior.
- Ilustrações prontas da landing em `ilustracoes/` (cada SVG já traz o próprio `<style>` com os tokens do tema claro):
  `faixa-rota`, `selo-30-dias`, `dor-1-quem-vai-amanha`, `dor-2-parada-a-toa`, `dor-3-cobrar-um-por-um`, `passo-1-grade-de-aulas`, `passo-2-confirmacao-whatsapp`, `passo-3-lista-e-rota`, `diferencial-lista-pela-grade`, `diferencial-foco-universitario`, `diferencial-whatsapp-sem-app`, `diferencial-rota-maps-waze`, ícones `icone-check-16`, `icone-check-20`, `icone-pin`.
  Na landing do protótipo, prefira portar o SVG inline do HTML original (ele usa as classes do CSS e funciona nos dois temas).
- **Mapa esquemático** (tela de rota e motorista): fundo `--surface-2` com grade leve de quarteirões em `--hair`, estrada `--road` seguindo a ordem das paradas com tracejado âmbar, paradas numeradas (círculo navy, número em mono branco), pontos de quem não vai em cinza riscado, faculdade como o prédio com telhado das ilustrações, van âmbar na posição atual. Veja o exemplo em `guia-visual.html`.
- Ícones de interface: `lucide-react`, traço 2, tamanho 18 a 20, cor herdada.

## Movimento

- Entrada de seções: "rise" (opacidade 0 → 1, 22px → 0) em 0,7s com `cubic-bezier(.2,.7,.2,1)`, disparado por IntersectionObserver, com atraso em cascata de 80 a 120ms entre itens.
- Hover de cartões: sobe 4px em 0,25s. Botões: sobe 2px em 0,2s.
- Selo "30 dias grátis": gira devagar (20s por volta) e entra com "pop".
- A van da faixa da rota anda pela estrada em loop.
- No painel: nova mensagem ou mudança de status entra com "pop" curto (0,4s) e um realce `--amber-soft` que some em 1,5s, para o professor ver a atualização ao vivo.
- Sempre respeitar `prefers-reduced-motion` (sem animação, tudo visível) e nunca esconder conteúdo atrás de animação que pode não disparar.

## Voz e texto

- Português do Brasil, simples, falando com o operador por **você**. Frases curtas. Verbos de ação nos botões ("Mandar confirmações", "Abrir rota", "Copiar código Pix").
- Sem jargão: "lista do dia", "cobrança", "vaga avulsa", "grade de aulas", "sem fidelidade". Nunca "manifest", "invoice", "check-in" sem tradução.
- **Nunca use o travessão "—"** e nunca escreva "Em breve". Use vírgula, dois pontos ou ponto.
- Números concretos em vez de adjetivos: "11 de 14 vão", "economizou 6 km", "R$ 420 recebidos".
- Slogans: "Menos burocracia, mais segurança em cada viagem." · "A gestão do seu fretado em um só app." · "Saiba quem vai amanhã antes de ligar a van."
- Estados vazios ajudam a agir: "Nenhuma cobrança atrasada. Bom mês!" · "Ninguém respondeu ainda. As confirmações saem às 21h."
- Não usar emojis de bolinha colorida como status.
