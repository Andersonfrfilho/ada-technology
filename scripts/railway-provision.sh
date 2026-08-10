#!/usr/bin/env bash
#
# Copyright (c) 2026 Ada Technology. All rights reserved.
#
# This source code is proprietary and confidential. Unauthorized copying,
# modification, distribution, or use of this file, via any medium, is
# strictly prohibited without prior written permission from Ada Technology.
#
# Provisiona um ambiente do projeto Railway `ada-technology`.
#
# Idempotente: rodar duas vezes nao duplica servico, dominio nem variavel.
#
#   ./scripts/railway-provision.sh production
#   ./scripts/railway-provision.sh staging
#
# O que ele NAO faz, de proposito:
#   - `PANEL_JWT_SECRET`: gerado por `railway-secrets.sh`, que le de /dev/urandom e escreve por
#     stdin. Segredo que aparece no terminal e segredo queimado (`security.md` §4).
#   - Credenciais do WhatsApp: sao da Meta, entram no painel do Railway quando existirem.
#   - Conectar o repositorio do GitHub ao servico: exige o GitHub App do Railway autorizado na
#     conta, que e um passo de OAuth no navegador. Depois disso, `railway-connect-repo.sh`.

set -euo pipefail

ENVIRONMENT_NAME="${1:-}"

if [[ "$ENVIRONMENT_NAME" != "production" && "$ENVIRONMENT_NAME" != "staging" ]]; then
  echo "uso: $0 <production|staging>" >&2
  exit 1
fi

PROJECT_NAME="ada"
COMPANY_ID="fb2298b4-084d-4f12-bd98-df5b46a13bb1"
APP_SERVICES=(api panel site)

echo "==> ambiente $ENVIRONMENT_NAME"
railway environment "$ENVIRONMENT_NAME" >/dev/null

# `railway add` nao reconcilia: chamado duas vezes ele cria `Postgres` e `Postgres-bg59`, cada um
# com seu volume. Por isso a checagem de existencia vem antes, e nao um `|| true` em cima do erro.
service_exists() {
  railway service list --json 2>/dev/null |
    /usr/bin/python3 -c "import json,sys; print(any(s['name']==sys.argv[1] for s in json.load(sys.stdin)))" "$1" |
    /usr/bin/grep -q True
}

ensure_database() {
  local database="$1" service="$2"
  if service_exists "$service"; then
    echo "--> banco $service (ja existe)"
    return
  fi
  echo "--> banco $service"
  railway add --database "$database" --json >/dev/null
}

ensure_service() {
  local service="$1"
  if service_exists "$service"; then
    echo "--> servico $service (ja existe)"
    return
  fi
  echo "--> servico $service"
  railway add --service "$service" --json >/dev/null
}

read_domain() {
  local service="$1"
  railway domain --service "$service" --port 8080 --json 2>/dev/null |
    /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("domain") or d["domains"][0])'
}

set_variables() {
  local service="$1"
  shift
  for pair in "$@"; do
    railway variable set "$pair" --service "$service" --skip-deploys >/dev/null
  done
  echo "--> $service: ${#} variaveis"
}

ensure_database postgres Postgres
ensure_database redis Redis
for service in "${APP_SERVICES[@]}"; do ensure_service "$service"; done

API_URL="$(read_domain api)"
PANEL_URL="$(read_domain panel)"
SITE_URL="$(read_domain site)"

echo "==> dominios"
echo "    api   $API_URL"
echo "    panel $PANEL_URL"
echo "    site  $SITE_URL"

# `PORT` e o que o Railway injeta e o que o Caddy le; `API_PORT` e o nome no schema zod da API.
# Os dois precisam existir e coincidir, senao o healthcheck bate numa porta onde ninguem escuta.
set_variables api \
  "PROJECT_NAME=$PROJECT_NAME" \
  "ENV=$ENVIRONMENT_NAME" \
  "NODE_ENV=production" \
  "APP_NAME=api-ada" \
  "PORT=8080" \
  "API_PORT=8080" \
  "API_PUBLIC_URL=$API_URL" \
  "LOG_LEVEL=info" \
  'DATABASE_URL=${{Postgres.DATABASE_URL}}' \
  'REDIS_URL=${{Redis.REDIS_URL}}' \
  "ADA_COMPANY_ID=$COMPANY_ID" \
  "CORS_ALLOWED_ORIGINS=$PANEL_URL,$SITE_URL" \
  "WIDGET_ALLOWED_ORIGINS=$SITE_URL" \
  "PANEL_ACCESS_TOKEN_TTL_MINUTES=15" \
  "WHATSAPP_ENABLED=false" \
  "WHATSAPP_GRAPH_BASE_URL=https://graph.facebook.com" \
  "INTENT_CLASSIFIER_ENABLED=false" \
  "GROQ_MODEL=llama-3.3-70b-versatile"

# `VITE_API_BASE_URL` e inlinado no bundle pela build, `API_ORIGIN` e lido pelo Caddy no runtime
# para montar o `connect-src` do CSP. Trocar o dominio da API exige rebuild dos dois frontends.
for service in panel site; do
  set_variables "$service" \
    "PORT=8080" \
    "VITE_API_BASE_URL=$API_URL" \
    "API_ORIGIN=$API_URL"
done

echo
echo "==> falta, e so voce pode fazer:"
echo "    1. ./scripts/railway-secrets.sh $ENVIRONMENT_NAME   (gera o PANEL_JWT_SECRET sem imprimir)"
echo "    2. conectar o repo aos servicos api/panel/site (GitHub App do Railway)"
