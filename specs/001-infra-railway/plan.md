# Plano técnico — Spec 001 Infra Railway

## 1. Visão geral

```
frontend-panel                      api-ada                                   Railway
───────────────                     ───────                                   ───────
Infra → Ambientes  ──GET/POST──▶  modules/infra/infra.controller.ts
Infra → Custos     ──GET──────▶     ├─ listInfraEnvironments.use-case.ts ─┐
                                    ├─ powerOffEnvironment.use-case.ts   ─┤
                                    ├─ powerOnEnvironment.use-case.ts    ─┼─▶ RailwayGateway ──▶ backboard.railway.com/graphql/v2
                                    ├─ getInfraCosts.use-case.ts         ─┤     (documentos fixos + zod)
                                    ├─ saveEnvironmentSchedule.use-case  ─┘
                                    └─ infraSchedules (ScheduledTask) ──▶ scheduler.ts (tick 1 min)
                                  audit/recordAuditLog  ·  Redis (cache + trava de operação)  ·  Postgres (agenda + operações)
```

## 2. Backend — `apps/api-ada/src/modules/infra/`

### 2.1 Arquivos

| Arquivo | Papel |
|---|---|
| `infra.controller.ts` | `infraRoutes: readonly Route[]`, todas com `auth: AUTH_REQUIREMENT.ADMIN` |
| `infra.schema.ts` | zod dos params/body das rotas |
| `infra.constant.ts` | `INFRA_ENVIRONMENT_CLASSIFICATION`, `INFRA_SERVICE_POWER_STATE`, `INFRA_OPERATION_KIND`, `INFRA_OPERATION_STATUS`, padrões de banco, TTLs de cache, chaves Redis |
| `infra.error.ts` | `InfraNotConfiguredError` 503, `InfraEnvironmentProtectedError` 403, `InfraEnvironmentNotFoundError` 404, `InfraOperationInProgressError` 409, `InfraOperationNotFoundError` 404, `RailwayRequestFailedError` 502, `RailwayRateLimitedError` 503, `InfraKeepOnUntilRequiredError` 400, `InfraInvalidScheduleError` 400 |
| `railwayPricing.constant.ts` | preço por medida, unidade, fonte (URL) e data de conferência |
| `RailwayGateway.ts` | adaptador: `fetch` (HTTP, sem CLI) para `https://backboard.railway.com/graphql/v2` com `Authorization: Bearer`, timeout de 20 s, documentos GraphQL fixos e `safeParse` zod; converte falha em erro de domínio. Trata `errors` mesmo com HTTP 200. Expõe `verifyAccess()` (D7), que o boot e a tela Infra usam e que devolve `ok \| token_invalid \| billing_unavailable` |
| `railwayGateway.schema.ts` | zod das respostas do Railway (são entrada não confiável) |
| `classifyEnvironment.ts` | função pura: `{ environmentName, environmentId, managedPattern, selfEnvironmentId }` → `managed \| protected \| unmanaged` |
| `orderServicesForPower.ts` | função pura: separa bancos × aplicações e devolve a ordem para `off`/`on` |
| `calculateUsageCost.ts` | função pura: linhas de `usage` + tabela de preço → custo por projeto/ambiente/medida |
| `listInfraEnvironments.use-case.ts` | projetos → ambientes → serviços com estado e classificação; cache 30 s |
| `powerOffEnvironment.use-case.ts` / `powerOnEnvironment.use-case.ts` | valida a classificação, trava, cria a operação, executa em segundo plano e audita |
| `runPowerOperation.ts` | executor comum: percorre os serviços na ordem, registra resultado por serviço e respeita a espera dos bancos. "Pronto" = `deploymentStopped` falso **e** instância `RUNNING` (nunca só `SUCCESS`). A trava Redis tem TTL = espera dos bancos + folga para build e é renovada enquanto a operação roda. No boot, operações `running` mais antigas que esse TTL viram `failed` (código de "interrompida"), para um deploy no meio não deixar o painel preso |
| `getInfraCosts.use-case.ts` | `usage` do ciclo + `estimatedUsage` → visão de custos; cache 15 min. A consulta `usage` falhou de forma intermitente ("Problem processing request") em 2 de ~6 execuções: uma única nova tentativa após 2 s e, se falhar de novo, devolver o último resultado em cache marcado como desatualizado |
| `saveEnvironmentSchedule.use-case.ts` / `listEnvironmentSchedules.use-case.ts` | CRUD da agenda; valida dias (0–6, ao menos um), `HH:mm`, `powerOnTime < powerOffTime` |
| `resolveScheduleAction.ts` | função pura: `{ schedule, now, lastEvaluatedAt, keepOnUntil }` → `power_on \| power_off \| none` e `nextScheduledAction` |
| `infraSchedules.ts` | `ScheduledTask` de 1 min: para cada agenda ativa, chama `resolveScheduleAction` e executa a ação (ator `system`) |
| `types/infra.types.ts`, `types/railwayGateway.interface.ts` | `Params`/`Result` por função; interface do gateway para injeção |

