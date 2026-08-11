# Contexto para I.A. — Ada Technology

Arquivo vivo. Toda rota nova, mudança de arquitetura ou regra de negócio alterada atualiza este
arquivo no mesmo commit.

## Apps

| App | Papel |
|---|---|
| `apps/api-ada` | HTTP com `Bun.serve`. Dona do domínio, hospeda o módulo de WhatsApp e o bot. |
| `apps/frontend-site` | Landing institucional (widget de chat embutido). |
| `apps/frontend-panel` | Painel de atendimento. |
| `packages/chat-widget` | Web Component do chat, embutido pela landing. |

Stack: Bun + TypeScript, PostgreSQL + Drizzle, Redis (cache, nonce, pub/sub de tempo real),
`@adatechnology/meta-whatsapp-module` como motor de conversa (ver `docs/adr/0001`).

## Como o bot funciona

O grafo de fluxo do módulo é o cérebro. **Nada gera texto para o cliente:** o que o grafo não previu
vira atendimento humano (`RequestHandoffUseCase` + `setMode('human')`), nunca resposta improvisada.
O classificador de intenção por LLM é opcional, gratuito e só classifica — `INTENT_CLASSIFIER_ENABLED`
nasce `false`.

`AdvanceConversationUseCase` é o passo único da conversa, comum aos dois canais:

- sessão em modo `human` → devolve sem falar;
- sem grafo, sem nó, resposta inválida repetida ou ação de fluxo pedindo gente → handoff;
- caso contrário apresenta o próximo nó pelo `ChannelAdapterInterface` recebido.

Comandos globais (`conversationCommand.resolver.ts`) valem em qualquer nó, sem estarem desenhados no
grafo: `sair` e sinônimos encerram com a `farewellMessage` do painel e zeram a posição — a próxima
mensagem recomeça do menu; `menu`/`voltar` voltam ao nó inicial; `atendente`/`humano` chamam uma
pessoa sem gastar as duas tentativas de fallback. Num nó de escolha a opção do grafo vence a palavra
do comando; em pergunta de texto livre o comando vem antes, senão não haveria como desistir dela.
`menu` não repergunta o nó inicial quando o `contextKey` dele já está no contexto — a resposta
guardada é reentregue ao interpretador, e a conversa cai direto no menu.

O widget do site aceita **nota de voz**: `POST /v1/widget/sessions/:id/audio` (multipart, campo
`audio`, teto de 4MB) transcreve por `@adatechnology/audio-transcription-provider` (Groq Whisper) e
injeta o texto na conversa como fala do visitante. Sem `GROQ_API_KEY` não há transcriber, a rota
responde 503 e o widget não desenha o microfone — capacidade por ausência. Depois do passo do fluxo,
`ExtractLeadSignalsUseCase` lê a fala solta e grava em `_leadSignals` no contexto da sessão o que ela
revelar (empresa, cargo, segmento, porte, dor, ferramentas, urgência), separado dos campos que o
cliente respondeu; falha de modelo não interrompe a conversa. A rota de transcript carimba
`answerKind` no payload do último balão do bot (`answerKind.resolver.ts`), e é dele que o widget tira
`autocomplete`/`inputMode` do campo de texto.

Falha de transcrição nunca chega ao visitante como 500: `toWidgetAudioError` traduz o erro do
provedor em erro de domínio — cota estourada vira 429 com `retryAfterSeconds` no contexto, que o
filtro global publica como header `Retry-After`; falha do engine vira 502. O widget escolhe a frase
pelo `code` do envelope (`getApiErrorCode` + `AUDIO_STATUS_BY_ERROR_CODE`), com o status HTTP só como
rede para resposta de proxy sem corpo nosso: `audioBusy` traz o número de segundos, `audioUnavailable`
e `audioFailed` convidam a escrever, que é o caminho que continua funcionando.

Entrada de cada canal:

- **WhatsApp** — `hooks.onMessageReceived` do módulo (`whatsappMessageHook.ts`). O módulo já não
  chama o hook quando a conversa está com atendente. Áudio, foto e documento viram handoff
  (`HANDOFF_REASON.UNSUPPORTED_MESSAGE`).
- **Widget** — as rotas `/v1/widget/*`, que gravam a mensagem do visitante e chamam o mesmo use-case.

O grafo inicial vive em `modules/conversation/defaultFlow.constant.ts` e é publicado por
`make seed-flow`. Rodar de novo não sobrescreve: depois da primeira publicação o grafo é conteúdo
editado no painel, e um seed que reescreve apagaria esse trabalho a cada deploy. **Base sem grafo é
bot mudo** — `AdvanceConversationUseCase` entrega toda mensagem para uma pessoa com `OUT_OF_FLOW`.

