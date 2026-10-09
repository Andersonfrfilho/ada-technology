# Evidência — Spec 001 Infra Railway

Uma linha por task: comando, resultado, commit. Escaladas de modelo também entram aqui.

| Task | Comando | Resultado | Commit |
|---|---|---|---|
| Preparação | `git worktree add -b feat/infra-railway ../ada-technology-wt/infra-railway origin/main` + `make validate` | base verde: 225 testes da API e 13 do painel passam | a0b4930 |
| T0.1 | spike em `cbni-staging` (abaixo) | mecanismo decidido: D2 = `deploymentStop` / `deploymentRestart` | — |

## T0.1 — Spike do mecanismo de desligar (2026-10-09, `cbni-staging`)

Alvos: `worker-uploads` (app, build do repositório) e `Redis` (banco, imagem `redis:8.2.9`).
`financing-backend` e Postgres não foram tocados; nenhuma mensagem de WhatsApp foi enviada.
Antes de cada mutação foi conferido que o deployment pertence ao ambiente `cbni-staging`.

| Mecanismo | Desligar | Religar | Tempo para voltar a `RUNNING` | Observações |
|---|---|---|---|---|
| **A** `deploymentStop(id)` + `deploymentRestart(id)` | OK nos dois alvos; instância vai a `EXITED` em < 7 s | OK; **mesmo deployment**, sem build | ≤ 7 s (app e Redis) | O status do deployment **continua `SUCCESS`** e ele continua em `activeDeployments`; o único sinal é `deploymentStopped=true` + instância `EXITED` |
| **B** `serviceInstanceUpdate(numReplicas: 0)` | **recusado**: `BAD_USER_INPUT — Error in numReplicas - Invalid input`; nada mudou | — | — | `numReplicas` é `null` em todos os serviços. Os `stg-toggle.yml` dos repos `fin-bot-*` usam exatamente esta mutação e **não funcionam**; eles só imprimem aviso e terminam com "desligado com sucesso" |
| **C** `deploymentRemove(id)` (= `railway down`) + `serviceInstanceRedeploy` | OK no Redis; `latestDeployment` e `activeDeployments` ficam vazios | OK; **novo deployment** (id muda) | ~19 s no Redis (imagem). App com build do repositório não foi religado por este caminho: exige build | É o que `railway-environment-power.sh` usa |

Conferências após religar tudo:
- os 6 serviços de `cbni-staging` em `SUCCESS` / `RUNNING`;
- domínio do backend inalterado (`financing-backend-cbni-staging.up.railway.app`), `GET /health` → 200;
- `numReplicas` continua `null` (nenhuma configuração foi alterada).

Formato da consulta de estado (campos confirmados): `serviceInstances { serviceId serviceName source { image repo } latestDeployment { id status deploymentStopped instances { status } } activeDeployments { id status } }`.
Banco × aplicação: dá para distinguir por `source.image` (`postgres-ssl`, `redis`), sem depender só do nome.

## T0.2 — Unidade e preço do `usage` (2026-10-09) — ✅ conferido: diferença de 1,2%

`usage(workspaceId, 2026-10-01 → 2026-10-31, [CPU_USAGE, MEMORY_USAGE_GB, NETWORK_TX_GB, DISK_USAGE_GB], groupBy [PROJECT_ID, ENVIRONMENT_ID])`.
Unidades: `CPU_USAGE` em vCPU-minuto, `MEMORY_USAGE_GB` e `DISK_USAGE_GB` em GB-minuto, `NETWORK_TX_GB` em GB.
Preços aplicados: CPU US$ 20/vCPU-mês, memória US$ 10/GB-mês, disco US$ 0,15/GB-mês (mês = 43 200 min), rede US$ 0,05/GB.

| Projeto / ambiente | US$ (1–9/out) | CPU | Memória | Rede | Disco |
|---|---|---|---|---|---|
| transportada / production | 20,01 | 0,31 | 19,54 | 0,13 | 0,04 |
| transportada / staging | 19,58 | 0,40 | 19,06 | 0,08 | 0,04 |
| financiamento-imobiliario-bot / cbni-production | 2,93 | 0,03 | 2,80 | 0,07 | 0,03 |
| transportada-ops / production | 2,60 | 0,05 | 2,48 | 0,00 | 0,07 |
| financiamento-imobiliario-bot / cbni-staging | 2,45 | 0,03 | 2,39 | 0,00 | 0,04 |
| quickcart / staging | 1,31 | 0,08 | 1,20 | 0,00 | 0,03 |
| ada-technology / production | 0,85 | 0,07 | 0,74 | 0,00 | 0,04 |
| ada-technology / staging | 0,84 | 0,05 | 0,75 | 0,00 | 0,03 |
| **Total** | **50,57** | | | | |