O `container.ts` instancia o `RailwayGateway` **só se** `RAILWAY_API_TOKEN` não estiver vazio, seguindo o padrão de capacidade por ausência. Os use cases recebem `railwayGateway?: RailwayGatewayInterface` e lançam `InfraNotConfiguredError` quando ele vem `undefined`.

### 2.2 Documentos GraphQL (fixos, declarados em `RailwayGateway.ts`)

| Operação | Uso |
|---|---|
| `environment(id) { serviceInstances { edges { node { serviceId serviceName source { image repo } latestDeployment { id status deploymentStopped instances { status } } activeDeployments { id status } } } } }` | estado (shape confirmado no T0.1). "Desligado" = `deploymentStopped` verdadeiro, instância `EXITED` ou nenhum deployment. O status continua `SUCCESS` em deployment parado |
| `deploymentStop(id)` | desligar (D2 fechada no T0.1: ~7 s, sem perder o deployment). `numReplicas: 0` é recusado pelo Railway |
| `deploymentRestart(id)` se parado; `serviceInstanceRedeploy(environmentId, serviceId)` se não há deployment | ligar (~7 s sem build; o redeploy pode exigir build em serviço de repositório) |
| `workspace(workspaceId) { customer { currentUsage billingPeriod { start end } } }` | período do ciclo e total oficial para reconciliar |
| `usage(workspaceId, startDate: billingPeriod.start, endDate: billingPeriod.end, measurements, groupBy: [PROJECT_ID, ENVIRONMENT_ID])` | custo acumulado. `endDate` = fim do ciclo (futuro); `endDate` = agora dá `Problem processing request`. Sem `BACKUP_USAGE_GB` aqui (só agrupa por projeto) |
| `estimatedUsage(workspaceId, measurements)` | projeção do mês por projeto |

Medidas consultadas por projeto × ambiente: `CPU_USAGE`, `MEMORY_USAGE_GB`, `NETWORK_TX_GB`, `DISK_USAGE_GB`. `BACKUP_USAGE_GB` só em consulta separada agrupada por `PROJECT_ID` (o T0.2 mostrou que com `ENVIRONMENT_ID` a consulta falha).
Amostra real de 2026-10-01 a 09: `CPU_USAGE` ≈ 91 e `MEMORY_USAGE_GB` ≈ 2589 num ambiente, compatíveis com vCPU-minuto e GB-minuto. A unidade é confirmada no T0.2.

### 2.3 Preços (fonte: docs.railway.com, consultados em 2026-10-09; reconferir no T0.2)

| Medida | Preço | Por minuto |
|---|---|---|
| CPU | US$ 20 / vCPU-mês | ≈ US$ 0,000463 / vCPU-min |
| Memória | US$ 10 / GB-mês | ≈ US$ 0,000231 / GB-min |
| Egress | US$ 0,05 / GB | — |
| Volume | US$ 0,15 / GB-mês | ≈ US$ 0,00000347 / GB-min |

### 2.4 Variáveis de ambiente (`infra/config/environment.ts`)

