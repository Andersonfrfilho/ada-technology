# Deploy no Railway

Um projeto (`ada-technology`) com **dois ambientes**. Cada ambiente tem os seus proprios cinco
recursos: dois plugins gerenciados (Postgres e Redis) e tres servicos buildados por Dockerfile a
partir deste repositorio.

| Ambiente | Branch | Banco e Redis | Segredos |
|---|---|---|---|
| `production` | `main` | proprios | proprios |
| `staging` | `staging` | proprios | proprios |

Nada e compartilhado entre os dois — nem volume, nem `PANEL_JWT_SECRET`. Ambiente de teste que
divide banco ou segredo com producao e producao com outro nome.

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

## 1. Provisionamento por script

Quatro scripts em `scripts/`, todos idempotentes. Rodar de novo reconcilia em vez de duplicar — o
`railway add` sozinho **nao** faz isso: chamado duas vezes ele cria `Postgres` e `Postgres-bg59`,
cada um com o seu volume.

```bash
railway login                                # uma vez por maquina

./scripts/railway-provision.sh production    # bancos, servicos, dominios e variaveis nao secretas
./scripts/railway-secrets.sh   production    # PANEL_JWT_SECRET, gerado sem passar pelo terminal
./scripts/railway-connect-repo.py            # liga os servicos ao GitHub e amarra branch->ambiente

./scripts/railway-provision.sh staging
./scripts/railway-secrets.sh   staging

./scripts/railway-domains.py                 # dominios proprios e o estado do DNS (secao 4)
```

O que cada um faz e por que existe:

- **`railway-provision.sh <ambiente>`** — garante Postgres, Redis e os servicos `api`, `panel` e
  `site`; gera o dominio de cada um; e deriva as variaveis **dos dominios recem-criados**, para
  que `CORS_ALLOWED_ORIGINS`, `WIDGET_ALLOWED_ORIGINS`, `VITE_API_BASE_URL` e `API_ORIGIN` nunca
  fiquem apontando para o ambiente errado.
- **`railway-secrets.sh <ambiente>`** — le 48 bytes de `/dev/urandom` e escreve em
  `railway variable set --stdin`. O valor nunca vira argumento de linha de comando (visivel no
  `ps`), nunca e ecoado, nunca entra no historico do shell. Rodar de novo **rotaciona**: os tokens
  em circulacao caem e todo mundo faz login outra vez.
- **`railway-connect-repo.py`** — GraphQL, nao CLI: `railway` so conecta repositorio no momento da
  criacao do servico (`railway add --service --repo`) e nao expoe branch por ambiente. Alem disso
  `serviceConnect` cria gatilho identico nos dois ambientes, ambos em `main` — o script corrige o
  do staging para `staging`.
- **`railway-domains.py`** — tambem GraphQL: a CLI responde `Unauthorized` em dominio customizado,
  e nao mostra o estado do registro enquanto o DNS propaga, que e o unico dado que interessa nessa
  hora.

### Ajustes que so a API GraphQL faz

`Root Directory` e `Config-as-code path` **nao tem comando na CLI**. Ficaram assim, por servico e
por ambiente:

- **Root Directory `/`** — o build precisa do `bun.lock` e dos outros workspaces; apontar para
  `apps/<app>` quebra o `bun install --frozen-lockfile`.
- **Config-as-code `apps/<app>/railway.json`** — de la sai o `dockerfilePath`, o healthcheck e o
  pre-deploy. Com root em `/` e um `railway.json` por app, o caminho precisa ser explicito.
- **Watch patterns** — `apps/<app>/**`, `packages/**`, `package.json`, `bun.lock`,
  `tsconfig.json`. Sem isso um commit so na landing rebuilda os tres servicos.

Duplicar um ambiente (`railway environment create <novo> --duplicate production`) **carrega esses
tres campos junto**, entao criar um ambiente novo a partir de um ja configurado dispensa refazer
o passo. Foi assim que o `staging` nasceu.

## 2. Portao de CI

O deploy e disparado pelo push, mas nao comeca antes do CI passar: os gatilhos estao com
`checkSuites` ligado (o "Wait for CI" do painel), entao o Railway espera o resultado do check
suite daquele commit. CI vermelho, deploy nenhum — nem em `staging`, nem em `main`.

`.github/workflows/ci.yml` roda em push para `main` e `staging` e em todo pull request:
`bun install --frozen-lockfile`, `bun run typecheck`, `bun run test` e a build dos dois frontends.

Duas coisas que parecem detalhe e nao sao:

- **Sem filtro de path no workflow.** Gatilho que espera por um check suite que nunca roda fica
  parado para sempre. Quem decide o que rebuilda sao os watch patterns do Railway, nao o CI.
- **A versao do Bun no runner e a mesma do runtime.** Divergir esconde exatamente o erro que so
  aparece no deploy.

