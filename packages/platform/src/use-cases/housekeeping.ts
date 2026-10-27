/**
 * The credential sweep (§11.1, §12.3).
 *
 * §12.3 wants expired sessions, reset codes and change links **deleted**, not
 * merely marked used. Every one of them is already useless the moment it
 * expires, so the rows carry no information except a token hash somebody could
 * one day match against a leak. The sweep removes them a day after they stop
 * mattering; the audit log keeps the fact that each existed.
 *
 * What it leaves alone, and why: invites, because the administrator's list
 * shows how long an unactivated account has been waiting and reads the invite
 * to say so (§3); and anything live, because a job must never be the reason
 * somebody was signed out.
 *
 * Run by the worker as the system actor, on a schedule. Every delete is
 * idempotent, so a second worker, or a developer running it by hand, removes
 * nothing the first did not.
 */

import { and, isNotNull, lt, or, sql } from 'drizzle-orm';
import {
  authRateLimits,
  emailChangeRequests,
  passwordResetOtps,
  sessions,
} from '@obdm/db';

import type { UseCaseContext } from '../context.js';
import { createAuditWriter } from '../repositories/audit.js';

export type SweepResult = {
  readonly sessions: number;
  readonly otps: number;
  readonly emailChanges: number;
  readonly rateLimitWindows: number;
};

/**
 * A day of grace after expiry.
 *
 * A session that expired a minute ago may still be the subject of a request in
 * flight, and a reset code that expired an hour ago is still the one the person
 * is being told has expired. A day later, neither is anything but a row.
 */
const GRACE_MS = 24 * 60 * 60 * 1000;

export async function sweepExpiredCredentials(ctx: UseCaseContext): Promise<SweepResult> {
  const now = ctx.clock.now();
  const before = new Date(now.getTime() - GRACE_MS);

  return ctx.db.transaction(async (tx) => {
    const sweptSessions = await tx
      .delete(sessions)
      .where(or(lt(sessions.expiresAt, before), and(isNotNull(sessions.revokedAt), lt(sessions.revokedAt, before))))
      .returning({ id: sessions.id });

    const sweptOtps = await tx
      .delete(passwordResetOtps)
      .where(lt(passwordResetOtps.expiresAt, before))
      .returning({ id: passwordResetOtps.id });

    const sweptChanges = await tx
      .delete(emailChangeRequests)
      .where(lt(emailChangeRequests.expiresAt, before))
      .returning({ id: emailChangeRequests.id });

    // A throttle window is fifteen minutes wide by default, and a row is
    // whichever width `auth.login_throttle.window_minutes` says (§12). The
    // bound is the configured width plus the day of grace, so a window that is
    // still counting is never the one removed, whatever an administrator set.
    const windowMs = ctx.config.auth.loginThrottle.windowMinutes * 60_000;
    const windowsBefore = new Date(now.getTime() - windowMs - GRACE_MS);
    const sweptWindows = await tx
      .delete(authRateLimits)
      .where(lt(authRateLimits.windowStart, windowsBefore))
      .returning({ id: sql<number>`1` });

    const result: SweepResult = {
      sessions: sweptSessions.length,
      otps: sweptOtps.length,
      emailChanges: sweptChanges.length,
      rateLimitWindows: sweptWindows.length,
    };

    const total = result.sessions + result.otps + result.emailChanges + result.rateLimitWindows;
    if (total > 0) {
      // Counts only. The rows are gone, and the point of deleting them was
      // that nothing about them should remain.
      const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
      await audit({
        action: 'credentials.swept',
        subjectType: 'housekeeping',
        subjectId: 'credentials',
        metadata: { ...result, before: before.toISOString() },
      });
    }

    return result;
  });
}
