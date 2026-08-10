#!/usr/bin/env python3
"""
Copyright (c) 2026 Ada Technology. All rights reserved.

This source code is proprietary and confidential. Unauthorized copying,
modification, distribution, or use of this file, via any medium, is
strictly prohibited without prior written permission from Ada Technology.

Garante os dominios proprios dos dois ambientes no Railway e imprime os registros de DNS que
faltam criar na zona.

    ./scripts/railway-domains.py

Idempotente: dominio que ja existe e apenas consultado. Nada aqui mexe em DNS — a zona
`adatechnology.com.br` vive no HostGator e so muda por la.

Por que nao e `railway domain <dominio>`: a CLI responde `Unauthorized` em dominio customizado,
enquanto a mesma operacao passa pela API GraphQL. E a CLI tambem nao mostra o estado do registro,
que e justamente o que se quer olhar enquanto o DNS propaga.
"""

import json
import os
import sys
import urllib.error
import urllib.request
from typing import Optional

RAILWAY_CONFIG = os.path.expanduser("~/.railway/config.json")
GRAPHQL_ENDPOINT = "https://backboard.railway.com/graphql/v2"
PROJECT_ID = "3cad98f6-9799-4e8f-9271-aca02435d4fa"
TARGET_PORT = 8080

ENVIRONMENT_IDS = {
    "production": "f9ddc420-b973-4176-92dd-64a6f940ae96",
    "staging": "a677c87f-1353-4a02-b87d-322614aa1655",
}
SERVICE_IDS = {
    "api": "40efe158-a1a0-4d05-aad1-0b350f1a5ef2",
    "panel": "8a385bf1-cd09-4f27-a1a1-4527cde13d0d",
    "site": "bec0ae76-3f89-4fae-abc4-70685930d86f",
}

# O apex so funciona em provedor com CNAME flattening ou ALIAS: o Railway exige CNAME na raiz, e
# uma zona cPanel comum nao aceita CNAME convivendo com o SOA. Sem isso, o site atende no `www`.
DOMAINS = (
    ("production", "api", "api.adatechnology.com.br"),
    ("production", "panel", "painel.adatechnology.com.br"),
    ("production", "site", "adatechnology.com.br"),
    ("production", "site", "www.adatechnology.com.br"),
    ("staging", "api", "api.staging.adatechnology.com.br"),
    ("staging", "panel", "painel.staging.adatechnology.com.br"),
    ("staging", "site", "staging.adatechnology.com.br"),
)


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
            "User-Agent": "ada-technology/railway-domains",
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


def list_custom_domains(environment: str, service: str) -> list:
    return call(
        """
        query ($projectId: String!, $environmentId: String!, $serviceId: String!) {
          domains(projectId: $projectId, environmentId: $environmentId, serviceId: $serviceId) {
            customDomains {
              domain
              status {
                certificateStatus
                verified
                verificationDnsHost
                verificationToken
                dnsRecords { hostlabel recordType requiredValue currentValue status }
              }
            }
          }
        }
        """,
        {
            "projectId": PROJECT_ID,
            "environmentId": ENVIRONMENT_IDS[environment],
            "serviceId": SERVICE_IDS[service],
        },
    )["domains"]["customDomains"]


def create_custom_domain(environment: str, service: str, domain: str) -> None:
    call(
        """
        mutation ($input: CustomDomainCreateInput!) {
          customDomainCreate(input: $input) { id }
        }
        """,
        {
            "input": {
                "domain": domain,
                "environmentId": ENVIRONMENT_IDS[environment],
                "projectId": PROJECT_ID,
                "serviceId": SERVICE_IDS[service],
                "targetPort": TARGET_PORT,
            }
        },
    )


def short(value: str) -> str:
    return value.rsplit("_", 1)[-1].lower()


def print_table(header: tuple, rows: list) -> None:
    if not rows:
        return
    widths = [
        max([len(row[column]) for row in rows] + [len(header[column])])
        for column in range(len(header))
    ]
    print()
    print("  ".join(header[column].ljust(widths[column]) for column in range(len(header))))
    print("  ".join("-" * widths[column] for column in range(len(header))))
    for row in rows:
        print("  ".join(row[column].ljust(widths[column]) for column in range(len(header))))


def main() -> None:
    routing_rows = []
    verification_rows = []

    for environment, service, domain in DOMAINS:
        existing = {item["domain"]: item for item in list_custom_domains(environment, service)}
        if domain not in existing:
            create_custom_domain(environment, service, domain)
            print(f"--> criado {domain} ({environment}/{service})")
            existing = {item["domain"]: item for item in list_custom_domains(environment, service)}

        status = existing[domain]["status"]
        for record in status["dnsRecords"]:
            routing_rows.append(
                (
                    record["hostlabel"] or "@",
                    short(record["recordType"]),
                    record["requiredValue"],
                    short(record["status"]),
                    short(status["certificateStatus"]),
                )
            )

        # Sem o TXT de posse o certificado fica preso em `validating_ownership` para sempre: o CNAME
        # apontando certo prova roteamento, nao propriedade do nome.
        if not status["verified"]:
            verification_rows.append(
                (status["verificationDnsHost"], "txt", status["verificationToken"])
            )

    print_table(("host", "tipo", "valor", "dns", "certificado"), routing_rows)
    print_table(("host", "tipo", "valor"), verification_rows)

    print("\ncrie estes registros na zona adatechnology.com.br (HostGator).")
    print("com o certificado emitido, rode ./scripts/railway-provision.sh <ambiente> custom")


if __name__ == "__main__":
    sys.exit(main())
