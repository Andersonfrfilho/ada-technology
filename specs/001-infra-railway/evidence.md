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

### Decisão D2

- **Desligar:** `deploymentStop(id do deployment ativo)`. **Religar:** `deploymentRestart(id)`. Sem build, ~7 s, mesmo deployment.
- **Estado "desligado" = qualquer um de:** `latestDeployment.deploymentStopped == true`, instância `EXITED`, ou ausência de deployment (ambiente desligado pelo script antigo com `railway down`).
- **Religar por estado:** parado → `deploymentRestart`; sem deployment → `serviceInstanceRedeploy` (pode exigir build para serviço de repositório; o RF5 espera `SUCCESS` com teto).
- **Descartado:** `numReplicas: 0` (o Railway recusa).

### Em aberto (vão para o ADR 0004 e para a Fase 6)

1. **Deployment parado deixa de cobrar?** Não confirmado: as métricas de memória ainda mostravam o valor antigo ~3 min depois do stop (atraso de ingestão), e a documentação só diz que o Railway cobra "enquanto o serviço roda". Verificar na T6.3: comparar `usage` (`MEMORY_USAGE_GB`) de um ambiente durante uma janela desligada.
2. **Postgres não foi testado.** Segue o caminho do Redis; confirmar no roteiro da T6.3, com checagem de backup do volume antes.
3. **Webhook do WhatsApp:** a Meta reenvia por até 7 dias (documentação oficial), mas o dedup do nosso webhook só vale 300 s e depende de `x-request-id`, que não foi confirmado. Ver plan §5.
