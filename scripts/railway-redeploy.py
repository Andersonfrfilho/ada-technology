#!/usr/bin/env python3
"""
Copyright (c) 2026 Ada Technology. All rights reserved.

This source code is proprietary and confidential. Unauthorized copying,
modification, distribution, or use of this file, via any medium, is
strictly prohibited without prior written permission from Ada Technology.

Dispara build nova dos servicos de um ambiente, a partir do ultimo commit do branch conectado.

    ./scripts/railway-redeploy.py production
    ./scripts/railway-redeploy.py staging panel site

`railway-provision.sh` escreve as variaveis com `--skip-deploys` de proposito: dezoito variaveis
viram dezoito deploys em cascata, e os intermediarios sobem com configuracao pela metade. O preco e
que a troca so vale no proximo deploy, e e este script que o provoca.

Por que nao `railway redeploy`: ele reaproveita a imagem ja construida. `VITE_API_BASE_URL` e
inlinado no bundle pelo Vite, entao trocar o dominio da API sem rebuild nao muda nada no frontend.
`latestCommit: true` forca o caminho completo, build inclusive.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Optional

RAILWAY_CONFIG = os.path.expanduser("~/.railway/config.json")
GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2"

ENVIRONMENT_IDS = {
    "production": "f9ddc420-b973-4176-92dd-64a6f940ae96",
    "staging": "a677c87f-1353-4a02-b87d-322614aa1655",
}
SERVICE_IDS = {
    "api": "40efe158-a1a0-4d05-aad1-0b350f1a5ef2",
    "panel": "8a385bf1-cd09-4f27-a1a1-4527cde13d0d",
    "site": "bec0ae76-3f89-4fae-abc4-70685930d86f",
}


def call(query: str, variables: Optional[dict] = None) -> dict:
    # O token e o da sessao da CLI (`railway login`); nunca e impresso nem gravado em outro lugar.
    token = json.load(open(RAILWAY_CONFIG))["user"]["accessToken"]
    request = urllib.request.Request(
        GRAPHQL_ENDPOINT,
        data=json.dumps({"query": query, "variables": variables or {}}).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token,
            # Sem User-Agent proprio a borda do Railway responde 403 antes do GraphQL.
            "User-Agent": "ada-technology/railway-redeploy",
        },
    )
    try:
        with urllib.request.urlopen(request) as response:
            payload = json.load(response)
    except urllib.error.HTTPError as error:
        raise SystemExit(f"HTTP {error.code}: {error.read().decode()[:400]}")

    if "errors" in payload:
        raise SystemExit(json.dumps(payload["errors"], indent=2))

    return payload["data"]


def deploy(environment: str, service: str) -> None:
    call(
        """
        mutation ($environmentId: String!, $serviceId: String!) {
          serviceInstanceDeploy(
            environmentId: $environmentId
            serviceId: $serviceId
            latestCommit: true
          )
        }
        """,
        {"environmentId": ENVIRONMENT_IDS[environment], "serviceId": SERVICE_IDS[service]},
    )


def main() -> None:
    arguments = sys.argv[1:]
    environment = arguments[0] if arguments else ""
    services = arguments[1:] or list(SERVICE_IDS)

    if environment not in ENVIRONMENT_IDS or any(s not in SERVICE_IDS for s in services):
        raise SystemExit(f"uso: {sys.argv[0]} <production|staging> [api] [panel] [site]")

    for service in services:
        deploy(environment, service)
        print(f"--> {environment}/{service}: build disparada")

    print("\nacompanhe com: railway logs --service <servico>")


if __name__ == "__main__":
    sys.exit(main())
