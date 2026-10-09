# Spec 001 — Infra Railway no painel: liga/desliga de staging e custos

> Status: pronta para execução · Escopo: todos os projetos do workspace Railway "AdA Technology"
> Apps: `apps/api-ada`, `apps/frontend-panel` · Data: 2026-10-09

## 1. Problema

Os ambientes de staging de todos os projetos ficam ligados 24/7 e cobram CPU e memória mesmo sem
uso. Já existe a lógica de desligar, mas espalhada e só por linha de comando:

- `financiamento-imobiliario-bot/scripts/railway-environment-power.sh` (`status|off|on`, via
  `railway down` / `railway redeploy`, bancos por último ao desligar e primeiro ao ligar);
- workflows `stg-toggle.yml` nos repos `fin-bot-*` e `financiamento-mensagens-prontas`
  (`serviceInstanceUpdate numReplicas 0|1` pela API GraphQL).

Ninguém vê quanto cada projeto custa, nem quanto staging pesa na fatura.

## 2. Objetivo

Uma área **Infra** no painel da Ada (só admin) que:

1. lista todos os projetos e ambientes do workspace Railway, com o estado de cada serviço;
2. desliga e religa **ambientes de staging** com um clique, na ordem segura;
3. liga e desliga staging **automaticamente** por agenda (janela de funcionamento por dia da semana),
   com exceção temporária "manter ligado até";
4. mostra o **custo** do mês corrente por projeto e por ambiente, e a projeção para o fim do mês.

## 3. Inventário atual (consultado em 2026-10-09)

| Projeto | Ambientes | Serviços |
|---|---|---|
| quickcart | staging, production | 5 |
| ada-technology | staging, production | 6 |
| transportada | staging, production | 23 |
| transportada-ops | production | 6 |
| financiamento-imobiliario-bot | cbni-staging, cbni-production | 8 |

Um workspace: `AdA Technology` (id `42450f5c-a76c-40d9-b77f-cc627906ead1`).

## 4. Histórias de usuário

- **US1 — Ver o estado.** Como admin, abro *Infra → Ambientes* e vejo cada projeto, seus ambientes e,
  por ambiente, quantos serviços estão no ar, desligados ou com falha.
- **US2 — Desligar staging.** Como admin, clico em *Desligar* num ambiente de staging, confirmo, e todos
  os serviços param — aplicações primeiro, bancos depois. Volumes, variáveis e backups ficam intactos.
- **US3 — Religar staging.** Como admin, clico em *Ligar*; os bancos sobem primeiro e as aplicações
  depois que os bancos respondem.
- **US4 — Agenda de liga/desliga.** Como admin, defino por ambiente de staging uma janela de
  funcionamento: dias da semana + hora de ligar + hora de desligar (ex.: seg–sex, 08:00–20:00).
  Fora da janela o ambiente fica desligado; dentro, ligado. A agenda roda sem ninguém no painel e
  o painel mostra a próxima ação ("desliga hoje às 20:00").
- **US4b — Exceção temporária.** Como admin, ligo staging fora da janela (ex.: sábado, para um teste)
  escolhendo "manter ligado até" (padrão: +2 h; máximo: 24 h). A agenda não desliga antes desse
  horário e, passado ele, desliga no próximo tick. Também posso pausar a agenda de um ambiente
  sem apagá-la.
- **US5 — Custos.** Como admin, abro *Infra → Custos* e vejo, para o mês corrente: custo acumulado no ciclo de cobrança por
  projeto, quebra por ambiente (staging × produção), quebra por recurso (CPU, memória, rede, disco) e a
  projeção de fechamento do mês.
- **US6 — Rastro.** Toda ação de ligar/desligar (manual ou agendada) fica na trilha de auditoria com
  quem, quando, qual ambiente e o resultado por serviço.

## 5. Requisitos funcionais

- **RF1** Listar projetos/ambientes/serviços do workspace pela API GraphQL do Railway.
- **RF2** Um ambiente é **gerenciável** quando o nome casa com `RAILWAY_MANAGED_ENVIRONMENT_PATTERN`
  (padrão `staging`, que cobre `staging` e `cbni-staging`) **e** não é protegido.