Ordem de boot em `src/infra/container.ts`: o hook é declarado dentro de `createMetaWhatsAppModule`,
mas depende dos use-cases que só existem depois. O ciclo é fechado por `whatsappMessageHandlers`,
preenchido logo após a construção e lido só na hora da mensagem.

## Rotas HTTP

Envelope `{ data }` em sucesso e `{ error: { code, message } }` em falha. Todas respondem com os
headers de segurança e `X-Trace-Id`. Rate limit por IP declarado na própria rota
(`infra/http/rateLimit.constant.ts`), com `429` + `Retry-After`.

| Método | Rota | Notas |
|---|---|---|
| `GET` | `/health` e `/health/ready` | Liveness e readiness (fora do versionamento). |
| `GET` | `/v1/whatsapp/webhook` | Desafio da Meta. Responde texto cru, sem envelope. |
| `POST` | `/v1/whatsapp/webhook` | HMAC sobre o **corpo cru** + nonce (TTL 300s), ambos do módulo. |
| `POST` | `/v1/widget/sessions` | Cria sessão e apresenta o nó de abertura. `201 { sessionId }`. |
| `POST` | `/v1/widget/sessions/:sessionId/messages` | `{ text }`. Devolve `{ outcome }`. |
| `GET` | `/v1/widget/sessions/:sessionId/messages` | Transcript. `?limit&before` (`before` é ISO de `createdAt`). |
| `GET` | `/v1/widget/sessions/:sessionId/events` | SSE do canal `conv:<sessionId>`. |
| `POST` | `/v1/auth/login` | `{ email, password }`. Access token no corpo, refresh **só no cookie**. |
| `POST` | `/v1/auth/refresh` | Lê o cookie, rotaciona o refresh e devolve novo access token. |
| `POST` | `/v1/auth/logout` | 🔒 `agent`. Revoga o refresh e expira o cookie. `204`. |
| `GET` | `/v1/auth/me` | 🔒 `agent`. Cadastro do próprio atendente (nome e e-mail vivem aqui, não no token). |
| `GET` | `/v1/panel/conversations` | 🔒 `agent`. Lista. `?page&limit&waitingHuman&search`. Sem `total` (ver abaixo). |
| `POST` | `/v1/panel/conversations/read` | 🔒 `agent`. Zera o não lido **do próprio atendente**. `{ updated }`. |
| `GET` | `/v1/panel/conversations/:id/messages` | 🔒 `agent`. Transcript paginado para trás (`?limit&before`). |
| `POST` | `/v1/panel/conversations/:id/messages` | 🔒 `agent`. `{ text }`. `204` quando a gravação é idempotente. |
| `POST` | `/v1/panel/conversations/:id/read` | 🔒 `agent`. Marca uma conversa como lida. `204`. |
| `GET` | `/v1/panel/conversations/:id/context` | 🔒 `agent`. Só o `context` do fluxo, nunca a linha da sessão. |
| `GET` | `/v1/panel/conversations/:id/documents` | 🔒 `agent`. `?page&limit&search&source&sortDirection`. |
| `GET` | `/v1/panel/documents` | 🔒 `agent`. Documentos da empresa. `?page&limit&search&source&sortDirection`. |
| `GET` | `/v1/panel/bot-messages` | 🔒 `agent`. Boas-vindas e despedida do bot. |
| `PUT` | `/v1/panel/bot-messages` | 🔒 `agent`. Auditado (`settings.changed`). |
| `GET` | `/v1/panel/template-settings` | 🔒 `agent`. Template de reengajamento escolhido. |
| `PUT` | `/v1/panel/template-settings` | 🔒 `agent`. Auditado (`settings.changed`). |
| `GET` | `/v1/panel/templates` | 🔒 `agent`. Catálogo da Meta. `503` sem WhatsApp configurado. |
| `POST` | `/v1/panel/templates` | 🔒 `agent`. Submete template à aprovação. Auditado (`template.created`). |
| `POST` | `/v1/panel/conversations/:id/takeover` | 🔒 `agent`. Cala o bot. Auditado. `204`. |
| `POST` | `/v1/panel/conversations/:id/release` | 🔒 `agent`. Devolve ao bot. Auditado. `204`. |
| `GET` | `/v1/panel/conversations/:id/transcript` | 🔒 `agent`. Exportação. Auditada, com limite de escrita. |
| `POST` | `/v1/panel/realtime/tickets` | 🔒 `agent`. `{ conversationId? }` → bilhete de 30s para o SSE. |
| `GET` | `/v1/panel/events` | Bilhete no `?ticket`. SSE do canal `global`. |
| `GET` | `/v1/panel/conversations/:id/events` | Bilhete no `?ticket`, amarrado àquela conversa. |

