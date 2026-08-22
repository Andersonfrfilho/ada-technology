# Agendamento: trocar a implementação local pelo trio publicado

> Substitui as Fases 1–5 de `spec.md`. Aquele plano continua válido como registro do que o produto
> precisa; o **como** mudou: o `api-ada` passa a consumir os pacotes em vez de manter agenda própria.

## Por que

As Fases 1 a 4 foram construídas dentro do `api-ada` (schema, disponibilidade, rotas, ações de
fluxo). O trio `@adatechnology/scheduling-{contracts,module,ui}` já existe publicado, com o mesmo
domínio resolvido em mais profundidade — recursos, serviços, exceções de disponibilidade,
lembretes, remarcação, no-show, sincronização de calendário — e a Fase 5 (Google Calendar) já é o
pacote `@adatechnology/google-calendar-provider`.

Manter as duas é o antipadrão que o `pluggable-module.md` §6 recusa: a cópia diverge, a correção
entra num lado só, e o segundo produto que precisar de agenda não terá o que instalar. Sai a
implementação local; fica o que é **regra de negócio do produto** — o bot agendar pela conversa.

## Mapa de modelos

| Ada (local, sai) | Trio (entra) | Nota |
|---|---|---|
| `agents` com regra semanal | `resources` | Um recurso por atendente, mesmo `id` do agente para o vínculo ser direto |
| — | `services` | O trio exige serviço para calcular disponibilidade; o produto tem um só ("Atendimento") |
| `schedule_settings` | `SchedulingModuleConfig` + `availability_rules` | Fuso passa a ser do recurso; janela e antecedência viram config do módulo |
| `agent_schedules` | `availability_rules` | |
| `agent_time_off` | `availability_exceptions` | Ganha exceção do tipo "extra", que a local não tinha |
| `appointments` + `appointment_agents` | `bookings` + `booking_slots` | |
| `SlotUnavailableError` | `SlotUnavailableError` (contracts) | Mesmo papel, erro do pacote |

O `companyId` vem de `environment.ADA_COMPANY_ID`, como em catálogo e fluxo — nunca do corpo nem de
header (`security.md` §2).

## Fases

> 🤖 Modelo: `sonnet` para tudo, exceto F5 e F7 marcadas 🧠.

### F1 — Dependências e migrations
- `@adatechnology/scheduling-contracts`, `-module` e (no painel) `-ui` no `package.json`.
- `runSchedulingMigrations` em `infra/database/migrate.ts`, antes das migrations da Ada, no mesmo
  molde do catálogo (journal e `pgSchema` próprios).
- Migration `0002` **derruba** as quatro tabelas locais (`appointment_agents`, `appointments`,
  `agent_time_off`, `agent_schedules`, `schedule_settings`). Destrutiva por definição: só é segura
  porque a agenda nunca chegou a receber reserva real — nenhuma delas tem linha em produção.
  Confirmar isso no banco antes de aplicar, e não depois.
- **Aceite:** `bun run db:migrate` sobe do zero e num banco que já tem a `0001`.

### F2 — Container
- `createSchedulingModule({ db, config, providers })` em `infra/container.ts`, ao lado do catálogo.
- Config: `maxLookaheadDays`, `pastBookingToleranceMinutes`, fuso padrão. Sem `calendarSync` por
  enquanto — capacidade por ausência; ligar depois é acrescentar o provider, não mudar chamada.
- `providers.logger` com o logger da Ada (a redação de PII já vive nele) e `providers.clock`
  injetado, para o teste não depender do dia em que roda.
- **Aceite:** `bun run typecheck` e o boot sobe.

### F3 — HTTP do painel
- `modules/scheduling/scheduling.controller.ts` com `createSchedulingRoutes` +
  `createModuleFetchRouter`, `basePath` `/v1/panel/scheduling`, no molde de `catalog.controller.ts`.
- `schedulingAuthResolver` espelhando o do catálogo: identidade do token, empresa do ambiente,
  escopo de admin.
- Rota-ponte com `auth: ADMIN` e entrada no rate limit.
- **Aceite:** teste de rota recusando token de atendente comum e aceitando admin.

### F4 — Recurso e serviço do produto
- Seeder (executando use-cases, nunca `INSERT` bruto — `code-standart.md` §5) que garante o serviço
  padrão e um recurso por atendente ativo.
- Criar atendente passa a criar o recurso correspondente; desativar desativa o recurso.
- **Aceite:** teste do seeder idempotente (rodar duas vezes não duplica).

### F5 — Ações de fluxo do bot 🧠
- `registerSchedulingFlowActions.ts` **fica** — é regra de negócio do produto — e passa a chamar
  `schedulingModule.useCases.listAvailableSlots` e `.requestBooking`.
- O contrato das opções oferecidas (`scheduleAgentOptions`, `scheduleSlotOptions`), o
  `unavailableNext`/`retryNext` e o destino terminal continuam iguais: é o que impede aceitar um
  horário que nunca foi listado.
- `requestBooking` recebe `idempotencyKey` derivada de sessão + instante: retentativa do cliente
  não vira duas reservas.
- Reserva continua **em processo**, sem rota pública de agendamento.
- **Aceite:** os 10 testes de `registerSchedulingFlowActions.test.ts` passam contra o módulo,
  ajustados ao novo formato de slot.

### F6 — Painel
- `modules/scheduling/Scheduling.page.tsx` = `SchedulingProvider` + `SchedulingWorkspace`, no molde
  de `Catalog.page.tsx`. Nada de remontar a tela a partir das peças (`pluggable-module.md` §5).
- `scheduling.api.ts` implementando `SchedulingApi` contra `/v1/panel/scheduling`.
- Área na query string, item no menu, rota.
- **Aceite:** as cinco áreas abrem, e a área sobrevive ao refresh.

### F7 — Remoção e documentação 🧠
- Apagar `modules/scheduling/{availability,timezone,DrizzleSchedulingRepository,*.use-case,
  scheduling.controller,scheduling.error,scheduling.schema}.ts` e seus testes; fica o registro das
  ações de fluxo e as constantes que o fluxo usa.
- `infra/database/schema/scheduling.schema.ts` sai.
- `ai-context.md` atualizado (`code-standart.md` §14).
- **Aceite:** `rg "modules/scheduling/(availability|timezone)"` não acha nada; `bun test` verde.

## Fora de escopo

Sincronização com Google Calendar (o provider existe; ligar é decisão separada), lembretes por
WhatsApp, e agenda por serviço com durações diferentes.
