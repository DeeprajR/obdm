/**
 * The web adapter (§2.11, ADR 0017).
 *
 * The donor application is a chat screen in a browser, installed to a phone's
 * home screen like the staff applications. It has no platform behind it
 * holding the conversation, so this adapter is the platform: sending a message
 * is writing a row to the transcript, and the browser reads the transcript
 * back. Everything above it still speaks the channel port's vocabulary, an
 * address, a message, some choices, exactly as it did when the adapter below
 * was Telegram's.
 *
 * Two things this adapter does differently from a chat platform's, and both
 * are the port working as designed:
 *
 *  - **It cannot vouch for a phone number.** `requestContact` is a hint, and a
 *    browser has nothing to answer it with, so the flag is ignored and the
 *    person types. Their number is recorded as typed, not verified, which is
 *    the fallback the flow was written for (§5, step 1).
 *  - **It receives nothing.** Updates arrive over HTTP and are handed straight
 *    to the router by the application; there is no long poll to run. `receive`
 *    resolves empty so the port stays whole and a loop that calls it idles.
 *
 * Editing in place is supported, which is what lets an answered question lock
 * its buttons (§8) without the chat filling with copies.
 */

import { and, eq, sql } from 'drizzle-orm';
import { chatMessages } from '@obdm/db/bot';
import { newId } from '@obdm/ids';

import type { BotDatabase } from '../db.js';
import type {
  ChannelAddress,
  ChannelPort,
  Choice,
  IncomingUpdate,
  OutgoingMessage,
  SendResult,
} from '../ports/channel.js';

export const WEB_CHANNEL = 'web';

export type WebChannelOptions = {
  /** Injected like every other clock (§3). Defaults to the wall clock. */
  readonly now?: () => Date;
};

/** One line of the transcript, as the chat screen renders it. */
export type TranscriptRow = {
  readonly id: string;
  readonly direction: 'in' | 'out';
  readonly text: string;
  readonly choices: readonly Choice[] | null;
  readonly at: Date;
};

export type WebChannel = ChannelPort & {
  /** A person's transcript, oldest first, bounded so a long chat stays a page. */
  readonly transcript: (address: ChannelAddress, limit?: number) => Promise<readonly TranscriptRow[]>;
  /**
   * Records what the person sent, so the chat reads as a conversation rather
   * than a list of replies. Returns the row id, which the caller uses as the
   * update id: it is unique, and a retried request writes a second row rather
   * than replaying the first.
   */
  readonly recordIncoming: (address: ChannelAddress, text: string) => Promise<string>;
  /**
   * The label of a button on an earlier message, looked up by its data. What a
   * tap shows on the transcript, resolved server-side so the stored text is
   * always something this system said.
   */
  readonly labelOf: (address: ChannelAddress, messageRef: string, data: string) => Promise<string | undefined>;
};

const TRANSCRIPT_LIMIT = 300;

export function createWebChannel(db: BotDatabase, options: WebChannelOptions = {}): WebChannel {
  const now = options.now ?? ((): Date => new Date());

  const owned = (address: ChannelAddress) =>
    and(
      eq(chatMessages.channel, address.channel),
      eq(chatMessages.channelUserId, address.channelUserId),
    );

  return {
    name: WEB_CHANNEL,

    async send(to: ChannelAddress, message: OutgoingMessage): Promise<SendResult> {
      const at = now();
      const choices = message.choices && message.choices.length > 0 ? [...message.choices] : null;

      try {
        if (message.replaces) {
          /**
           * An edit. Only the buttons when `editChoicesOnly` says so, which is
           * how a locked question keeps the exact wording that was answered.
           * The address is part of the match so a reference from one person's
           * transcript can never rewrite a row on another's.
           */
          const edited = await db
            .update(chatMessages)
            .set({
              choices,
              ...(message.editChoicesOnly === true ? {} : { text: message.text }),
              updatedAt: at,
            })
            .where(and(eq(chatMessages.id, message.replaces), owned(to)))
            .returning({ id: chatMessages.id });

          if (edited.length === 0) {
            // The row is gone, which is an erased transcript or a reference
            // from before one. Nothing to edit, and never will be.
            return { ok: false, permanent: true, reason: `web: no message ${message.replaces} to edit` };
          }
          return { ok: true, messageRef: message.replaces };
        }

        const id = newId();
        await db.insert(chatMessages).values({
          id,
          channel: to.channel,
          channelUserId: to.channelUserId,
          direction: 'out',
          text: message.text,
          choices,
          createdAt: at,
          updatedAt: at,
        });
        return { ok: true, messageRef: id };
      } catch (error) {
        // The database being away is temporary by definition. The outbox retries.
        return {
          ok: false,
          permanent: false,
          reason: error instanceof Error ? error.message : 'database error',
        };
      }
    },

    receive(): Promise<readonly IncomingUpdate[]> {
      return Promise.resolve([]);
    },

    async check(): Promise<{ ok: boolean; detail: string }> {
      try {
        await db.execute(sql`SELECT 1`);
        return { ok: true, detail: 'web channel: the transcript table is reachable' };
      } catch (error) {
        return { ok: false, detail: error instanceof Error ? error.message : 'unreachable' };
      }
    },

    async transcript(address, limit = TRANSCRIPT_LIMIT): Promise<readonly TranscriptRow[]> {
      /**
       * The newest `limit` rows, then put back in order. A person who has been
       * registered for a year has a long transcript, and the screen needs the
       * end of it, not the beginning.
       */
      const rows = await db
        .select({
          id: chatMessages.id,
          direction: chatMessages.direction,
          text: chatMessages.text,
          choices: chatMessages.choices,
          at: chatMessages.createdAt,
        })
        .from(chatMessages)
        .where(owned(address))
        .orderBy(sql`${chatMessages.id} DESC`)
        .limit(limit);

      return rows.reverse().map((row) => ({
        id: row.id,
        direction: row.direction === 'in' ? 'in' : 'out',
        text: row.text,
        choices: Array.isArray(row.choices) ? (row.choices as Choice[]) : null,
        at: row.at,
      }));
    },

    async recordIncoming(address, text): Promise<string> {
      const at = now();
      const id = newId();
      await db.insert(chatMessages).values({
        id,
        channel: address.channel,
        channelUserId: address.channelUserId,
        direction: 'in',
        text,
        choices: null,
        createdAt: at,
        updatedAt: at,
      });
      return id;
    },

    async labelOf(address, messageRef, data): Promise<string | undefined> {
      const [row] = await db
        .select({ choices: chatMessages.choices })
        .from(chatMessages)
        .where(and(eq(chatMessages.id, messageRef), owned(address)));
      const choices = Array.isArray(row?.choices) ? (row.choices as Choice[]) : [];
      return choices.find((choice) => choice.data === data)?.label;
    },
  };
}
