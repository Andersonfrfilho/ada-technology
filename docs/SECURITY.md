# Achados de seguranca

Registro exigido pelo `security.md` §10: achado vira item com data, nao some no historico do chat.
Item so sai daqui quando esta resolvido — e ai fica na secao de fechados, com a data.

## Abertos

### 2026-10-09 — Token de workspace do Railway na `api-ada`

**Regra:** `security.md` §2 (escopo enumerado e token rotacionavel, nada de credencial larga e eterna)
e §4 (segredo so como variavel validada, nunca em log ou terminal).

**Estado:** aberto. Vale a partir da configuracao de `RAILWAY_API_TOKEN` na `api` de producao, pelo
procedimento de `docs/deploy-railway.md`, secao 11. Nao ha forma de reduzir o poder do token: o de
projeto nao serve, porque enxerga um ambiente so (ADR 0004, D1).

**Risco:** o token age sobre **todos** os projetos do workspace Railway, com o que um membro faz pela
API: apaga servicos, volumes e projetos, le variaveis de producao (`DATABASE_URL`, chaves da Meta,
segredos de JWT) e troca a imagem de um deploy. A `api` passa a guardar o segredo mais poderoso do
workspace. Por isso ele e o item de maior impacto desta lista.

**Mitigacoes em vigor:**

- documentos GraphQL fixos em `RailwayGateway.ts`; nenhuma consulta monta texto a partir de entrada;
- token so na `api` de producao; vazio em dev, test, staging e CI;
- ambiente de producao e o da propria API protegidos por codigo (`classifyEnvironment`), que
  responde `403` antes de qualquer mutation;
- token nunca em log, e o header `authorization` sempre redigido;
- auditoria de cada ligar, desligar e mudanca de agenda, com ator, alvo e resultado por servico.

**O que elas nao cobrem:**

- uso do token fora do painel (console do Railway, CLI, script com o valor copiado): essas acoes
  nao aparecem na auditoria da Ada;
- vazamento da propria producao: quem le o ambiente de producao le o token, e as travas do nosso
  codigo deixam de valer para quem tem o token fora da `api`;
- admin que age dentro do painel: a auditoria registra a acao, nao a impede.

**Antecedente:** durante a T0.4 (2026-10-09) um token de verificacao apareceu na tela do terminal. O
registro de evidencia da spec 001 trata esse token como queimado e pede a revogacao.

**Rotacao (sem suspeita de vazamento):**

1. criar um token de workspace novo no Railway;
2. trocar `RAILWAY_API_TOKEN` somente na `api` de producao;
3. conferir que `GET /v1/panel/infra/environments` responde com `access` `ok`;
4. revogar o token antigo.

**Vazamento (suspeita ou confirmacao):**

1. revogar o token no Railway, sem esperar;
2. criar outro e trocar somente na `api` de producao;
3. tratar como queimados os segredos de **todos** os projetos do workspace (banco, Meta, JWT, S3,
   e-mail) e rotaciona-los, porque o token permitia le-los;
4. revisar no Railway os deployments e as mudancas de variaveis desde a data provavel do vazamento.

**Risco operacional ligado ao mesmo modulo:** com staging desligado pela agenda, o webhook do WhatsApp
responde erro, e a Meta reenvia por ate 7 dias com uma rajada ao religar. O dedup de 300 s depende de
`x-request-id`, que ainda nao foi confirmado que a Meta envia; sem ele, o dedup nao deduplica. Detalhes
em `docs/adr/0004-infra-railway-no-painel.md`, secao sobre o webhook.

### 2026-08-08 — `style-src 'unsafe-inline'` no painel

**Regra:** `security.md` §3 — "CSP sem `unsafe-inline` no frontend".

**Estado:** `script-src 'self'` vale nos dois frontends, e a landing ja fechou tambem o `style-src`
(ver a secao de fechados). Resta o painel (`apps/frontend-panel/Caddyfile`): o
`@adatechnology/conversations-ui` usa `style={{...}}` em varios componentes, e o React aplica isso
como atributo inline. Atributo nao aceita hash sem `'unsafe-hashes'`, entao nao ha saida so pela
politica.

**Risco:** menor que o de `script-src` — CSS inline sozinho nao executa codigo. O que ele abre e
exfiltracao por seletor/`background: url(...)` e defacement em cenario onde ja existe injecao de
HTML. Ou seja: agrava um XSS, nao cria um. O painel e autenticado, o que estreita a superficie.

**Encaminhamento:** depende do `conversations-ui`. Enquanto o pacote usar `style={{...}}`, a
politica do painel nao fecha; o caminho e abrir a questao no repositorio do pacote — ou os
componentes passam a emitir classe com folha propria, ou expoem um modo que aceite
`adoptedStyleSheets`.

## Fechados

### 2026-08-08 — `style-src 'unsafe-inline'` na landing e no widget

Fechado no mesmo dia em que foi aberto. O `Caddyfile` da landing agora declara
`style-src 'self' https://fonts.googleapis.com`, sem `'unsafe-inline'`, e o `script-src` continua
`'self'`.

O que mudou:

