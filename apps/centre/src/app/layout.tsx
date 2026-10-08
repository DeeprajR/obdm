import type { ReactNode } from 'react';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';

// `tailwind.css` `@import`s the kit token files (base, accent-medical,
// typography, preflight) so their `@theme` blocks and preflight's global
// resets pass through Tailwind's PostCSS pipeline. Importing them here as
// separate `.tsx` CSS side-effect imports would bypass that pipeline (ADR 0015).
import './tailwind.css';

import { StaffDocument, staffMetadata, staffViewport } from '@blood-connect/staff-web';

export const metadata = staffMetadata;

export const viewport = staffViewport;

/**
 * The Geist variables (`--font-geist-sans`, `--font-geist-mono`) are set on
 * the html element by `next/font` and read by the kit's typography tokens
 * (`--font-sans`, `--font-mono`) with a system fallback. Loaded here rather
 * than in the shared document because `next/font` must be called from the
 * application's own source.
 */
export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <StaffDocument fontClassName={`${GeistSans.variable} ${GeistMono.variable}`}>
      {children}
    </StaffDocument>
  );
}
