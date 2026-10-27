/**
 * What every database needs before an application can run against it, whether
 * it is a developer's, CI's, or a hospital's.
 *
 * Three things, each a row the migrations cannot write: the location hierarchy
 * (§5), because it is data with a source and a version rather than schema; the
 * centre's own district, because `centre_settings.district_id` is a foreign
 * key into that hierarchy and the migrations run before it exists; and the
 * contract version both releases assert against at boot (§6).
 *
 * Shared by the seed, which adds synthetic records on top, and the bootstrap,
 * which adds a real administrator and nothing else. Idempotent, because both
 * callers are.
 */

import { eq, sql as raw } from 'drizzle-orm';
import type { drizzle } from 'drizzle-orm/postgres-js';

import { CONTRACT_VERSION, CONTRACT_VERSION_CONFIG_KEY } from '@obdm/contract';

import {
  DATASET_SOURCE,
  DATASET_VERSION,
  readLocationSeed,
} from '../seeds/locations.js';
import {
  appConfig,
  centreSettings,
  locationAliases,
  locationDatasetVersions,
  locationNodes,
} from './schema/index.js';

export type Database = ReturnType<typeof drizzle>;

export async function provisionLocations(db: Database): Promise<void> {
  const nodes = await readLocationSeed();

  await db
    .insert(locationDatasetVersions)
    .values({ version: DATASET_VERSION, source: DATASET_SOURCE })
    .onConflictDoUpdate({
      target: locationDatasetVersions.version,
      set: { source: DATASET_SOURCE },
    });

  // Parents before children: the rows arrive in hierarchy order and the
  // self-referencing foreign key is checked per statement.
  for (const node of nodes) {
    await db
      .insert(locationNodes)
      .values({
        id: node.id,
        level: node.level,
        kind: node.kind,
        parentId: node.parentId,
        name: node.name,
        nameNormalised: node.nameNormalised,
        datasetVersion: DATASET_VERSION,
      })
      .onConflictDoUpdate({
        target: locationNodes.id,
        set: {
          level: node.level,
          kind: node.kind,
          parentId: node.parentId,
          name: node.name,
          nameNormalised: node.nameNormalised,
          datasetVersion: DATASET_VERSION,
          updatedAt: raw`now()`,
        },
      });
  }

  const aliases = nodes.flatMap((node) =>
    node.aliases.map((aliasNormalised) => ({ nodeId: node.id, aliasNormalised })),
  );

  if (aliases.length > 0) {
    await db.insert(locationAliases).values(aliases).onConflictDoNothing();
  }

  const localities = nodes.filter((n) => n.level === 'locality').length;
  process.stdout.write(
    `  locations: ${nodes.length} nodes (${localities} localities), ${aliases.length} aliases\n`,
  );
}

/**
 * Points the centre at its district, now that the hierarchy exists.
 *
 * Migration 0010 creates the settings row without one, because `district_id` is
 * a foreign key into `reference.location_nodes` and the migrations run before
 * this does. Set here rather than there, so a fresh database migrates cleanly
 * and the demand use case has an address to snapshot. A district already set
 * on the settings screen is left alone.
 */
export async function provisionCentreSettings(
  db: Database,
  place: { readonly districtId: string; readonly cityId: string | null },
  options: {
    /**
     * Overwrite a district already set. The seed does, so a development
     * database always comes back to the demonstration's Kozhikode; the
     * bootstrap does not, because a real centre set its own on the settings
     * screen and a re-run must not undo it.
     */
    readonly reset?: boolean;
  } = {},
): Promise<void> {
  const [current] = await db
    .select({ districtId: centreSettings.districtId })
    .from(centreSettings)
    .where(eq(centreSettings.id, 1));

  if (!current) {
    process.stdout.write('  centre:    no settings row; has migration 0010 been applied?\n');
    return;
  }

  if (current.districtId && options.reset !== true) {
    process.stdout.write(`  centre:    settings already point at ${current.districtId}\n`);
    return;
  }

  await db
    .update(centreSettings)
    .set({ districtId: place.districtId, cityId: place.cityId, updatedAt: raw`now()` })
    .where(eq(centreSettings.id, 1));

  process.stdout.write(`  centre:    settings pointed at ${place.districtId}\n`);
}

export async function provisionContractVersion(db: Database): Promise<void> {
  // Both processes assert their compiled contract version against this at boot
  // and refuse to start on a major mismatch (§6).
  await db
    .insert(appConfig)
    .values({ key: CONTRACT_VERSION_CONFIG_KEY, value: CONTRACT_VERSION })
    .onConflictDoUpdate({
      target: appConfig.key,
      set: { value: CONTRACT_VERSION, updatedAt: raw`now()` },
    });

  // Every clinical threshold keeps its default until someone changes it on
  // purpose. Writing the defaults as rows here would freeze today's guideline
  // values into the database and hide a later change to them (§12).
  process.stdout.write(`  config:    contract.version = ${CONTRACT_VERSION}\n`);
}
