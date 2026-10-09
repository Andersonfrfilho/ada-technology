# Tasks — Spec 001 Infra Railway

Leia `spec.md` e `plan.md` antes. Uma task por vez, na ordem. Cada task fecha com:
`bun run typecheck` (ou `make validate`) + testes do app tocado + commit isolado + linha em `evidence.md`.

Branch: `feat/infra-railway`, a partir de `main` atualizada. Use worktree se o checkout principal estiver
com trabalho de outra sessão.

| Fase | Modelo | Tasks 🧠 |
|---|---|---|
| 0 — Spike e decisão | `opus` (T0.2, T0.4 → `sonnet`) | T0.1, T0.3 |
| 1 — Fundação da API | `sonnet` (T1.1, T1.2 → `haiku`) | — |
| 2 — Ligar/desligar | `sonnet` | — |
| 3 — Custos | `sonnet` (T3.1 → `haiku`) | — |
| 4 — Agenda | `sonnet` | — |
| 5 — Painel | `sonnet` (T5.4 → `haiku`) | — |
| 6 — Documentação e auditoria final | `haiku` (T6.3 → `sonnet`) | — |

---

## Fase 0 — Spike e decisão
> 🤖 Modelo: `opus` (T0.2 → `sonnet`)

- [x] **T0.1 🧠 Spike do mecanismo de desligar.** _(feito em 2026-10-09; resultado em `evidence.md`)_ Em **um** serviço de aplicação de `cbni-staging`,
  e depois no Postgres do mesmo ambiente, testar `deploymentStop`, `deploymentRemove` e
  `serviceInstanceUpdate(numReplicas: 0)`. Para cada um, registrar:
  - se a cobrança de CPU e memória para;
  - como religa (`serviceInstanceRedeploy`, `deploymentRedeploy` ou `numReplicas: 1`), e se religa sem build nova;
  - quanto tempo leva para voltar a `SUCCESS`;
  - qual campo da query de estado mostra "desligado".
  - Confirmar também o shape real da query de estado do plan §2.2, e como distinguir banco de aplicação (nome × `source.image`).
  - Conferir também, depois de religar: o domínio público do serviço continua o mesmo e responde, e o `GET` de verificação do webhook (`hub.challenge`) volta a passar.
  - **Parar e pedir confirmação ao usuário antes de mexer em qualquer serviço.**
  - **Alvo do teste:** serviços sem webhook do WhatsApp (`worker-uploads` e `Redis`). Não desligar `financing-backend` nem mandar mensagem real de WhatsApp sem nova autorização.
  - Aceite: tabela no `evidence.md`, com a conclusão sobre o domínio e o webhook.
- [x] **T0.2 Unidade e preço do `usage`.** _(feito em 2026-10-09: +1,2% contra `customer.currentUsage`; ver `evidence.md`)_
  - Rodar a query `usage` do mês corrente para o workspace.
  - Converter com os preços do plan §2.3 e comparar com o painel de uso do Railway (pedir o número ao usuário se a CLI não expuser).
  - Aceite: diferença ≤ 5% registrada no `evidence.md`; se não bater, corrigir a tabela de preço/unidade no plan antes da Fase 3.
- [x] **T0.3 🧠 ADR `docs/adr/0004-infra-railway-no-painel.md`.**
  - Registrar D1–D6 da spec, com o resultado do T0.1 fechando a D2, e o risco do token de workspace.
  - Aceite: ADR no formato dos ADRs 0001–0003; plan §2.2 atualizado com a mutação escolhida.

- [x] **T0.4 Verificar o token de workspace por HTTP.** _(feito em 2026-10-09: todos os itens PASS; ver `evidence.md`)_
  - Criar um token de **workspace** no Railway (Workspace settings → Tokens) e rodar `scripts/railway-token-check.ts` com ele, num terminal seu: o script só lê, nunca imprime o token e cobre workspace, projetos/ambientes, ciclo de cobrança + `currentUsage`, `usage` e estado de um ambiente.
  - Se `billing` falhar, o token de workspace não lê cobrança: registrar e decidir entre token de conta ou custo sem total oficial (D7).
  - Aceite: saída do script (sem token) colada no `evidence.md`; a permissão de parar/religar deployment fica para a T6.3.

