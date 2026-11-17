'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requirePermission } from '@/lib/access';
import { fieldErrors, parseRoomForm } from '@/lib/rooms/form';
import { createRoom, updateRoom, type SaveResult } from '@/lib/rooms/data';

export interface RoomFormState {
  errors: Record<string, string>;
}

const ROOM_NUMBER_TAKEN = 'That building already has a room with this number.';

export async function createRoomAction(state: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const editor = await requirePermission('rooms:create');
  const parsed = parseRoomForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  return afterSave(await createRoom(parsed.data, editor.id));
}

export async function updateRoomAction(roomId: string, state: RoomFormState, formData: FormData): Promise<RoomFormState> {
  const editor = await requirePermission('rooms:update');
  const parsed = parseRoomForm(formData);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  return afterSave(await updateRoom(roomId, parsed.data, editor.id));
}

function afterSave(result: SaveResult): RoomFormState {
  if (!result.ok) return { errors: { roomNumber: ROOM_NUMBER_TAKEN } };
  revalidatePath('/');
  revalidatePath(`/rooms/${result.roomId}`);
  redirect(`/rooms/${result.roomId}`);
}
