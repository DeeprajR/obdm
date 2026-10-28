/**
 * What is needed right now, by blood group (§5).
 *
 * The public face of the board: a group and a number of units, and nothing
 * else. No hospital, no day, no request id, so it says nothing about any one
 * patient (§2.10) and can be shown to somebody who has not registered and
 * never will. The same open requests the board lists, summed per group.
 *
 * "Needed" is what recruitment still has to find: units asked for, less the
 * donors already confirmed and the units already collected at the counter
 * (contract 1.2.0). A group whose requests are all covered is left out.
 */

import { and, eq, gte, sql } from 'drizzle-orm';
import { botRequests } from '@obdm/db/bot';
import { BLOOD_GROUPS } from '@obdm/domain';

import type { BotContext } from '../context.js';

export type NeededNow = readonly { readonly bloodGroup: string; readonly units: number }[];

export async function neededNow(ctx: BotContext): Promise<NeededNow> {
  const rows = await ctx.db
    .select({
      bloodGroup: botRequests.bloodGroup,
      units: sql<number>`sum(greatest(0, ${botRequests.unitsNeeded} - ${botRequests.confirmedCount} - ${botRequests.walkInUnits}))::int`,
    })
    .from(botRequests)
    .where(
      and(
        eq(botRequests.status, 'open'),
        // The same cut as the board: a day that has passed is not a need.
        gte(botRequests.neededBy, ctx.clock.today()),
      ),
    )
    .groupBy(botRequests.bloodGroup);

  // `::int` above, so the driver hands back a number rather than a bigint string.
  const byGroup = new Map(rows.map((row) => [row.bloodGroup, row.units]));

  // The order every blood group list in the system uses, not the database's.
  return BLOOD_GROUPS.flatMap((bloodGroup) => {
    const units = byGroup.get(bloodGroup) ?? 0;
    return units > 0 ? [{ bloodGroup, units }] : [];
  });
}
