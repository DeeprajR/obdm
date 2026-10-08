-- Sessions name one of four applications, not one of two (ADR 0015).
--
-- The staff application is now three: doctors, the blood centre and volunteer
-- admins each sign in to their own deployment, as administration already did
-- (ADR 0003). A session is bound to the application that issued it, so the
-- vocabulary of `audience` follows the split: 'staff' is gone, and each role's
-- application has its own word.
--
-- Existing rows are moved to the audience of their account's role, revoked and
-- expired ones included, because the new CHECK has to hold for every row and a
-- row is more useful saying which application it belonged to than being
-- deleted. A live 'staff' session does not become usable anywhere by this:
-- its cookie is `bc_session`, which none of the new applications reads.
--
-- The default goes. Every session is created by an application that knows
-- which one it is, and a default is how a session gets bound to the wrong one.
--
-- Rollback plan: map the three staff audiences back to 'staff' and restore the
-- previous CHECK and default. No row is deleted, so nothing is lost either way.

ALTER TABLE "hospital"."sessions" DROP CONSTRAINT "sessions_audience_check";--> statement-breakpoint
UPDATE "hospital"."sessions" AS s
SET "audience" = CASE u."role"
  WHEN 'doctor' THEN 'doctor'
  WHEN 'blood_centre' THEN 'centre'
  WHEN 'volunteer_admin' THEN 'volunteer'
  ELSE 'admin'
END
FROM "hospital"."users" AS u
WHERE u."id" = s."user_id" AND s."audience" = 'staff';--> statement-breakpoint
ALTER TABLE "hospital"."sessions" ALTER COLUMN "audience" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "hospital"."sessions" ADD CONSTRAINT "sessions_audience_check" CHECK (audience IN ('doctor', 'centre', 'volunteer', 'admin'));
