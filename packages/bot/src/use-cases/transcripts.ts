/**
 * The chat transcript of somebody who never registered (§12.3).
 *
 * On the web channel the conversation is a table of ours, and the incoming
 * rows hold what the person typed: a name, a date of birth, a phone number.
 * A registered donor's transcript goes with the rest of their data when they
 * ask (`deleteDonorData`). These are the two ways a visitor's goes: at once,
 * when they say stop or delete, and by age, when they simply never came back.
 */

import { and, eq, lt, sql } from 'drizzle-orm';
import { chatMessages, donorChannels } from '@obdm/db/bot';

import type { BotContext } from '../context.js';
import type { BotDatabase } from '../db.js';
import type { ChannelAddress } from '../ports/channel.js';

/** How long an abandoned visitor's transcript is kept. */
export const STRANGER_TRANSCRIPT_DAYS = 30;

/**
 * Deletes everything on this address's transcript. "Nothing was saved" has to
 * be true of the conversation as well as of the draft.
 */
export async function forgetTranscript(ctx: BotContext, address: ChannelAddress): Promise<void> {
  await ctx.db
    .delete(chatMessages)
    .where(
      and(
        eq(chatMessages.channel, address.channel),
        eq(chatMessages.channelUserId, address.channelUserId),
      ),
    );
}

/**
 * Deletes transcript rows older than `before` on addresses that belong to no
 * donor. A registered donor's conversation is theirs to keep until they ask;
 * a visitor who left mid-signup has nobody to ask.
 */
export async function pruneStrangerTranscripts(db: BotDatabase, before: Date): Promise<number> {
  const rows = await db
    .delete(chatMessages)
    .where(
      and(
        lt(chatMessages.createdAt, before),
        sql`NOT EXISTS (
          SELECT 1 FROM ${donorChannels}
           WHERE ${donorChannels.channel} = ${chatMessages.channel}
             AND ${donorChannels.channelUserId} = ${chatMessages.channelUserId}
        )`,
      ),
    )
    .returning({ id: chatMessages.id });
  return rows.length;
}
