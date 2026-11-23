'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/access';
import { fieldErrors, type FormState } from '@/lib/forms';
import { parseRoomForm } from '@/lib/rooms/form';
import { createRoom, updateRoom, type SaveResult } from '@/lib/rooms/data';

const ROOM_NUMBER_TAKEN = 'That building already has a room with this number.';

export async function createRoomAction(state: FormState, formData: FormData): Promise<FormState> {
  const editor = await requirePermission('rooms:create');
  const parsed = parseRoomForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  return afterSave(await createRoom(parsed.data, editor.id));
}

export async function updateRoomAction(roomId: string, state: FormState, formData: FormData): Promise<FormState> {
  const editor = await requirePermission('rooms:update');
  const parsed = parseRoomForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  return afterSave(await updateRoom(roomId, parsed.data, editor.id));
}

function afterSave(result: SaveResult): FormState {
  if (!result.ok) return { errors: { roomNumber: ROOM_NUMBER_TAKEN } };
  revalidatePath('/');
  revalidatePath(`/rooms/${result.roomId}`);
  redirect(`/rooms/${result.roomId}`);
}