## Fase 1 — Fundação da API
> 🤖 Modelo: `sonnet` (T1.1 e T1.2 → `haiku`)

- [x] **T1.1 Variáveis de ambiente.**
  - Adicionar as cinco variáveis do plan §2.4 em `infra/config/environment.ts`.
  - Regras de `superRefine`: workspace e `RAILWAY_ENVIRONMENT_ID` obrigatórios quando há token; o padrão precisa compilar como regex.
  - Valores vazios em `envs/env.dev` e `envs/env.test`.
  - Aceite: `typecheck` e testes do `environment` cobrindo token sem workspace, token sem `RAILWAY_ENVIRONMENT_ID` e regex inválida.
- [x] **T1.2 Códigos de erro e constantes.**
  - Grupo `infra` em `shared/errors/codes.ts`.
  - `infra.error.ts` com todas as classes do plan §2.1 (nove, incluindo `InfraOperationNotFoundError`, `InfraKeepOnUntilRequiredError` e `InfraInvalidScheduleError`).
  - `infra.constant.ts`.
  - `AUDIT_ACTION`/`AUDIT_TARGET` (e `ACTOR_TYPE.SYSTEM`, se faltar).
  - Aceite: `typecheck`.
- [x] **T1.3 `RailwayGateway` + schemas zod + interface.**
  - Documentos fixos do plan §2.2.
  - Sem log do token.
  - 429 vira `RailwayRateLimitedError`; `errors` do GraphQL e resposta inválida viram `RailwayRequestFailedError`.
  - `fetch` direto para `https://backboard.railway.com/graphql/v2` (nunca CLI); `errors` no corpo conta como falha mesmo com HTTP 200; `verifyAccess()` conforme D7.
  - Aceite: testes com `fetch` falso cobrindo os quatro caminhos, o erro com HTTP 200 e os três resultados de `verifyAccess()`.
- [x] **T1.4 Funções puras.**
  - `classifyEnvironment`, `orderServicesForPower` (banco por `source.image`, nome só como reforço; testar serviço renomeado com imagem de banco), com TDD.
  - Aceite: testes de produção, autoproteção, padrão, não gerenciado e ordem off/on.
- [x] **T1.5 Container.**
  - Instanciar o gateway só com token.
  - Registrar os use cases (stubs não; só os que existirem ao fim de cada task).
  - Aceite: a API sobe sem `RAILWAY_API_TOKEN` (teste do boot ou do container).

## Fase 2 — Ligar/desligar
> 🤖 Modelo: `sonnet`

- [x] **T2.1 Schema Drizzle + migration.**
  - Tabelas `infra_environment_schedules` e `infra_power_operations` (plan §2.5), via `bun run db:generate`.
  - Aceite: `db:migrate` local aplica; migration só aditiva.
  - **Parar e perguntar** se o gerador produzir `DROP` ou alteração em tabela existente.
- [x] **T2.2 `listInfraEnvironments.use-case.ts`.**
  - Estado, classificação, agenda e operação em andamento; cache Redis de 30 s.
  - Aceite: testes com gateway falso.
- [x] **T2.3 `runPowerOperation` + `powerOffEnvironment` + `powerOnEnvironment`.**
  - Trava Redis, registro da operação, execução em segundo plano, espera dos bancos com teto e resultado por serviço.
  - Auditoria e invalidação do cache.
  - "Pronto" = `deploymentStopped` falso e instância `RUNNING`; trava com TTL renovado; no boot, operações `running` antigas viram `failed` (interrompida).
  - Aceite: testes de protegido (zero mutações), trava (409), falha parcial, ator na auditoria, deployment `SUCCESS` com `deploymentStopped=true` (não conta como pronto) e operação interrompida.
- [x] **T2.4 Rotas.**
  - `GET environments`, `POST power-off|power-on`, `GET operations/:id` em `infra.controller.ts`.
  - Registrar em `index.ts`; preset de rate limit mais duro.
  - Aceite: testes de rota (403 não-admin, 503 sem token, 202).

