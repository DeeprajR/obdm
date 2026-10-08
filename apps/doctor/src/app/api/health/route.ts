import type { NextResponse } from 'next/server';

import { healthResponse } from '@blood-connect/staff-web';

/** The load balancer's probe (§11.9). Shallow, public and uninformative. */
export const dynamic = 'force-dynamic';

export function GET(): Promise<NextResponse> {
  return healthResponse();
}
