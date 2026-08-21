# Contexto de build e a RAIZ do monorepo: `bun.lock` e `tsconfig.json` da raiz sao do workspace.
FROM oven/bun:1.3.14-slim AS build

WORKDIR /repo

# O `tsconfig.json` da raiz vem junto: os tsconfig de app fazem `extends: "../../tsconfig.json"`,
# e sem ele o `tsc` cai nos defaults e reprova o build inteiro.
COPY package.json bun.lock tsconfig.json ./
COPY apps/api-ada/package.json apps/api-ada/
COPY apps/frontend-panel/package.json apps/frontend-panel/
COPY apps/frontend-site/package.json apps/frontend-site/

RUN bun install --frozen-lockfile

COPY apps/frontend-site/ apps/frontend-site/

ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Producao e o default aqui tambem, e nao so no schema.
#
# `ARG` sem valor nao produz "variavel ausente": produz `ENV VITE_APP_ENV=`, e o Vite inlina a
# string vazia — que nao e o mesmo que `undefined` para o `.default()` do Zod. Foi assim que uma
# faixa de ambiente interno derrubou o JS da landing inteira. So dev e staging sobrescrevem.
ARG VITE_APP_ENV=production
ENV VITE_APP_ENV=$VITE_APP_ENV

RUN cd apps/frontend-site && bun run build

FROM caddy:2.10-alpine

COPY apps/frontend-site/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/frontend-site/dist /srv

EXPOSE 8080
