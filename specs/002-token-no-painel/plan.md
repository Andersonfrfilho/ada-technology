# Plano técnico — Spec 002 Token no painel

## 1. Visão geral

```
frontend-panel                        api-ada                                        banco / Redis
──────────────                        ───────                                        ─────────────
Infra › Integração ──GET/PUT/POST/DELETE──▶ buildInfraIntegrationRoutes (admin, rate limit)
   (campo password, sem cache)               ├─ getInfraIntegration        ─┐
                                             ├─ saveInfraIntegration ──────┤──▶ infra_integration_secrets (cifrado)
                                             │    1 senha do admin (verifyAgentPassword)
                                             │    2 testa no Railway com o token recebido
                                             │    3 cifra (AES-256-GCM) e grava
                                             │    4 invalida o provedor + audita
                                             ├─ verifyInfraIntegration     │
                                             └─ removeInfraIntegration    ─┘
RailwayGatewayProvider.current() ◀── usado por TODOS os casos de uso da spec 001
   1 token do painel (decifra)  →  2 RAILWAY_API_TOKEN  →  3 undefined (módulo desligado)
```

## 2. Backend — `apps/api-ada/src/modules/infra/`

### 2.1 Arquivos

| Arquivo | Papel |
|---|---|
| `infraSecretCipher.ts` | funções puras `sealSecret` / `openSecret` (AES-256-GCM, `node:crypto`), com a chave injetada; formato `v1.<keyVersion>.<iv>.<tag>.<dados>` em base64url; dado autenticado = rótulo fixo `ada.infra.railway-token` + versão |
| `infraSecretCipher.test.ts` | ida e volta, IV diferente a cada chamada, byte adulterado falha, chave errada falha, rótulo errado falha, chave de comprimento errado recusada |
| `types/infraIntegration.types.ts` | `InfraIntegrationRecord`, `InfraIntegrationView`, Params/Result dos casos de uso |
| `types/infraIntegrationRepository.interface.ts` + `DrizzleInfraIntegrationRepository.ts` | `findRailway()`, `upsertRailway(...)`, `deleteRailway()` |
| `types/railwayGatewayProvider.interface.ts` | `RailwayGatewayProvider { current(): Promise<RailwayGatewayInterface \| undefined>; invalidate(): void; describeSource(): Promise<'panel'\|'environment'\|'none'> }` |
| `RailwayGatewayProvider.ts` | resolve: token do painel decifrado → `RAILWAY_API_TOKEN` → `undefined`; guarda o gateway montado por 30 s em memória; `invalidate()` zera |
| `staticGatewayProvider.ts` | provedor fixo para testes e para o caminho só-variável-de-ambiente |
| `verifyAgentPassword.use-case.ts` | confere a senha do agente logado com o mesmo hash do login, sem criar sessão; tentativa errada lança `InfraIntegrationPasswordInvalidError` |
| `getInfraIntegration.use-case.ts` | estado sem segredo (RF5), com `access` do provedor |
| `saveInfraIntegration.use-case.ts` | ordem: ambiente de produção → chave de cifra presente → senha → validação do formato → **teste no Railway** → cifrar e gravar → invalidar provedor → auditar. Qualquer falha antes de gravar é auditada como `integration_denied` |
| `verifyInfraIntegration.use-case.ts` / `removeInfraIntegration.use-case.ts` | verificar de novo; remover (senha, só origem painel) |
| `buildInfraIntegrationRoutes.ts` + `infraIntegration.schema.ts` | rotas, zod do corpo (`token` 20–200 caracteres sem espaço; `workspaceId` UUID; `password` não vazio), limites 5/min por agente e por IP no `PUT`/`DELETE` |

Erros novos (`infra.error.ts` + `ERROR_CODES.infra`): `INFRA_SECRET_KEY_MISSING` 503,
`INFRA_INTEGRATION_PRODUCTION_ONLY` 403, `INFRA_INTEGRATION_PASSWORD_INVALID` 403,
`INFRA_INTEGRATION_TOKEN_REJECTED` 422 (Railway recusou), `INFRA_INTEGRATION_WORKSPACE_NOT_FOUND` 422,
`INFRA_INTEGRATION_ENVIRONMENT_MANAGED` 409 (token da variável de ambiente não se remove pelo painel).

### 2.2 Banco (migration `0005`, aditiva)

`infra_integration_secrets`: `id` uuid PK, `provider` varchar(20) **unique** (`'railway'`), `workspace_id`
varchar(64), `ciphertext` text, `key_version` smallint, `token_hint` varchar(4), `updated_by_agent_id`
uuid null, `created_at`, `updated_at`. Sem ENUM nativo.

### 2.3 Variáveis de ambiente

| Variável | Schema | Observação |
|---|---|---|
| `INFRA_SECRET_ENCRYPTION_KEY` | `z.string().default('')` | opcional; se presente, `superRefine` exige base64 de **exatamente 32 bytes**; a API **não** loga o valor |
| `RAILWAY_API_TOKEN` e demais | sem mudança | continuam valendo como reserva (RF8) |

