#!/usr/bin/env python3
"""
Copyright (c) 2026 Ada Technology. All rights reserved.

This source code is proprietary and confidential. Unauthorized copying,
modification, distribution, or use of this file, via any medium, is
strictly prohibited without prior written permission from Ada Technology.

Liga os servicos `api`, `panel` e `site` ao repositorio do GitHub e amarra cada ambiente ao seu
branch: `production` segue `main`, `staging` segue `staging`.

    ./scripts/railway-connect-repo.py

Por que nao e `railway` puro: a CLI so conecta repo no `railway add --service --repo`, ou seja na
criacao, e nao expoe o branch por ambiente. `serviceConnect` cria gatilho identico nos dois
ambientes (ambos em `main`), entao o passo seguinte e corrigir o gatilho do staging. Ambos vivem
so na API GraphQL.

Idempotente: reconectar o mesmo repo e reescrever o mesmo branch nao muda nada.
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
REPOSITORY = "Andersonfrfilho/ada-technology"
DEPLOYABLE_SERVICES = ("api", "panel", "site")
BRANCH_BY_ENVIRONMENT = {"production": "main", "staging": "staging"}


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
            "User-Agent": "ada-technology/railway-connect-repo",
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


def fetch_project() -> dict:
    return call(
        """
        query ($projectId: String!) {
          project(id: $projectId) {
            environments { edges { node { id name } } }
            services { edges { node { id name } } }
            deploymentTriggers { edges { node { id branch environmentId serviceId } } }
          }
        }
        """,
        {"projectId": PROJECT_ID},
    )["project"]


def connect_service(service_id: str) -> None:
    call(
        """
        mutation ($id: String!, $input: ServiceConnectInput!) {
          serviceConnect(id: $id, input: $input) { id }
        }
        """,
        {"id": service_id, "input": {"repo": REPOSITORY, "branch": "main"}},
    )


def retarget_trigger(trigger_id: str, branch: str) -> None:
    call(
        """
        mutation ($id: String!, $input: DeploymentTriggerUpdateInput!) {
          deploymentTriggerUpdate(id: $id, input: $input) { id branch }
        }
        """,
        {"id": trigger_id, "input": {"branch": branch}},
    )


def main() -> None:
    project = fetch_project()
    services = {
        edge["node"]["name"]: edge["node"]["id"]
        for edge in project["services"]["edges"]
    }
    environments = {
        edge["node"]["id"]: edge["node"]["name"]
        for edge in project["environments"]["edges"]
    }

    missing = [name for name in DEPLOYABLE_SERVICES if name not in services]
    if missing:
        raise SystemExit(f"servicos ausentes: {', '.join(missing)} — rode railway-provision.sh antes")

    for name in DEPLOYABLE_SERVICES:
        connect_service(services[name])
        print(f"--> {name} conectado a {REPOSITORY}")

    for edge in fetch_project()["deploymentTriggers"]["edges"]:
        trigger = edge["node"]
        environment_name = environments.get(trigger["environmentId"])
        expected_branch = BRANCH_BY_ENVIRONMENT.get(environment_name)
        if expected_branch is None or trigger["branch"] == expected_branch:
            continue
        retarget_trigger(trigger["id"], expected_branch)
        print(f"--> {environment_name}: gatilho movido para o branch {expected_branch}")

    print("\npronto: push em main sobe production, push em staging sobe staging")


if __name__ == "__main__":
    sys.exit(main())
