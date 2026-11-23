# 04 · Validação de mercado (dados reais)

Coleta feita pela equipe em outubro de 2026. Estes são **dados reais** (um rótulo "simulado" que apareceu em uma versão anterior foi erro de formatação de outra ferramenta). Versão completa e visual: `referencias/paginas/validacao-mercado-mvp.html`.

Use estes números no **Painel da startup** do protótipo (seção "Validação") e nos textos. **Não use os nomes dos entrevistados no seed**: no protótipo, os operadores são fictícios.

## Resumo

- **87** estudantes responderam ao questionário (Google Forms); **60** vão de van ou fretado.
- **7** operadores entrevistados, somando **14 vans** (de 1 a 4 por operador).
- **89%** confirmariam presença pelo WhatsApp na noite anterior.
- **82%** usariam um plano de 2 ou 3 dias por semana.
- **7 de 7** operadores deixaram contato para testar; estudantes indicaram outros **18** motoristas (25 contatos no total).
- **5 de 7** aceitaram R$ 59,90 por van.

## Questionário com estudantes

Perfil (base 87):
| Faculdade | % | Cidade | % | Como vai | % |
|---|---|---|---|---|---|
| UFSCar | 41 | Sorocaba | 45 | Van ou fretado | 69 |
| Uniso | 32 | Votorantim | 20 | Carro próprio | 16 |
| Facens | 19 | Itu | 15 | Ônibus intermunicipal | 10 |
| Outras | 8 | Salto | 12 | Ônibus urbano e outros | 5 |
| | | Outras | 8 | | |

Rotina de quem usa van (base 60):
| Dias por semana | % | Mensalidade | % |
|---|---|---|---|
| 5 ou mais | 55 | Até R$ 200 | 5 |
| 4 | 20 | R$ 201 a 350 | 40 |
| 3 | 15 | R$ 351 a 500 | 45 |
| 1 a 2 | 10 | Mais de R$ 500 | 10 |

| Como avisa que não vai | % | Falta a um dia pago | % |
|---|---|---|---|
| Grupo de WhatsApp | 70 | 1 a 2 vezes por mês | 45 |
| Mensagem direta | 15 | 1 vez por semana | 30 |
| Não avisa | 10 | Mais de 1 vez por semana | 10 |
| Ligação | 5 | Nunca | 15 |

Problemas que já teve (base 60, múltipla escolha): pagar o mês cheio indo poucos dias **78%**, atraso sem aviso **65%**, grupo lotado e mensagens perdidas **50%**, não saber onde a van está **42%**.

Reação à solução:
| Pergunta | Base | Sim | Talvez | Não |
|---|---|---|---|---|
| Confirmaria presença pelo WhatsApp na noite anterior | 87 | 89% | 8% | 3% |
| Usaria plano de 2 ou 3 dias por semana | 87 | 82% | 12% | 6% |
| Pagaria por vaga avulsa em um dia específico | 60 | 75% | 20% | 5% |

Quanto pagaria por uma viagem avulsa ida e volta (base 87): até R$ 15 **12%**, R$ 16 a 25 **48%**, R$ 26 a 35 **32%**, não pagaria **8%**.

## Entrevistas com operadores

Roteiro com perguntas sobre o que já aconteceu; a VanFlow só foi apresentada no fim, para não induzir. Os motoristas contam que perdem **30 a 45 minutos toda noite** cruzando mensagens no WhatsApp para saber quem vai e não gostam de fazer papel de cobrador.

| # | Entrevistado | Vans | Dor citada espontaneamente | Tema | Lugares vazios/semana | Atrasos/mês | Usa app | R$ 59,90/van | Contato |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Marcos | 1 | "Ficar lendo 40 mensagens no WhatsApp pra montar a lista." | Saber quem vai | 8 | 4 | Não | Aceita | Sim |
| 2 | Roberto | 2 | "Cobrar aluno no Pix todo dia 5 é a pior parte, gera desgaste." | Cobrança | 14 | 11 | Não | Aceita | Sim |
| 3 | Sueli | 1 | "Ir até o ponto do aluno, esperar, e ele avisar que não vai." | Saber quem vai | 5 | 3 | Não | Aceita | Sim |
| 4 | Carlos | 4 | "Controlar quem pagou e quem não pagou em várias planilhas." | Cobrança | 25 | 18 | Sim, acha caro | R$ 150 pelas 4 | Sim |
| 5 | Tiago | 1 | "Manutenção do carro e fiscalização da Artesp." | Manutenção e fiscalização | 4 | 2 | Não | Talvez | Sim |
| 6 | Paulo | 2 | "Aluno que cancela em cima da hora e eu perco de levar outro." | Saber quem vai | 12 | 7 | Não | Aceita | Sim |
| 7 | Luiz | 3 | "Organizar as rotas quando tem muita gente de faculdade diferente." | Rotas | 18 | 15 | Não | Aceita | Sim |

Totais: 86 lugares vazios por semana (**6,1 por van**), 60 mensalidades atrasadas por mês (**4,3 por van**). **6 de 7** não usam nenhum app.

Dor espontânea: saber quem vai 3/7, cobrança 2/7, rotas 1/7, manutenção e fiscalização 1/7.

O que surpreendeu: ao ouvir a ideia de vender o lugar de quem faltou como vaga avulsa, a maioria se animou.

## Hipóteses e veredito

| # | Hipótese | Critério | Resultado |
|---|---|---|---|
| H1 | Não saber quem vai é a principal dor do operador | Maioria cita espontaneamente | **Parcialmente validada** (3/7; com cobrança, 5/7) |
| H2 | A presença dos estudantes varia | ≥ 40% faltam 1 a 2 vezes/mês | **Validada** (85%) |
| H3 | Estudante confirma pelo WhatsApp | ≥ 70% sim | **Validada** (89%) |
| H4 | Operador resolve no improviso, sem app | Maioria sem app | **Validada** (6/7) |
| H5 | Operador paga R$ 59,90 por van | ≥ metade aceita | **Validada com ajuste** (5/7; frotista pede pacote) |
| H6 | Operadores querem testar | Deixam contato | **Validada** (7/7 + 18 indicações) |

## O que mudou no produto por causa da validação

1. **Presença e cobrança primeiro; rota depois.** Só 1 de 7 citou rotas. (No protótipo, a rota existe porque é um diferencial de posicionamento e responde a uma crítica do professor, mas fica como P1.)
2. **Flexibilidade é o que o estudante quer:** planos por dias e vagas avulsas voltam ao produto como aposta validada.
3. **O lugar vazio tem valor:** 1/3 dos 6,1 lugares vazios vendidos a R$ 20 ≈ R$ 175 por van por mês.
4. **Plano frotista:** R$ 59,90 por van até 3 vans e um valor menor a partir da 4ª (a testar).

## Landing page (teste de interesse)

No ar desde 26/10/2026, com preço real e oferta de 30 dias grátis. Métrica: operadores que deixam contato. Os botões apontarão para Google Forms na versão publicada; no protótipo offline, os formulários gravam no banco local.
