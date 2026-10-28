-- A third throttle scope: new devices per address.
--
-- The device key is a hash of the cookie, and a script can drop its cookie and
-- be a new device on every request, so the device limit alone bounds nothing.
-- `new_device` counts, per address, only the requests that minted a device.
--
-- Rollback plan: restore the two-scope CHECK after deleting the new rows:
-- DELETE FROM bot.chat_rate_limits WHERE scope = 'new_device'.
ALTER TABLE "bot"."chat_rate_limits" DROP CONSTRAINT "chat_rate_limits_scope_check";--> statement-breakpoint
ALTER TABLE "bot"."chat_rate_limits" ADD CONSTRAINT "chat_rate_limits_scope_check" CHECK (scope IN ('device', 'ip', 'new_device'));