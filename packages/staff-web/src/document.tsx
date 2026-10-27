import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import { ServiceWorker } from './client/service-worker.js';

/**
 * The root layout's metadata, the same in all three applications.
 *
 * Deliberately **not** named per application. The root layout wraps every
 * response, the 403 included, and §14 wants that page to carry nothing about
 * who is asking or what they would have seen. Which application this is goes
 * where a person looks for it instead: the shell, the sign-in page's title,
 * and the installed-app name in each application's own manifest.
 */
export const staffMetadata: Metadata = {
  title: 'OBDM',
  description:
    'Blood requests, centre inventory and donor recruitment for a medical-college hospital.',

  manifest: '/manifest.webmanifest',
  applicationName: 'OBDM',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'OBDM' },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }],
  },
  // A ward device is shared: a private page must not be summarised in a search
  // result or a link preview.
  robots: { index: false, follow: false },
};

export const staffViewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // The design system is light-only here by decision; declaring it stops the
  // browser painting a dark scrollbar and form controls around a light page.
  colorScheme: 'light',
  themeColor: '#ffffff',
  // Zooming stays available. Pinch-to-zoom is how a lot of people read a
  // screen, and disabling it fails WCAG 1.4.4.
  maximumScale: 5,
  userScalable: true,
  // Keeps content clear of a notch when installed to a home screen.
  viewportFit: 'cover',
};

/**
 * The document every staff application renders.
 *
 * `data-theme="light"` on `<html>` is a kit convention (ADR 0015): the design
 * system is light-only for the shared-workstation reason, and a component may
 * read the attribute for that purpose.
 *
 * The font class comes from the application. `next/font` has to be called from
 * a file Next compiles as part of the application, so each `layout.tsx` loads
 * Geist itself and hands the variable class names in; the kit's typography
 * tokens read `--font-geist-sans` and `--font-geist-mono` from there.
 */
export function StaffDocument({
  fontClassName,
  children,
}: {
  fontClassName: string;
  children: ReactNode;
}) {
  return (
    <html lang="en" data-theme="light" className={fontClassName}>
      <body>
        {/*
         * A visually-hidden link that appears on focus, letting a keyboard
         * user skip the shell's nav and jump straight to `#main`. No kit
         * component for this: it is one link, not a design-system concern.
         */}
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded-control focus:border focus:border-border-strong focus:bg-surface focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-ink"
        >
          Skip to main content
        </a>
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
