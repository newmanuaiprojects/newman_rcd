import { z } from 'zod';
import { FLOORS } from '@/lib/rooms/labels';
import { ROOM_TYPES } from '@/types/types';

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Keep this under ${max} characters.`)
    .transform((value) => value || null);

const photoUrl = z
  .string()
  .trim()
  .transform((value) => value || null)
  .pipe(z.url({ protocol: /^https$/, hostname: /\.ufs\.sh$/, error: 'Upload the photo again.' }).nullable());

const wholeNumber = (message: string) => z.string(message).trim().regex(/^\d{1,5}$/, message).transform(Number);

export const roomFormSchema = z.object({
  buildingId: z.string('Choose a building.').min(1, 'Choose a building.'),
  roomNumber: z.string('Enter a room number.').trim().min(1, 'Enter a room number.').max(20, 'Keep the room number under 20 characters.'),
  displayName: optionalText(100),
  roomType: z.enum(ROOM_TYPES, 'Choose a room type.'),
  floor: wholeNumber('Choose a floor.').refine((floor) => FLOORS.includes(floor), 'Choose a floor.'),
  capacity: wholeNumber('Enter the capacity as a whole number.'),
  accessible: z.boolean(),
  notes: optionalText(1000),
  photoFront: photoUrl,
  photoBack: photoUrl,
  features: z.record(
    z.string().min(1),
    z.object({
      quantity: wholeNumber('Enter a whole number.').refine((quantity) => quantity > 0, 'Enter 1 or more.'),
      details: optionalText(200),
    }),
  ),
});

export type RoomInput = z.output<typeof roomFormSchema>;

export function parseRoomForm(formData: FormData) {
  const featureIds = formData.getAll('features').filter((value) => typeof value === 'string');
  return roomFormSchema.safeParse({
    buildingId: formData.get('buildingId'),
    roomNumber: formData.get('roomNumber'),
    displayName: formData.get('displayName'),
    roomType: formData.get('roomType'),
    floor: formData.get('floor'),
    capacity: formData.get('capacity'),
    accessible: formData.get('accessible') === 'on',
    notes: formData.get('notes'),
    photoFront: formData.get('photoFront'),
    photoBack: formData.get('photoBack'),
    features: Object.fromEntries(
      featureIds.map((id) => [
        id,
        { quantity: formData.get(`quantity:${id}`) ?? '1', details: formData.get(`details:${id}`) ?? '' },
      ]),
    ),
  });
}

export function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const field = issue.path.join('.');
    errors[field] ??= issue.message;
  }
  return errors;
}
