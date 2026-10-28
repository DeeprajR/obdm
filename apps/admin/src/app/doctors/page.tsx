import type { Metadata } from 'next';
import Link from 'next/link';

import {
  DataTable,
  StatusBadge,
  linkButtonClasses,
  type Column,
} from '@obdm/ui';

import { KitShell } from '../kit-shell';
import { requireAccess, useCaseContext } from '@/lib/guards';
import { listDoctors, type DoctorSummary } from '@obdm/platform';

export const metadata: Metadata = { title: 'Staff · Administration' };

const ROLE_LABELS: Readonly<Record<string, string>> = {
  doctor: 'Doctor',
  blood_centre: 'Blood centre',
  volunteer_admin: 'Volunteer coordinator',
};

const STATUS_LABELS = {
  active: 'Active',
  pending_activation: 'Invited, not yet activated',
  deactivated: 'Deactivated',
} as const;

const STATUS_TONES = {
  active: 'success',
  pending_activation: 'warning',
  deactivated: 'neutral',
} as const;

const dayFormat = new Intl.DateTimeFormat('en-IN', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'Asia/Kolkata',
});

/** Whole days, so an invite that is ageing is obvious at a glance (§8). */
const daysSince = (from: Date, now: Date): number =>
  Math.floor((now.getTime() - from.getTime()) / 86_400_000);

export default async function DoctorsPage() {
  const actor = await requireAccess('/doctors');
  const ctx = await useCaseContext(actor);
  const doctors = await listDoctors(ctx);
  const now = new Date();

  const columns: Column<DoctorSummary>[] = [
    {
      key: 'name',
      header: 'Name',
      cell: (d) => (
        <Link href={`/doctors/${d.id}`} className="font-medium text-primary hover:underline">
          {d.fullName}
        </Link>
      ),
    },
    { key: 'role', header: 'Role', cell: (d) => ROLE_LABELS[d.role] ?? d.role },
    { key: 'email', header: 'Email', cell: (d) => d.email },
    {
      key: 'reg',
      header: 'Registration',
      cell: (d) => <span className="tabular-nums">{d.provisionalReg ?? '–'}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      cell: (d) => {
        const waiting =
          d.status === 'pending_activation' ? daysSince(d.createdAt, now) : null;
        return (
          <span className="inline-flex items-center gap-1.5">
            <StatusBadge label={STATUS_LABELS[d.status]} tone={STATUS_TONES[d.status]} />
            {/*
              An invite that was never used ages visibly rather than rotting
              silently (§8).
            */}
            {waiting !== null && waiting > 0 ? (
              <span className="text-xs text-ink-subtle">{waiting}d</span>
            ) : null}
          </span>
        );
      },
    },
    {
      key: 'seal',
      header: 'Seal',
      cell: (d) => (d.hasSeal ? 'Yes' : '–'),
    },
    {
      key: 'added',
      header: 'Added',
      cell: (d) => <span className="tabular-nums">{dayFormat.format(d.createdAt)}</span>,
    },
  ];

  return (
    <KitShell actor={actor} currentPath="/doctors" currentTitle="Staff">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-ink">Staff</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {doctors.length} record{doctors.length === 1 ? '' : 's'}
          </p>
        </div>
        <Link href="/doctors/new" className={linkButtonClasses()}>
          Add staff
        </Link>
      </div>

      <DataTable
        columns={columns}
        rows={doctors}
        getRowKey={(d) => d.id}
        emptyLabel="No staff yet. Adding someone sends them an invite to set a password."
      />
    </KitShell>
  );
}
