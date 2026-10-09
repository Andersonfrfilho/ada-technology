# Tasks — Spec 002 Token no painel

Leia `spec.md` e `plan.md` antes. Uma task por vez, na ordem. Cada task fecha com `make validate` (ou
typecheck + testes do app tocado) + commit isolado + linha em `evidence.md`.
Branch: `feat/infra-token-no-painel`, a partir de `main` atualizada (spec 001 já está em `main`).

| Fase | Modelo | Tasks 🧠 |
|---|---|---|
| 0 — Desenho e ameaças | `opus` | T0.1 |
| 1 — Cifra e armazenamento | `sonnet` (T1.3 → `haiku`) | — |
| 2 — Gateway por provedor | `sonnet` | — |
| 3 — Casos de uso e rotas | `sonnet` | — |
| 4 — Painel | `sonnet` | — |
| 5 — Verificação, docs e revisão | `sonnet` (T5.2 → `haiku`) | — |

**Regra do repo para esta feature:** o token **nunca** aparece em resposta, log, erro, auditoria, cache do
navegador, fixture, documentação ou commit. Todo teste que passa um token usa um valor-isca e varre os
rastros. Verificações reais de escrita no Railway **não** fazem parte desta spec: a prova com token de
verdade é manual e do usuário (T5.4).

---

## Fase 0 — Desenho e ameaças
> 🤖 Modelo: `opus`

- [ ] **T0.1 🧠 ADR `docs/adr/0005-token-do-railway-no-painel.md`.** Registrar D1–D7 da spec, o modelo de
  ameaça (sessão roubada, XSS, banco vazado, chave vazada, token em log/Sentry) e os riscos aceitos do spec §8.
  Passada de revisão por `architect` e `security-reviewer` (`opus`) **antes** de implementar: o que eles
  apontarem entra na spec/plan com data. Aceite: ADR no formato dos anteriores; revisão registrada em `evidence.md`.

## Fase 1 — Cifra e armazenamento
> 🤖 Modelo: `sonnet` (T1.3 → `haiku`)

- [ ] **T1.1 Cifra (TDD, função pura).** `infraSecretCipher.ts` com `sealSecret`/`openSecret` e a variável
  `INFRA_SECRET_ENCRYPTION_KEY` validada no boot (base64 de 32 bytes). Testes primeiro, **mostre o vermelho**:
  ida e volta, IV diferente a cada chamada, byte adulterado falha, chave errada falha, rótulo/versão errados
  falham, chave de tamanho errado recusada. Teste de mutação próprio: trocar o modo/IV fixo deve quebrar testes.
  Aceite: testes + `make validate`.
- [ ] **T1.2 Tabela e repositório.** Schema Drizzle `infra_integration_secrets`, migration `0005` **só aditiva**
  (parar e perguntar se o gerador produzir `DROP`/`ALTER`), `DrizzleInfraIntegrationRepository`. Aceite:
  teste de integração temporário contra Postgres 17 **descartável** (migration do zero, `provider` único,
  `ciphertext` sem o valor-isca, adulterar 1 byte e ler falha), removido ao fim.
- [ ] **T1.3 Constantes, erros e auditoria.** Códigos e classes do plan §2.1; `AUDIT_ACTION`:
  `infra.integration_configured|replaced|removed|verified|denied`; `AUDIT_TARGET` se faltar. Aceite: typecheck + teste de erros.

## Fase 2 — Gateway por provedor
> 🤖 Modelo: `sonnet`

- [ ] **T2.1 `RailwayGatewayProvider` + `staticGatewayProvider`.** Precedência painel > variável de ambiente >
  nenhum, cache de 30 s, `invalidate()`, decifrar com falha devolve `undefined` e loga (sem segredo). Aceite:
  testes de precedência, invalidação, cache e falha de decifragem.