### 2.4 Refatoração do gateway fixo para provedor (RF12)

Hoje o container cria `railwayGateway` no boot e cada caso de uso recebe `railwayGateway?`. Passa a receber
`gatewayProvider` e chamar `await gatewayProvider.current()` no início do `execute`.

- Casos de uso afetados: `listInfraEnvironments`, `powerEnvironment` (+ `locateManagedEnvironment`),
  `saveEnvironmentSchedule`, `getInfraCosts`, `runInfraSchedules`, `recoverInterruptedInfraOperations` (esta
  não usa o gateway; só a tarefa do scheduler muda).
- `index.ts`: a tarefa `infra-schedules` e a recuperação do boot passam a ser **sempre** registradas; sem token
  elas retornam logo (zero chamadas ao Railway, como hoje com "sem agendas ativas").
- Mudança mecânica coberta pelos testes existentes (565 + 68): nenhum teste pode ser apagado ou enfraquecido;
  só o ponto de injeção muda (`staticGatewayProvider(fake)`).

### 2.5 Redação e vazamento (RF9)

- O `PUT`/`DELETE` leem o corpo uma vez, em variável local; o token não vai para `ctx`, erro nem contexto de erro.
- Teste com **valor-isca** (`canary`) como token: chamar `PUT` (com sucesso e com todas as falhas) e varrer
  respostas, logs capturados, `audit_logs`, mensagens de erro e o `captureError` falso; nenhuma ocorrência.
- Verificar se o `captureError`/Sentry anexa corpo da requisição; se sim, desligar para estas rotas.

## 3. Frontend — `apps/frontend-panel/src/modules/infra/`

| Arquivo | Papel |
|---|---|
| `InfraIntegration.page.tsx` | estado + formulário + remover; mensagens por código de erro |
| `components/IntegrationStatus.component.tsx` | configurada?, origem, final do token, quem/quando, acesso |
| `components/IntegrationForm.component.tsx` | campos token (`type=password`, `autocomplete="off"`, `spellCheck=false`), workspace, senha de confirmação; botão *Testar e salvar* |
| `components/RemoveIntegrationDialog.component.tsx` | confirmação com senha |
| `infraIntegration.hook.ts` | `useInfraIntegration`, mutações com `gcTime: 0` e `reset()` no sucesso/erro; o valor do token nunca vai para o cache nem para o estado global |
| navegação | `PANEL_SECTION.INFRA_INTEGRATION` (`'integracao'`), `requiresAdmin`, grupo Infra |
| `infra.locale.json` | textos pt-BR; erros por código |

Regras de UI: o campo do token é limpo ao salvar, ao falhar e ao desmontar; sem `localStorage`/`sessionStorage`;
o formulário não preenche nada a partir da API (não existe valor para preencher).

## 4. Testes

- **Cifra** (puro): tabela do §2.1.
- **Casos de uso** com fakes (gateway que aceita/recusa, repositório em memória, senha certa/errada): ordem das
  checagens e **zero gravação** em cada falha; auditoria com ator e motivo e sem token; troca preserva só um registro.
- **Provedor**: precedência painel > ambiente > nenhum; `invalidate()` vale na próxima chamada; cache de 30 s;
  decifrar com chave errada ou texto adulterado devolve `undefined` (módulo desligado) e loga, nunca lança.
- **Rotas**: 401/403 (não admin)/503/403 produção/403 senha/422/429 (6ª tentativa)/200; corpo nunca na resposta.
- **Postgres e Redis reais (descartáveis)**: migration, upsert único por `provider`, `ciphertext` sem o token,
  adulterar 1 byte e ler falha.
- **API real de ponta a ponta** (Postgres + Redis descartáveis, `ENV=production`, chave de cifra de teste,
  Railway indisponível): `PUT` com isca é recusado pelo Railway real e **não grava**; varredura de logs e banco.
- **Painel no navegador** (simulador): fluxo feliz e cada erro; `localStorage`/`sessionStorage` vazios depois;
  campo limpo; sem rolagem horizontal em 375 px; contraste e alvos de toque como na spec 001.

## 5. Riscos técnicos

| Risco | Mitigação |
|---|---|
| Refatoração do gateway para provedor quebra comportamento da spec 001 | testes existentes intactos; só o ponto de injeção muda; API real conferida antes e depois |
| Chave de cifra vazada ou perdida | fica fora do banco; perdê-la só obriga a informar o token de novo; documentar em `SECURITY.md` |
| Token aparece em log/Sentry por acidente | isca nos testes + redação existente + verificação do `captureError` |
| `PUT` usado para trocar a integração por um token de outro workspace | `workspaceId` do formulário precisa ser o do token (teste no Railway); a tela mostra o workspace configurado |
| Senha de confirmação vira vetor de força bruta | limite 5/min por agente e por IP, tentativa errada auditada |
