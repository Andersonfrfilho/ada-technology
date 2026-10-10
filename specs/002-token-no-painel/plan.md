# Plano técnico — Spec 002 Token no painel (revisado em 2026-10-09)

## 1. Visão geral

```
frontend-panel                      api-ada                                        banco / Redis
──────────────                      ───────                                        ─────────────
Infra › Integração ─GET/PUT/POST/DELETE─▶ buildInfraIntegrationRoutes (admin, no-store, rate limit)
 (token + senha)                           ├─ getInfraIntegration ─────────┐
 workspace só leitura (env)                ├─ saveInfraIntegration ────────┼─▶ infra_integration_secrets (cifrado)
                                           │   1 produção · chave · env ids · bloqueio · senha (relida no banco)
                                           │   2 probeWorkspace (cliente descartável; recusa token de conta)
                                           │   3 transação FOR UPDATE: cifra e grava, audita
                                           │   4 invalida provedor + apaga 4 chaves Redis
                                           ├─ verifyInfraIntegration (3/min, cache 30 s)
                                           └─ removeInfraIntegration (senha; 409 se token vier de variável)

casos de uso da spec 001 ──resolveGateway()──▶ RailwayGatewayProvider
  (1 vez por execute; powerEnvironment passa o gateway ao runner)   1 variável de ambiente (fonte única, trava o painel)
                                                                     2 linha do painel decifrada (fail closed se ilegível)
                                                                     3 nenhum → módulo desligado (503)
```

## 2. Backend — `apps/api-ada/src/modules/infra/`

### 2.1 Arquivos novos

| Arquivo | Papel |
|---|---|
| `infraSecretCipher.ts` (+teste) | `sealSecret`/`openSecret` puras; formato `v1.<key_id>.<iv>.<tag>.<dados>` (base64url); AAD `ada.infra.railway-token\|<key_id>\|<provider>\|<workspace_id>`; IV 12 e tag 16 bytes validados |
| `infraSecretKey.ts` | carrega e valida a chave (32 bytes), calcula o `key_id` (8 bytes hex do SHA-256), sem nunca logar |
| `types/infraIntegration*.types.ts` | registro, view, Params/Result |
| `types/infraIntegrationRepository.interface.ts` + `DrizzleInfraIntegrationRepository.ts` | `findRailway()`, `upsertRailwayLocked(...)`, `deleteRailwayLocked(...)` com `SELECT … FOR UPDATE` |
| `RailwayGatewayProvider.ts` + `staticGatewayProvider.ts` (teste) | resolve a fonte; relê a linha a cada 30 s; remonta o gateway só quando a impressão digital muda; contador de geração; `invalidate()` |
| `types/resolveGateway.types.ts` | `ResolveGateway = () => Promise<RailwayGatewayInterface \| undefined>` |
| `probeWorkspace` (em `RailwayGateway`/arquivo próprio) | resultado discriminado: `ok` / `token_rejected` / `workspace_not_found` / `too_broad` / `unavailable` / `rate_limited`; cliente descartável com bloqueio próprio |
| `verifyAgentPassword.use-case.ts` | usa **`findCredentialsById`** (novo no repositório de agente: `passwordHash`, `isActive`, `role`); exige ativo e `admin`; conta falhas (Redis, TTL 15 min); na 5ª revoga sessões e bloqueia |
| `get|save|verify|removeInfraIntegration.use-case.ts` | ver §1 |
| `buildInfraIntegrationRoutes.ts` + `infraIntegration.schema.ts` | 4 rotas; zod `token` (16–128, `[A-Za-z0-9_-]`) e `password` (não vazio); `no-store` |

Erros novos (códigos em `ERROR_CODES.infra`): `INFRA_SECRET_KEY_MISSING` 503, `INFRA_INTEGRATION_PRODUCTION_ONLY` 403,
`INFRA_INTEGRATION_PASSWORD_INVALID` 403, `INFRA_INTEGRATION_LOCKED` 423, `INFRA_INTEGRATION_TOKEN_REJECTED` 422,
`INFRA_INTEGRATION_TOKEN_TOO_BROAD` 422, `INFRA_INTEGRATION_WORKSPACE_NOT_FOUND` 422, `INFRA_INTEGRATION_ENVIRONMENT_MANAGED` 409.
Auditoria: `infra.integration_configured|replaced|removed|verified|denied|locked` com metadata tipada e fechada.

### 2.2 Banco (migration `0005`, aditiva)
`infra_integration_secrets`: `id` uuid PK, `provider` varchar(20) **unique**, `workspace_id` varchar(64), `ciphertext`
text, `key_id` varchar(16), `token_hint` varchar(4), `updated_by_agent_id` uuid, `created_at`, `updated_at`. Sem ENUM.

