import type { Metadata } from 'next';
import Link from 'next/link';

import { Card, PageHeader } from '@obdm/ui';

import { KitShell } from '../../kit-shell';
import { CreateDoctorForm } from '../../forms';
import { requireAccess } from '@/lib/guards';

export const metadata: Metadata = { title: 'Add a doctor · Administration' };

export default async function NewDoctorPage() {
  const actor = await requireAccess('/doctors/new');

  return (
    <KitShell actor={actor} currentPath="/doctors" currentTitle="Add a doctor">
      <PageHeader
        title="Add a doctor"
        description="They receive an email with a single-use link and set their own password."
      />

      <Card>
        <CreateDoctorForm />
      </Card>

      <Link
        href="/doctors"
        className="text-sm font-medium text-ink-muted hover:text-ink hover:underline"
      >
        ← Back to the list
      </Link>
    </KitShell>
  );
}