- [ ] **T2.2 Trocar `railwayGateway?` por `gatewayProvider` nos casos de uso da spec 001** (plan §2.4) e no
  container. **Nenhum teste existente pode ser removido, pulado ou enfraquecido**; só o ponto de injeção muda.
  Conferir antes e depois com `make validate` (mesmos totais ou maiores) e **API real** (Postgres + Redis
  descartáveis, sem token): 503/404/401/`/health/ready` 200 como na spec 001.
- [ ] **T2.3 Scheduler sempre registrado.** `index.ts` registra a tarefa `infra-schedules` e a recuperação
  sempre; sem token retornam sem chamar o Railway. Aceite: teste "sem token, zero chamadas" + boot real.

## Fase 3 — Casos de uso e rotas
> 🤖 Modelo: `sonnet`

- [ ] **T3.1 `verifyAgentPassword`.** Reusa o hash do login do módulo `agent`, sem sessão. Aceite: certo/errado, e a
  senha errada **não** vaza qual campo falhou.
- [ ] **T3.2 Casos de uso** `getInfraIntegration`, `saveInfraIntegration`, `verifyInfraIntegration`,
  `removeInfraIntegration` com a ordem do plan §2.1. Aceite: testes com fakes — **cada falha antes de gravar
  grava zero**, token recusado/workspace errado/Railway fora têm erros distintos, auditoria sem token,
  troca mantém um registro, token da variável de ambiente não se remove.
- [ ] **T3.3 Rotas e limites.** `buildInfraIntegrationRoutes` + zod do corpo, preset de rate limit (5/min por
  agente e por IP em `PUT`/`DELETE`, 12 em `verify`). Aceite: 401/403/503/403 produção/403 senha/422/429/200 e
  **varredura com valor-isca** de resposta, logs, `audit_logs` e `captureError`; verificar se o Sentry anexa
  corpo e desligar para estas rotas se anexar.

## Fase 4 — Painel
> 🤖 Modelo: `sonnet`

- [ ] **T4.1 Navegação, API e hook.** Seção `integracao` (admin), `infra.api.ts` das 4 chamadas,
  `infraIntegration.hook.ts` com `gcTime: 0` e `reset()`; textos em `infra.locale.json`. Aceite: typecheck + testes
  de caminho/método/corpo e de visibilidade.
- [ ] **T4.2 Tela de Integração.** Status, formulário (token `type=password`, `autocomplete=off`, senha de
  confirmação), remover com senha, erros por código. Aceite: **verificação no navegador** com API simulada
  (leitura por árvore de acessibilidade e medição, uma captura final): fluxo feliz, cada erro, campo limpo
  depois de salvar e de falhar, `localStorage`/`sessionStorage` vazios, sem rolagem horizontal em 375 px,
  contraste WCAG e alvos de toque como na spec 001.

## Fase 5 — Verificação, docs e revisão
> 🤖 Modelo: `sonnet` (T5.2 → `haiku`)

- [ ] **T5.1 API real de ponta a ponta.** Postgres + Redis descartáveis, `ENV=production`, chave de teste:
  `PUT` com isca é recusado pelo Railway real e **não grava**; `GET` mostra não configurado; sem a chave, 503;
  fora de produção, 403; varredura de logs e do banco sem o valor-isca. **Nenhuma escrita no Railway.**
- [ ] **T5.2 Documentação.** ADR 0005 final, `ai-context.md` (rotas, regras, variável de cifra), `deploy-railway.md` §11
  (configurar pelo painel; a chave de cifra como pré-requisito; **corrigir o caminho de criação do token**:
  `railway.com/account/tokens` com o seletor de workspace), `SECURITY.md` (achado datado: token no banco cifrado,
  rotação e perda da chave, o que a auditoria não cobre).