| Variável | Schema | Observação |
|---|---|---|
| `RAILWAY_API_TOKEN` | `z.string().default('')` | vazio desliga o módulo; **só em produção** |
| `RAILWAY_WORKSPACE_ID` | `z.string().default('')` | obrigatória via `superRefine` quando há token |
| `RAILWAY_MANAGED_ENVIRONMENT_PATTERN` | `z.string().default('staging')` | regex; validar que compila |
| `RAILWAY_DATABASE_WAIT_SECONDS` | `z.coerce.number().int().min(10).max(600).default(120)` | teto da espera dos bancos |
| `RAILWAY_ENVIRONMENT_ID` | `z.string().default('')` | injetada pelo próprio Railway; usada para a autoproteção. **`superRefine`: obrigatória (não vazia) quando há `RAILWAY_API_TOKEN`** — sem ela a API não se reconheceria e a autoproteção sumiria sem erro; o boot falha |

### 2.5 Banco (Drizzle, `infra/database/schema/infra.schema.ts`)

- `infra_environment_schedules`
  - Colunas: `id` uuid PK, `railway_project_id` varchar, `railway_environment_id` varchar UNIQUE, `active_weekdays` smallint[] (0 = domingo), `power_on_time` varchar(5) `HH:mm`, `power_off_time` varchar(5), `timezone` varchar default `America/Sao_Paulo`, `is_enabled` boolean, `keep_on_until` timestamptz null, `last_evaluated_at` timestamptz null, `last_power_off_at`, `last_power_on_at`, `updated_by_agent_id` uuid null, `created_at`, `updated_at`.
- `infra_power_operations`
  - Colunas: `id` uuid PK, `railway_project_id`, `railway_environment_id`, `kind` varchar (`power_off|power_on`), `status` varchar (`running|succeeded|partially_failed|failed`), `trigger` varchar (`manual|schedule`), `actor_agent_id` uuid null, `service_results` jsonb (`[{ serviceName, outcome, errorCode? }]`), `started_at`, `finished_at`.
- Sem ENUM nativo. Migration aditiva via `bun run db:generate`, no formato atual do drizzle-kit do repo.

A trava "uma operação por ambiente" usa `SET NX` no Redis, com TTL de 15 min e chave `infra:operation-lock:<environmentId>`. O registro em `infra_power_operations` é o que o painel consulta.

### 2.6 Rotas (`/v1/panel/infra`, todas `AUTH_REQUIREMENT.ADMIN`)

| Método | Caminho | Resposta |
|---|---|---|
| GET | `/v1/panel/infra/environments` | `{ data: { access: 'ok' \| 'token_invalid' \| 'billing_unavailable', projects: [{ projectId, projectName, environments: [{ environmentId, environmentName, classification, state, services: [{ serviceName, isDatabase, status }], schedule? , runningOperationId? }] }] }` |
| POST | `/v1/panel/infra/environments/:environmentId/power-off` | 202 `{ data: { operationId } }` |
| POST | `/v1/panel/infra/environments/:environmentId/power-on` | body `{ keepOnUntil? }` (obrigatório fora da janela de uma agenda ativa; ≤ 24 h) → 202 `{ data: { operationId } }` |
| GET | `/v1/panel/infra/operations/:operationId` | `{ data: { status, serviceResults, startedAt, finishedAt } }` |
| PUT | `/v1/panel/infra/environments/:environmentId/schedule` | body `{ activeWeekdays, powerOnTime, powerOffTime, isEnabled }` → `{ data: { ...schedule, nextScheduledAction } }` |
| GET | `/v1/panel/infra/costs` (campos reais além dos abaixo: `windowSource`, `officialTotal`, `divergencePercent`, `isDivergent`, `projectionMethod`, `pricingSource`, `isStale`; serviço em `environments[].services[]` usa `powerState` = running\|stopped\|no_deployment\|transitioning, não `status`) | `{ data: { periodStart, periodEnd, currency: 'USD', totalCost, projectedTotal, projects: [{ projectId, projectName, cost, projected, environments: [{ environmentName, isProduction, cost, byMeasurement }] }], pricingCheckedAt } }` |

- **Rate limit:** escrita usa `RATE_LIMIT.PANEL_WRITE`. As rotas de power usam um preset mais duro, criado se ainda não existir.
- **Códigos de erro:** novo grupo `infra` em `shared/errors/codes.ts`.

### 2.7 Auditoria

