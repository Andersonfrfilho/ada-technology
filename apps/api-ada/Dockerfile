# Contexto de build e a RAIZ do monorepo, nao esta pasta: o `bun.lock` e os package.json dos outros
# workspaces precisam entrar para o install ser reprodutivel.
#
# Imagem pinada na mesma versao do Bun local (1.3.14) — "latest" faz o runtime mudar sozinho entre
# dois deploys do mesmo commit, e o bug aparece so em producao.
FROM oven/bun:1.3.14-slim

WORKDIR /repo

# Os manifests entram antes do codigo para o `bun install` virar camada de cache: mexer em `src/`
# nao reinstala nada.
COPY package.json bun.lock ./
COPY apps/api-ada/package.json apps/api-ada/
COPY apps/frontend-panel/package.json apps/frontend-panel/
COPY apps/frontend-site/package.json apps/frontend-site/

# `--frozen-lockfile`: a build falha se o lock divergir do manifest, em vez de resolver uma versao
# nova sem ninguem ver (security.md §4).
RUN bun install --frozen-lockfile

COPY apps/api-ada/ apps/api-ada/

ENV NODE_ENV=production
# O servidor le `API_PORT` do env validado; `PORT` fica junto porque e o nome que o Railway usa.
ENV PORT=8080
ENV API_PORT=8080

EXPOSE 8080

USER bun
WORKDIR /repo/apps/api-ada

CMD ["bun", "run", "src/index.ts"]
