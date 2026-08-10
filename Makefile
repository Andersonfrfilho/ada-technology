ENV ?= dev
# Absoluto: os alvos entram em apps/<app> antes de rodar, e caminho relativo nao sobrevive ao cd.
ROOT := $(CURDIR)
ENV_FILE := $(ROOT)/envs/env.$(ENV)
ENV_LOCAL_FILE := $(ROOT)/envs/env.$(ENV).local

# PROJECT_NAME vem do env do ambiente e prefixa todo recurso: $(PROJECT_NAME)-$(ENV)-<recurso>
PROJECT_NAME := $(shell grep -E '^PROJECT_NAME=' $(ENV_FILE) | cut -d= -f2)
COMPOSE := PROJECT_NAME=$(PROJECT_NAME) ENV=$(ENV) docker compose -f infra/docker-compose.yml

# env.<ambiente>.local sobrescreve o versionado, quando existir
ENV_ARGS := --env-file=$(ENV_FILE) $(if $(wildcard $(ENV_LOCAL_FILE)),--env-file=$(ENV_LOCAL_FILE),)

.PHONY: help install up down logs ps migrate seed seed-flow dev-api dev-panel dev-site \
        typecheck test validate ada-pins ada-pins-write docker-images docker-api docker-panel \
        docker-site clean

# A landing e o painel inlinam esta URL no bundle; local ela aponta para a API de desenvolvimento.
VITE_API_BASE_URL ?= http://localhost:3401

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-18s\033[0m %s\n", $$1, $$2}'

FRONTEND_APPS := frontend-panel frontend-site

install: ## Instala dependencias e materializa o .env.development dos frontends
	bun install
	@for app in $(FRONTEND_APPS); do \
		test -f apps/$$app/.env.development || cp apps/$$app/.env.example apps/$$app/.env.development; \
	done

up: ## Sobe postgres, redis e o mock da Graph API
	$(COMPOSE) up -d
	@echo "infra de $(PROJECT_NAME)-$(ENV) no ar"

down: ## Derruba a infra local
	$(COMPOSE) down

logs: ## Acompanha os logs da infra
	$(COMPOSE) logs -f

ps: ## Lista os containers da infra
	$(COMPOSE) ps

migrate: ## Aplica as migrations versionadas
	cd apps/api-ada && bun $(ENV_ARGS) run src/infra/database/migrate.ts

seed: ## Popula a base executando use-cases reais (nunca INSERT bruto)
	cd apps/api-ada && bun $(ENV_ARGS) run src/infra/database/seeds/index.ts

seed-flow: ## Publica o fluxo inicial do bot (nao sobrescreve o que ja foi editado)
	cd apps/api-ada && bun $(ENV_ARGS) run src/infra/database/seeds/flow.ts

dev-api: ## API em modo watch
	cd apps/api-ada && bun $(ENV_ARGS) --watch run src/index.ts

dev-panel: ## Painel de atendimento
	cd apps/frontend-panel && bun run dev

dev-site: ## Landing page com o widget embutido (porta 5176, fixa)
	cd apps/frontend-site && bun run dev

typecheck: ## tsc --noEmit em todos os apps
	bun run typecheck

test: ## Testes de todos os apps
	bun run test

validate: typecheck test ## Gate de qualidade completo

ada-pins: ## Confere se os pins @adatechnology estao na ultima tag publicada
	bun run scripts/ada-pins.ts

ada-pins-write: ## Alinha os pins @adatechnology e reinstala
	bun run scripts/ada-pins.ts --write

docker-images: docker-api docker-panel docker-site ## Builda as tres imagens como o Railway builda

# Contexto na raiz de proposito: o install precisa do bun.lock e dos outros workspaces.
docker-api: ## Imagem da API
	docker build -f apps/api-ada/Dockerfile -t $(PROJECT_NAME)-api:local .

docker-panel: ## Imagem do painel (VITE_API_BASE_URL entra na build, nao no runtime)
	docker build -f apps/frontend-panel/Dockerfile \
		--build-arg VITE_API_BASE_URL=$(VITE_API_BASE_URL) -t $(PROJECT_NAME)-panel:local .

docker-site: ## Imagem da landing
	docker build -f apps/frontend-site/Dockerfile \
		--build-arg VITE_API_BASE_URL=$(VITE_API_BASE_URL) -t $(PROJECT_NAME)-site:local .

clean: ## Remove artefatos de build e dependencias
	rm -rf node_modules apps/*/node_modules apps/*/dist
