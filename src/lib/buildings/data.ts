import 'server-only';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { buildings } from '@/lib/db/schema';
import type { BuildingInput } from '@/lib/buildings/form';

export type CreateBuildingResult = { ok: true; buildingId: string } | { ok: false; error: 'abbreviation-taken' };

export async function createBuilding(input: BuildingInput): Promise<CreateBuildingResult> {
  const created = await db
    .insert(buildings)
    .values({ id: nanoid(), ...input })
    .onConflictDoNothing({ target: buildings.abbreviation })
    .returning({ id: buildings.id });
  const building = created.at(0);
  return building ? { ok: true, buildingId: building.id } : { ok: false, error: 'abbreviation-taken' };
}
