# Contexto de build e a RAIZ do monorepo.
FROM oven/bun:1.3.14-slim AS build

WORKDIR /repo

# O `tsconfig.json` da raiz vem junto: os tsconfig de app fazem `extends: "../../tsconfig.json"`,
# e sem ele o `tsc` cai nos defaults e reprova o build inteiro.
COPY package.json bun.lock tsconfig.json ./
COPY apps/api-ada/package.json apps/api-ada/
COPY apps/frontend-panel/package.json apps/frontend-panel/
COPY apps/frontend-site/package.json apps/frontend-site/
# Workspaces: sem o manifest de CADA um aqui, o `bun install` recusa a resolver — mesmo que o
# Dockerfile copie `packages/` inteiro depois, porque o install roda antes dessa copia. Pacote novo
# em `packages/` entra nesta lista, nos tres Dockerfiles.
COPY packages/user-sdk/package.json packages/user-sdk/
COPY packages/email-layout/package.json packages/email-layout/

RUN bun install --frozen-lockfile

COPY packages/ packages/
COPY apps/frontend-panel/ apps/frontend-panel/

# `VITE_*` e inlinado no bundle, entao a origem da API precisa existir na BUILD, nao no runtime.
# Nao e segredo — e justamente por isso que so URL publica pode entrar com esse prefixo.
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

# Producao e o default aqui tambem, e nao so no schema: `ARG` sem valor produz `ENV VITE_APP_ENV=`,
# e a string vazia inlinada no bundle nao e o mesmo que `undefined` para o `.default()` do Zod.
ARG VITE_APP_ENV=production
ENV VITE_APP_ENV=$VITE_APP_ENV

# `build` roda `tsc --noEmit` antes do vite: bundle nao sai de codigo que nao tipa.
RUN cd apps/frontend-panel && bun run build

FROM caddy:2.10-alpine

COPY apps/frontend-panel/Caddyfile /etc/caddy/Caddyfile
COPY --from=build /repo/apps/frontend-panel/dist /srv

EXPOSE 8080