## Fase 3 — Custos
> 🤖 Modelo: `sonnet` (T3.1 → `haiku`)

- [x] **T3.1 `railwayPricing.constant.ts` + `calculateUsageCost`.**
  - Preços e unidades confirmados no T0.2, com fonte e data.
  - Aceite: teste com números do T0.2.
- [x] **T3.2 `getInfraCosts.use-case.ts` + `GET /costs`.**
  - `billingPeriod` do workspace define a janela; `usage` agrupado por projeto e ambiente com `endDate` = fim do ciclo; `estimatedUsage` para a projeção; total oficial `customer.currentUsage` para reconciliar; cache de 15 min; `isProduction` por ambiente.
  - Aceite: testes com gateway falso e de rota.

## Fase 4 — Agenda
> 🤖 Modelo: `sonnet`

- [x] **T4.1 `resolveScheduleAction` (função pura, TDD).**
  - Janela por dia da semana + `HH:mm` no fuso `America/Sao_Paulo`.
  - Detecção de transição via `lastEvaluatedAt`, `keepOnUntil` e `nextScheduledAction` (plan §2.8).
  - Aceite: todos os casos da tabela de testes do plan §4 "Agenda".
- [x] **T4.2 `saveEnvironmentSchedule` / `listEnvironmentSchedules` + `PUT schedule`.**
  - Valida dias, horas e `powerOnTime < powerOffTime` (400 `INFRA_INVALID_SCHEDULE`).
  - Recusa ambiente protegido; devolve `nextScheduledAction`; auditoria `INFRA_SCHEDULE_CHANGED`.
  - Aceite: testes de use case e de rota.
- [x] **T4.3 `keepOnUntil` no `power-on`/`power-off`.**
  - `power-on` fora da janela de agenda ativa exige `keepOnUntil` ≤ 24 h (400 `INFRA_KEEP_ON_UNTIL_REQUIRED`).
  - `power-off` limpa o campo.
  - Aceite: testes de rota.
- [x] **T4.4 `infraSchedules.ts` no `startScheduler`.**
  - Tick de 1 min chamando `resolveScheduleAction`; executa com `trigger: schedule` e ator system.
  - Grava `last_evaluated_at`; adia se houver operação rodando.
  - Aceite: teste da task com relógio controlado (entra, sai, `keepOnUntil` vence, sem disparo duplicado).

## Fase 5 — Painel
> 🤖 Modelo: `sonnet` (T5.4 → `haiku`)

- [x] **T5.1 Navegação + API client.**
  - `PANEL_GROUP.INFRA`, seções `ambientes` e `custos` com `requiresAdmin`, `case` no `PanelSectionView`, `PANEL_PATH`.
  - `infra.api.ts`, `infra.hook.ts`.
  - Aceite: `typecheck` e teste do `infra.api.ts`.
- [x] **T5.2 `InfraEnvironments.page.tsx`.**
  - Cards por ambiente; confirmação que exige digitar o nome para desligar.
  - Polling enquanto há operação rodando.
  - `ScheduleEditor`: chips de dia, horários, preset "horário comercial", interruptor de pausa.
  - Próxima ação agendada no card.
  - Seletor "manter ligado até" ao ligar fora da janela.
  - Ambiente protegido sem botões; estado "módulo não configurado" para o 503.
  - Aceite: `typecheck`; verificação no browser por `read_page` (sem screenshot intermediário).
- [x] **T5.3 `InfraCosts.page.tsx`.**
  - Total, projeção, tabela por projeto (staging × produção), quebra por recurso e data dos preços.
  - Seguir a skill `dataviz` no gráfico.
  - Aceite: `typecheck`; verificação no browser.
- [x] **T5.4 Locale.**
  - `infra.locale.json` e rótulos no `shared.locale.json`, sem texto solto no TSX.
  - Aceite: grep sem string pt-BR literal nos `.tsx` do módulo.

