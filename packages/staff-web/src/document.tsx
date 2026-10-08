import type { ReactNode } from 'react';
import type { Metadata, Viewport } from 'next';

import { ServiceWorker } from './client/service-worker.js';
import { Ux4gRuntime } from './client/ux4g-runtime.js';

/**
 * The root layout's metadata, the same in all three applications.
 *
 * Deliberately **not** named per application. The root layout wraps every
 * response, the 403 included, and §14 wants that page to carry nothing about
 * who is asking or what they would have seen. Which application this is goes
 * where a person looks for it instead: the header, the sign-in page's title,
 * and the installed-app name in each application's own manifest.
 */
export const staffMetadata: Metadata = {
  title: 'Blood Connect',
  description:
    'Blood requests, centre inventory and donor recruitment for a medical-college hospital.',

  manifest: '/manifest.webmanifest',
  applicationName: 'Blood Connect',
  appleWebApp: { capable: true, statusBarStyle: 'default', title: 'Blood Connect' },
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
 * `data-theme` on `<html>` is required, not optional: UX4G components have no
 * fallback theme and render unstyled without it (Design.md §10).
 */
export function StaffDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <a className="app-skip-link" href="#main">
          Skip to main content
        </a>
        {children}
        <Ux4gRuntime />
        <ServiceWorker />
      </body>
    </html>
  );
}