Para religar ou desligar o portao, o campo e `checkSuites` no `deploymentTriggerUpdate` — nao ha
comando na CLI.

## 3. Variaveis do servico `api`

O `environment.ts` valida tudo no boot com zod e **falha em vez de subir degradado**. Nao existe
default silencioso para segredo.

| Variavel | `production` | `staging` | Nota |
|---|---|---|---|
| `PROJECT_NAME` | `ada` | `ada` | prefixo de recurso |
| `ENV` | `production` | `staging` | `dev` \| `test` \| `staging` \| `production` |
| `NODE_ENV` | `production` | `production` | o schema so aceita `development`/`test`/`production` |
| `APP_NAME` | `api-ada` | `api-ada` | entra na mascara de log |
| `PORT` | `8080` | `8080` | o Railway roteia para ela |
| `API_PORT` | `8080` | `8080` | e a que o `Bun.serve` le; mantenha igual a `PORT` |
| `API_PUBLIC_URL` | dominio da api do ambiente | idem | URL publica da propria API |
| `LOG_LEVEL` | `info` | `info` | `debug` vaza volume, nao PII (o logger redige) |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` | idem | referencia; resolve no plugin **do ambiente** |
| `REDIS_URL` | `${{Redis.REDIS_URL}}` | idem | idem |
| `ADA_COMPANY_ID` | UUID da empresa | mesmo UUID | bases sao separadas; repetir o id so facilita o seed |
| `CORS_ALLOWED_ORIGINS` | `<painel>,<site>` do ambiente | idem | lista, sem espaco |
| `WIDGET_ALLOWED_ORIGINS` | `<site>` do ambiente | idem | so a landing; o widget e publico e nao autentica |
| `PANEL_JWT_SECRET` | proprio, ≥32 chars | **outro**, proprio | `railway-secrets.sh` |
| `PANEL_ACCESS_TOKEN_TTL_MINUTES` | `15` | `15` | teto do schema |
| `WHATSAPP_ENABLED` | `false` ate ter credencial | `false` | |
| `WHATSAPP_GRAPH_BASE_URL` | `https://graph.facebook.com` | idem | em dev aponta para o mock |
| `INTENT_CLASSIFIER_ENABLED` | `false` | `false` | ligado exige `GROQ_API_KEY` |
| `GROQ_MODEL` | `llama-3.3-70b-versatile` | idem | so importa com o classificador ligado |

