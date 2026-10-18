# Página de ambiente desligado

Quando um serviço do Railway está parado, a borda do Railway responde `502 Application failed to
respond`, em JSON, e isso não pode ser trocado nos domínios `*.up.railway.app`. Esta pasta tem a página
que aparece no lugar, com o logo da Ada Technology e o 🚧, e um Worker do Cloudflare que a serve.

## Como funciona

- `index.html`: página única, sem dependência além da fonte Space Grotesk. Mostra o nome do ambiente e o
  rodapé de copyright da Ada Technology. Sem informação interna (nada de caminho do painel).
- `worker.js`: repassa a requisição ao Railway. Só quando a resposta é o 502 do próprio Railway
  (`x-railway-fallback: true`) devolve a página, com status `503`, `Cache-Control: no-store` e
  `Retry-After`. Qualquer outra resposta, inclusive um 502 da aplicação, passa como veio.
- `wrangler.toml`: nome do ambiente em `ENVIRONMENT_NAME` e a rota do domínio.

## Uso

Exige um **domínio próprio** da Ada na zona do Cloudflare, apontando para o domínio do serviço no Railway
(o Worker roda na frente dele). Em `wrangler.toml`, descomente `routes` com o domínio real e rode:

```bash
npx wrangler deploy
```

Um Worker por ambiente (ou um por rota, com `ENVIRONMENT_NAME` diferente). Nada disso liga serviços ou
altera o Railway.

## Teste

```bash
bun test infra/offline-page
```
