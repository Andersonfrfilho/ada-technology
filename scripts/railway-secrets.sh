#!/usr/bin/env bash
#
# Copyright (c) 2026 Ada Technology. All rights reserved.
#
# This source code is proprietary and confidential. Unauthorized copying,
# modification, distribution, or use of this file, via any medium, is
# strictly prohibited without prior written permission from Ada Technology.
#
# Gera e envia os segredos de um ambiente do Railway sem que eles passem pelo terminal.
#
#   ./scripts/railway-secrets.sh production
#
# `security.md` §4: segredo que aparece em terminal, CI ou log e segredo queimado. Por isso o valor
# sai do /dev/urandom e entra no `railway variable set --stdin` pelo pipe — nunca vira argumento de
# linha de comando (visivel no `ps`), nunca e ecoado, nunca toca o historico do shell.
#
# O segundo argumento escolhe o segredo, porque rodar de novo TROCA o valor:
#
#   ./scripts/railway-secrets.sh production            # PANEL_JWT_SECRET
#   ./scripts/railway-secrets.sh production whatsapp   # WHATSAPP_WEBHOOK_VERIFY_TOKEN
#
# `groq` e a excecao: a chave e emitida pela Groq, entao ela entra pelo pipe em vez de ser gerada.
#
#   textutil -convert txt -stdout chave.rtf | grep -o 'gsk_[A-Za-z0-9]*' |
#     ./scripts/railway-secrets.sh staging groq
#
# Trocar o `PANEL_JWT_SECRET` invalida os tokens em circulacao, que e exatamente o que se quer numa
# rotacao — todo mundo faz login de novo. Trocar o verify token do WhatsApp obriga a colar o valor
# novo no webhook da Meta, senao a revalidacao dela falha e o numero para de entregar mensagem.
#
# Os dois valores ficam legiveis no painel do Railway, que e de onde se copia o verify token para a
# Meta. Nao ha como ser de outro jeito: a Meta precisa do mesmo segredo dos dois lados.

set -euo pipefail

ENVIRONMENT_NAME="${1:-}"
SECRET_NAME="${2:-panel-jwt}"

if [[ "$ENVIRONMENT_NAME" != "production" && "$ENVIRONMENT_NAME" != "staging" ]]; then
  echo "uso: $0 <production|staging> [panel-jwt|whatsapp]" >&2
  exit 1
fi

case "$SECRET_NAME" in
  panel-jwt) VARIABLE_NAME="PANEL_JWT_SECRET" ;;
  whatsapp) VARIABLE_NAME="WHATSAPP_WEBHOOK_VERIFY_TOKEN" ;;
  # Segredo de terceiro nao se gera: ele chega pelo pipe, e o mesmo cuidado vale — nunca argumento.
  groq) VARIABLE_NAME="GROQ_API_KEY" ;;
  *)
    echo "uso: $0 <production|staging> [panel-jwt|whatsapp|groq]" >&2
    exit 1
    ;;
esac

railway environment "$ENVIRONMENT_NAME" >/dev/null

if [[ "$SECRET_NAME" == "groq" ]]; then
  if [ -t 0 ]; then
    echo "$VARIABLE_NAME vem de fora: passe o valor pelo pipe, nunca como argumento" >&2
    exit 1
  fi
  tr -d '\n' <&0 |
    railway variable set "$VARIABLE_NAME" --stdin --service api --skip-deploys >/dev/null
else
  # 48 bytes crus -> 64 caracteres em base64, bem acima do minimo de 32 do schema da API.
  openssl rand -base64 48 | tr -d '\n' |
    railway variable set "$VARIABLE_NAME" --stdin --service api --skip-deploys >/dev/null
fi

echo "$VARIABLE_NAME definido em $ENVIRONMENT_NAME (valor nunca impresso)"
