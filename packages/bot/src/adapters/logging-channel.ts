/**
 * A channel that says what passes through it.
 *
 * Written after a person read the same refusal three times and nobody could
 * say what they had sent: the outbox records every reply, the event log
 * records every decision, and nothing recorded the incoming message. This
 * wraps any channel port and writes one line per update received and one per
 * message sent, so a transcript can be read off the terminal.
 *
 * Phone numbers are masked before they reach a log line. A terminal is not a
 * roster, and a log file lives longer than a donor's consent (§12).
 */

import type {
  ChannelAddress,
  ChannelPort,
  IncomingUpdate,
  OutgoingMessage,
} from '../ports/channel.js';

export type LogLine = (line: string) => void;

/** Seven or more digits in a row are a number somebody can ring. */
const mask = (text: string): string =>
  text.replace(/\+?\d[\d ()-]{5,}\d/g, (run) => {
    const digits = run.replace(/\D/g, '');
    if (digits.length < 7) return run;
    return `${run.startsWith('+') ? '+' : ''}${digits.slice(0, 2)}•••${digits.slice(-3)}`;
  });

/** The first line of a message, shortened, so one log line stays one line. */
const firstLine = (text: string, max = 72): string => {
  const line = text.split('\n')[0] ?? '';
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

const who = (address: ChannelAddress): string => `${address.channel}/${address.channelUserId}`;

export function describeIncoming(update: IncomingUpdate): string {
  switch (update.kind) {
    case 'text':
      return `<- ${who(update.address)} #${update.updateId} text ${JSON.stringify(mask(update.text))}`;
    case 'choice':
      return `<- ${who(update.address)} #${update.updateId} tap ${update.data} on msg ${update.messageRef}`;
    case 'contact':
      return `<- ${who(update.address)} #${update.updateId} contact ${mask(update.phone)}`;
  }
}

export function describeOutgoing(to: ChannelAddress, message: OutgoingMessage): string {
  const parts = [`-> ${who(to)} ${JSON.stringify(mask(firstLine(message.text)))}`];
  if (message.choices && message.choices.length > 0) {
    parts.push(`[${String(message.choices.length)} buttons]`);
  }
  if (message.requestContact) parts.push('[asks for contact]');
  if (message.replaces) {
    parts.push(message.editChoicesOnly ? `[edits buttons on msg ${message.replaces}]` : `[replaces msg ${message.replaces}]`);
  }
  return parts.join(' ');
}

export function withLogging(port: ChannelPort, log: LogLine): ChannelPort {
  return {
    name: port.name,

    async send(to, message) {
      const result = await port.send(to, message);
      const outcome = result.ok
        ? `ok, msg ${result.messageRef}`
        : `FAILED${result.permanent ? ' for good' : ', will retry'}: ${result.reason}`;
      log(`${describeOutgoing(to, message)} ${outcome}`);
      return result;
    },

    async receive(signal) {
      const updates = await port.receive(signal);
      for (const update of updates) log(describeIncoming(update));
      return updates;
    },

    check: () => port.check(),
  };
}
