'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/access';
import { createBuilding } from '@/lib/buildings/data';
import { parseBuildingForm } from '@/lib/buildings/form';
import { fieldErrors, type FormState } from '@/lib/forms';

export async function createBuildingAction(state: FormState, formData: FormData): Promise<FormState> {
  await requirePermission('rooms:create');
  const parsed = parseBuildingForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  const result = await createBuilding(parsed.data);
  if (!result.ok) return { errors: { abbreviation: `${parsed.data.abbreviation} is already a building.` } };
  revalidatePath('/');
  redirect(`/rooms/new?building=${result.buildingId}`);
}
