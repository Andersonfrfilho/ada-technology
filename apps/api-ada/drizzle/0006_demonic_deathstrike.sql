-- As tabelas de infraestrutura passaram para o schema "infra", do @adatechnology/infra-module, que as
-- cria em sua própria migration (roda antes desta). Copia o que existia e só então remove as antigas;
-- ON CONFLICT DO NOTHING deixa a migration repetível e não sobrescreve linha já gravada no schema novo.
DO $$
BEGIN
  IF to_regclass('public.infra_environment_schedules') IS NOT NULL THEN
    INSERT INTO "infra"."infra_environment_schedules" (
      "id", "railway_project_id", "railway_environment_id", "active_weekdays", "power_on_time", "power_off_time",
      "timezone", "is_enabled", "keep_on_until", "last_evaluated_at", "last_power_off_at", "last_power_on_at",
      "updated_by_agent_id", "created_at", "updated_at"
    )
    SELECT
      "id", "railway_project_id", "railway_environment_id", "active_weekdays", "power_on_time", "power_off_time",
      "timezone", "is_enabled", "keep_on_until", "last_evaluated_at", "last_power_off_at", "last_power_on_at",
      "updated_by_agent_id", "created_at", "updated_at"
    FROM "public"."infra_environment_schedules"
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.infra_power_operations') IS NOT NULL THEN
    INSERT INTO "infra"."infra_power_operations" (
      "id", "railway_project_id", "railway_environment_id", "kind", "status", "trigger", "actor_agent_id",
      "service_results", "started_at", "finished_at"
    )
    SELECT
      "id", "railway_project_id", "railway_environment_id", "kind", "status", "trigger", "actor_agent_id",
      "service_results", "started_at", "finished_at"
    FROM "public"."infra_power_operations"
    ON CONFLICT DO NOTHING;
  END IF;

  IF to_regclass('public.infra_integration_secrets') IS NOT NULL THEN
    INSERT INTO "infra"."infra_integration_secrets" (
      "id", "provider", "workspace_id", "ciphertext", "key_id", "token_hint", "updated_by_agent_id",
      "created_at", "updated_at"
    )
    SELECT
      "id", "provider", "workspace_id", "ciphertext", "key_id", "token_hint", "updated_by_agent_id",
      "created_at", "updated_at"
    FROM "public"."infra_integration_secrets"
    ON CONFLICT DO NOTHING;
  END IF;
END
$$;
--> statement-breakpoint
DROP TABLE IF EXISTS "public"."infra_environment_schedules" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."infra_power_operations" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "public"."infra_integration_secrets" CASCADE;