As rotas de WhatsApp só são montadas com `WHATSAPP_ENABLED=true`: sem segredo não há como conferir
assinatura, e rota pública que aceita qualquer corpo é pior que rota nenhuma.

### Autenticação do painel

Rota protegida declara `auth: 'agent' | 'admin'` no próprio `Route`; o router resolve o atendente
antes do handler e o entrega em `context.agent` (lido com `requireAgent`). O papel checado ali é a
porta, não o cadeado — quem mexe em recurso de terceiro ainda confere o dono dentro do use case.

- **Access token**: JWT HS256 (`jose`), ≤15 min, carrega só `sub` e `role`. Sem nome nem e-mail:
  o token viaja em header e aparece em log de borda.
- **Refresh token**: 32 bytes aleatórios no Redis (`panel:refresh:<token>`, TTL 7 dias), rotacionado
  por `GETDEL` — um comando só, senão dois pedidos simultâneos usariam o mesmo token. Vai e volta
  apenas no cookie `HttpOnly` com `Path=/v1/auth`.
- **Login** responde igual para senha errada, e-mail inexistente e conta desativada, e sempre paga um
  argon2 (hash-isca) para não enumerar contas pelo tempo de resposta.
- **Trilha**: login, falha de login e logout gravam em `audit_logs` com ator, alvo e IP — nunca o
  e-mail digitado. O IP vem de `context.clientAddress`, já resolvido atrás do proxy.

Primeiro administrador: `bun run db:seed --email <e-mail> --name "<nome>"` com a senha pela **entrada
padrão** (argumento apareceria em `ps` e no histórico). Repetir o seed não quebra: e-mail já existente
é ignorado.

### Regras não óbvias das rotas do widget

- **`isWidgetSessionId()` em toda rota com `:sessionId`.** Sessão de widget e de WhatsApp dividem a
  mesma tabela; sem a checagem, um número de telefone no lugar do id leria a conversa de um cliente
  real. Falha responde `404`, não `400`, para não virar verificador de telefone.
- **Origem** (`WIDGET_ALLOWED_ORIGINS`) é exigida nos `POST`, que gastam recurso.
- **O evento SSE não carrega texto** — só avisa que mudou; o navegador rebusca o transcript pela rota
  que já filtra campos internos (`widget.mapper.ts`).

### Regras não óbvias das rotas do painel

- **O painel nunca vê telefone.** A conversa é identificada por um `conversationId` opaco (o `id` da
  linha de sessão); `panel.mapper.ts` expõe `contactHandle` já mascarado (`****1234`) ou
  `Visitante do site`. A rota de contexto devolve `session.context` e não a linha, justamente porque a
  linha carrega o número.
- **`ResolveConversationUseCase` é a fronteira de autorização.** Todo `:id` passa por ele, que resolve
  sob o `companyId` e devolve a `conversationKey` interna; id de outra empresa vira `404` antes de
  qualquer leitura (BOLA).
- **SSE se autoriza por bilhete.** `EventSource` não manda header, então as duas rotas de evento não
  declaram `auth`. O bilhete é emitido por rota autenticada, vive 30s, é resgatado com `GETDEL` e
  carrega a chave já resolvida — abrir o stream não consulta o banco, e bilhete de uma conversa não
  escuta outra.
- **`POST` sem corpo é válido.** `readJsonBody` devolve `{}` quando o corpo vem vazio: `takeover`,
  `release`, `read` e o pedido de bilhete não têm o que mandar, e onde há campo obrigatório o schema
  reprova com `VALIDATION_FAILED` em vez de "JSON inválido".
- **A lista sai sem `total`.** `ListConversationsUseCase` devolve só a página; total inventado esconde
  conversa na paginação, e a `conversations-ui` aceita a lista crua.
- **Nenhum transcript usa o `listMessages` do módulo.** Ele ordena `createdAt` ascendente com
  `limit`, ou seja, devolve a janela mais **antiga** — o oposto do que uma tela de conversa abre.
  `modules/shared/DrizzleTranscriptRepository` lê `desc` com cursor `before` e inverte; painel e
  widget compartilham essa leitura, e é por isso que ela mora em `shared` e não em `panel`.
