# Deploy no Railway

Cinco recursos num projeto Railway: dois plugins gerenciados (Postgres e Redis) e tres servicos
buildados por Dockerfile a partir deste repositorio.

| Servico | Dockerfile | Config as code | Publico |
|---|---|---|---|
| `api` | `apps/api-ada/Dockerfile` | `apps/api-ada/railway.json` | sim, dominio proprio |
| `panel` | `apps/frontend-panel/Dockerfile` | `apps/frontend-panel/railway.json` | sim |
| `site` | `apps/frontend-site/Dockerfile` | `apps/frontend-site/railway.json` | sim |

> **Divergencia consciente do `INFRASTRUCTURE_ECOSYSTEM_RULES.md`.** Aquele documento descreve
> Kong + Keycloak + Kubernetes. Aqui o alvo e Railway, escolhido para este produto: o TLS e o
> roteamento sao do proprio Railway, o rate limit e o CORS ficam na API (ja implementados) e nao
> ha gateway na frente. Se o produto migrar para o cluster, o que muda e a borda — a aplicacao
> nao depende do Railway em lugar nenhum do codigo.

## 1. Ordem de criacao

1. **Postgres** (plugin). Anote a `DATABASE_URL` da aba *Variables*.
2. **Redis** (plugin). Anote a `REDIS_URL`.
3. **api** — servico a partir do repositorio.
4. **panel** e **site** — servicos a partir do mesmo repositorio.

Em cada um dos tres servicos, nas *Settings*:

- **Root Directory:** deixe na raiz (`/`). O build precisa do `bun.lock` e dos outros workspaces;
  apontar para `apps/<app>` quebra o install.
- **Config-as-code path:** `apps/<app>/railway.json`. E de la que sai o `dockerfilePath`, o
  healthcheck e o pre-deploy.

## 2. Variaveis do servico `api`

O `environment.ts` valida tudo no boot com zod e **falha em vez de subir degradado**. Nao existe
default silencioso para segredo.

| Variavel | Valor em producao | Nota |
|---|---|---|
| `PROJECT_NAME` | `ada` | prefixo de recurso |
| `ENV` | `production` | `dev` \| `test` \| `staging` \| `production` |
| `NODE_ENV` | `production` | |
| `APP_NAME` | `api-ada` | entra na mascara de log |
| `PORT` | `8080` | o Railway roteia para ela |
| `API_PORT` | `8080` | e a que o `Bun.serve` le; mantenha igual a `PORT` |
| `API_PUBLIC_URL` | `https://api.<dominio>` | URL publica da propria API |
| `LOG_LEVEL` | `info` | `debug` em producao vaza volume, nao PII (o logger redige) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | referencia ao plugin |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | referencia ao plugin |
| `ADA_COMPANY_ID` | UUID da empresa | o mesmo que o seed usa |
| `CORS_ALLOWED_ORIGINS` | `https://<painel>,https://<site>` | lista, sem espaco |
| `WIDGET_ALLOWED_ORIGINS` | `https://<site>` | so a landing; o widget e publico e nao autentica |
| `PANEL_JWT_SECRET` | segredo novo, ≥32 chars | **gere no Railway, nunca no terminal** |
| `PANEL_ACCESS_TOKEN_TTL_MINUTES` | `15` | teto do schema |
| `WHATSAPP_ENABLED` | `false` ate ter as credenciais | |
| `WHATSAPP_GRAPH_BASE_URL` | `https://graph.facebook.com` | em dev aponta para o mock |
| `INTENT_CLASSIFIER_ENABLED` | `false` | ligado exige `GROQ_API_KEY` |

