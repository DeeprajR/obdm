import { describe, expect, it } from 'vitest';

import { clientAddress } from './client-address.js';

describe('clientAddress (§3)', () => {
  it('reads the entry the nearest proxy wrote, not the one the client sent', () => {
    expect(clientAddress('1.2.3.4', null)).toBe('1.2.3.4');
    // The client claimed 9.9.9.9; the proxy appended the address it saw.
    expect(clientAddress('9.9.9.9, 1.2.3.4', null)).toBe('1.2.3.4');
    expect(clientAddress('9.9.9.9, 10.0.0.7 , 1.2.3.4', null)).toBe('1.2.3.4');
  });

  it('accepts IPv6 and falls back to X-Real-IP', () => {
    expect(clientAddress('2001:db8::1', null)).toBe('2001:db8::1');
    expect(clientAddress(null, '1.2.3.4')).toBe('1.2.3.4');
    expect(clientAddress('not an address', '1.2.3.4')).toBe('1.2.3.4');
  });

  it('refuses anything that is not an address, so the key cannot be chosen or oversized', () => {
    expect(clientAddress('unknown', null)).toBeNull();
    expect(clientAddress('x'.repeat(5000), null)).toBeNull();
    expect(clientAddress('', '')).toBeNull();
    expect(clientAddress(',', null)).toBeNull();
    expect(clientAddress(undefined, undefined)).toBeNull();
  });
});
