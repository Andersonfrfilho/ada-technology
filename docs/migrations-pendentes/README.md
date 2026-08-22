# Migrations geradas e ainda nao aplicadas

Migration destrutiva nao entra em `drizzle/` antes de ter plano de rollback escrito e aprovacao
humana: o que esta em `drizzle/` roda sozinho no `deploy:pre`, e `DROP TABLE` nao tem volta.

## `api-ada-0002-drop-agendamento-local.sql`

Derruba as cinco tabelas do agendamento local (`agent_schedules`, `agent_time_off`,
`appointment_agents`, `appointments`, `schedule_settings`), substituido pelo schema `scheduling` do
`@adatechnology/scheduling-module`. O codigo ja nao le nenhuma delas — as tabelas so ocupam espaco.

Antes de mover o arquivo de volta para `apps/api-ada/drizzle/` e recriar a entrada no
`_journal.json`:

1. `SELECT count(*) FROM appointments;` em producao. Com linhas, decidir migracao para
   `scheduling.bookings` ou descarte explicito — nao existe conversao automatica.
2. Dump das cinco tabelas guardado fora do banco, criptografado (elas carregam dado pessoal).
3. Rollback: restaurar do dump. O `CASCADE` leva junto o que referenciar as tabelas, entao o dump
   precisa ser tirado no mesmo momento do drop, nao antes da janela.