- **Ações e alvo:** `AUDIT_ACTION` ganha `INFRA_ENVIRONMENT_POWERED_OFF`, `INFRA_ENVIRONMENT_POWERED_ON` e `INFRA_SCHEDULE_CHANGED`; `AUDIT_TARGET` ganha `INFRA_ENVIRONMENT`.
- **Alvo do registro:** os ids do Railway são UUIDs, então vão em `targetId`. Nomes de projeto e ambiente, `operationId`, `trigger` e a contagem de resultados vão em `metadata`.
- **Ator:** `ACTOR_TYPE.AGENT` em ação manual e `ACTOR_TYPE.SYSTEM` na agenda. Se `SYSTEM` não existir, adicionar.

### 2.8 Agenda

- O `infraSchedules.ts` entra em `startScheduler({ tasks })` ao lado de `catalogModule.schedules`, no `index.ts`, com `cronExpression` `* * * * *` (tick de 1 min).
- **Modelo: janela + transição.** Em cada tick, `resolveScheduleAction` calcula se `now` está dentro da janela (dia em `activeWeekdays` e `powerOnTime ≤ hora < powerOffTime`, no fuso da agenda) e se houve **transição** desde `last_evaluated_at`:
  - entrou na janela → `power_on`;
  - saiu da janela → `power_off`, a não ser que `keep_on_until > now`;
  - `keep_on_until` venceu fora da janela → `power_off` e limpa o campo;
  - sem transição → `none`. É isso que impede a agenda de desfazer uma ação manual no meio da janela.
- Depois de avaliar, grava `last_evaluated_at = now`. Se a API ficou fora do ar e perdeu uma transição, o primeiro tick depois da volta detecta a mudança de lado da janela e age uma vez só.
- **Guarda:** não age se o ambiente já estiver no estado-alvo, ou se houver operação rodando (a trava Redis do §2.5); nesse caso tenta no próximo tick.
- **`keepOnUntil`:** o `power-on` manual fora da janela de agenda ativa exige o campo (400 `INFRA_KEEP_ON_UNTIL_REQUIRED`), e acima de 24 h dá 400. O `power-off` manual limpa o campo.
- **`nextScheduledAction`:** próxima transição a partir de `now` (varrendo até 8 dias), considerando `keep_on_until`. Volta em `GET environments` e no `PUT schedule`.
- **Fuso:** `America/Sao_Paulo`, com conversão por `Intl.DateTimeFormat` e sem lib nova. Janela que cruza a meia-noite é recusada na v1.

## 3. Frontend — `apps/frontend-panel/src/modules/infra/`

| Arquivo | Papel |
|---|---|
| `infra.api.ts` | chamadas via `panelRequest`; caminhos em `PANEL_PATH` |
| `infra.hook.ts` | react-query: `useInfraEnvironments` (refetch 15 s enquanto houver operação rodando), `usePowerEnvironment`, `useInfraCosts`, `useSaveEnvironmentSchedule` |
| `InfraEnvironments.page.tsx` | lista por projeto; card por ambiente com estado, serviços, próxima ação agendada ("desliga hoje às 20:00"), botão Ligar/Desligar (só gerenciável), modal de confirmação que exige digitar o nome do ambiente para desligar, e "manter ligado até" (+1 h / +2 h / +4 h / fim do dia) ao ligar fora da janela |
| `components/ScheduleEditor.component.tsx` | dias da semana (chips), hora de ligar e de desligar, preset "horário comercial" (seg–sex 08:00–20:00), interruptor ativa/pausa |
| `InfraCosts.page.tsx` | total do mês + projeção; tabela por projeto com staging × produção; quebra por recurso; nota "preços conferidos em <data>" |
| `components/*.component.tsx` | `EnvironmentCard`, `PowerConfirmDialog`, `ScheduleEditor`, `CostTable` |
| `infra.locale.json` | textos pt-BR |
| `types/infra.types.ts` | tipos de resposta |

Navegação:
1. Novo grupo `PANEL_GROUP.INFRA` com as seções `PANEL_SECTION.INFRA_ENVIRONMENTS` (`'ambientes'`) e `PANEL_SECTION.INFRA_COSTS` (`'custos'`), ambas `requiresAdmin: true`.
2. Cada seção ganha um `case` no `PanelSectionView`.
3. Os rótulos vão no `shared.locale.json`.