## Fase 6 — Documentação e auditoria final
> 🤖 Modelo: `haiku` (T6.3 → `sonnet`)

- [x] **T6.1 `ai-context.md`.**
  - Rotas em "## Rotas HTTP" e regras não óbvias (autoproteção, produção bloqueada, trava, agenda em réplica única).
  - Telas em "## Painel" e variáveis em "## Deploy".
- [x] **T6.2 Documentos de deploy e segurança.**
  - `docs/deploy-railway.md`: como criar o token de workspace e onde colocá-lo (só em produção, só na `api`).
  - `docs/SECURITY.md`: achado datado do token de workspace e procedimento de rotação.
- [ ] **T6.3 Auditoria final (§15 das regras + `security.md`) e roteiro manual.**
  - Auditoria: N+1 nas chamadas ao Railway, `Promise.all` versus `allSettled` no executor (falha de um serviço não pode derrubar os outros), log sem token nem PII, 500 sem stack.
  - Roteiro manual contra `cbni-staging`: desligar → conferir no Railway → religar → bot responde.
    Depois, agenda com janela curta (ex.: hoje, agora+5 min até agora+15 min) → liga e desliga sozinha → apagar a agenda de teste.
  - O roteiro exige a feature rodando com `RAILWAY_API_TOKEN` na `api-ada` de produção (D1: o token só existe lá). Configurar o token e fazer o deploy pedem confirmação; sem isso, o roteiro fica registrado como pendente. Alternativa só com autorização expressa: token temporário local, revogado ao fim e anotado no `docs/SECURITY.md`.
  - Verificar também: o deployment parado deixa de cobrar (comparar `MEMORY_USAGE_GB` numa janela desligada) e, se houver Postgres no alvo, confirmar backup do volume antes.
  - **Parar e pedir confirmação antes de executar o roteiro**, porque mexe em infra real.
  - Aceite: critérios 1–7 da spec marcados no `evidence.md`.

---

## Fase 7 — Correções da revisão independente (2026-10-09)
> 🤖 Modelo: `sonnet` (revisores: `code-reviewer` e `security-reviewer`, ambos `sonnet`, em passada separada da escrita; veredito dos dois: aprovar com ressalvas, 0 bloqueantes)

Cada achado foi conferido no código antes de entrar aqui. **Corrigir (R1–R3):**

- [x] **R1 Lote A — operações e trava.**
  - Trava Redis com **dono** (valor aleatório por operação) e liberar/renovar só se for o dono (script Lua compare-and-delete / compare-and-expire), com teste contra Redis real (achados de segurança 3 e de código 8).
  - Operação `running` presa: `findRunningByEnvironmentId` ignora operações mais velhas que o TTL da trava e a recuperação roda **a cada tick do scheduler**, não só no boot (código 1, alto).
  - Auditoria: gravar `infra.environment_power_requested` ao aceitar (antes do 202), `infra.environment_power_denied` quando a ação é recusada (ambiente protegido/inexistente/ocupado/keepOnUntil) e `infra.operation_interrupted` na recuperação (segurança 1; código 14).
  - `listRunning()` no repositório para tirar o N+1 da listagem (código 7).
- [ ] **R2 Lote B — gateway, custos e configuração.**
  - Gateway lê `Retry-After`/`X-RateLimit-*` e não chama o Railway até o fim da espera (código 2, alto).
  - Custos: não repetir em 429 (código 3); resultado `calendar_month` por falha transitória não vai para o cache longo nem para o `last-good` (código 4).
  - `verifyAccess`: falha transitória não fica 5 min como `token_invalid` (segurança 9).
  - `JSON.parse` de cache com `safeParse`/zod e erro tratado como miss (segurança 7; código 13); `activeWeekdays` com `.max(7)` (segurança 8).
  - Desligar/religar mira o deployment **ativo**, não o último (código 10); banco por igualdade de nome de imagem, não `startsWith` (código 11).
  - `RAILWAY_API_TOKEN` só aceito com `ENV=production` (segurança 5).
