import Link from 'next/link';

import { Button, Card, DescList, PageHeader, linkButtonClasses } from '@obdm/ui';
import {
  UPDATE_REQUEST_LABELS,
  findAccountById,
  listMyUpdateRequests,
  type Actor,
} from '@obdm/platform';
import { db } from '@obdm/platform';
import { emailChangeRequests } from '@obdm/db';
import { and, eq, isNull } from 'drizzle-orm';

import { RequestEmailChangeForm } from './client/forms.js';
import { RequestUpdateForm } from './client/request-update-form.js';
import type { FormAction } from './form-state.js';
import { useCaseContext } from './guards.js';

export type ProfileActions = {
  readonly requestEmailChange: FormAction;
  readonly cancelEmailChange: () => Promise<void>;
  readonly requestAccountUpdate: FormAction;
  readonly withdrawAccountUpdate: (form: FormData) => Promise<void>;
};

// The link-button chrome for the "Change password" card. A <Link> cannot
// render a <button>, so `linkButtonClasses` gives it <Button>'s
// `variant="secondary"` shape instead.
const LINK_SECONDARY = linkButtonClasses({ variant: 'secondary' });

/**
 * Your own profile. The page has already decided access and wraps this in its
 * own shell; this renders for the signed-in account and nobody else, because
 * the actor is the only input that says whose it is.
 */
export async function ProfileBody({
  actor,
  actions,
}: {
  actor: Actor;
  actions: ProfileActions;
}) {
  if (actor.kind !== 'user') return null;

  const account = await findAccountById(db, actor.userId);

  const [pending] = await db
    .select({
      newEmail: emailChangeRequests.newEmail,
      expiresAt: emailChangeRequests.expiresAt,
    })
    .from(emailChangeRequests)
    .where(
      and(
        eq(emailChangeRequests.userId, actor.userId),
        isNull(emailChangeRequests.consumedAt),
        isNull(emailChangeRequests.supersededAt),
        isNull(emailChangeRequests.cancelledAt),
      ),
    );

  const updates = await listMyUpdateRequests(await useCaseContext(actor));
  const waiting = updates.filter((row) => row.status === 'pending');
  const decided = updates.filter(
    (row) => row.status === 'approved' || row.status === 'rejected',
  );

  return (
    <>
      <PageHeader
        title="Your profile"
        description="Your name and registration number appear on every request you raise, so an administrator agrees to a change before it applies. Your address and your password are yours to change."
      />

      <Card title="Your details">
        <DescList
          items={[
            { term: 'Name', value: account?.fullName ?? '—' },
            { term: 'Email', value: account?.email ?? '—' },
            {
              term: 'Registration',
              value: (
                <span className="tabular-nums">
                  {account?.provisionalReg ?? 'Not recorded'}
                </span>
              ),
            },
          ]}
        />
      </Card>

      <Card title="Change your email address">
        <p className="mb-4 text-xs text-ink-subtle">
          You confirm it yourself, from the new address. Nobody else approves
          it.
        </p>
        {pending ? (
          <div className="space-y-3">
            {/*
              A change in flight is shown with a way out. The third ending
              of this flow is withdrawing it, and a request that can only
              be completed or abandoned silently is the dead end §8
              forbids.
            */}
            <p
              role="status"
              className="rounded-control border border-info/30 bg-info-soft px-3 py-2 text-sm text-ink"
            >
              Waiting for{' '}
              <span className="font-medium">{pending.newEmail}</span> to
              confirm. Your account keeps its current address until then.
            </p>
            <form action={actions.cancelEmailChange}>
              <Button type="submit" variant="danger" size="sm">
                Cancel this change
              </Button>
            </form>
          </div>
        ) : (
          <RequestEmailChangeForm
            action={actions.requestEmailChange}
            currentEmail={account?.email ?? ''}
          />
        )}
      </Card>

      <Card title="Ask to change your name or registration">
        <p className="mb-4 text-xs text-ink-subtle">
          An administrator decides, and the change is applied for you.
        </p>
        <div className="space-y-4">
          {waiting.length > 0 && (
            <ul className="space-y-3">
              {waiting.map((row) => (
                <li key={row.id} className="space-y-2">
                  <p
                    role="status"
                    className="rounded-control border border-info/30 bg-info-soft px-3 py-2 text-sm text-ink"
                  >
                    Waiting on your administrator:{' '}
                    <span className="font-medium">
                      {UPDATE_REQUEST_LABELS[row.field]}
                    </span>{' '}
                    to read{' '}
                    <span className="font-medium">{row.proposedValue}</span>.
                  </p>
                  {/*
                    Every request in flight has a way out. A request that
                    can only be decided by somebody else, with nothing the
                    person can do, is the dead end §8 forbids.
                  */}
                  <form action={actions.withdrawAccountUpdate}>
                    <input type="hidden" name="requestId" value={row.id} />
                    <Button type="submit" variant="danger" size="sm">
                      Withdraw it
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}

          {decided.length > 0 && (
            <ul className="space-y-2">
              {decided.map((row) => (
                <li key={row.id}>
                  <p
                    role="status"
                    className={
                      row.status === 'approved'
                        ? 'rounded-control border border-success/30 bg-success-soft px-3 py-2 text-sm text-ink'
                        : 'rounded-control border border-warning/30 bg-warning-soft px-3 py-2 text-sm text-ink'
                    }
                  >
                    {row.status === 'approved'
                      ? `${UPDATE_REQUEST_LABELS[row.field]} now reads ${row.proposedValue}.`
                      : `${UPDATE_REQUEST_LABELS[row.field]} was not changed. ${row.adminNote ?? ''}`}
                  </p>
                </li>
              ))}
            </ul>
          )}

          <RequestUpdateForm
            action={actions.requestAccountUpdate}
            currentName={account?.fullName ?? ''}
            currentReg={account?.provisionalReg ?? ''}
          />
        </div>
      </Card>

      <Card title="Change your password">
        <p className="mb-4 text-xs text-ink-subtle">
          Uses the same six-digit code as a reset, sent to your address.
        </p>
        <Link href="/reset" className={LINK_SECONDARY}>
          Change password
        </Link>
      </Card>
    </>
  );
}
