CREATE TABLE IF NOT EXISTS "infra_integration_secrets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) NOT NULL,
	"workspace_id" varchar(64) NOT NULL,
	"ciphertext" text NOT NULL,
	"key_id" varchar(16) NOT NULL,
	"token_hint" varchar(4) NOT NULL,
	"updated_by_agent_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "infra_integration_secrets_provider_unique" UNIQUE("provider")
);
