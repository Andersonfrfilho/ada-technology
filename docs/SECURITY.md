# Achados de seguranca

Registro exigido pelo `security.md` §10: achado vira item com data, nao some no historico do chat.
Item so sai daqui quando esta resolvido — e ai fica na secao de fechados, com a data.

## Abertos

### 2026-10-09 — Token de workspace do Railway na `api-ada`

**Regra:** `security.md` §2 (escopo enumerado e token rotacionavel, nada de credencial larga e eterna)
e §4 (segredo so como variavel validada, nunca em log ou terminal).

**Estado:** aberto. Vale a partir da configuracao do token na `api` de producao, pelo painel (Infra › Integração)
ou pela variavel `RAILWAY_API_TOKEN`, conforme `docs/deploy-railway.md`, secao 11. O achado seguinte trata do
token guardado no banco. Nao ha forma de reduzir o poder do token: o de
projeto nao serve, porque enxerga um ambiente so (ADR 0004, D1).

**Risco:** o token age sobre **todos** os projetos do workspace Railway, com o que um membro faz pela
API: apaga servicos, volumes e projetos, le variaveis de producao (`DATABASE_URL`, chaves da Meta,
segredos de JWT) e troca a imagem de um deploy. A `api` passa a guardar o segredo mais poderoso do
workspace. Por isso ele e o item de maior impacto desta lista.

**Mitigacoes em vigor:**

- documentos GraphQL fixos em `RailwayGateway.ts`; nenhuma consulta monta texto a partir de entrada;
- token so na `api` de producao, pelo painel (cifrado no banco) ou pela variavel; vazio em dev, test, staging e CI;
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
2. salvar o token novo em Infra › Integração (ou trocar `RAILWAY_API_TOKEN` somente na `api` de producao, se a variavel for a fonte);
3. conferir que `GET /v1/panel/infra/environments` responde com `access` `ok`;
4. revogar o token antigo.

**Vazamento (suspeita ou confirmacao):**

1. revogar o token no Railway, sem esperar;
2. criar outro e salvar em Infra › Integração (ou trocar a variavel, se ela for a fonte);
3. tratar como queimados os segredos de **todos** os projetos do workspace (banco, Meta, JWT, S3,
   e-mail) e rotaciona-los, porque o token permitia le-los;
4. revisar no Railway os deployments e as mudancas de variaveis desde a data provavel do vazamento.

**Risco operacional ligado ao mesmo modulo:** com staging desligado pela agenda, o webhook do WhatsApp
responde erro, e a Meta reenvia por ate 7 dias com uma rajada ao religar. O dedup de 300 s depende de
`x-request-id`, que ainda nao foi confirmado que a Meta envia; sem ele, o dedup nao deduplica. Detalhes
em `docs/adr/0004-infra-railway-no-painel.md`, secao sobre o webhook.

### 2026-10-09 — Token do Railway guardado no banco (configuracao pelo painel)

**Regra:** `security.md` §2 (token rotacionavel, escopo enumerado), §4 (segredo so como variavel validada,
nunca em log ou terminal) e §5 (campo sensivel em repouso criptografado, com chave separada da do banco).

**Estado:** aberto. Implementado pela spec 002 (ADR 0005), tarefas T0 a T5. Falta a verificacao com um token de
workspace real (roteiro manual, T6.4), a revisao independente (T6.3) e a API real ponta a ponta (T6.1). Desde
a configuracao pelo painel, o token nao depende so de variavel de ambiente: fica cifrado na tabela
`infra_integration_secrets`.

**Mitigacoes em vigor:**

- AES-256-GCM com `node:crypto`; IV aleatorio de 12 bytes a cada gravacao; tag de 16 bytes; dado autenticado
  `ada.infra.railway-token|<key_id>|<provider>|<workspace_id>`, que impede copiar o cifrado para outra linha ou
  outro workspace;
- chave em `INFRA_SECRET_ENCRYPTION_KEY` (32 bytes), so em `ENV=production`, diferente de `PANEL_JWT_SECRET`,
  recusada no boot se invalida; a chave nunca fica no banco;
- a API nunca devolve o token, cifrado ou em claro; a tela mostra so os 4 ultimos caracteres, que nunca entram
  na auditoria; todas as respostas sao `no-store`;
- `PUT` e `DELETE` exigem a senha do admin, relida no banco (papel e `isActive` naquele instante); 5 falhas em
  15 min revogam as sessoes do agente e bloqueiam a integracao por 15 min;
- o token e testado no Railway antes de gravar; o workspace vem de `RAILWAY_WORKSPACE_ID`, nunca do formulario;
  token de conta e recusado; nada e gravado em falha;