Gráfico de custos: segue a skill `dataviz` (barras empilhadas staging × produção por projeto). Sem lib nova, se der para fazer com Tailwind/SVG; se precisar de lib, justificar conforme o §13 das regras.

## 4. Testes

- **Unidade (bun test, colocados)**
  - `classifyEnvironment` cobre produção, autoproteção, padrão e ambiente não gerenciado.
  - `orderServicesForPower`: ordem de `off` e de `on`.
  - `calculateUsageCost`: números conhecidos.
  - `RailwayGateway` com `fetch` falso: sucesso, `errors` do GraphQL, 429 e resposta fora do schema.
- **Use cases com gateway falso**
  - O ambiente protegido nunca chama mutação.
  - A trava dá 409.
  - A falha parcial vira `partially_failed`.
  - A auditoria é chamada com o ator certo.
- **Rotas (`apps/api-ada/tests/infra/`)**
  - Não-admin recebe 403.
  - Sem token, 503.
  - 202 com `operationId`.
- **Agenda (`resolveScheduleAction`, tabela de casos):**
  - entrar e sair da janela;
  - dia fora de `activeWeekdays`;
  - ação manual no meio da janela não é desfeita;
  - `keepOnUntil` adia o desligamento e vence;
  - API fora do ar por 3 h atravessando a transição age uma vez só;
  - agenda pausada;
  - `nextScheduledAction` numa sexta à noite aponta para segunda 08:00.
- **Painel:** teste de `infra.api.ts` no padrão de `panelHttpClient.test.ts`.
- **E2E:** não há E2E no repo. A validação real é o roteiro manual do T5.3, contra `cbni-staging`.

## 5. Riscos

| Risco | Mitigação |
|---|---|
| Token de workspace tem poder amplo (inclusive apagar projetos) | só documentos fixos; só em produção da API; rotação documentada em `docs/SECURITY.md`; achado registrado lá |
| Mecanismo de desligar não religa igual (ex.: `deploymentRemove` perde a imagem e força build) | spike T0.1 mede antes de codar; `on` cai para `serviceInstanceRedeploy` |
| Banco desligado corrompe ou demora a subir | ordem fixa; espera com teto; volumes não são tocados |
| Desligar o ambiente que hospeda o próprio painel | autoproteção por `RAILWAY_ENVIRONMENT_ID` (RF3) |
| Staging com webhook do WhatsApp (ex.: `cbni-staging`) desligado perde mensagem | a Meta reentrega por até 7 dias com frequência decrescente a qualquer resposta não-200, então, dentro desses 7 dias, nada se perde; ao religar chega uma rajada de mensagens atrasadas (o bot pode responder a conversa velha) e a WABA tem 3 apps assinados, então a reentrega vai a todos. Mitigação: desligar só fora do horário de uso, religar com bancos primeiro, e o webhook responder 500 (nunca 200) quando Redis/Postgres estiverem fora — o `Webhook.controller` do financiamento já faz isso |
| Dedup do webhook falha após religar | o `ReceiveWhatsAppWebhook` guarda o nonce (`x-request-id`, ou `Date.now()` se o header faltar) no Redis por 300 s; reentrega fora desses 5 min, ou com o Redis zerado, não é barrada. O fallback `Date.now()` gera um nonce novo a cada requisição e **não deduplica nada**. Verificar se a Meta envia `x-request-id`; se não, o dedup só vale por `waMessageId` (o `LogMessage` já evita registro duplicado, mas não está confirmado se a resposta do bot depende disso) — correção no repo do financiamento, fora desta spec |
| API com 2+ réplicas dispara a agenda N vezes | `last_evaluated_at` + trava Redis; nota no `ai-context.md` |
| Agenda derruba staging no meio de um teste | modelo por transição (não reaplica no meio da janela) + `keepOnUntil` obrigatório fora da janela |
| Token sem permissão para ler cobrança (`customer`) ou revogado | `verifyAccess()` distingue os dois; custo sem o total oficial quando só a cobrança falha; `scripts/railway-token-check.ts` valida o token antes de configurá-lo (T0.4) |
| Unidade de `usage` errada → custo errado | T0.2 conferiu: +1,2% contra `customer.currentUsage`. A tela mostra os dois totais; divergência > 5% vira aviso |
