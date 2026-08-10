# Achados de seguranca

Registro exigido pelo `security.md` §10: achado vira item com data, nao some no historico do chat.
Item so sai daqui quando esta resolvido — e ai fica na secao de fechados, com a data.

## Abertos

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
3. **Widget** — `packages/chat-widget/src/widget.style.ts` ganhou `applyWidgetStyle()`, que monta
   uma `CSSStyleSheet` construida e a atribui a `root.adoptedStyleSheets`. Folha adotada nao passa
   por `style-src`. O `<style>` continua como fallback para navegador sem folha construida
   (Safari < 16.4).

As escritas de estilo que sobraram no JS sao via CSSOM (`el.style.display = 'flex'`), que o
`style-src` nao intercepta.

**Verificacao:** o `dist` real foi servido com exatamente o CSP de producao e carregado no browser —
console limpo, zero violacao; dentro do shadow root do widget, `adoptedStyleSheets: 1` e
`styleTags: 0`; estilos computados conferidos na navegacao, no launcher, nos cards bento e no modal
do easter egg.