- **RF3** São **protegidos**, sem exceção configurável pelo painel:
  - todo ambiente cujo nome contém `prod` (cobre `production`, `prod` e abreviações; fail-closed);
  - o ambiente onde a própria `api-ada` está rodando (`RAILWAY_ENVIRONMENT_ID`, injetado pelo Railway).
  Ambiente protegido não exibe botão e a API responde 403 `INFRA_ENVIRONMENT_PROTECTED`.
- **RF4** Desligar: aplicações primeiro, depois bancos (banco = `source.image` casa com uma lista de imagens de banco em `infra.constant.ts` — `postgres`, `postgres-ssl`, `redis`, `mysql`, `mongo`; o nome `^(Postgres|Redis|MySQL|MongoDB)` só vale como reforço quando `source.image` vier nulo — decisão do spike T0.1).
- **RF5** Ligar: bancos primeiro, espera até ficarem **prontos** (`deploymentStopped` falso **e** instância `RUNNING`; o status `SUCCESS` sozinho não serve, porque um deployment parado também é `SUCCESS`) (teto configurável, padrão 120 s),
  depois aplicações.
- **RF6** Ligar/desligar é **assíncrono**: a API responde 202 com o id da operação e o estado é
  consultado depois. Uma operação por ambiente por vez (409 `INFRA_OPERATION_IN_PROGRESS`).
- **RF7** Falha num serviço não interrompe os demais; o resultado por serviço vai para a operação e
  para a auditoria.
- **RF8** Agenda por ambiente gerenciável, em campos estruturados (não cron cru na UI):
  `activeWeekdays` (0–6), `powerOnTime` e `powerOffTime` (`HH:mm`), fuso `America/Sao_Paulo`,
  `isEnabled`. Janela que cruza a meia-noite (ex.: 22:00–02:00) é recusada na v1 (400).
  Executada pelo scheduler em processo da `api-ada`, com ator `system`.
- **RF8a** A agenda é **convergente**: a cada tick, compara o estado desejado (dentro/fora da janela)
  com o estado real e só age na transição de janela. Uma ação manual dentro da janela não é
  desfeita pela agenda até a próxima transição. Exceção: `keepOnUntil` (RF8b).
- **RF8b** Ligar manualmente fora da janela exige `keepOnUntil` (padrão: agora + 2 h, máximo 24 h).
  A agenda não desliga antes dele; ao vencer, desliga e limpa o campo. Desligar manualmente limpa
  `keepOnUntil`.
- **RF8c** O painel sugere o preset "horário comercial" (seg–sex, 08:00–20:00) ao criar a agenda;
  nenhum ambiente ganha agenda sem um admin salvar.
- **RF8d** A API devolve, por ambiente, `nextScheduledAction` (`{ kind, at }`), calculado no servidor.
- **RF9** Custos do **ciclo de cobrança corrente** (`workspace.customer.billingPeriod`, hoje dia 19 a dia 19; não o mês-calendário) por projeto × ambiente × medida (query `usage` com
  `groupBy: [PROJECT_ID, ENVIRONMENT_ID]`) e projeção até o fim do ciclo (`estimatedUsage`). A tela mostra também o total oficial do Railway (`customer.currentUsage`) para reconciliar com o cálculo.
- **RF10** Conversão de uso em dólar pela tabela de preços do Railway, mantida em constante com a fonte
  e a data de conferência.
- **RF11** Somente admin (`AUTH_REQUIREMENT.ADMIN` na API, `requiresAdmin` no menu).

## 6. Requisitos não funcionais

- **Segurança**
  - O token do Railway vive só na `api-ada`, como variável validada no boot.
  - Ausência do token desliga o módulo: as rotas respondem 503 `INFRA_NOT_CONFIGURED` e o menu mostra o estado.
  - O cliente GraphQL só executa documentos fixos declarados em código, nunca uma query montada a partir de entrada.
  - O token nunca aparece em log.
- **Verificação de acesso (recorrente)**
  - O `RailwayGateway` expõe `verifyAccess()`: lê workspace, projetos, ciclo de cobrança (`customer`), `usage` e o estado de um ambiente. Roda no boot (só avisa no log, nunca derruba a API) e a cada abertura da tela Infra, com resultado em cache de 5 min.
  - A tela mostra um aviso quando o token está inválido/revogado ou quando só o `customer` (cobrança) não é legível; neste caso os custos aparecem sem o total oficial, em vez de a tela inteira falhar.
  - O Railway responde falha de autenticação com **HTTP 200 e o erro no corpo**: o gateway trata `errors` mesmo em 200.
