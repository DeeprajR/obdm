import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';

import { Card, DescList, PageHeader } from '@obdm/ui';

import { KitShell } from '../../kit-shell';
import { StartRequestButton, DischargeButton } from '../../request-buttons';
import { requireAccess } from '@/lib/guards';
import { isUuidV7 } from '@obdm/ids';
import { db } from '@obdm/platform';
import { admissions, patients } from '@obdm/db';
import { WORDING, bloodGroupLabel, type BloodGroup } from '@obdm/domain';

export const metadata: Metadata = { title: 'Admission · OBDM' };

export default async function AdmissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const actor = await requireAccess(`/admissions/${id}`);
  if (actor.kind !== 'user') return null;
  if (!isUuidV7(id)) notFound();

  const [row] = await db
    .select({ admission: admissions, patient: patients })
    .from(admissions)
    .innerJoin(patients, eq(patients.id, admissions.patientId))
    .where(eq(admissions.id, id));

  if (!row) notFound();

  const bloodLabel = bloodGroupLabel(row.patient.bloodGroup as BloodGroup);

  return (
    <KitShell
      role={actor.role} userId={actor.userId}
      currentPath={`/admissions/${id}`}
      currentTitle={row.patient.name}
    >
      <PageHeader
        title={row.patient.name}
        description={`${WORDING.ipNumber} ${row.admission.ipNo} · ${WORDING.ward} ${row.admission.ward} · ${bloodLabel}`}
        actions={
          <>
            <StartRequestButton admissionId={row.admission.id} />
            {row.admission.status === 'admitted' ? (
              <DischargeButton admissionId={row.admission.id} />
            ) : null}
          </>
        }
      />

      <Card>
        <DescList
          items={[
            {
              term: WORDING.age,
              value:
                row.patient.age !== null
                  ? `${String(row.patient.age)} ${row.patient.ageUnit ?? ''}`
                  : (row.patient.dob ?? '—'),
            },
            {
              term: WORDING.hospitalId,
              value: (
                <span className="tabular-nums">{row.patient.uhid ?? '—'}</span>
              ),
            },
            {
              term: WORDING.knownDiagnosis,
              value: row.patient.diagnosis ?? '—',
            },
            {
              term: WORDING.previousTransfusion,
              value: row.patient.previousTransfusion,
            },
          ]}
        />
      </Card>

      <div>
        <Link
          href="/dashboard"
          className="text-sm font-medium text-ink-muted hover:text-ink hover:underline"
        >
          ← Back to the dashboard
        </Link>
      </div>
    </KitShell>
  );
}
