import type { Metadata } from 'next';

import { ProfileBody } from '@blood-connect/staff-web';

import { AppShell } from '../shell';
import {
  cancelEmailChangeAction,
  requestAccountUpdateAction,
  requestEmailChangeAction,
  withdrawAccountUpdateAction,
} from '../actions';
import { requireAccess } from '@/lib/guards';

export const metadata: Metadata = { title: 'Your profile · Blood Connect' };

export default async function ProfilePage() {
  const actor = await requireAccess('/profile');

  return (
    <AppShell actor={actor} title="Your profile">
      <ProfileBody
        actor={actor}
        actions={{
          requestEmailChange: requestEmailChangeAction,
          cancelEmailChange: cancelEmailChangeAction,
          requestAccountUpdate: requestAccountUpdateAction,
          withdrawAccountUpdate: withdrawAccountUpdateAction,
        }}
      />
    </AppShell>
  );
}