1. **Folha da landing** — o bloco `<style>` de ~1400 linhas saiu do `index.html` para
   `apps/frontend-site/src/landing.css`, importado por `src/landingInteractions.js`. O Vite emite
   um `<link>` com hash, que passa em `style-src 'self'`.
2. **Atributos `style="..."`** — os 24 atributos inline viraram classe no `landing.css`
   (`badge-dot-indigo`, `bento-icon-cyan`, `egg-title`, ...). `grep -c 'style="' index.html` da `0`.
   Atributo nao poderia ser resolvido por hash sem `'unsafe-hashes'`; classe resolve.
3. **Widget** — `@adatechnology/web-chat-widget` (`src/widget.style.ts`) ganhou `applyWidgetStyle()`, que monta
   uma `CSSStyleSheet` construida e a atribui a `root.adoptedStyleSheets`. Folha adotada nao passa
   por `style-src`. O `<style>` continua como fallback para navegador sem folha construida
   (Safari < 16.4).

As escritas de estilo que sobraram no JS sao via CSSOM (`el.style.display = 'flex'`), que o
`style-src` nao intercepta.

**Verificacao:** o `dist` real foi servido com exatamente o CSP de producao e carregado no browser —
console limpo, zero violacao; dentro do shadow root do widget, `adoptedStyleSheets: 1` e
`styleTags: 0`; estilos computados conferidos na navegacao, no launcher, nos cards bento e no modal
do easter egg.

## 10/08/2026 — Token de System User do WhatsApp com escopo largo e sem expiracao

**Aberto.** O `WHATSAPP_ACCESS_TOKEN` de producao e um token de System User valido, sem expiracao
(`expires_at: 0`) e com 17 escopos: alem de `whatsapp_business_messaging` e
`whatsapp_business_management`, que sao os dois que a API usa, ele carrega `catalog_management`,
`instagram_content_publish`, `instagram_manage_messages`, `pages_read_engagement` e mais.

`security.md` §2 pede o oposto: escopo enumerado do que a integracao realmente usa, e token
rotacionavel. Token eterno e largo transforma vazamento de uma variavel de ambiente em acesso a
Instagram, catalogo e paginas — dano muito maior do que o canal de atendimento.

Agrava: o mesmo valor esta em dois servicos (`ada-technology/api` e `financiamento-imobiliario-bot/n8n`),
entao rotacionar exige atualizar os dois, e quem esquecer descobre pelo envio falhando calado.

**Acao:** criar um System User dedicado com so os dois escopos de WhatsApp, trocar a variavel nos
dois servicos e revogar o token largo. Enquanto nao for feito, o token nao pode aparecer em log,
terminal ou commit — nem mascarado.

## 10/08/2026 — WHATSAPP_APP_SECRET de producao nao pertence ao app

**Bloqueante para o canal, sem risco de exposicao.** O valor herdado do servico `n8n` nao e o app
secret do app `1017474297938142` (`AdA technology`), que e quem emitiu o access token. Comprovado por
duas vias: o app access token `app_id|app_secret` foi recusado com `Invalid OAuth access token
signature`, e o `appsecret_proof` calculado com ele foi recusado com `Invalid appsecret_proof`.

O modo de falhar e traicoeiro: o desafio `GET` do webhook usa o `WHATSAPP_WEBHOOK_VERIFY_TOKEN`, que
e nosso e esta correto, entao **a Meta valida e salva o webhook normalmente**. So depois, em cada
mensagem real, o `POST` morre em `401 META_WHATSAPP_INVALID_SIGNATURE` — canal aparentemente
configurado que nao entrega nada.

Que o n8n conviva com o valor errado indica que ele nao confere assinatura de webhook: entrada
publica aceita sem autenticacao, contra `security.md` §3. Vale auditar aquele fluxo.

**Acao:** copiar o segredo de Configuracoes do app -> Basico -> Chave secreta do app, e conferir com
o teste de `appsecret_proof` antes de anunciar o canal como pronto.

## 10/08/2026 — Politica de privacidade promete retencao e exclusao que nada automatiza

**Aberto.** A pagina `/privacidade` publicada hoje declara prazos concretos — conversas por 24
meses, trilha de auditoria por 5 anos, exclusao a pedido em ate 15 dias — e nenhum deles existe em
codigo. Nao ha rotina que expire conversa antiga, nem endpoint ou procedimento que apague um lead e
o historico dele a partir do telefone ou do e-mail. Hoje a promessa so se cumpre no braco, por
alguem rodando SQL a mao.

O risco nao e vazamento, e o inverso do minimizar do art. 6º, III da LGPD: dado que devia ter sido
eliminado continua no banco, e um pedido de exclusao (art. 18, VI) depende de memoria humana para
ser atendido dentro do prazo que a propria politica anuncia.

**Acao:** um `cron-` que elimina conversa sem mensagem ha 24 meses e auditoria com mais de 5 anos, e
um caso de uso de exclusao por titular que apague lead, conversa e mensagens numa transacao,
deixando so o registro de que a exclusao ocorreu. Enquanto nao existir, todo pedido de exclusao
precisa virar tarefa rastreada — nao pode morrer numa conversa de WhatsApp.
