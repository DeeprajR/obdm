'use client';

import { useFormStatus } from 'react-dom';

function Submit() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      className="ux4g-btn ux4g-btn-outline-neutral ux4g-btn-md app-target"
      disabled={pending}
      aria-disabled={pending}
    >
      {pending ? 'Signing out…' : 'Sign out'}
    </button>
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