- **`TranscribedWhatsAppChannel` grava o que o bot fala.** O `SendMessageUseCase` do módulo guardou o
  adapter cru no construtor, então a mensagem que o atendente manda pelo painel continua gravada uma
  vez só.
- **Mídia ficou de fora.** Sem provider de storage ligado, não há rota para `sendMedia`,
  `getDocumentUrl` nem `getMediaProxyUrl`; o adapter do front lança "não suportado" em vez de fingir.
- **`targetId` do `audit_logs` é coluna `uuid`.** Alvo que não tem UUID — configuração
  (`bot_messages`, `template`) e o `shortId` que a Meta devolve — vai em `metadata`, com `targetId`
  omitido. Escrever string livre ali derruba o `INSERT` **depois** de a configuração já ter sido
  gravada: o cliente vê `500` e o dado salvou. TypeScript não pega, o tipo é `string`.
- **Templates falha fechado.** Sem `WHATSAPP_ENABLED` / `WHATSAPP_BUSINESS_ACCOUNT_ID` não há
  provider e o catálogo responde `503 CHANNEL_WHATSAPP_DISABLED`. O nome já salvo vem pela rota de
  `template-settings`, que é independente — a tela abre e continua editável.

## Painel

Shell de barra lateral fixa (ícone + rótulo), virando gaveta abaixo de `desktop:`. **A seção é
caminho, não rota de biblioteca**: `@tanstack/react-router` está instalado mas não é usado, porque as
telas da `conversations-ui` guardam o próprio estado na query string com `history.replaceState` e um
roteador com localização própria brigaria com essas escritas. O shell manda no caminho, cada
workspace manda nos seus parâmetros.

`PanelSectionView` tem `switch` exaustivo sem `default`: item novo na barra sem tela por trás não
compila, e é isso que impede uma seção "em breve" chegar ao operador.

**O tema é a classe `dark` no `<html>`, uma fonte só.** `index.css` declara
`@custom-variant dark (&:where(.dark, .dark *))` porque o padrão do Tailwind v4 é
`prefers-color-scheme` — e aí o painel teria duas verdades em desacordo: os utilitários seguiriam o
sistema operacional enquanto o `styles.css` do SDK (`.dark .cv-*`) e os componentes que escolhem cor
em JavaScript (`useIsDarkTheme`) seguiriam o `<html>`. Era isso que deixava a barra lateral escura
com a lista de conversas branca. `useDarkMode` é montado **uma vez**, no `PanelShell`: a barra
lateral existe em duas cópias abaixo de `desktop:` (o `aside` escondido e a gaveta), e dois
controladores da mesma classe divergiriam. O `body` pinta por token (`--panel-canvas`), senão a tela
de carregamento aparece clara antes de a aplicação montar.

| Seção | Tela | Nota |
|---|---|---|
| Conversas | `ConversationsWorkspace` | Inbox + transcript + takeover. |
| Fluxos | `Flows.page` | Editor do grafo do bot. |
| Mensagens | `MessagesWorkspace` | Só `getMessages`/`saveMessages`; sem tópicos, templates nem transcrição a tela colapsa na aba do bot e some a barra de abas. |
| Templates | `WhatsAppTemplatesSettings` | Componente é presentacional — todo o estado vive em `templateSettings.hook.ts`. |
| Documentos | `DocumentsWorkspace` | `dateFilter={false}` e `categories={[]}`: a rota só entende `search`, `source`, `sortDirection` e paginação. Filtro que o servidor descarta faria lista crua parecer filtrada. |
| Clientes | `LeadsPage` | Leads capturados pelo bot: nome, contato, interesse, origem, quando, link para a conversa. |

**A tela composta é o padrão de consumo** (`pluggable-module.md` §4): o pacote entra inteiro,
customizado por `labels` e slots. Nada de fork.

**Desvio consciente do §7** (listagens): Clientes não tem seleção em massa. A única ação em lote
natural seria exportar CSV, e exportação de dado pessoal é ação sensível pelo §10 da segurança —
precisa de trilha de auditoria, que export no cliente não consegue dar. Quando a exportação virar
rota do servidor, o checkbox entra junto.

Documentos renderiza vazio até um provider de `objectStorage` ser injetado em
`createMetaWhatsAppModule` (`ingestInboundMedia` hoje é `undefined`) — é lacuna de configuração,
não tela inacabada.

## Landing e widget

