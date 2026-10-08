import type { Metadata } from 'next';

import { ProfileBody } from '@blood-connect/staff-web';

import { KitShell } from '../kit-shell';
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
  if (actor.kind !== 'user') return null;

  return (
    <KitShell role={actor.role} currentPath="/profile" currentTitle="Your profile">
      <ProfileBody
        actor={actor}
        actions={{
          requestEmailChange: requestEmailChangeAction,
          cancelEmailChange: cancelEmailChangeAction,
          requestAccountUpdate: requestAccountUpdateAction,
          withdrawAccountUpdate: withdrawAccountUpdateAction,
        }}
      />
    </KitShell>
  );
}
