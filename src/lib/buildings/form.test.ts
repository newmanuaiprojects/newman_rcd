import { describe, expect, it } from 'vitest';
import { parseBuildingForm } from '@/lib/buildings/form';
import { fieldErrors } from '@/lib/forms';

function form(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [name, value] of Object.entries(fields)) formData.append(name, value);
  return formData;
}

describe('parseBuildingForm', () => {
  it('trims the name and uppercases the short code', () => {
    const result = parseBuildingForm(form({ name: '  Dugan Library ', abbreviation: ' dl ' }));
    expect(result.success && result.data).toEqual({ name: 'Dugan Library', abbreviation: 'DL' });
  });

  it('names what is wrong with each field', () => {
    const result = parseBuildingForm(form({ name: ' ', abbreviation: 'E-K' }));
    expect(result.success ? null : fieldErrors(result.error)).toEqual({
      name: "Enter the building's name.",
      abbreviation: 'Use 2 to 10 letters or numbers, like ECK.',
    });
  });
});
