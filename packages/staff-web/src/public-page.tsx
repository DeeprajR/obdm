import type { ReactNode } from 'react';

import type { StaffApp } from './app.js';

/**
 * The frame of a page with nobody signed in: sign-in, the password reset, the
 * invite link and the address confirmation.
 *
 * No app shell, deliberately. An anonymous visitor has no navigation to render
 * and no role-scoped chrome, so a centred column on the canvas is the whole
 * page (ADR 0015). The brand line is the one place such a page says which of
 * the three applications it is: a person at the wrong address finds out here,
 * and nothing about the account they are about to type is needed to tell them.
 */
export function PublicPage({
  app,
  subtitle,
  width = 'md',
  children,
}: {
  app: StaffApp;
  subtitle: string;
  width?: 'sm' | 'md';
  children: ReactNode;
}) {
  return (
    <div
      id="main"
      className="flex min-h-dvh items-center justify-center bg-canvas p-6"
    >
      <div className={width === 'sm' ? 'w-full max-w-sm space-y-6' : 'w-full max-w-md space-y-6'}>
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-control bg-primary text-base font-bold text-white"
          >
            B
          </span>
          <div>
            <p className="text-base font-semibold text-ink">OBDM · {app.name}</p>
            <p className="text-xs text-ink-subtle">Open Blood Donation Management</p>
            <p className="text-xs text-ink-subtle">{subtitle}</p>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
