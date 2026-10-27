/**
 * Hand-over: the reserved units for a request leave the fridge (§4).
 *
 * A decision reserves. `reserved` is "held for this request between the
 * decision and physical collection", and it is cleared when the units go. This
 * is that step: every bag still reserved for the request becomes `issued` to
 * it, with the time, which is what a return (case 1) and the tag release both
 * read afterwards.
 *
 * Only `reserved` bags move. One that was already handed over, or released by a
 * cancellation, is not this request's to issue.
 */

import { and, eq } from 'drizzle-orm';
import { err, ok, type Result } from '@obdm/result';
import { bloodBags } from '@obdm/db';
import { actorHas, createAuditWriter, type UseCaseContext } from '@obdm/platform';

import { invalidBag, notAuthorized, type InvalidBag, type NotAuthorized } from '../errors.js';

export async function handOverBags(
  ctx: UseCaseContext,
  requestUuid: string,
): Promise<Result<{ readonly issued: number }, NotAuthorized | InvalidBag>> {
  if (!actorHas(ctx.actor, 'centre:operate')) return err(notAuthorized('centre:operate'));

  const now = ctx.clock.now();

  return ctx.db.transaction(async (tx) => {
    // Conditional on `reserved`, so two people pressing it at once issue each
    // bag once, and the second is told there was nothing left to hand over.
    const issued = await tx
      .update(bloodBags)
      .set({
        status: 'issued',
        issuedToRequestId: requestUuid,
        issuedAt: now,
        reservedForRequestId: null,
      })
      .where(
        and(eq(bloodBags.reservedForRequestId, requestUuid), eq(bloodBags.status, 'reserved')),
      )
      .returning({ id: bloodBags.id });

    if (issued.length === 0) {
      return err(invalidBag('No units are held for this request any more. Nothing was handed over.'));
    }

    const audit = createAuditWriter(tx, ctx.actor, ctx.correlationId, now);
    await audit({
      action: 'bags.issued',
      subjectType: 'blood_request',
      subjectId: requestUuid,
      metadata: { bagIds: issued.map((row) => row.id) },
    });

    return ok({ issued: issued.length });
  });
}
