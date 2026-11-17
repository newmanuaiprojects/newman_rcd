import { z } from 'zod';

export const buildingFormSchema = z.object({
  name: z
    .string("Enter the building's name.")
    .trim()
    .min(1, "Enter the building's name.")
    .max(100, 'Keep the name under 100 characters.'),
  abbreviation: z
    .string('Enter a short code, like ECK.')
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,10}$/, 'Use 2 to 10 letters or numbers, like ECK.'),
});

export type BuildingInput = z.output<typeof buildingFormSchema>;

export function parseBuildingForm(formData: FormData) {
  return buildingFormSchema.safeParse({ name: formData.get('name'), abbreviation: formData.get('abbreviation') });
}
