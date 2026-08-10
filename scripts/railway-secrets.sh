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
# Rodar de novo troca o segredo. Trocar o `PANEL_JWT_SECRET` invalida os tokens em circulacao, que
# e exatamente o que se quer numa rotacao — todo mundo faz login de novo.

set -euo pipefail

ENVIRONMENT_NAME="${1:-}"

if [[ "$ENVIRONMENT_NAME" != "production" && "$ENVIRONMENT_NAME" != "staging" ]]; then
  echo "uso: $0 <production|staging>" >&2
  exit 1
fi

railway environment "$ENVIRONMENT_NAME" >/dev/null

# 48 bytes crus -> 64 caracteres em base64, bem acima do minimo de 32 do schema da API.
openssl rand -base64 48 | tr -d '\n' |
  railway variable set PANEL_JWT_SECRET --stdin --service api --skip-deploys >/dev/null

echo "PANEL_JWT_SECRET definido em $ENVIRONMENT_NAME (valor nunca impresso)"