Leituras:
- **Staging é 48% do total** (US$ 24,18 de 50,57); só `transportada / staging` custa quase o mesmo que a produção dela.
- **Memória é ~95% do custo**; CPU é desprezível. Desligar staging corta praticamente toda a fatura do ambiente.
- `quickcart / production` não aparece (sem uso registrado no período).
- **Conferência (aceite ≤ 5%): passou.** Pelo ciclo de cobrança completo (2026-09-19 14:00 → agora) o cálculo deu **US$ 114,69**; o Railway informa `workspace.customer.currentUsage = 113,28`. Diferença **+1,2%**. Quebra do cálculo: memória 111,32 · CPU 2,22 · disco 0,66 · rede 0,49. No ciclo: transportada/production 44,87 · transportada/staging 44,17 · cbni-production 6,82 · transportada-ops 5,90 · cbni-staging 5,84 · quickcart/staging 3,03 · ada-technology production 2,18 / staging 1,89.
- **O ciclo de cobrança não é o mês-calendário:** `workspace.customer.billingPeriod` = 2026-09-19T14:00:56Z → 2026-10-19T14:00:56Z. O plano do workspace é `HOBBY`. A tela de custos deve usar o ciclo, não o dia 1.
- `workspace(workspaceId) { customer { currentUsage billingPeriod { start end } } }` é o total oficial para reconciliar; a tabela por ambiente vem do `usage`.

Achados para o `RailwayGateway`:
- `usage` com `endDate` igual a "agora" falha com `Problem processing request`; com data futura (ex.: fim do mês) funciona. Usar sempre o último instante do mês.
- `BACKUP_USAGE_GB` só funciona agrupando por `PROJECT_ID`, sem `ENVIRONMENT_ID`; ficar fora da consulta principal (o custo de backup é por projeto).

## T0.4 — Token de workspace por HTTP (2026-10-09) — ✅

`bun scripts/railway-token-check.ts` com um token de **workspace**, rodado pelo usuário no terminal:

| Item | Resultado |
|---|---|
| workspace | PASS — visível |
| projetos e ambientes | PASS — 5 projetos, 4 ambientes de staging |
| ciclo de cobrança e `currentUsage` | PASS — ciclo 2026-09-19 → 2026-10-19, `currentUsage` US$ 113,35 (**o token de workspace lê cobrança**) |
| `usage` por projeto e ambiente | PASS — 96 linhas |
| estado dos serviços de um ambiente | PASS — 5 serviços legíveis (`deploymentStopped`, status da instância, `source.image`) |

Conclusões: D1 confirmada (token de workspace basta para leitura, inclusive `customer`), e a degradação `billing_unavailable` do D7 fica como proteção, não como caminho esperado.
Não verificado: permissão de parar/religar deployment (escrita). Fica para a T6.3.
Incidente: durante a execução o token apareceu na tela do terminal (eco da colagem). Tratado como queimado: revogar o token usado nesta verificação e criar outro só quando for configurar a `api-ada` de produção.

### Decisão D2

- **Desligar:** `deploymentStop(id do deployment ativo)`. **Religar:** `deploymentRestart(id)`. Sem build, ~7 s, mesmo deployment.
- **Estado "desligado" = qualquer um de:** `latestDeployment.deploymentStopped == true`, instância `EXITED`, ou ausência de deployment (ambiente desligado pelo script antigo com `railway down`).
- **Religar por estado:** parado → `deploymentRestart`; sem deployment → `serviceInstanceRedeploy` (pode exigir build para serviço de repositório; o RF5 espera `SUCCESS` com teto).
- **Descartado:** `numReplicas: 0` (o Railway recusa).

### Em aberto (vão para o ADR 0004 e para a Fase 6)

1. **Deployment parado deixa de cobrar?** Não confirmado: as métricas de memória ainda mostravam o valor antigo ~3 min depois do stop (atraso de ingestão), e a documentação só diz que o Railway cobra "enquanto o serviço roda". Verificar na T6.3: comparar `usage` (`MEMORY_USAGE_GB`) de um ambiente durante uma janela desligada.
2. **Postgres não foi testado.** Segue o caminho do Redis; confirmar no roteiro da T6.3, com checagem de backup do volume antes.
3. **Webhook do WhatsApp:** a Meta reenvia por até 7 dias (documentação oficial), mas o dedup do nosso webhook só vale 300 s e depende de `x-request-id`, que não foi confirmado. Ver plan §5.
