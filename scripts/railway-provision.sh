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
# O segundo argumento escolhe qual dominio e o principal:
#
#   ./scripts/railway-provision.sh production custom
#
# `railway` (padrao) aponta API_PUBLIC_URL, VITE_API_BASE_URL e API_ORIGIN para o dominio
# `*.up.railway.app`; `custom` aponta para o dominio proprio. Rodar com `custom` antes do DNS
# resolver derruba o painel, porque `VITE_API_BASE_URL` e inlinado na build e o `connect-src` do
# CSP passa a citar um host que ainda nao existe. As allowlists (CORS e widget) sempre citam os
# dois, e por isso podem ser escritas antes: lista permissiva com host inexistente nao permite nada.
#
# O que ele NAO faz, de proposito:
#   - `PANEL_JWT_SECRET`: gerado por `railway-secrets.sh`, que le de /dev/urandom e escreve por
#     stdin. Segredo que aparece no terminal e segredo queimado (`security.md` §4).
#   - `WHATSAPP_ACCESS_TOKEN` e `WHATSAPP_APP_SECRET`: nascem na Meta, entram pelo painel do
#     Railway. O `WHATSAPP_WEBHOOK_VERIFY_TOKEN` e nosso e sai de `railway-secrets.sh whatsapp`.
#     Com `WHATSAPP_ENABLED=true` e qualquer um deles vazio a API nao sobe (fail-closed no zod), e o
#     healthcheck mantem a versao antiga no ar em vez de publicar a quebrada.
#   - Conectar o repositorio do GitHub ao servico: exige o GitHub App do Railway autorizado na
#     conta, que e um passo de OAuth no navegador. Depois disso, `railway-connect-repo.sh`.

set -euo pipefail

ENVIRONMENT_NAME="${1:-}"
PRIMARY_DOMAIN_KIND="${2:-railway}"

if [[ "$ENVIRONMENT_NAME" != "production" && "$ENVIRONMENT_NAME" != "staging" ]]; then
  echo "uso: $0 <production|staging> [railway|custom]" >&2
  exit 1
fi

if [[ "$PRIMARY_DOMAIN_KIND" != "railway" && "$PRIMARY_DOMAIN_KIND" != "custom" ]]; then
  echo "uso: $0 <production|staging> [railway|custom]" >&2
  exit 1
fi

PROJECT_NAME="ada"
COMPANY_ID="fb2298b4-084d-4f12-bd98-df5b46a13bb1"
APP_SERVICES=(api panel site)
MAILPIT_SERVICE="mailpit"
MAILPIT_IMAGE="axllent/mailpit:v1.31.0"

# Dominios proprios de cada ambiente. Criar o dominio no Railway e trabalho de
# `railway-domains.py`; aqui eles so entram nas variaveis.
#
# Cada ambiente tem o seu numero, e nao por preciosismo: `WHATSAPP_PHONE_NUMBER_ID` e o
# REMETENTE. Repetir o numero de producao aqui faria um teste no staging responder pelo numero
# real, na conversa real do cliente — o webhook nao filtra por `phone_number_id`, entao quem
# recebe processa tudo o que a Meta entregar.
if [[ "$ENVIRONMENT_NAME" == "production" ]]; then
  CUSTOM_API="https://api.adatechnology.com.br"
  CUSTOM_PANEL="https://painel.adatechnology.com.br"
  CUSTOM_SITE="https://adatechnology.com.br"
  CUSTOM_SITE_ALTERNATE="https://www.adatechnology.com.br"
  WHATSAPP_PHONE_NUMBER_ID="1129051206965973"
  EMAIL_FROM="Ada <nao-responda@adatechnology.com.br>"
  # A Railway nao tem produto de e-mail transacional, e servidor de e-mail proprio la nao entrega:
  # IP compartilhado sem reputacao, sem dominio verificado com DKIM, porta 25 de saida bloqueada.
  # Producao espera provedor externo — vazio ate a chave existir, e o modulo responde
  # `hasEmail: false` em vez de a API subir quebrada.
  EMAIL_DRIVER=""
  EMAIL_SMTP_URL=""
