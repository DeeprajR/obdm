import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import {
  describeIncoming,
  drainOutbox,
  callerAddressFromHeaders,
  handleUpdate,
  takeChatToken,
  type ChannelAddress,
  type IncomingUpdate,
} from '@obdm/bot';
import { newId } from '@obdm/ids';

import { botRuntime, type BotRuntime } from '@/lib/bot';
import { deviceAddress } from '@/lib/identity';

/**
 * The conversation, over HTTP (ADR 0017).
 *
 * `GET` is the transcript. `POST` is one thing the person did, a message, a
 * tap, or opening the application, handed to the same router every channel's
 * updates go through, and answered with the transcript as it stands once the
 * replies have been sent. Replies still go through the outbox (§7.6) and are
 * drained here, immediately, so a tap is answered within the request rather
 * than on the next tick.
 *
 * Public by design: a donor has no account. Who they are is the device cookie,
 * resolved by `deviceAddress`, and nothing in the body can say otherwise.
 */
export const dynamic = 'force-dynamic';

const TEXT_MAX = 500;
const DATA_MAX = 64;
const MESSAGE_REF = /^[0-9a-f-]{36}$/;
const PUBLIC_ID = /^[A-Za-z0-9_-]{4,64}$/;
/** The largest legitimate body is a 500-character message; this is ample. */
const BODY_MAX_BYTES = 4096;

type Incoming =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'choice'; readonly data: string; readonly messageRef: string }
  /** The application opened, on a request link or on nothing in particular. */
  | { readonly kind: 'open'; readonly publicId?: string };

/** Shape-checked by hand: three shapes, no library needed to say no to a fourth. */
function parse(body: unknown): Incoming | undefined {
  if (typeof body !== 'object' || body === null) return undefined;
  const record = body as Record<string, unknown>;
  const kind = record['kind'];

  if (kind === 'text') {
    const text = typeof record['text'] === 'string' ? record['text'].trim() : '';
    if (text.length === 0 || text.length > TEXT_MAX) return undefined;
    return { kind, text };
  }

  if (kind === 'choice') {
    const data = record['data'];
    const messageRef = record['messageRef'];
    if (typeof data !== 'string' || data.length === 0 || data.length > DATA_MAX) return undefined;
    if (typeof messageRef !== 'string' || !MESSAGE_REF.test(messageRef)) return undefined;
    return { kind, data, messageRef };
  }

  if (kind === 'open') {
    const publicId = record['publicId'];
    if (publicId === undefined) return { kind };
    if (typeof publicId !== 'string' || !PUBLIC_ID.test(publicId)) return undefined;
    return { kind, publicId };
  }

  return undefined;
}

/**
 * Same-origin check on every mutating request (§3).
 *
 * The cookie is `sameSite=lax`, which already keeps it off a cross-site POST;
 * this is the second of two independent controls. A missing `Origin` is
 * refused: every browser that can run this sends it on a POST.
 */
