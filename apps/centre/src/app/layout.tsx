import type { ReactNode } from 'react';

import 'ux4g-web-components/styles.css';
import '@blood-connect/staff-web/theme.css';

import { StaffDocument, staffMetadata, staffViewport } from '@blood-connect/staff-web';

export const metadata = staffMetadata;

export const viewport = staffViewport;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return <StaffDocument>{children}</StaffDocument>;
}
