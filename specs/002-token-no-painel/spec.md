# Spec 002 — Token do Railway configurável pelo painel da Ada

> Status: **revisada em 2026-10-09 após revisão de arquitetura e de ameaças (opus)** · Depende da spec 001 (em `main`, PR #12)
> Apps: `apps/api-ada`, `apps/frontend-panel` · Decisões e riscos: `docs/adr/0005-token-do-railway-no-painel.md`

## 1. Problema

Hoje o `RAILWAY_API_TOKEN` só entra como variável de ambiente da `api` de produção, pelo painel do Railway.
Trocar ou remover o token exige acesso ao Railway e redeploy, e o painel da Ada não mostra se a integração
funciona. O usuário decidiu que o token deve ser configurado **pelo painel da Ada**.

Isso muda a postura de segurança: o token de workspace (apaga serviços e volumes, lê variáveis de produção)
passa a trafegar pelo navegador e a morar no banco. Esta spec faz isso **sem enfraquecer** as garantias da spec 001.

## 2. Objetivo

Uma tela **Infra › Integração** (só admin) em que se informa o token, se **testa a conexão antes de salvar**,
se vê o estado da integração e se pode verificar de novo, trocar ou remover o token. O token fica **cifrado em
repouso**, **nunca é devolvido**, **nunca é logado** e passa a valer **sem redeploy**.

## 3. Histórias de usuário

- **US1 Configurar.** Abro *Infra › Integração*, colo o token, digito a minha senha e clico em *Testar e salvar*.
  Se o Railway recusar, nada é salvo e vejo o motivo. Se aceitar, a tela Infra funciona na hora.
- **US2 Acompanhar.** Vejo se está configurada, a origem (painel ou variável de ambiente), os 4 últimos
  caracteres, quem alterou e quando, e o resultado do último teste de acesso.
- **US3 Trocar.** Informo um token novo com a senha; o antigo deixa de ser usado. A tela avisa que o antigo
  **continua válido no Railway até eu revogá-lo** lá.
- **US4 Remover.** Removo o token (com senha): o módulo Infra volta a 503 e as agendas deixam de agir. Se o token vier
  de variável de ambiente, a tela diz onde ele está e não deixa remover.
- **US5 Rastro.** Configurar, trocar, remover, verificar, recusar e bloquear ficam na auditoria, sem o token.

## 4. Requisitos funcionais

- **RF1** Rotas só admin, todas com `Cache-Control: no-store`: `GET /v1/panel/infra/integration`,
  `PUT /v1/panel/infra/integration`, `POST /v1/panel/infra/integration/verify`, `DELETE /v1/panel/infra/integration`.
- **RF2** **O workspace não vem do formulário.** O `PUT` recebe só `token` e `password`. O workspace é o de
  `RAILWAY_WORKSPACE_ID`, fixado no ambiente (não é segredo), e o token precisa enxergar **exatamente** esse id.
  O token é testado num cliente descartável (`probeWorkspace`, com resultado discriminado, sem contaminar o
  bloqueio de rate limit em uso): recusado → 422 `INFRA_INTEGRATION_TOKEN_REJECTED`; workspace inacessível ou
  inexistente → 422 `INFRA_INTEGRATION_WORKSPACE_NOT_FOUND` (um código só se o Railway não distinguir);
  Railway fora → 503; limite do Railway → 429 com `Retry-After`. **Token de conta é recusado**: a query `me` é
  documentada como negada a token de workspace, então se `me` responder o token é amplo demais → 422
  `INFRA_INTEGRATION_TOKEN_TOO_BROAD`. Nenhuma falha grava nada. Sem `RAILWAY_WORKSPACE_ID` ou
  `RAILWAY_ENVIRONMENT_ID`, `PUT` e provedor respondem 503 `INFRA_NOT_CONFIGURED`.
- **RF3** `PUT` e `DELETE` exigem a **senha do admin logado**. O caso de uso relê o agente no banco e exige
  `isActive` e papel `admin` **naquele instante** (o papel do JWT pode estar 15 min defasado), e confere a senha
  com o mesmo `Bun.password.verify` do login, sem criar sessão. Senha errada: 403
  `INFRA_INTEGRATION_PASSWORD_INVALID`. As falhas somam num contador por agente (TTL 15 min); na **5ª falha** a API
  revoga todas as sessões do agente, bloqueia as rotas de integração dele por 15 min (423
  `INFRA_INTEGRATION_LOCKED`, com `Retry-After`) e audita `infra.integration_locked`. O login não muda.
- **RF4** **Cifra:** AES-256-GCM com `node:crypto`, IV aleatório de 12 bytes por gravação, tag fixada em 16 bytes
  (IV ≠ 12 ou tag ≠ 16 é recusado antes de decifrar). Dado autenticado:
  `ada.infra.railway-token|<key_id>|<provider>|<workspace_id>`, o que impede transplantar o cifrado entre linhas ou
  workspaces. Chave em `INFRA_SECRET_ENCRYPTION_KEY` (base64 de exatamente 32 bytes), **recusada no boot fora de
  `ENV=production`** e se for igual a `PANEL_JWT_SECRET`. `key_id` = 8 bytes (hex) do SHA-256 da chave, gravado com o
  segredo. Em produção, com a chave presente, `RAILWAY_WORKSPACE_ID` e `RAILWAY_ENVIRONMENT_ID` são obrigatórias no boot.
  Sem a chave, `PUT` responde 503 `INFRA_SECRET_KEY_MISSING`.
- **RF5** **Nenhuma rota devolve o token**, nem cifrado. O `GET` devolve só estado: `source`
  (`panel` | `environment` | `none`), `state` (`not_configured` | `configured` | `key_missing` | `key_mismatch` |
  `secret_unreadable`), `tokenHint` (4 últimos caracteres), `workspaceId`, `updatedAt`, `updatedByName`,
  `access` (vocabulário da spec 001, lido do cache `infra:access`, sem chamar o Railway a cada abertura) e
  `environmentTokenAlsoPresent`.
- **RF6** **Vale sem redeploy.** Os casos de uso da spec 001 trocam `railwayGateway?` por `resolveGateway()`,
  chamado **uma vez** no início de cada `execute`; a operação de energia passa o gateway resolvido ao runner
  (nunca troca de token no meio) e uma operação já admitida termina com o token com que começou. O provedor relê a
  linha do banco no máximo a cada 30 s e **só remonta o gateway quando a credencial muda** (impressão digital de
  `updated_at`, `key_id` e `workspace_id`), preservando o bloqueio de `Retry-After`; `invalidate()` vale na próxima
  chamada, com contador de geração contra leitura em andamento. **Salvar, trocar e remover apagam as quatro chaves
  Redis** (`infra:inventory`, `infra:access`, `infra:costs:v1`, `infra:costs:v1:last-good`).
- **RF7** `PUT` fora de `ENV=production` responde 403 `INFRA_INTEGRATION_PRODUCTION_ONLY` (auditado). Fora de
  produção o provedor **nem lê a tabela**; o `GET` funciona e mostra o estado.
- **RF8** **Uma fonte de credencial por vez.** Com `RAILWAY_API_TOKEN` definida, ela vale (com o
  `RAILWAY_WORKSPACE_ID` do ambiente), `source = environment`, e `PUT`/`DELETE` respondem 409
  `INFRA_INTEGRATION_ENVIRONMENT_MANAGED`; uma linha do painel eventualmente existente é ignorada e o `GET` avisa.
  Sem a variável, vale o painel. **Linha do painel presente e ilegível** (chave ausente, errada, tag inválida) é
  **fail closed**: o módulo fica indisponível e o `GET` mostra `key_missing`/`key_mismatch`/`secret_unreadable`;
  **nunca** cai para outra credencial. Trocar ou remover no painel **não revoga** o token no Railway: a tela e o
  `SECURITY.md` mandam revogar o antigo em `railway.com/account/tokens`.
- **RF9** **Sem vazamento.** O token, a senha e o texto cifrado nunca entram em log, resposta, erro, contexto de erro
  nem `audit_logs`. (a) A redação do logger passa a casar por **substring** (`token`, `password`, `secret`,
  `ciphertext`, `encryptionkey`), com allowlist explícita para `tokenHint`. (b) A metadata das ações
  `infra.integration_*` é um **tipo fechado** (`reason` de enum fixo, `workspaceId?`, `source?`), sem texto livre.
  (c) O filtro de exceção não loga `message` de erro do Drizzle (a mensagem carrega os parâmetros da consulta, que
  incluiriam o cifrado), só o código da causa. (d) Os campos do corpo se chamam exatamente `token` e `password`, e
  nenhum `refine` do zod interpola o valor. (e) O token fica em campo privado (`#token`) do cliente, nunca em
  propriedade enumerável. (f) Teste com **valor-isca** varre stdout e stderr do **processo real**, as respostas e
  `audit_logs`, em todos os caminhos (sucesso e cada falha, inclusive o ramo 500). A `api-ada` não usa Sentry.
- **RF10** Limites: `PUT` e `DELETE` com 5/min por agente e por IP; `verify` com 3/min por agente e resultado
  cacheado por 30 s (impede esgotar a cota horária do token).
- **RF11** Auditoria: `infra.integration_configured`, `_replaced`, `_removed`, `_verified`, `_denied` e `_locked`,
  com ator, IP e motivo; jamais o token nem os últimos 4 caracteres. `PUT`/`DELETE` rodam numa transação com
  `SELECT … FOR UPDATE` na linha do provedor (sem last-write-wins), e `configured` × `replaced` é decidido dentro dela.
- **RF12** A tarefa `infra-schedules` e a recuperação do boot passam a ser registradas **apenas com `ENV=production`**
  (onde um token pode existir) e retornam sem chamar o Railway quando não há token. Em dev, test e staging o
  comportamento da spec 001 não muda (sem token, o relógio nem sobe).
- **RF13** **Formulário.** O campo do token não pode ser capturado por gerenciador de senhas nem corretor:
  `autoComplete="off"`, `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`, `data-1p-ignore`,
  `data-lpignore="true"`, `data-bwignore`, nome neutro; envio por clique, não por `submit` de `<form>`; a senha de
  confirmação usa `autocomplete="current-password"`. O campo é limpo ao salvar, ao falhar e ao desmontar; sem
  `localStorage`/`sessionStorage`; mutação com `gcTime: 0` e `reset()`. **Conferência manual** em Chrome, Safari e
  Firefox: nenhum oferece salvar o token. O tratamento visual do campo (máscara) é escolhido para passar nessa conferência.
- **RF14** **Pré-requisito de segurança (fora do módulo Infra, achado na revisão):** (a) o CORS com credenciais vale
  **só** para `CORS_ALLOWED_ORIGINS` (painel); origens do widget recebem CORS sem `Access-Control-Allow-Credentials`;
  (b) `POST /auth/refresh` recusa `Origin` que não seja do painel; (c) o widget não pode regredir (teste do fluxo do
  widget antes e depois); (d) o IP usado em rate limit e auditoria hoje é o primeiro valor de `X-Forwarded-For`, que o
  cliente controla: só trocar para o valor do proxy do Railway **depois de confirmar na documentação do Railway** qual
  cabeçalho/posição é confiável; se não for confirmável, fica registrado como risco.

## 5. Requisitos não funcionais

- Sem biblioteca nova (`node:crypto` e Drizzle já existentes). Migration aditiva (`0005`).
- Sem a chave e sem token, tudo continua como na spec 001 (módulo desligado, 503).
- Rotação da chave: informar o token de novo (sem suporte a duas chaves na v1); documentar.

## 6. Fora de escopo (v1)

- Vários workspaces ou tokens; papéis além de admin; aprovação por duas pessoas.
- Aviso por e-mail aos admins quando a integração muda (recomendado; abre item no ADR).
- Pedir a mesma confirmação por senha na criação e promoção de admin (fecha o buraco da sessão roubada; item no ADR).
- Atacar os 13 achados `high` do `bun audit` (fora do caminho do token).
- Cache compartilhado entre réplicas (a spec 001 fixa uma réplica).

## 7. Decisões (detalhe e alternativas no ADR 0005)

| # | Decisão |
|---|---|
| D1 | Token cifrado (AES-256-GCM), chave só em variável de ambiente, só em produção, `key_id` + AAD completo |
| D2 | Confirmação por senha em `PUT`/`DELETE`, com papel e `isActive` relidos no banco e bloqueio na 5ª falha |
| D3 | Testar no Railway antes de gravar (`probeWorkspace`), workspace fixado no ambiente, token de conta recusado |
| D4 | A API nunca devolve o token; dica de 4 caracteres só na tela |
| D5 | `resolveGateway()` por `execute`, provedor com geração e remontagem só quando a credencial muda; limpa o Redis |
| D6 | **Fonte única:** a variável de ambiente, se existir, vale e trava o painel; sem ela vale o painel; falha de leitura = fail closed |
| D7 | Só em produção (token, chave, `PUT`, leitura da tabela, scheduler) |

## 8. Riscos aceitos (a registrar no ADR 0005)

- **Sessão admin roubada:** a confirmação por senha acrescenta um passo e dois rastros, mas **não fecha** o caminho
  enquanto criar/promover admin não exigir a mesma confirmação.
- **XSS na tela de Integração:** o CSP real (`script-src 'self'`, sem inline nem terceiros) e a ausência de HTML
  injetado reduzem; o resíduo é supply chain.
- **Banco + chave** (mesmo cofre de variáveis que o `DATABASE_URL`): a cifra cobre dump, backup e leitura SQL, não quem
  lê as variáveis do Railway.
- **Token em memória** por 30 s e enquanto uma operação em curso o usa.
- **Remover/trocar não revoga no Railway.** Depende de ação humana.
- Falha ao gravar a auditoria depois de salvar: o segredo fica sem a linha de auditoria; autor e data saem da própria linha.

## 9. Critérios de aceite

1. Sem a chave: `PUT` responde 503 `INFRA_SECRET_KEY_MISSING` e nada muda.
2. Token recusado, workspace inacessível, token de conta ou Railway fora: erro distinto e **nada gravado** (conferido no banco).
3. Senha errada em `PUT`/`DELETE`: 403, nada muda; a 5ª falha revoga as sessões do agente e bloqueia por 15 min; o papel rebaixado no banco é recusado mesmo com JWT válido.
4. Com token salvo, **nenhuma** resposta, linha de log (stdout/stderr do processo real) ou linha de `audit_logs` contém o valor-isca.
5. O banco guarda só texto cifrado (o `ciphertext` não contém o token; trocar 1 byte, trocar o `key_id` ou o `workspace_id` faz a leitura falhar).
6. Depois de salvar, Ambientes e Custos funcionam **sem redeploy**; depois de remover, voltam a 503; trocar de token não mostra dados do anterior (Redis limpo).
7. Fora de `ENV=production`: `PUT` 403, a tabela não é lida, o scheduler não sobe; o `GET` mostra o estado.
8. Com `RAILWAY_API_TOKEN` na variável de ambiente: `source: environment`, `PUT`/`DELETE` 409.
9. Linha ilegível: `state` correto e **nenhum** fallback para a variável de ambiente.
10. Painel: nenhum dado do token em `localStorage`/`sessionStorage`/cache de mutação; campo limpo; nenhum navegador testado oferece salvar o token.
11. RF14: origem do widget não recebe credenciais nem consegue `refresh`; o widget segue funcionando.
12. `make validate` verde; nenhum `test.skip`/`.only`; nenhum arquivo > 200 linhas nem função > 40.
