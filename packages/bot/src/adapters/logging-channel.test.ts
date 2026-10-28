import { describe, expect, it } from 'vitest';

import { describeIncoming, describeOutgoing, withLogging } from './logging-channel.js';
import { createMemoryChannel } from './memory-channel.js';

const WHO = { channel: 'memory', channelUserId: 'log-1' };

describe('the conversation log', () => {
  it('masks a phone number wherever it appears', () => {
    expect(describeIncoming({ kind: 'contact', address: WHO, phone: '+919847012345', updateId: '7' }))
      .toBe('<- memory/log-1 #7 contact +91•••345');
    expect(describeIncoming({ kind: 'text', address: WHO, text: 'call me on 98470 12345', updateId: '8' }))
      .toContain('"call me on 98•••345"');
  });

  it('keeps a short message readable and shortens a long one to its first line', () => {
    expect(describeIncoming({ kind: 'text', address: WHO, text: 'hi', updateId: '1' }))
      .toBe('<- memory/log-1 #1 text "hi"');
    const line = describeOutgoing(WHO, {
      text: 'What is your phone number?\n\nOnly the blood centre sees it.',
      requestContact: true,
    });
    expect(line).toBe('-> memory/log-1 "What is your phone number?" [asks for contact]');
  });

  it('logs a tap by its verb, never the answer or the journey it names', () => {
    const line = describeIncoming({
      kind: 'choice',
      address: WHO,
      data: 'screen:0190a1b2-0000-7000-8000-000000000001:2:yes',
      messageRef: 'm1',
      updateId: '3',
    });
    expect(line).toBe('<- memory/log-1 #3 tap screen on msg m1');
    expect(line).not.toContain('yes');
  });

  it('says how many buttons went with a question, and which message an edit touched', () => {
    expect(describeOutgoing(WHO, { text: 'Which year?', choices: [{ label: 'a', data: 'a' }, { label: 'b', data: 'b' }] }))
      .toContain('[2 buttons]');
    expect(describeOutgoing(WHO, { text: 'Which year?', replaces: '12', editChoicesOnly: true, choices: [{ label: 'a', data: 'a' }] }))
      .toContain('[edits buttons on msg 12]');
  });

  it('writes one line per message sent and per update received', async () => {
    const lines: string[] = [];
    const inner = createMemoryChannel();
    const port = withLogging(inner, (line) => lines.push(line));

    await port.send(WHO, { text: 'Hello' });
    inner.push({ kind: 'text', address: WHO, text: 'hi there', updateId: 'u9' });
    await port.receive();

    expect(lines).toHaveLength(2);
    expect(lines[0]).toMatch(/^-> memory\/log-1 "Hello" ok, msg /);
    expect(lines[1]).toBe('<- memory/log-1 #u9 text "hi there"');
  });
});
