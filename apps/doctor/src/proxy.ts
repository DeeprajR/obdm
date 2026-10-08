import type { NextRequest, NextResponse } from 'next/server';

import { guardRequest } from '@blood-connect/staff-web';

import { APP } from '@/lib/app';

/**
 * Layer 1 of §13: route protection, for this application.
 *
 * Every request reaches it; there is no matcher. The decision is the shared
 * route table read with this application's audience, so a session issued by
 * one of the other applications resolves to nobody here.
 */
export function proxy(request: NextRequest): Promise<NextResponse> {
  return guardRequest(APP, request);
}