Com `WHATSAPP_ENABLED=true` o schema passa a exigir `WHATSAPP_PHONE_NUMBER_ID`,
`WHATSAPP_BUSINESS_ACCOUNT_ID`, `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e
`WHATSAPP_APP_SECRET`. Sem qualquer um deles o processo nao sobe — fail-closed de proposito: um
webhook publico sem `APP_SECRET` aceitaria payload forjado.

`PANEL_JWT_SECRET` gerado e colado num terminal e segredo queimado (`security.md` §4). Por isso o
`railway-secrets.sh` existe: o valor sai do `/dev/urandom` direto para o `stdin` do Railway e nao
e visto por ninguem. Se preferir, o gerador do painel do Railway faz o mesmo papel.

## 4. Variaveis dos servicos `panel` e `site`

`VITE_API_BASE_URL` e **build arg**, nao variavel de runtime: o Vite inlina o literal no bundle.
No Railway, variaveis do servico ja sao passadas como `--build-arg` para o Dockerfile, entao
basta declarar:

| Servico | Variavel | Valor |
|---|---|---|
| `panel` | `PORT` | `8080` (o Caddy le `{$PORT:8080}`) |
| `panel` | `VITE_API_BASE_URL` | dominio da api **do mesmo ambiente** |
| `panel` | `API_ORIGIN` | mesmo valor (runtime, entra no CSP) |
| `site` | `PORT` | `8080` |
| `site` | `VITE_API_BASE_URL` | dominio da api **do mesmo ambiente** |
| `site` | `API_ORIGIN` | mesmo valor (runtime, entra no CSP) |

A origem da API aparece duas vezes de proposito: uma vira parte do bundle (o front chama a API), a
outra e lida pelo Caddy quando carrega a config (o CSP precisa autorizar a mesma origem em
`connect-src`). Trocar o dominio da API exige **rebuild** dos dois frontends — e por isso que
cada ambiente tem o seu build, e nao se promove imagem de staging para producao.

Nenhum segredo com prefixo `VITE_` — o prefixo e publico por definicao.

## 5. Dominios proprios

`./scripts/railway-domains.py` cria os dominios nos dois ambientes e imprime o estado de cada
registro. A zona `adatechnology.com.br` vive no HostGator (`dns3`/`dns4.hostgator.com.br`) e so
muda por la — o script nao toca em DNS.

| Host | Tipo | Aponta para | Ambiente |
|---|---|---|---|
| `api` | CNAME | dominio gerado do servico `api` | production |
| `painel` | CNAME | dominio gerado do servico `panel` | production |
| `www` | CNAME | dominio gerado do servico `site` | production |
| `@` | CNAME | dominio gerado do servico `site` | production |
| `api.staging` | CNAME | dominio gerado do servico `api` | staging |
| `painel.staging` | CNAME | dominio gerado do servico `panel` | staging |
| `staging` | CNAME | dominio gerado do servico `site` | staging |

Os valores mudam a cada dominio criado; rode o script para ver os atuais.

**Cada dominio precisa tambem de um TXT `_railway-verify`**, impresso na segunda tabela do script.
O CNAME apontando certo prova roteamento, nao propriedade do nome — sem o TXT o certificado fica
preso em `validating_ownership` e a borda continua servindo o certificado curinga
`*.up.railway.app`, o que quebra o HTTPS com `subjectAltName does not match host name`. O TXT do
apex e `_railway-verify` sem sufixo; os demais seguem o host (`_railway-verify.api`,
`_railway-verify.painel.staging`).

**O apex e o unico que nao fecha no HostGator.** O Railway exige CNAME tambem na raiz, e uma zona
cPanel comum nao aceita CNAME convivendo com o SOA — e proibido pelo RFC, nao e limitacao do
painel. Duas saidas:

- mover a zona para um DNS com CNAME flattening ou ALIAS (Cloudflare resolve, e e gratis);
- servir o site em `www` e deixar o apex com um redirecionamento 301 para `www`.

A ordem importa. As allowlists (`CORS_ALLOWED_ORIGINS`, `WIDGET_ALLOWED_ORIGINS`) citam o dominio
gerado **e** o proprio desde ja: lista permissiva com host que ainda nao existe nao permite nada.
Ja `API_PUBLIC_URL`, `VITE_API_BASE_URL` e `API_ORIGIN` guardam um valor so, e trocar antes do DNS
resolver derruba o painel — o `connect-src` do CSP passaria a citar um host inexistente. Por isso
o corte e um passo separado, depois que `railway-domains.py` mostrar o certificado emitido:

```bash
./scripts/railway-provision.sh production custom
./scripts/railway-provision.sh staging custom
```

Isso forca rebuild dos frontends, que e o esperado: `VITE_API_BASE_URL` esta no bundle.

## 6. Migrations

O `railway.json` da API declara `preDeployCommand: ["bun run db:migrate"]`. O comando roda no
mesmo container do release, antes de trocar a versao no ar, com o `WORKDIR` ja em
`/repo/apps/api-ada`. Ele aplica primeiro as migrations do modulo `meta_whatsapp` (que criam o
schema proprio do modulo) e depois as versionadas da Ada, em `apps/api-ada/drizzle/`.

`drizzle-kit push` nao entra em nenhum ambiente que nao seja local descartavel.

O seed (`bun run db:seed`) e do fluxo (`make seed-flow`) **nao** roda automaticamente. Rode uma
vez por ambiente, manualmente, depois do primeiro deploy:

```bash
railway link --environment staging
railway ssh --service api
# dentro do container:
bun run db:seed --email <e-mail> --name "<nome>" < senha.txt
bun run db:seed-flow
```

A senha do admin entra por stdin justamente para nao virar argumento de comando.

## 7. Healthcheck

`GET /health/ready` responde `200` com `{"status":"ready"}` e `503` com `degraded` quando o
Postgres nao responde. E ele que o Railway consulta antes de considerar a versao viva, entao um
deploy com `DATABASE_URL` errada nao substitui a versao boa.

## 8. WhatsApp

Depois que o servico `api` tiver dominio:

- Webhook na Meta: `https://<api do ambiente>/v1/whatsapp/webhook`.
- Verify token: o mesmo valor de `WHATSAPP_WEBHOOK_VERIFY_TOKEN`.
- A assinatura `X-Hub-Signature-256` e conferida sobre o **rawBody**, com janela de timestamp e
  nonce em Redis contra replay. Por isso o Redis nao e opcional quando o canal esta ligado.

Um numero de teste da Meta aponta para o webhook de `staging`; o numero de producao, para o de
`production`. Compartilhar o numero entre os dois faz mensagem de cliente cair no ambiente errado.

## 9. Cabecalhos e CSP dos frontends

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

## 10. Verificacao pos-deploy

```bash
curl -sS  https://<api do ambiente>/health/ready
curl -sSI https://<site do ambiente>  | grep -i content-security-policy
curl -sSI https://<painel do ambiente> | grep -i strict-transport-security
```

E, no painel: login, abrir uma conversa, assumir o atendimento. Se o SSE nao conectar, o suspeito
numero um e `CORS_ALLOWED_ORIGINS`/`WIDGET_ALLOWED_ORIGINS` sem o dominio novo.

Confira tambem que o CSP do painel de `staging` cita a API de `staging`, e nao a de producao — e
o sintoma classico de um `API_ORIGIN` copiado junto com o ambiente duplicado.