else
  CUSTOM_API="https://api.staging.adatechnology.com.br"
  CUSTOM_PANEL="https://painel.staging.adatechnology.com.br"
  CUSTOM_SITE="https://staging.adatechnology.com.br"
  CUSTOM_SITE_ALTERNATE=""
  # Numero de teste da Meta (WhatsApp -> Configuracao da API -> seletor "De"). Preencher aqui e o
  # unico passo que liga o canal no staging.
  WHATSAPP_PHONE_NUMBER_ID=""
  EMAIL_FROM="Ada <nao-responda@staging.adatechnology.com.br>"
  # Endereco de cliente em staging costuma ser real: um envio de verdade queimaria reputacao de
  # dominio por engano. Tudo cai na caixa interna, que nao tem rota para fora.
  EMAIL_DRIVER="smtp"
  EMAIL_SMTP_URL="smtp://${MAILPIT_SERVICE}.railway.internal:1025"
fi

# Os 4 numeros vivem na mesma conta de negocio, entao a WABA e a mesma nos dois ambientes.
WHATSAPP_BUSINESS_ACCOUNT_ID="1331187315501590"

# O canal liga por consequencia de existir numero, nunca por um `true` escrito a mao: com
# `WHATSAPP_ENABLED=true` e `WHATSAPP_PHONE_NUMBER_ID` vazio o zod recusa subir a API
# (`environment.ts`), e um deploy que nao sobe e pior do que um canal desligado.
if [[ -n "$WHATSAPP_PHONE_NUMBER_ID" ]]; then
  WHATSAPP_ENABLED="true"
else
  WHATSAPP_ENABLED="false"
fi

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

variable_exists() {
  local service="$1" key="$2"
  railway variable list --service "$service" --json 2>/dev/null |
    /usr/bin/python3 -c "
import json, sys
try:
    print(bool(json.load(sys.stdin).get(sys.argv[1])))
except Exception:
    print(False)
" "$key" |
    /usr/bin/grep -q True
}

ensure_image_service() {
  local service="$1" image="$2"
  if service_exists "$service"; then
    echo "--> servico $service (ja existe)"
    return
  fi
  echo "--> servico $service ($image)"
  railway add --service "$service" --image "$image" --json >/dev/null
}

read_domain() {
  local service="$1"
  local port="${2:-8080}"
  railway domain --service "$service" --port "$port" --json 2>/dev/null |
    /usr/bin/python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("domain") or d["domains"][0])'
}

set_variables() {
  local service="$1"
  shift
  for pair in "$@"; do
    # A CLI recusa `CHAVE=` com "Invalid variable format". Valor vazio aqui significa capacidade
    # desligada, e no schema da API a chave ausente ja cai no `.default('')` — entao apagar e a
    # traducao fiel, e mantem o script reversivel: religar e desligar levam ao mesmo estado.
    if [[ "$pair" == *= ]]; then
      railway variable delete "${pair%=}" --service "$service" >/dev/null 2>&1 || true
    else
      railway variable set "$pair" --service "$service" --skip-deploys >/dev/null
    fi
  done
  echo "--> $service: ${#} variaveis"
}

ensure_database postgres Postgres
ensure_database redis Redis
for service in "${APP_SERVICES[@]}"; do ensure_service "$service"; done
if [[ "$EMAIL_DRIVER" == "smtp" ]]; then ensure_image_service "$MAILPIT_SERVICE" "$MAILPIT_IMAGE"; fi

API_URL="$(read_domain api)"
PANEL_URL="$(read_domain panel)"
SITE_URL="$(read_domain site)"

echo "==> dominios"
echo "    api   $API_URL"
echo "    panel $PANEL_URL"
echo "    site  $SITE_URL"

CORS_ORIGINS="$PANEL_URL,$SITE_URL,$CUSTOM_PANEL,$CUSTOM_SITE"
WIDGET_ORIGINS="$SITE_URL,$CUSTOM_SITE"
if [[ -n "$CUSTOM_SITE_ALTERNATE" ]]; then
  CORS_ORIGINS="$CORS_ORIGINS,$CUSTOM_SITE_ALTERNATE"
  WIDGET_ORIGINS="$WIDGET_ORIGINS,$CUSTOM_SITE_ALTERNATE"
