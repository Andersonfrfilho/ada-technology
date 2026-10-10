# Tasks — Spec 002 Token no painel (revisadas em 2026-10-09)

Leia `spec.md`, `plan.md` e `docs/adr/0005-token-do-railway-no-painel.md` antes. Uma task por vez, na ordem.
Cada task fecha com `make validate` (ou typecheck + testes do app tocado) + commit isolado + linha em `evidence.md`.
Branch: `feat/infra-token-no-painel`, a partir de `main` atualizada (spec 001 já está em `main`).

| Fase | Modelo | Tasks 🧠 |
|---|---|---|
| 0 — Desenho e ameaças | `opus` | T0.1 ✅ |
| 1 — Cifra, configuração e armazenamento | `sonnet` (T1.4 → `haiku`) | — |
| 2 — Pré-requisitos de segurança | `sonnet` | — |
| 3 — Gateway por provedor e senha | `sonnet` | — |
| 4 — Casos de uso e rotas | `sonnet` | — |
| 5 — Painel | `sonnet` | — |
| 6 — Verificação, docs e revisão | `sonnet` (T6.2 → `haiku`) | — |

**Regra desta feature:** o token **nunca** aparece em resposta, log, erro, auditoria, cache do navegador, fixture,
documentação, commit ou conversa. Todo teste que passa um token usa um **valor-isca** e varre os rastros (incluindo
stdout/stderr do processo real). **Ninguém lê nem usa um token real nesta spec**: a prova com token de verdade é manual
e do usuário (T6.4). Se um arquivo do usuário contiver um token, **pare e avise**.

---

## Fase 0 — Desenho e ameaças
> 🤖 Modelo: `opus`

- [x] **T0.1 🧠 ADR `docs/adr/0005-token-do-railway-no-painel.md`.** Feito em 2026-10-09: revisão de arquitetura
  e modelo de ameaças por `architect` e `security-reviewer` (`opus`, somente leitura) antes de implementar; achados
  conferidos no código e incorporados à spec, ao plano e ao ADR (ver `evidence.md`).

## Fase 1 — Cifra, configuração e armazenamento
> 🤖 Modelo: `sonnet` (T1.4 → `haiku`)

- [x] **T1.1 Cifra (TDD, função pura).** `infraSecretCipher.ts` + `infraSecretKey.ts` (RF4): AES-256-GCM, IV de 12 e tag
  de 16 bytes validados, AAD com `key_id`, `provider` e `workspace_id`, formato `v1.<key_id>.<iv>.<tag>.<dados>`.
  Testes primeiro, **mostre o vermelho**: ida e volta, IV diferente a cada chamada, adulterar 1 byte falha, chave errada
  falha, `key_id`/`provider`/`workspace_id` trocados falham, tag truncada recusada, chave de tamanho errado recusada.
  **Teste de mutação próprio** (IV fixo, tag curta, AAD sem workspace devem quebrar testes). Aceite: testes + `make validate`.
- [x] **T1.2 Variáveis de ambiente.** `INFRA_SECRET_ENCRYPTION_KEY` com as regras do RF4 (base64 de 32 bytes; recusada fora
  de `ENV=production`; diferente de `PANEL_JWT_SECRET`; exige `RAILWAY_WORKSPACE_ID` e `RAILWAY_ENVIRONMENT_ID`). Aceite:
  testes de cada regra e nenhum valor de chave em mensagem de erro.
- [x] **T1.3 Tabela e repositório.** `infra_integration_secrets` (plan §2.2), migration `0005` **só aditiva** (parar e
  perguntar se o gerador produzir `DROP`/`ALTER`), `DrizzleInfraIntegrationRepository` com `SELECT … FOR UPDATE`. Aceite:
  teste temporário contra Postgres 17 **descartável** (migration do zero, `provider` único, `ciphertext` sem a isca,
  adulterar 1 byte e abrir falha, corrida de dois `upsert`), removido ao fim.
- [x] **T1.4 Constantes, erros e auditoria.** Códigos e classes do plan §2.1; `AUDIT_ACTION` das seis ações; metadata
  tipada e fechada. Aceite: typecheck + teste dos erros (status e código).

## Fase 2 — Pré-requisitos de segurança (achados da revisão)
> 🤖 Modelo: `sonnet`

- [x] **T2.1 RF14: CORS e refresh.** Primeiro um **teste de não regressão do widget** (as rotas do widget com a origem do
  widget funcionam, antes de mudar nada). Depois: CORS com credenciais só para `CORS_ALLOWED_ORIGINS`; `POST /auth/refresh`
  recusa `Origin` fora do painel. Conferir na **documentação do Railway** qual cabeçalho do proxy é confiável para o IP;
  só mudar a origem do IP se confirmado, senão registrar como risco. Aceite: testes + API real (origem do widget sem
  credenciais, sem `refresh`; widget intacto; painel intacto).
