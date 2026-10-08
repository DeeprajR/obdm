'use client';

import { useFormStatus } from 'react-dom';

import { Button } from '@blood-connect/ui';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="ghost" size="sm" loading={pending}>
      {pending ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}

/** The action is the application's own, so it clears that application's cookie. */
export function SignOutButton({ action }: { action: () => Promise<void> }) {
  return (
    <form action={action}>
      <Submit />
    </form>
  );
}
