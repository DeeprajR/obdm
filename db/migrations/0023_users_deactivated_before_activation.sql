-- An invited account can be deactivated before it is ever opened.
--
-- The old check tied `pending_activation` to a missing password both ways, so
-- a deactivated account had to have one, and withdrawing an invite nobody had
-- opened failed on the constraint. Now only the two ends are pinned: waiting
-- for an invite means no password, active means one. A deactivated account
-- may be either, and reactivating one that never had a password puts it back
-- to `pending_activation`.
ALTER TABLE "hospital"."users" DROP CONSTRAINT "users_activation_check";--> statement-breakpoint
ALTER TABLE "hospital"."users" ADD CONSTRAINT "users_activation_check" CHECK ((status <> 'pending_activation' OR password_hash IS NULL) AND (status <> 'active' OR password_hash IS NOT NULL));