- [ ] **R3 Lote C — agenda, rotas e painel.**
  - `findNextTransition` com `keepOnUntil` quando a janela abre antes do vencimento (código 5), com teste que a simulação de uma semana não cobria.
  - O servidor passa a informar `requiresKeepOnUntil` na listagem e o painel deixa de deduzir isso do tipo da próxima ação (código 6).
  - O scheduler só lê o inventário quando alguma agenda tem ação a executar (código 9).
  - Rate limit de power também **por agente**, dentro do handler (segurança 2).

**Aceitos sem mudança (registrados no ADR):** classificação por nome sem revalidar durante a operação (segurança 4); retry de agenda sem teto (segurança 6, mitigado em parte por R3); `GET operations` aceita qualquer UUID de qualquer admin, sistema de um workspace só (segurança 10); `X-Forwarded-For` é comportamento anterior do roteador (segurança 2, parte do IP); falha de auditoria só logada, a operação grava o resultado (código 14); falha ao parar app não impede parar o banco (código 15, RF7); janela alterada não gera transição retroativa (código 12, RF8a).

---

## Prompt de execução

```text
/oh-my-claudecode:autopilot Execute a spec specs/001-infra-railway/ no repo
~/Documents/personal/ada-technology: portal Infra no painel da Ada (liga/desliga de staging de todos
os projetos do workspace Railway, agenda automática por janela de funcionamento com "manter ligado
até", e painel de custos por projeto/ambiente). Leia spec.md, plan.md e tasks.md inteiros antes de
tocar em código, e o ai-context.md da raiz para as convenções do repo.

Preparação: crie a branch feat/infra-railway a partir de main atualizada, num worktree, porque o
checkout principal tem trabalho de outra sessão (feat/branded-email-template) que não pode ser tocado.
Commite primeiro specs/001-infra-railway/ nessa branch e crie specs/001-infra-railway/evidence.md.

Execução: uma task por vez, na ordem do tasks.md (Fases 0→6), marcando [x] ao fechar.
Modelos: Fase 0 → opus (T0.2 → executor model=sonnet) · Fase 1 → executor model=sonnet
(T1.1, T1.2 → haiku) · Fase 2 → executor model=sonnet · Fase 3 → executor model=sonnet (T3.1 → haiku) ·
Fase 4 (agenda: T4.1–T4.4) → executor model=sonnet · Fase 5 → executor model=sonnet (T5.4 → haiku) ·
Fase 6 → executor model=haiku (T6.3 → sonnet) · revisão final → code-reviewer model=sonnet e
security-reviewer model=sonnet, em passada separada da escrita.
T0.1 e T0.3 são 🧠: rodar em opus. O resultado do T0.1 fecha a decisão D2 (mecanismo de desligar) e
atualiza o plan §2.2 antes de começar a Fase 1; o T0.2 confirma unidade/preço do usage antes da Fase 3.
Escalada: gate falhou 2x → sobe um nível (haiku→sonnet→opus) e registra em evidence.md.

Gates de cada task: bun run typecheck (ou make validate) + testes do app tocado + commit isolado
(mensagem em pt-BR, prefixo feat(api)/feat(panel)/docs) + linha em evidence.md com o comando e o resultado.
Proibido fechar task com test.skip/.only, TODO ou stub.
Regras do repo que não se negociam: use case sem try/catch, erro por classe de domínio com código em
shared/errors/codes.ts, sem ENUM nativo, cabeçalho de copyright em todo arquivo-fonte, textos do painel
só nos *.locale.json, token do Railway nunca em log.

Pare e pergunte antes de: qualquer ação real no Railway (spike T0.1, roteiro manual do T6.3, inclusive o
teste da agenda), migration que não seja só aditiva, configurar RAILWAY_API_TOKEN em qualquer ambiente,
deploy, push e abrir PR.
Nunca desligue ambiente de produção nem o ambiente onde a api-ada roda — nem em teste.
Ao terminar (ou ao parar por bloqueio), cancele o modo autopilot e entregue: tasks fechadas, decisões
tomadas no T0.1/T0.2, pendências e o checklist dos critérios 1–7 da spec.
```