- [ ] **T5.3 Revisão independente** (`code-reviewer` e `security-reviewer`, `sonnet`, passada separada da escrita,
  somente leitura) sobre o diff da branch; corrigir os achados reais, registrar os aceitos no ADR. Auditoria §15
  (N+1, `Promise.all` vs `allSettled`, logs sem PII, sem stack em 500) e conformidade de tamanho (arquivo ≤ 200
  linhas, função ≤ 40).
- [ ] **T5.4 Roteiro manual (do usuário).** Depois do deploy: gerar o token de workspace em
  `railway.com/account/tokens`, abrir *Infra › Integração* e salvar. Conferir: Ambientes e Custos funcionam sem
  redeploy; remover volta a 503. **Parar e pedir confirmação** antes de qualquer ação real; o autopilot não
  recebe nem manipula o token.

---

## Prompt de execução

```text
/oh-my-claudecode:autopilot Execute a spec specs/002-token-no-painel/ no repo
~/Documents/personal/ada-technology (leia spec.md, plan.md e tasks.md inteiros antes de tocar em código,
e o ai-context.md da raiz e docs/adr/0004-infra-railway-no-painel.md para as convenções e decisões da spec 001).
Contexto: a spec 001 (portal Infra no painel) já está em main (PR #12). Esta spec deixa o usuário configurar o
token de workspace do Railway pela tela Infra › Integração, com o token cifrado em repouso, nunca devolvido,
nunca logado, e valendo sem redeploy.

Preparação: use um worktree novo a partir de main atualizada, na branch feat/infra-token-no-painel (a spec já
está commitada nela; se não estiver, comite specs/002-token-no-painel/ primeiro) e crie
specs/002-token-no-painel/evidence.md. Não toque no checkout principal.

Execução: uma task por vez, na ordem do tasks.md (Fases 0→5), marcando [x] ao fechar.
Modelos: Fase 0 → opus (T0.1 com architect e security-reviewer em opus) · Fase 1 → executor model=sonnet (T1.3 →
haiku) · Fase 2 → executor model=sonnet · Fase 3 → executor model=sonnet · Fase 4 → executor model=sonnet ·
Fase 5 → executor model=sonnet (T5.2 → haiku) · revisão final → code-reviewer model=sonnet e security-reviewer
model=sonnet, em passada separada da escrita, somente leitura.
Escalada: gate falhou 2x → sobe um nível (haiku→sonnet→opus) e registra em evidence.md.

Gates de cada task: bun run typecheck (ou make validate) + testes do app tocado + commit isolado (mensagem em
pt-BR, prefixo feat(api)/feat(panel)/docs/fix) + linha em evidence.md com comando e resultado. Verifique você
mesmo o que o subagente declarar (diff, testes, comportamento) e use bancos/Redis descartáveis para provar o que
os fakes não provam; apague arquivos e contêineres temporários. Proibido fechar task com test.skip/.only, TODO ou
stub. Regras do repo: use case sem try/catch (exceto cleanup/fallback justificado), erro por classe de domínio com
código em shared/errors/codes.ts, sem ENUM nativo, cabeçalho de copyright em todo arquivo-fonte, textos do painel só
nos *.locale.json, arquivo ≤ 200 linhas e função ≤ 40, sem Promise.all que derrube lote sem necessidade.
SEGREDO: o token do Railway não pode aparecer em resposta, log, erro, auditoria, cache do navegador, fixture,
documentação, commit ou conversa; todo teste usa valor-isca e varre os rastros. NUNCA peça, leia nem use um token
real; se um arquivo do usuário contiver um token, pare e avise.

Pare e pergunte antes de: qualquer ação real no Railway (leitura ou escrita com token real), migration que não seja
só aditiva, configurar INFRA_SECRET_ENCRYPTION_KEY ou RAILWAY_API_TOKEN em qualquer ambiente, deploy, push e abrir PR.
Ao terminar (ou ao parar por bloqueio), cancele o modo autopilot e entregue: tasks fechadas, decisões, pendências
e o checklist dos critérios 1–10 da spec.
```
