# 08 · Regras de negócio

Tudo que estiver marcado como **configurável** fica em `operator_settings` e aparece na tela Configurações. Os valores abaixo são os padrões.

## 1. Preço da VanFlow (o que o operador paga)

- **R$ 59,90 por van por mês**, alunos ilimitados, todas as funções, sem fidelidade, sem taxa sobre as mensalidades.
- **30 dias grátis** a partir da criação da conta, com tudo liberado. Banner com contagem regressiva.
- Fim do teste sem assinar: o painel continua visível, mas os envios automáticos pausam e aparece o convite para assinar. (Na demo, nunca deixe o sistema travado: a central da demo pode "estender o teste".)
- Plano frotista (P2, em teste): R$ 59,90 por van até 3 vans e **R$ 44,90 por van a partir da 4ª** (valor de hipótese; o dono de 4 vans propôs R$ 150 pelas 4).
- Cancelamento: a qualquer momento, sem multa.

## 2. Preço do transporte (o que o aluno paga ao operador)

Definido pelo operador por linha. Padrões do seed (fictícios, dentro das faixas da pesquisa):

| Plano | Itu e Salto → Sorocaba (noite) | Votorantim → Sorocaba (manhã) |
|---|---|---|
| 5 dias por semana | R$ 420,00 | R$ 320,00 |
| 3 dias por semana | R$ 300,00 | R$ 240,00 |
| 2 dias por semana | R$ 220,00 | R$ 170,00 |
| Avulsa ida e volta | R$ 20,00 | R$ 16,00 |
| Avulsa só ida ou só volta | R$ 12,00 | R$ 10,00 |

- Plano de N dias: o aluno escolhe **quais** dias da semana (precisam bater com a grade; se a grade tiver um dia a mais, o sistema avisa e sugere o plano maior ou a avulsa).
- Dia fora do plano → o aluno pode comprar avulsa.
- Sem pró-rata no MVP (entrada no meio do mês: o operador ajusta o valor da primeira cobrança manualmente).
- Feriado ou viagem cancelada pelo operador não gera desconto automático (configurável em P2).

## 3. Grade de aulas e lista do dia

- Cada aluno tem uma **grade por semestre**: lista de `{dia_da_semana, faculdade, inicio, fim}`. Semestre padrão: 2026/2, de 03/08/2026 a 12/12/2026.
- A grade define em quais **viagens** ele é previsto: a viagem de ida do turno cujo horário de chegada atende o `inicio`, e a de volta que atende o `fim`.
- **Previsto para a viagem do dia D** = matrícula ativa na linha + dia da semana de D está no plano + tem aula em D na grade + não há exceção (feriado, aula cancelada cadastrada, falta já avisada) + não foi suspenso por inadimplência (P2, desligado por padrão).
- Avulsos pagos para D entram como previstos e confirmados.
- **Capacidade:** lugares da van (padrão 15). Vagas livres = capacidade − (confirmados + sem resposta + avulsos pagos + reservas pendentes).

## 4. Confirmação de presença

| Item | Padrão | Configurável |
|---|---|---|
| Envio da confirmação | **21h00 da véspera** | Sim (19h a 22h) |
| Lembrete para quem não respondeu | 22h30 da véspera | Sim, liga/desliga |
| Fechamento da lista | 5h30 (turno da manhã) ou 3h antes da saída (noite) | Sim |
| Sem resposta no fechamento | Conta como **vai** (marcado "sem resposta") | Sim: "conta como vai" ou "conta como não vai" |
| Não envia | Feriados, domingos, dias sem aula na grade, fora do semestre | |

Status de cada passageiro na viagem (`trip_passengers.status`):
`previsto` → (mensagem enviada) `aguardando` → `confirmado` | `nao_vai` | `sem_resposta` (no fechamento) → no dia: `embarcou` | `nao_apareceu`.
Avulsos: `reservado` (aguardando Pix) → `confirmado` (pago) | `expirado`.

Parser de resposta livre (normalize: minúsculas, sem acento, sem pontuação):
- **Vai:** "vou", "sim", "vou sim", "to indo", "confirmo", "ok", "👍".
- **Não vai:** começa com "nao", "não vou", "nao vou", "hoje nao", "nao vai dar", "falto". Se houver texto depois (ex.: "não vou, a aula foi cancelada"), guarde como `motivo`.
- **Só ida / só volta** (P1): "só ida", "so volta".
- **Avulsa:** "avulsa", "vaga", "quero ir [dia]".
- **Pix:** "pix", "boleto", "segunda via", "2a via", "pagar".
- Não entendeu: responda com os botões de novo e "Não entendi. Toque em uma opção ou responda VOU ou NÃO VOU."

