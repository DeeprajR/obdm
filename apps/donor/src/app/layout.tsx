import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

// `tailwind.css` `@import`s the kit token files (base, accent-medical,
// typography, preflight) so their `@theme` blocks and preflight's global
// resets pass through Tailwind's PostCSS pipeline (ADR 0015).
import './tailwind.css';

import { ServiceWorker } from './service-worker';

/**
 * The donor application (ADR 0017).
 *
 * The one application with no sign-in: a donor is a device with a cookie, and
 * the conversation (`/chat`) is the whole interface. It also serves `/`, the
 * landing page for the whole system, because it has the bare name. It is
 * installable like the staff applications, with the same shell-only service
 * worker, because the person it is for opens it from a home screen on a
 * phone, often in a hurry.
 */
export const metadata: Metadata = {
  title: 'OBDM · Donors',
  description:
    'Register to give blood, and answer when a patient near you needs your group.',

  manifest: '/manifest.webmanifest',
  applicationName: 'OBDM · Donors',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'BC Donors' },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  // The chat is one person's. A link preview or a search snippet of it would
  // be a line of somebody's conversation.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light',
  themeColor: '#ffffff',
  // Zooming stays available. Pinch-to-zoom is how a lot of people read a
  // screen, and disabling it fails WCAG 1.4.4.
  maximumScale: 5,
  userScalable: true,
  // Keeps the composer clear of a notch and the home bar when installed.
  viewportFit: 'cover',
};

/**
 * `data-theme="light"` on `<html>` is a kit convention (ADR 0015). The Geist
 * variables are set here by `next/font` and read by the kit's typography
 * tokens with a system fallback.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" data-theme="light" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:border focus:border-border-strong focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
        >
          Skip to the main content
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