Com `WHATSAPP_ENABLED=true` o schema passa a exigir `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e
`WHATSAPP_APP_SECRET`. Sem qualquer um deles o processo nao sobe — fail-closed de proposito: um
webhook publico sem `APP_SECRET` aceitaria payload forjado.

`PANEL_JWT_SECRET` gerado e colado num terminal e segredo queimado (`security.md` §4). Use o
gerador do proprio painel do Railway e nunca o imprima.

## 3. Variaveis dos servicos `panel` e `site`

`VITE_API_BASE_URL` e **build arg**, nao variavel de runtime: o Vite inlina o literal no bundle.
No Railway, variaveis do servico ja sao passadas como `--build-arg` para o Dockerfile, entao
basta declarar:

| Servico | Variavel | Valor |
|---|---|---|
| `panel` | `VITE_API_BASE_URL` | `https://api.<dominio>` |
| `panel` | `API_ORIGIN` | `https://api.<dominio>` (runtime, entra no CSP) |
| `site` | `VITE_API_BASE_URL` | `https://api.<dominio>` |
| `site` | `API_ORIGIN` | `https://api.<dominio>` (runtime, entra no CSP) |

`API_ORIGIN` aparece duas vezes de proposito: uma vira parte do bundle (o front chama a API), a
outra e lida pelo Caddy quando carrega a config (o CSP precisa autorizar a mesma origem em
`connect-src`). Trocar o dominio da API exige **rebuild** dos dois frontends.

Nenhum segredo com prefixo `VITE_` — o prefixo e publico por definicao.

## 4. Migrations

O `railway.json` da API declara `preDeployCommand: ["bun run db:migrate"]`. O comando roda no
mesmo container do release, antes de trocar a versao no ar, com o `WORKDIR` ja em
`/repo/apps/api-ada`. Ele aplica primeiro as migrations do modulo `meta_whatsapp` (que criam o
schema proprio do modulo) e depois as versionadas da Ada, em `apps/api-ada/drizzle/`.

`drizzle-kit push` nao entra em nenhum ambiente que nao seja local descartavel.

O seed (`bun run db:seed`) e do fluxo (`make seed-flow`) **nao** roda automaticamente. Rode uma
vez, manualmente, pelo shell do servico, depois do primeiro deploy.

## 5. Healthcheck

`GET /health/ready` responde `200` com `{"status":"ready"}` e `503` com `degraded` quando o
Postgres nao responde. E ele que o Railway consulta antes de considerar a versao viva, entao um
deploy com `DATABASE_URL` errada nao substitui a versao boa.

## 6. WhatsApp

Depois que o servico `api` tiver dominio:

- Webhook na Meta: `https://api.<dominio>/v1/whatsapp/webhook`.
- Verify token: o mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- A assinatura `X-Hub-Signature-256` e conferida sobre o **rawBody**, com janela de timestamp e
  nonce em Redis contra replay. Por isso o Redis nao e opcional quando o canal esta ligado.

## 7. Cabecalhos e CSP dos frontends

Painel e landing sao servidos por `caddy:2.10-alpine` com `Caddyfile` versionado ao lado do
Dockerfile. De la saem `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`, `Strict-Transport-Security` e o `Content-Security-Policy`.

`script-src 'self'` nos dois — o script da landing saiu do HTML para
`apps/frontend-site/src/landingInteractions.js` justamente para isso.

A landing tambem fecha o `style-src`: a folha saiu do `<style>` para `src/landing.css`, os
atributos `style="..."` viraram classe e o widget adota `CSSStyleSheet` construida
(`adoptedStyleSheets` nao passa por `style-src`).

**Divergencia aberta:** `style-src` ainda carrega `'unsafe-inline'` no painel, porque o
`@adatechnology/conversations-ui` usa `style={{...}}`, que o React aplica como atributo inline —
atributo nao tem hash sem `'unsafe-hashes'`.

O risco residual e menor que o de `script-src`, mas continua sendo divergencia do
`security.md` §3 e esta registrada em `docs/SECURITY.md`.

## 8. Verificacao pos-deploy

```bash
curl -sS https://api.<dominio>/health/ready
curl -sSI https://<site> | grep -i content-security-policy
curl -sSI https://<painel> | grep -i strict-transport-security
```

E, no painel: login, abrir uma conversa, assumir o atendimento. Se o SSE nao conectar, o suspeito
numero um e `CORS_ALLOWED_ORIGINS`/`WIDGET_ALLOWED_ORIGINS` sem o dominio novo.