## 5. Mensagens (modelos)

Use exatamente este tom: curto, amigável, sem jargão, sem "—". `{}` são variáveis. Dia da semana abreviado entre parênteses.

- **Confirmação:** `Oi, {primeiro_nome}! Amanhã ({dia_abrev}) você tem aula às {inicio} na {faculdade}. Vai na van?` Botões: `Vou` · `Não vou`.
- **Resposta "Vou":** `Combinado! Saída às {saida} no {ponto}. Até amanhã.`
- **Resposta "Não vou":** `Anotado! Seu lugar foi liberado. Até {proximo_dia_com_aula}.`
- **Lembrete sem resposta:** `{primeiro_nome}, ainda não sabemos se você vai amanhã. Responda VOU ou NÃO VOU até {fechamento}.`
- **Oferta de vaga avulsa:** `Abriu vaga na van de {dia_abrev} ({data}): {linha}, saída {saida}. Ida e volta por {preco}. Quer reservar?` Botão: `Reservar`.
- **Reserva avulsa:** `Vaga reservada por 30 minutos. Pague com o Pix copia e cola abaixo para garantir:` + bloco do Pix.
- **Avulsa paga:** `Pagamento recebido! Você está na lista de {dia_abrev}. Saída às {saida} no {ponto}.`
- **Cobrança do mês:** `Oi, {primeiro_nome}! Sua mensalidade de {mes} da {nome_van} é {valor}, com vencimento em {vencimento}. Pix copia e cola:` + bloco + `Ou abra o QR Code: {link}`.
- **Lembrete antes:** `Lembrete: sua mensalidade de {valor} vence {em_2_dias_ou_hoje}. O Pix está aqui:`
- **Atraso:** `{primeiro_nome}, a mensalidade de {mes} venceu em {vencimento}. Se já pagou, desconsidere. Pix:`
- **Recibo:** `Recebemos {valor} referente a {descricao}. Obrigado! Recibo: {link}`
- **Aviso ao operador (no painel e, P2, no WhatsApp dele):** `Ana avisou que não vai hoje (20 min antes da saída).` · `3 mensalidades atrasadas.` · `A CNH do Edson vence em 12 dias.`

Mensagens com botões aparecem no simulador como bolhas com botões, iguais ao chat da landing (`identidade-visual/guia.md`, componente Chat).

## 6. Vagas avulsas

- Fonte das vagas: lugares livres da viagem (seção 3), incluindo os liberados por "Não vou".
- Quem pode comprar: qualquer estudante cadastrado na **lista de interesse** da linha (alunos sem plano naquele dia e contatos avulsos). Na demo, o simulador também permite um número novo.
- Reserva segura a vaga por **30 minutos**; depois expira.
- Venda encerra no fechamento da lista (ou na saída, se o operador permitir).
- Oferta automática (P1): ao liberar uma vaga, a VanFlow manda a oferta para até 5 interessados da lista, por ordem de quem comprou mais recentemente. Primeiro a pagar leva.
- Receita das avulsas entra no financeiro da van.

## 7. Cobrança e Pix

- Geração: dia **1** do mês, vencimento dia **5** (configurável 5 ou 10). Uma cobrança por matrícula.
- Lembretes: D−2, D0 (8h), D+1, D+3. Depois disso, só manual.
- Status: `pendente` → `paga` | `atrasada` (a partir de D+1) → `paga`. `cancelada` manual.
- Baixa: só pelo webhook do PSP (simulado) ou manual pelo operador ("Marcar como paga", com motivo "recebi em dinheiro").
- Multa e juros: desligado por padrão (P2).

### BR Code (Pix copia e cola)

Formato EMV MPM do Banco Central. Cada campo é `ID (2 dígitos) + tamanho (2 dígitos) + valor`.

