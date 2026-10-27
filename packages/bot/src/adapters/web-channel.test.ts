import { afterAll, beforeEach, describe, expect, it } from 'vitest';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

import * as bot from '@obdm/db/bot';
import { createFakeClock } from '@obdm/testing';

import { createWebChannel, type WebChannel } from './web.js';
import type { BotDatabase } from '../db.js';

const testUrl = process.env['TEST_DATABASE_URL'];

/**
 * The web channel is the platform as well as the adapter (ADR 0017), so what
 * it writes is what a person sees. These assert the transcript the way the
 * conversation tests assert the chat: in the order it is read.
 */
describe.skipIf(!testUrl)('the web channel', () => {
  const client = postgres(testUrl ?? '', { max: 4, onnotice: () => undefined });
  const db = drizzle(client, { schema: bot }) as unknown as BotDatabase;
  const clock = createFakeClock(new Date('2026-10-01T09:00:00.000Z'));
  let channel: WebChannel;

  const WHO = { channel: 'web', channelUserId: 'device-1' };
  const OTHER = { channel: 'web', channelUserId: 'device-2' };

  beforeEach(async () => {
    channel = createWebChannel(db, { now: () => clock.now() });
    await client`TRUNCATE bot.chat_messages`;
  });

  afterAll(async () => {
    await client`TRUNCATE bot.chat_messages`;
    await client.end({ timeout: 5 });
  });

  it('writes a sent message to the transcript, in order, with its buttons', async () => {
    await channel.recordIncoming(WHO, 'hello');
    const first = await channel.send(WHO, { text: 'What is your name?' });
    const second = await channel.send(WHO, {
      text: 'Are you male or female?',
      choices: [
        { label: 'Female', data: 'sex:female' },
        { label: 'Male', data: 'sex:male' },
      ],
    });

    expect(first.ok && second.ok).toBe(true);

    const rows = await channel.transcript(WHO);
    expect(rows.map((row) => [row.direction, row.text])).toEqual([
      ['in', 'hello'],
      ['out', 'What is your name?'],
      ['out', 'Are you male or female?'],
    ]);
    expect(rows[1]?.choices).toBeNull();
    expect(rows[2]?.choices?.map((c) => c.data)).toEqual(['sex:female', 'sex:male']);
  });

  it('edits the buttons of an earlier message in place, keeping its text', async () => {
    const asked = await channel.send(WHO, {
      text: 'Could you give?',
      choices: [
        { label: 'Yes', data: 'accept:1' },
        { label: 'No', data: 'decline:1' },
      ],
    });
    if (!asked.ok) throw new Error('send failed');

    const locked = await channel.send(WHO, {
      text: 'ignored',
      replaces: asked.messageRef,
      editChoicesOnly: true,
      choices: [
        { label: 'Yes', data: 'accept:1', state: 'chosen' },
        { label: 'No', data: 'decline:1', state: 'unavailable' },
      ],
    });

    expect(locked).toEqual({ ok: true, messageRef: asked.messageRef });

    const rows = await channel.transcript(WHO);
    // One row, not two: the point of editing in place (§8).
    expect(rows).toHaveLength(1);
    expect(rows[0]?.text).toBe('Could you give?');
    expect(rows[0]?.choices?.map((c) => c.state)).toEqual(['chosen', 'unavailable']);
  });

  it('refuses, permanently, to edit a message that is not on this person’s transcript', async () => {
    const theirs = await channel.send(OTHER, { text: 'theirs', choices: [{ label: 'x', data: 'x' }] });
    if (!theirs.ok) throw new Error('send failed');

    const result = await channel.send(WHO, {
      text: '',
      replaces: theirs.messageRef,
      editChoicesOnly: true,
      choices: [{ label: 'x', data: 'x', state: 'chosen' }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.permanent).toBe(true);
    // And theirs is untouched.
    const rows = await channel.transcript(OTHER);
    expect(rows[0]?.choices?.[0]?.state).toBeUndefined();
  });

  it('keeps one person’s transcript apart from another’s', async () => {
    await channel.send(WHO, { text: 'for one' });
    await channel.send(OTHER, { text: 'for two' });

    expect((await channel.transcript(WHO)).map((r) => r.text)).toEqual(['for one']);
    expect((await channel.transcript(OTHER)).map((r) => r.text)).toEqual(['for two']);
  });

  it('resolves the label a tap stands for from the message it was on', async () => {
    const sent = await channel.send(WHO, {
      text: 'Pick',
      choices: [{ label: 'What is needed now', data: 'needs' }],
    });
    if (!sent.ok) throw new Error('send failed');

    expect(await channel.labelOf(WHO, sent.messageRef, 'needs')).toBe('What is needed now');
    expect(await channel.labelOf(WHO, sent.messageRef, 'nope')).toBeUndefined();
    expect(await channel.labelOf(OTHER, sent.messageRef, 'needs')).toBeUndefined();
  });

  it('returns the end of a long transcript, still in order', async () => {
    for (let i = 0; i < 5; i += 1) {
      await channel.send(WHO, { text: `m${String(i)}` });
    }
    const rows = await channel.transcript(WHO, 3);
    expect(rows.map((r) => r.text)).toEqual(['m2', 'm3', 'm4']);
  });

  it('receives nothing, because updates arrive over HTTP', async () => {
    expect(await channel.receive()).toEqual([]);
    expect((await channel.check()).ok).toBe(true);
  });
});