### 2.3 Variáveis de ambiente
| Variável | Regra |
|---|---|
| `INFRA_SECRET_ENCRYPTION_KEY` | opcional; se presente: base64 de exatamente 32 bytes, **só com `ENV=production`**, diferente de `PANEL_JWT_SECRET`; exige `RAILWAY_WORKSPACE_ID` e `RAILWAY_ENVIRONMENT_ID` |
| `RAILWAY_WORKSPACE_ID`, `RAILWAY_ENVIRONMENT_ID` | passam a ser exigidas também quando a chave está presente (a autoproteção do ambiente da API nunca some em silêncio) |
| `RAILWAY_API_TOKEN` e demais | sem mudança |

### 2.4 Refatoração para `resolveGateway()` (RF6) — opção A do arquiteto
Cinco casos de uso mudam só o ponto de injeção: `listInfraEnvironments`, `powerEnvironment` (+ `locateManagedEnvironment`,
que já recebe o gateway), `saveEnvironmentSchedule`, `getInfraCosts`, `runInfraSchedules`. `recoverInterruptedInfraOperations`
não usa o gateway. A checagem "não configurado" continua na primeira linha de cada `execute`, **antes** de ler o cache
(por isso a remoção devolve 503 na hora). `powerEnvironment` resolve **uma vez** e passa o gateway em `RunOperationParams`.
Os testes existentes (565 + 68) não podem ser removidos nem enfraquecidos; só mudam a injeção (`async () => fake`).
Rejeitada: gateway que delega a cada chamada (serve cache depois da remoção, troca de token no meio de uma operação, erro todo minuto no scheduler).

### 2.5 Redação e vazamento (RF9)
- `shared/redaction.ts`: casar por substring (`token|password|secret|ciphertext|encryptionkey`) com allowlist `tokenHint`; testes que provam que nenhuma chave existente passa a vazar nem a ser redigida indevidamente.
- `recordAuditLog`: tipos de metadata fechados para `infra.integration_*`.
- `exceptionFilter`: no ramo de erro desconhecido, erro do Drizzle loga só o código da causa.
- Cliente GraphQL: `#token` privado.
- Varredura com isca em stdout/stderr do processo real (API de verdade, Postgres e Redis descartáveis), respostas e `audit_logs`.

### 2.6 Pré-requisito RF14 (fora do módulo)
`infra/http/cors.ts` (credenciais só para o painel), `agent.controller.ts` (`refresh` checa `Origin`), e a verificação do IP confiável
na documentação do Railway. Teste de não regressão do widget (rotas do widget com a origem do widget, antes e depois).

## 3. Frontend — `apps/frontend-panel/src/modules/infra/`
`InfraIntegration.page.tsx`; `components/IntegrationStatus`, `IntegrationForm`, `RemoveIntegrationDialog`;
`infraIntegration.hook.ts` (mutações `gcTime: 0` + `reset()`); seção `integracao` (admin); locale pt-BR com erros por código.
O workspace aparece **somente leitura** (vem do ambiente). Avisos fixos: "trocar ou remover aqui não revoga no Railway" e,
quando `environmentTokenAlsoPresent`, "a variável de ambiente tem prioridade".

## 4. Testes
- Cifra (puro) incl. adulteração, `key_id`, AAD, IV/tag; mutação própria (trocar IV fixo ou tag curta quebra testes).
- Provedor: fonte única, fail closed, geração (corrida), remontagem só com credencial nova, não lê a tabela fora de produção.
- Casos de uso com fakes: ordem das checagens e **zero gravação** em cada falha; bloqueio na 5ª falha; papel rebaixado no banco.
- Rotas: 401/403/503/403 produção/403 senha/423/422(3 tipos)/409/429/200; `Cache-Control: no-store`.
- **Postgres e Redis reais:** migration, `FOR UPDATE`, ciphertext sem a isca, adulterar 1 byte; Redis limpo ao trocar/remover.
- **API real ponta a ponta** (`ENV=production`, chave de teste, Railway real recusando a isca): nada gravado; varredura de stdout/stderr.
- RF14: widget com e sem credenciais.
- Painel no navegador (simulador): fluxos, erros, storage vazio, sem rolagem horizontal em 375 px, contraste, alvos de toque; conferência manual de gerenciador de senhas.

## 5. Riscos técnicos
| Risco | Mitigação |
|---|---|
| Refatoração para `resolveGateway()` quebra a spec 001 | testes existentes intactos; API real conferida antes e depois |
| RF14 quebra o widget | teste de não regressão antes de mudar; mudança mínima e reversível |
| Redação por substring redige campo legítimo | allowlist + teste dos campos já usados nos logs |
| Chave perdida/rotacionada | fail closed com estado claro; informar o token de novo; documentado em `SECURITY.md` |
| `me` não negado a token de workspace | a documentação diz que é negado; conferir com leitura real antes de depender (T0.2) |