| ID | Campo | Valor |
|---|---|---|
| 00 | Payload Format Indicator | `01` |
| 01 | Point of Initiation Method | `12` (uso único, para cobranças) ou `11` (reutilizável) |
| 26 | Merchant Account Information | subcampos `00` = `br.gov.bcb.pix`, `01` = chave Pix, `02` = descrição opcional |
| 52 | Merchant Category Code | `0000` |
| 53 | Moeda | `986` (BRL) |
| 54 | Valor | `320.00` (ponto decimal, sem separador de milhar) |
| 58 | País | `BR` |
| 59 | Nome do recebedor | até 25 caracteres, sem acento, maiúsculas |
| 60 | Cidade | até 15 caracteres, sem acento, maiúsculas |
| 62 | Dados adicionais | subcampo `05` = txid (até 25 caracteres alfanuméricos; `***` se não houver) |
| 63 | CRC16 | `6304` + 4 dígitos hexadecimais maiúsculos |

CRC: **CRC-16/CCITT-FALSE** (polinômio 0x1021, valor inicial 0xFFFF, sem reflexão, sem XOR final), calculado sobre todo o payload **incluindo** o texto `6304`. Valor de teste: CRC de `123456789` = `29B1`.

Vetor de teste (use em um teste automatizado):
```
chave  = vanflow.demo@exemplo.com
nome   = JOSE ALMEIDA FRETADOS
cidade = ITU
valor  = 320.00
txid   = VF202611ANA01
payload esperado:
00020101021226460014br.gov.bcb.pix0124vanflow.demo@exemplo.com5204000053039865406320.005802BR5921JOSE ALMEIDA FRETADOS6003ITU62170513VF202611ANA01630485D3
```

txid sugerido: `VF` + `AAAAMM` + id curto do aluno + sequência (ex.: `VF202611ANA01`). Avulsa: `VA` + `AAAAMMDD` + id.
QR Code: gere a partir do payload com a lib `qrcode` (nível de correção M). Mostre "Copiar código" ao lado.

Webhook simulado: `POST /api/webhooks/pix` com `{ txid, valor, pago_em }`. O mesmo endpoint é chamado pelo botão "Simular pagamento".

## 8. Rota do dia

- Entrada: ponto de saída da linha (garagem ou primeiro ponto), paradas dos passageiros com status `confirmado`, `sem_resposta` ou avulso pago, e o destino (faculdade; se a viagem atende mais de uma faculdade, as faculdades entram como paradas finais em ordem de horário de aula).
- Na **ida**: casa → faculdade. Na **volta**: faculdade → casas (ordem inversa recalculada).
- Algoritmo offline: vizinho mais próximo a partir da saída + **2-opt** até não melhorar, distância haversine × 1,3 (fator de estrada). Velocidade média 40 km/h urbana e 80 km/h rodovia para estimar horários (simples: 50 km/h).
- Em produção: Google Routes API com `optimizeWaypointOrder`. Deixe isso escrito na interface `MapsProvider`.
- Saída: lista ordenada com horário estimado de cada parada, distância total e tempo total, e comparação com a "rota de cabeça" (todos os previstos, sem otimizar) para mostrar a economia em km.

Links:
- Google Maps: `https://www.google.com/maps/dir/?api=1&origin={lat},{lng}&destination={lat},{lng}&waypoints={lat},{lng}|{lat},{lng}&travelmode=driving` (codifique `|` como `%7C`). **Até 9 waypoints** por link; acima disso, gere trechos (Trecho 1, Trecho 2).
- Waze: `https://waze.com/ul?ll={lat},{lng}&navigate=yes`, um link por parada (botão "Próxima parada").

## 9. Documentos

Tipos: CNH do motorista (com EAR), CRLV da van, vistoria (Artesp/prefeitura), seguro APP/RCF, **autorização de fretamento da Artesp** (intermunicipal), curso de transporte coletivo do motorista. Alertas 30, 15 e 7 dias antes; vencido = vermelho. Não é consultoria jurídica: o texto diz "lembrete", nunca "você está regular".

## 10. Feriados e exceções

Seed inclui os feriados de nov e dez de 2026: **15/11 (domingo), 20/11 (sexta, Consciência Negra), 25/12**. Em feriado não há viagem nem confirmação. O operador pode cadastrar exceções: "faculdade X sem aula em tal data" (afeta todos os alunos daquela faculdade) ou "viagem cancelada".

## 11. Formatos

- Moeda: `R$ 1.234,56`. Datas: `12/11/2026`, `qui, 12/11`. Hora: `21h`, `17h40`.
- Telefones: `(15) 9XXXX-XXXX`. Todos os números do seed são fictícios (`(15) 90000-00XX`).