- [x] **T2.2 Redação e vazamento (RF9 a–c, e).** Redação por substring com allowlist `tokenHint`; metadata de auditoria
  tipada; `exceptionFilter` sem `message` de erro do Drizzle; cliente GraphQL com `#token`. Aceite: testes que provam
  (a) as chaves já usadas nos logs continuam legíveis, (b) `railwayToken`, `newToken`, `currentPassword`, `ciphertext`
  passam a ser redigidas, (c) o erro do Drizzle com a isca nos parâmetros não vaza no ramo 500.

## Fase 3 — Gateway por provedor e senha
> 🤖 Modelo: `sonnet`

- [x] **T3.1 `RailwayGatewayProvider` + `ResolveGateway`.** Fonte única (variável de ambiente > painel > nenhuma), fail
  closed, relê a linha a cada 30 s, remonta só com credencial nova (preserva `Retry-After`), contador de geração,
  não lê a tabela fora de produção, par token+workspace nunca misturado. Aceite: testes de precedência, geração (corrida
  de `invalidate`), cache de 30 s, falha de decifragem sem fallback, fora de produção.
- [x] **T3.2 Trocar `railwayGateway?` por `resolveGateway()`** nos cinco casos de uso e no container (plan §2.4);
  `powerEnvironment` resolve uma vez e passa o gateway ao runner. **Nenhum teste existente pode ser removido, pulado ou
  enfraquecido.** Aceite: `make validate` com totais iguais ou maiores (565 + 68) e **API real** (Postgres + Redis
  descartáveis, sem token) como na spec 001: 503/404/401/`/health/ready` 200.
- [x] **T3.3 Scheduler só em produção (RF12).** `infra-schedules` e a recuperação do boot registrados apenas com
  `ENV=production`; sem token retornam sem chamar o Railway. Aceite: teste + boot real em dev (sem relógio) e produção.
- [x] **T3.4 `probeWorkspace`.** Resultado discriminado e cliente descartável com bloqueio próprio; compara o id do
  workspace; recusa token de conta (`me` responde). Aceite: testes com fetch falso para cada resultado e prova de que
  o bloqueio de rate limit do gateway em uso não é contaminado.
- [x] **T3.5 `verifyAgentPassword`.** `findCredentialsById` no repositório de agente; relê `isActive` e `role`; contador de
  falhas (Redis, 15 min); na 5ª revoga as sessões do agente e bloqueia 15 min. Aceite: certo, errado, papel rebaixado no
  banco com JWT ainda válido, 5ª falha (sessões revogadas, 423), e que a mensagem não revela qual campo falhou.

## Fase 4 — Casos de uso e rotas
> 🤖 Modelo: `sonnet`

- [x] **T4.1 Casos de uso** `get|save|verify|removeInfraIntegration` (plan §1): ordem das checagens; transação com
  `FOR UPDATE`; auditoria tipada; limpeza das quatro chaves Redis e `invalidate()`. Aceite: com fakes, **cada falha antes
  de gravar grava zero**, `configured` × `replaced` correto, token da variável de ambiente não se remove, linha
  ilegível = fail closed.
- [x] **T4.2 Rotas e limites.** `buildInfraIntegrationRoutes` + zod, `Cache-Control: no-store`, limites (5/min `PUT`/`DELETE`
  por agente e IP; 3/min `verify`, cache de 30 s). Aceite: 401/403/503/403 produção/403 senha/423/422/409/429/200 e
  varredura com isca de respostas, logs e `audit_logs`.

## Fase 5 — Painel
> 🤖 Modelo: `sonnet`

- [x] **T5.1 Navegação, API e hook.** Seção `integracao` (admin), 4 chamadas, hook com `gcTime: 0` e `reset()`, locale.
  Aceite: typecheck + testes de caminho/método/corpo e visibilidade.
- [x] **T5.2 Tela de Integração.** Status, formulário (RF13), workspace somente leitura, remover com senha, avisos fixos
  ("não revoga no Railway", "variável de ambiente tem prioridade"). Aceite: **navegador com API simulada** (leitura por
  árvore de acessibilidade e medição, uma captura final): fluxo feliz, cada erro, campo limpo, storage vazio, sem rolagem
  horizontal em 375 px, contraste e alvos de toque; **conferência manual de gerenciador de senhas** (anotar o que o
  usuário precisa testar em Chrome, Safari e Firefox).

## Fase 6 — Verificação, docs e revisão
> 🤖 Modelo: `sonnet` (T6.2 → `haiku`)

- [x] **T6.1 API real ponta a ponta.** Postgres + Redis descartáveis, `ENV=production`, chave de teste, `RAILWAY_WORKSPACE_ID` e
  `RAILWAY_ENVIRONMENT_ID` de teste: `PUT` com **isca** é recusado pelo Railway real e **não grava** (sem escrita no Railway);
  sem chave 503; fora de produção 403; varredura de stdout/stderr, banco e respostas sem a isca.
