# Agendamento pelo bot — especificação

Status: em implementação (Fase 1)
Decisões tomadas com o Anderson em 2026-08-21.

## O que o cliente vai poder fazer

Pelo WhatsApp ou pelo chat do site, depois de aceitar falar com o time: escolher com quem quer
falar (uma ou mais pessoas), ver os horários realmente livres e reservar um. O horário reservado
some da lista para todo mundo no mesmo instante.

## Decisões

| Assunto | Decisão |
|---|---|
| Fonte da verdade | **Nosso Postgres.** A reserva é nossa e a garantia contra duplo-booking é do banco. |
| Integrações externas | Consultadas para **subtrair** ocupação (ex.: Google Calendar de cada atendente). Nunca são a fonte: agenda de terceiro fora do ar não pode virar horário vendido duas vezes. |
| Janela e duração | **Configuráveis por tela**, não constante em código. Fuso, duração do slot, antecedência mínima e horizonte. |
| Titular | **Por atendente.** O cliente pode selecionar mais de uma pessoa; a lista mostra a **interseção** — horário livre para todos os selecionados. |

## Modelo de dados

- `schedule_settings` — linha única: fuso, `slot_minutes`, antecedência mínima, horizonte em dias, liga/desliga.
- `agent_schedules` — regra semanal por atendente: `agent_id`, dia da semana, minuto inicial e final. Várias linhas no mesmo dia é como se descreve intervalo de almoço.
- `agent_time_off` — bloqueio pontual (férias, compromisso): `agent_id`, início e fim.
- `appointments` — a reserva: início, fim, sessão de origem, canal, status.
- `appointment_agents` — quem atende. **Índice único parcial `(agent_id, starts_at)` só para o que está agendado** — é esta linha, e não o código, que impede dois clientes no mesmo horário.

Sem ENUM nativo (`code-standart.md` §8): status em `varchar`.

## Regras

- Slot livre é slot dentro da regra semanal de **todos** os atendentes escolhidos, sem `time_off`, sem `appointment` e sem ocupação vinda de integração externa.
- Reserva roda em transação; a colisão é resolvida pela constraint, não por leitura prévia — `SELECT` antes de `INSERT` não é exclusão mútua.
- Reserva é idempotente pela sessão + horário: retentativa do cliente não cria duas.
- Cancelamento libera o horário (o índice único é parcial ao status).
- O que o cliente digitou continua fora do log (`security.md` §1). A tabela guarda `session_id`, não nome nem telefone.
- Integração externa indisponível **bloqueia o horário** (fail-closed): melhor oferecer menos horário que marcar em cima de um compromisso que não vimos.

## Fases

| Fase | Entrega | 🤖 Modelo |
|---|---|---|
| 1 | Schema, migration e cálculo de disponibilidade (função pura, testada) | `opus` 🧠 |
| 2 | Rotas: configuração, horários livres, reservar, cancelar | `sonnet` |
| 3 | Painel: tela de configuração da agenda e lista de agendamentos | `sonnet` |
| 4 | Fluxo: nós de escolha de pessoa/dia/horário e `actionKind: 'book_appointment'` | `opus` 🧠 |
| 5 | Provider de ocupação externa (Google Calendar por atendente) | `sonnet` |
