-- The transcript of a web conversation (§2.11, ADR 0017).
--
-- The donor bot moved from Telegram to a web chat. A chat platform held the
-- conversation on the donor's behalf; a browser holds nothing, so the bot now
-- keeps the transcript itself: one row per message in either direction, keyed
-- by the same (channel, channel_user_id) pair every other table uses for a
-- person. The channel adapter writes the outgoing rows as the outbox drains,
-- the chat route writes the incoming ones, and the browser reads its own rows
-- back in order. That is the whole screen.
--
-- Editing a card in place (§8) is an UPDATE of the row an earlier send
-- returned, which is what lets an answered question lock its buttons without
-- a second copy of the question.
--
-- The incoming rows hold what the person typed, which includes a name and a
-- phone number before either reaches `donors`. Erasure (§12.1) deletes them
-- with the channel row.
--
-- No grant changes: this is the bot's own schema, and the default privileges
-- from migration 0001 give app_bot the table. `updated_at` is maintained by
-- the database like every other table here (§5.2).
--
-- Rollback plan: one table, its index and its trigger. Dropping it loses the
-- chat history and nothing else; every decision it reflects is on `donors`,
-- `donor_requests` and the event log.

CREATE TABLE "bot"."chat_messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"channel" text NOT NULL,
	"channel_user_id" text NOT NULL,
	"direction" text NOT NULL,
	"text" text NOT NULL,
	"choices" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chat_messages_direction_check" CHECK (direction IN ('in', 'out'))
);
--> statement-breakpoint
CREATE INDEX "chat_messages_transcript_idx" ON "bot"."chat_messages" USING btree ("channel","channel_user_id","id");
--> statement-breakpoint
CREATE TRIGGER chat_messages_set_updated_at
  BEFORE UPDATE ON "bot"."chat_messages"
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