`packages/chat-widget` é Web Component nativo (`<ada-chat-widget>`, shadow DOM), não React — regra do
`web.md` §1 para elemento que precisa rodar fora do React. Ele não depende do bundle da landing e
pode ser colado em qualquer página com um `<script type="module">`.

- **A origem da API entra por atributo** (`api-base`), e o elemento nasce em `src/main.ts` da landing
  para o valor vir do env validado. Atributo escrito à mão no `index.html` seria o mesmo domínio nos
  três ambientes, e o servidor confere `Origin` — o erro só apareceria depois do deploy.
- **Todo texto do servidor entra por `textContent`.** O conteúdo é editado no painel e a página é
  pública: `innerHTML` transformaria o editor de fluxo em injeção de HTML na landing.
- **O clique numa opção manda o rótulo, não o id.** O que sai dali é gravado como a fala do
  visitante; com o id, quem assumisse a conversa leria `dados` no lugar de "Dashboards e dados".
  `flowAnswer.validator.ts` aceita rótulo, id ou posição — o WhatsApp deixa digitar, e quem digita
  responde "2" ou "financiamento".
- **O transcript só é redesenhado quando o conjunto de ids muda**: rerender a cada evento SSE
  perderia a posição do scroll.
- Estilo é folha única no shadow root, com tokens em `:host` — a superfície de customização do host.
  Mobile é a base (faixa inteira, `left`/`right` de 12px); a partir de `min-width: 640px` volta a ser
  cartão de 380px.

## Deploy

Railway, três serviços buildados por Dockerfile (`api`, `panel`, `site`) mais os plugins de
Postgres e Redis. Passo a passo, tabela de variáveis e verificação pós-deploy em
`docs/deploy-railway.md`.

- **O contexto de build é a raiz do monorepo**, nunca a pasta do app: o `bun install` precisa do
  `bun.lock` e dos `package.json` dos outros workspaces para ser reprodutível. Por isso o
  `railway.json` de cada app aponta `dockerfilePath` a partir da raiz e o *Root Directory* do
  serviço fica em `/`.
- **Os frontends são servidos por Caddy**, com `Caddyfile` versionado ao lado do Dockerfile. Não é
  preguiça de escrever um servidor: os cabeçalhos do `security.md` §3 ficam declarativos, e o
  `{$API_ORIGIN}` entra no CSP em tempo de carga da config, sem rebuild.
- **`VITE_API_BASE_URL` é build arg, não variável de runtime** — o Vite inlina o literal no bundle.
  Trocar o domínio da API exige rebuild dos dois frontends, e é por isso que ele aparece duas vezes
  no serviço: uma para o bundle, outra (`API_ORIGIN`) para o `connect-src` do Caddy.
- **Migration roda no `preDeployCommand`**, antes de a versão nova entrar no ar. Seed e
  `seed-flow` são manuais, uma vez, pelo shell do serviço.
- `style-src` ainda carrega `'unsafe-inline'` nos dois frontends — divergência registrada em
  `docs/SECURITY.md` com o encaminhamento.

## Convenções

Sufixo de papel no arquivo (`*.use-case.ts`, `*.controller.ts`, `*.constant.ts`, `*.schema.ts`,
`*.error.ts`, `*.mapper.ts`); função com mais de um parâmetro recebe objeto tipado; use case não faz
try/catch (o filtro global do router responde, e `MetaWhatsAppError` tem ramo próprio lá); cabeçalho
de copyright em todo arquivo-fonte; nenhuma PII em log.

## Comandos

```bash
make up            # postgres, redis e mock da Graph API
make migrate       # migrations do módulo e depois as da Ada
make seed-flow     # publica o fluxo inicial do bot (não sobrescreve edição do painel)
make dev-api       # API em watch                        → http://localhost:3401
make dev-panel     # painel de atendimento               → http://localhost:5175
make dev-site      # landing                             → http://localhost:5176
make validate      # typecheck + testes (gate obrigatório)

# primeiro atendente (senha pela entrada padrão, nunca por argumento)
cd apps/api-ada && bun --env-file=../../envs/env.dev run src/infra/database/seeds/index.ts \
  --email voce@adatechnology.com.br --name "Seu Nome" --role admin < senha.txt
```

Painel em 5175 e landing em 5176 porque 5173 e 5174 já são de outros projetos locais. Ambos com
`strictPort: true`: sem isso o Vite escorrega para a próxima porta livre, a landing sobe onde
ninguém procura e pode ocupar a porta do painel. As duas origens entram na allowlist de CORS
(`CORS_ALLOWED_ORIGINS` em `envs/env.dev`) — mudar uma sem a outra derruba o login e o widget.
