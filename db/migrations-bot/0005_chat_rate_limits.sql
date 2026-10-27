-- Throttling the chat route (§3, §13, ADR 0017 §8).
--
-- A chat platform rate-limited the bot on our behalf; the web channel has no
-- platform and its chat route is public by design. The same shape as
-- `hospital.auth_rate_limits`, in the `bot` schema because the donor
-- application holds no grant on `hospital` beyond the contract columns. The
-- default privileges from migration 0001 give `app_bot` the table; nothing
-- narrower is needed, since every row is a count and a hashed key.
--
-- The grants are also stated outright, for both tables the web transcript
-- added. The default privileges only fire for objects `migrator` itself
-- creates, and a database migrated by another role (CI applies this set as
-- the superuser) would otherwise leave `app_bot` unable to read its own
-- transcript. Idempotent, like every grant.
--
-- Rollback plan: `DROP TABLE "bot"."chat_rate_limits"`. Nothing else refers to it.

CREATE TABLE "bot"."chat_rate_limits" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_rate_limits_scope_check" CHECK (scope IN ('device', 'ip')),
	CONSTRAINT "chat_rate_limits_attempts_check" CHECK (attempts >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX "chat_rate_limits_window_idx" ON "bot"."chat_rate_limits" USING btree ("scope","key","window_start");
--> statement-breakpoint
-- `updated_at` is maintained by the database, not the application (§5.2).
CREATE TRIGGER chat_rate_limits_set_updated_at
  BEFORE UPDATE ON "bot"."chat_rate_limits"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "bot"."chat_rate_limits" TO app_bot;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON "bot"."chat_messages" TO app_bot;