- logs redigidos por substring (`token`, `password`, `secret`, `ciphertext`, `encryptionkey`); metadata de
  auditoria em tipo fechado; o filtro de excecao nao loga a mensagem de erro do banco, que carrega os parametros
  da consulta;
- formulario sem captura por gerenciador de senha e sem storage do navegador; campo limpo ao salvar, ao falhar e
  ao desmontar;
- fonte unica e fail closed: linha ilegivel deixa o modulo indisponivel, sem cair para outra credencial.

**Chave perdida ou trocada:** o cifrado so abre com a chave que o gravou. Se `INFRA_SECRET_ENCRYPTION_KEY` mudar
ou sumir, o estado vira `key_mismatch` ou `key_missing`, o modulo responde `503` e nenhuma outra credencial e
usada. Na v1 nao ha duas chaves. Procedimento:

1. gerar a chave nova com `openssl rand -base64 32` e definir na `api` de producao (sem colar em chat);
2. esperar o deploy da `api`;
3. informar o token em Infra › Integração, com a senha do admin. A Ada nao consegue recuperar o token original:
   se o valor nao estiver mais disponivel, criar outro em `railway.com/account/tokens`;
4. revogar o token antigo no Railway.

**Remover ou trocar nao revoga no Railway:** apagar a linha pelo painel apaga o cifrado do banco e nao faz o
Railway recusar o token. A tela avisa isso. Quem precisa encerrar o acesso revoga o token em
`railway.com/account/tokens`. Quem ainda tiver um backup do banco e a chave antiga consegue decifrar o token
antigo; so a revogacao no Railway o invalida.

**O que a auditoria nao cobre:**

- uso do token fora da Ada (console, CLI, script com o valor copiado): nao aparece na auditoria da Ada;
- leitura conjunta do banco e das variaveis do Railway: quem le as duas coisas decifra o token. A cifra cobre
  dump, backup e leitura SQL, nao esse caso (risco aceito, ADR 0005, T8);
- o `GET` de estado nao e auditado. A auditoria cobre configurar, trocar, remover, verificar, recusar e bloquear
  (`infra.integration_*`), sempre com ator, IP e motivo, nunca com o token;
- falha ao gravar a auditoria depois de salvar: o segredo fica sem linha de auditoria (autor e data saem da
  propria linha de `infra_integration_secrets`);
- admin com sessao roubada: a senha acrescenta um passo e um rastro, mas quem tem a sessao e a senha pode criar
  um admin novo e confirmar com ele (ADR 0005, D2).

**Riscos abertos do ADR 0005:**

- sessao admin roubada: a confirmacao por senha nao fecha esse caminho enquanto criar e promover admin nao
  exigir a mesma senha (ADR 0005, ponto 4);
- XSS residual na tela de Integracao: o CSP `script-src 'self'` e a ausencia de HTML injetado reduzem o risco; o
  resto e supply chain;
- banco e chave no mesmo cofre de variaveis que o `DATABASE_URL`;
- `X-Real-IP` nao verificado no proxy do Railway: o codigo usa o cabecalho, mas falta confirmar que o proxy
  sobrescreve um `X-Real-IP` enviado pelo cliente (ADR 0005, ponto 5);
- `me` negado a token de workspace nao verificado com token real: se o Railway responder `me` a um token de
  workspace, ele sera recusado como amplo demais, e a premissa precisa ser revista (ADR 0005, ponto 1; T6.4);
- 13 achados `high` do `bun audit`, fora do caminho do token, em aberto (ADR 0005, ponto 6);
- `-webkit-text-security` nao tem suporte no Firefox: o campo do token nao aparece mascarado nesse navegador, e a
  conferencia de gerenciador de senha nele segue manual (RF13).

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

## 2026-10-09 — CORS com credenciais, refresh e IP do cliente (RF14)

**Corrigido no código; verificação em navegador real e na Railway pendente.** `Access-Control-Allow-Credentials`
só sai para origens de `CORS_ALLOWED_ORIGINS` (painel); origens só do widget recebem o CORS sem credenciais.
`POST /v1/auth/refresh` responde 401 `AGENT_NOT_AUTHENTICATED` se `Origin` não for do painel. O IP de rate limit e
auditoria vem de `X-Real-IP` (que a Railway documenta como o cliente remoto), com `X-Forwarded-For` ignorado.

**Risco residual:** origem listada nas DUAS variáveis continua com credenciais (escolha do operador); em
`ENV=production` o boot loga um `warn` com as origens em comum. Fora do painel não deve haver origem repetida.