- **Custo de API**
  - O estado dos ambientes fica em cache no Redis por 30 s.
  - Os custos ficam em cache por 15 min.
  - Os headers de rate limit do Railway são respeitados, e 429 vira erro de domínio, sem retry cego.
- **Auditoria**
  - `infra.environment_powered_off`, `infra.environment_powered_on` e `infra.schedule_changed`.
  - Ator, alvo (projeto e ambiente em `metadata`), IP e resultado por serviço.
- **Observabilidade**
  - Log estruturado por operação: id da operação, ambiente e contagem de sucesso/falha. Sem PII.

## 7. Fora de escopo (v1)

- Desligar produção (bloqueado por design, não por configuração).
- Custos de meses anteriores, exportação e alertas de orçamento.
- Conversão para BRL.
- Economia estimada pelas horas desligadas.
- Apagar os mecanismos antigos (`railway-environment-power.sh`, `stg-toggle.yml`). Eles seguem funcionando.
  - Os repos `fin-bot-*` apontam para projetos que não aparecem mais no workspace e devem ser revisados à parte.
- Serverless / `sleepApplication`: avaliado no spike T0.1 como alternativa, mas não é entrega da v1.

## 8. Decisões assumidas (vetáveis antes da execução)

| # | Decisão | Alternativa descartada |
|---|---|---|
| D1 | Token de **workspace** (`Authorization: Bearer`), só em produção da `api-ada` | Token de projeto: é por ambiente, não enxerga os outros projetos |
| D2 | **Fechada no T0.1:** `deploymentStop` para desligar e `deploymentRestart` para religar (~7 s, sem build, mesmo deployment) | `numReplicas: 0` (o Railway recusa; os `stg-toggle.yml` não funcionam) e `deploymentRemove` (religar cria deployment novo e pode exigir build) |
| D3 | Agenda no scheduler em processo da `api-ada` (réplica única hoje) | `apps/cron-ada` novo: só se a API ganhar réplicas |
| D7 | A `api-ada` fala com o Railway **só por HTTP** (`fetch` na API GraphQL, `Authorization: Bearer <token de workspace>`, endpoint `https://backboard.railway.com/graphql/v2`), nunca pela CLI. A verificação do token e do acesso é rotina da própria API (RNF abaixo) | CLI `railway`: a imagem da `api-ada` não a tem, exige login interativo e por baixo chama a mesma API GraphQL; além disso não devolve erro estruturado para o código tratar |
| D6 | Agenda como janela (dias + hora liga/desliga), convergente por transição | Dois crons independentes: deixam estados impossíveis (ligar depois de desligar no mesmo dia) e não suportam "manter até" |
| D4 | Preços em constante, com fonte e data | Buscar preço por API: o Railway não expõe |
| D5 | Rotas em `/v1/panel/infra/...` | Rota fora do painel |

## 9. Critérios de aceite

1. Admin vê os 5 projetos e seus ambientes; não-admin não vê o menu, e a API responde 403.
2. Desligar `cbni-staging` pelo painel deixa todos os serviços sem instância ativa em menos de 2 min.
   Religar devolve todos a prontos (`deploymentStopped` falso e instância `RUNNING`) em menos de 5 min, e o bot de staging responde.
3. Tentar desligar `cbni-production`, `production` ou o ambiente da própria `api-ada`: 403, e nada muda no Railway.
4. Com a agenda seg–sex 08:00–20:00 em `cbni-staging`: às 20:00 desliga e às 08:00 do dia útil
   seguinte liga, sozinha, com auditoria de ator `system`. No sábado, ligar com "manter até +2 h"
   mantém ligado e desliga sozinho ao vencer. A agenda pausada não age.
5. O custo do ciclo por projeto bate com o Railway, com margem de ±5% (T0.2 já mediu +1,2% no total).
6. Sem `RAILWAY_API_TOKEN`, a API sobe, as rotas de infra respondem 503 e o resto do painel funciona.
7. `make validate` verde; nenhum `test.skip`/`.only`.
