CREATE TABLE IF NOT EXISTS "agent_schedules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"weekday" smallint NOT NULL,
	"start_minute" integer NOT NULL,
	"end_minute" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "agent_schedules_range_check" CHECK ("agent_schedules"."start_minute" >= 0 and "agent_schedules"."end_minute" <= 1440 and "agent_schedules"."start_minute" < "agent_schedules"."end_minute")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "agent_time_off" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"agent_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"reason" varchar(200),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointment_agents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"appointment_id" uuid NOT NULL,
	"agent_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "appointments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone NOT NULL,
	"status" varchar(20) DEFAULT 'scheduled' NOT NULL,
	"source_channel" varchar(20) NOT NULL,
	"canceled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "schedule_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"timezone" varchar(60) DEFAULT 'America/Sao_Paulo' NOT NULL,
	"slot_minutes" integer DEFAULT 30 NOT NULL,
	"minimum_notice_minutes" integer DEFAULT 120 NOT NULL,
	"horizon_days" integer DEFAULT 30 NOT NULL,
	"is_enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_schedules" ADD CONSTRAINT "agent_schedules_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_time_off" ADD CONSTRAINT "agent_time_off_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_agents" ADD CONSTRAINT "appointment_agents_appointment_id_appointments_id_fk" FOREIGN KEY ("appointment_id") REFERENCES "public"."appointments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "appointment_agents" ADD CONSTRAINT "appointment_agents_agent_id_agents_id_fk" FOREIGN KEY ("agent_id") REFERENCES "public"."agents"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_schedules_agent_weekday_idx" ON "agent_schedules" USING btree ("agent_id","weekday");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "agent_time_off_agent_range_idx" ON "agent_time_off" USING btree ("agent_id","starts_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointment_agents_agent_starts_idx" ON "appointment_agents" USING btree ("agent_id","starts_at");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointment_agents_slot_unique" ON "appointment_agents" USING btree ("agent_id","starts_at") WHERE "appointment_agents"."status" = 'scheduled';--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "appointments_starts_status_idx" ON "appointments" USING btree ("starts_at","status");--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "appointments_session_start_unique" ON "appointments" USING btree ("session_id","starts_at") WHERE "appointments"."status" = 'scheduled';