- [x] **T6.2 Documentação.** ADR 0005 final, `ai-context.md`, `docs/deploy-railway.md` §11 (configurar pelo painel; chave e
  `RAILWAY_WORKSPACE_ID` como pré-requisitos; **corrigir o caminho de criação do token** para `railway.com/account/tokens` com
  o seletor de workspace), `SECURITY.md` (achado datado: token no banco cifrado, rotação e perda da chave, "remover não revoga",
  o que a auditoria não cobre).
- [ ] **T6.3 Revisão independente** (`code-reviewer` e `security-reviewer`, `sonnet`, somente leitura, passada separada da
  escrita) sobre o diff; corrigir o que for real e registrar o aceito no ADR. Auditoria §15 e conformidade de tamanho
  (arquivo ≤ 200, função ≤ 40).
- [ ] **T6.4 Roteiro manual (do usuário).** Depois do deploy: definir `INFRA_SECRET_ENCRYPTION_KEY` e `RAILWAY_WORKSPACE_ID` na
  `api` de produção, gerar o token de workspace em `railway.com/account/tokens`, abrir *Infra › Integração* e salvar. Conferir:
  Ambientes e Custos funcionam sem redeploy; trocar mostra o aviso de revogação; remover volta a 503. **Se o token de workspace
  for recusado como "amplo demais"**, a premissa sobre a query `me` está errada: parar e reportar. O autopilot não recebe nem manipula o token.

---

## Prompt de execução

```text
/oh-my-claudecode:autopilot Execute a spec specs/002-token-no-painel/ no repo
~/Documents/personal/ada-technology (leia spec.md, plan.md e tasks.md inteiros antes de tocar em código, e o
docs/adr/0005-token-do-railway-no-painel.md, o ai-context.md da raiz e o docs/adr/0004-infra-railway-no-painel.md).
Contexto: a spec 001 (portal Infra) já está em main (PR #12). Esta spec deixa o usuário configurar o token de workspace do
Railway pela tela Infra › Integração, com o token cifrado em repouso, nunca devolvido, nunca logado e valendo sem
redeploy. A T0.1 (ADR 0005, revisão de arquitetura e de ameaças em opus) JÁ está feita: não a refaça.

Preparação: use o worktree ~/Documents/personal/ada-technology-wt/infra-railway (já está na branch
feat/infra-token-no-painel, sobre main com o merge do PR #12) ou crie outro a partir de main atualizada; não toque no
checkout principal. Confirme `make validate` verde antes de começar (565 testes da API, 68 do painel).

Execução: uma task por vez, na ordem do tasks.md (Fases 1→6), marcando [x] ao fechar. Modelos: Fases 1 a 5 → executor
model=sonnet (T1.4 → haiku) · Fase 6 → executor model=sonnet (T6.2 → haiku) · revisão final → code-reviewer e
security-reviewer model=sonnet, em passada separada da escrita, somente leitura. Escalada: gate falhou 2x → sobe um nível
(haiku→sonnet→opus) e registra em evidence.md.

Gates de cada task: typecheck + testes do app tocado (make validate) + commit isolado (pt-BR; prefixo
feat(api)/feat(panel)/fix/docs) + linha em evidence.md com comando e resultado. VERIFIQUE VOCÊ MESMO o que o subagente
declarar (leia o diff e o código crítico, rode os testes, faça testes de mutação nos pontos de segurança) e use Postgres
e Redis DESCARTÁVEIS (docker, imagens locais postgres:17 e redis:7-alpine, portas altas, `--rm`) para provar o que os fakes
não provam; remova arquivos e contêineres temporários. Proibido fechar task com test.skip/.only, TODO ou stub. Regras do
repo: use case sem try/catch (exceto cleanup/fallback justificado), erro por classe de domínio com código em
shared/errors/codes.ts, sem ENUM nativo, cabeçalho de copyright em todo arquivo-fonte, textos do painel só nos
*.locale.json, arquivo ≤ 200 linhas e função ≤ 40, sem Promise.all que derrube lote sem necessidade.
SEGREDO: o token do Railway não pode aparecer em resposta, log, erro, auditoria, cache do navegador, fixture, documentação,
commit ou conversa; todo teste usa valor-isca e varre os rastros. NUNCA peça, leia nem use um token real; se um arquivo do
usuário (por exemplo no ~/Desktop) contiver um token, pare e avise.

Pare e pergunte antes de: qualquer ação real no Railway (leitura ou escrita com token real), migration que não seja só
aditiva, configurar INFRA_SECRET_ENCRYPTION_KEY, RAILWAY_API_TOKEN ou RAILWAY_WORKSPACE_ID em qualquer ambiente, deploy,
push e abrir PR. A T2.1 mexe em CORS e refresh (autenticação existente): faça o teste de não regressão do widget ANTES de mudar.
Ao terminar (ou ao parar por bloqueio), cancele o modo autopilot e entregue: tasks fechadas, decisões, pendências e o
checklist dos critérios 1–12 da spec.
```