async function sameOrigin(): Promise<boolean> {
  const list = await headers();
  const origin = list.get('origin');
  const host = list.get('host');
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * The caller's address, as a throttle key and nothing more (§3). Cloudflare's
 * header behind the tunnel, else the entry the nearest proxy wrote; see
 * `callerAddressFromHeaders`.
 */
async function callerAddress(): Promise<string | null> {
  const list = await headers();
  return callerAddressFromHeaders((name) => list.get(name));
}

/**
 * The body, read no further than `BODY_MAX_BYTES`. A route handler has no
 * body limit of its own, and `request.json()` would buffer and parse whatever
 * arrived, however large, before anything could refuse it.
 */
async function readCapped(request: Request): Promise<string | undefined> {
  const declared = Number(request.headers.get('content-length') ?? '0');
  if (declared > BODY_MAX_BYTES) return undefined;
  if (!request.body) return '';

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > BODY_MAX_BYTES) {
      await reader.cancel();
      return undefined;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString('utf8');
}

const parseJson = (raw: string): unknown => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

/** What the person did, as the router sees it. */
async function toUpdate(
  runtime: BotRuntime,
  address: ChannelAddress,
  incoming: Incoming,
): Promise<IncomingUpdate | undefined> {
  switch (incoming.kind) {
    case 'text': {
      // On the transcript first, so the chat reads as a conversation. The row
      // id is the update id: unique, and a retry writes a new row rather than
      // replaying the old one.
      const updateId = await runtime.web.recordIncoming(address, incoming.text);
      return { kind: 'text', address, text: incoming.text, updateId };
    }
    case 'choice': {
      /*
        A tap is only a tap on a button this person was shown: the data must be
        on the message it names, and that message must be theirs. Anything
        else is a request somebody wrote by hand, and it is not acted on. The
        transcript quotes the button's own label, never the client's text.
      */
      const label = await runtime.web.labelOf(address, incoming.messageRef, incoming.data);
      if (label === undefined) return undefined;
      const updateId = await runtime.web.recordIncoming(address, label);
      return {
        kind: 'choice',
        address,
        data: incoming.data,
        messageRef: incoming.messageRef,
        updateId,
      };
    }
    case 'open': {
      /*
        Opening the application is the web's "any message starts the bot".
        Not written to the transcript: the person said nothing. A request link
        arrives as the same `start <id>` payload a deep link always carried, so
        the router's one command word keeps doing its job (§5).
      */
      const text = incoming.publicId === undefined ? 'hello' : `start ${incoming.publicId}`;
      return { kind: 'text', address, text, updateId: newId() };
    }
  }
}

async function transcriptResponse(
  runtime: BotRuntime,
  address: ChannelAddress,
): Promise<NextResponse> {
  const rows = await runtime.web.transcript(address);
  return NextResponse.json(
    { messages: rows.map((row) => ({ ...row, at: row.at.toISOString() })) },
    // Never cached: a stored transcript is a stale one, and on a shared phone
    // it is somebody else's.
    { headers: { 'cache-control': 'no-store' } },
  );
}

export async function GET(): Promise<NextResponse> {
  try {
    const runtime = botRuntime();
    const { address } = await deviceAddress();
    return await transcriptResponse(runtime, address);
  } catch (error) {
    process.stderr.write(`chat read failed: ${String(error)}\n`);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<NextResponse> {
  if (!(await sameOrigin())) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  if (Number(request.headers.get('content-length') ?? '0') > BODY_MAX_BYTES) {
    return NextResponse.json({ error: 'too large' }, { status: 413 });
  }

  try {
    const runtime = botRuntime();
    const { address, issued } = await deviceAddress();

    /*
      The limit a chat platform used to impose for us (ADR 0017 §8). Counted
      before the body is even read, so a flood costs one upsert per key and no
      transcript row. `Retry-After` says when the window closes.
    */
    const throttle = await takeChatToken(
      runtime.db,
      { device: address.channelUserId, ip: await callerAddress(), newDevice: issued },
      new Date(),
    );
    if (!throttle.allowed) {
      return NextResponse.json(
        { error: 'too many requests' },
        { status: 429, headers: { 'retry-after': String(throttle.retryAfterSeconds) } },
      );
    }

    const raw = await readCapped(request);
    if (raw === undefined) {
      return NextResponse.json({ error: 'too large' }, { status: 413 });
    }
    const incoming = parse(parseJson(raw));
    if (!incoming) {
      return NextResponse.json({ error: 'bad request' }, { status: 400 });
    }

    const update = await toUpdate(runtime, address, incoming);
    if (update === undefined) {
      // A tap on no button of theirs: nothing happens, and they see their
      // conversation as it stands.
      return await transcriptResponse(runtime, address);
    }
    runtime.log(describeIncoming(update));

    await handleUpdate(await runtime.context(), update);

    /**
     * Send what that queued, **now**. The reply is already committed, so if
     * this drain fails the ticker's drain delivers it on the next pass; the
     * person just waits a little longer rather than losing anything.
     */
    try {
      await drainOutbox(await runtime.context(), 20);
    } catch (error) {
      process.stderr.write(`reply drain failed: ${String(error)}\n`);
    }

    return await transcriptResponse(runtime, address);
  } catch (error) {
    // No detail reaches the browser. The terminal has it.
    process.stderr.write(`chat update failed: ${String(error)}\n`);
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}