fi

if [[ "$PRIMARY_DOMAIN_KIND" == "custom" ]]; then
  API_URL="$CUSTOM_API"
  PANEL_URL="$CUSTOM_PANEL"
fi
echo "    api principal: $API_URL"

# O link do e-mail de redefinicao e clicado pelo usuario, entao sai no dominio principal do painel,
# nao no `*.up.railway.app`. `{token}` e literal: o modulo troca na hora do envio, e se o
# marcador sumir a API recusa subir (`ConfigMissingError`).
PANEL_RESET_URL_TEMPLATE="$PANEL_URL/reset-password?token={token}"

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
  "CORS_ALLOWED_ORIGINS=$CORS_ORIGINS" \
  "WIDGET_ALLOWED_ORIGINS=$WIDGET_ORIGINS" \
  "PANEL_ACCESS_TOKEN_TTL_MINUTES=15" \
  "PANEL_RESET_URL_TEMPLATE=$PANEL_RESET_URL_TEMPLATE" \
  "EMAIL_DRIVER=$EMAIL_DRIVER" \
  "EMAIL_FROM=$EMAIL_FROM" \
  "EMAIL_SMTP_URL=$EMAIL_SMTP_URL" \
  "EMAIL_SES_REGION=us-east-1" \
  "WHATSAPP_ENABLED=$WHATSAPP_ENABLED" \
  "WHATSAPP_PHONE_NUMBER_ID=$WHATSAPP_PHONE_NUMBER_ID" \
  "WHATSAPP_BUSINESS_ACCOUNT_ID=$WHATSAPP_BUSINESS_ACCOUNT_ID" \
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

if [[ "$EMAIL_DRIVER" == "smtp" ]]; then
  # Rede privada da Railway e IPv6: escutando so em 0.0.0.0 o `mailpit.railway.internal` nao
  # resolve para nada e o envio falha por timeout, nao por erro claro.
  # A borda do Railway roteia pela `PORT` quando o dominio nao tem porta-alvo, e o Mailpit ignora
  # essa variavel — sem os tres numeros batendo, o dominio responde 502 com o container saudavel.
  set_variables "$MAILPIT_SERVICE" \
    "PORT=8025" \
    "MP_SMTP_BIND_ADDR=[::]:1025" \
    "MP_UI_BIND_ADDR=[::]:8025" \
    "MP_MAX_MESSAGES=500" \
    "MP_SMTP_AUTH_ACCEPT_ANY=1" \
    "MP_SMTP_AUTH_ALLOW_INSECURE=1"

  # A caixa guarda e-mail de cliente. Fail-closed: o dominio publico so nasce depois que a senha
  # existe, senao a primeira execucao deixaria a UI aberta ate alguem lembrar do outro script.
  if variable_exists "$MAILPIT_SERVICE" MP_UI_AUTH; then
    MAILPIT_URL="$(read_domain "$MAILPIT_SERVICE" 8025)"
    echo "    caixa de entrada: $MAILPIT_URL"
  else
    echo "--> caixa de entrada sem dominio: rode ./scripts/railway-secrets.sh $ENVIRONMENT_NAME mailpit-ui e repita"
  fi
fi

echo
echo "==> proximos passos:"
echo "    1. ./scripts/railway-secrets.sh $ENVIRONMENT_NAME   (gera o PANEL_JWT_SECRET sem imprimir)"
if [[ "$EMAIL_DRIVER" == "smtp" ]]; then
  echo "       ./scripts/railway-secrets.sh $ENVIRONMENT_NAME mailpit-ui   (senha da caixa de entrada)"
fi
echo "    2. ./scripts/railway-domains.py              (dominios proprios + registros de DNS)"
echo "    3. ./scripts/railway-redeploy.py $ENVIRONMENT_NAME   (as variaveis acima so valem na proxima build)"
