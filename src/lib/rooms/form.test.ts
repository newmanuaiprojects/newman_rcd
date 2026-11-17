import { describe, expect, it } from 'vitest';
import { fieldErrors, parseRoomForm } from '@/lib/rooms/form';

function form(fields: Record<string, string | string[]>): FormData {
  const formData = new FormData();
  const defaults = {
    buildingId: 'eck',
    roomNumber: '260',
    displayName: '',
    roomType: 'classroom',
    floor: '2',
    capacity: '32',
    notes: '',
  };
  for (const [name, value] of Object.entries({ ...defaults, ...fields })) {
    for (const item of Array.isArray(value) ? value : [value]) formData.append(name, item);
  }
  return formData;
}

function errorsOf(formData: FormData) {
  const result = parseRoomForm(formData);
  if (result.success) throw new Error('expected the form to be rejected');
  return fieldErrors(result.error);
}

describe('parseRoomForm', () => {
  it('turns the form into a room with its features', () => {
    const result = parseRoomForm(
      form({
        displayName: '  Radiologic Technology ',
        accessible: 'on',
        notes: 'X-Ray Room',
        features: ['projector', 'chairs'],
        'quantity:projector': '2',
        'details:projector': '',
        'quantity:chairs': '32',
        'details:chairs': 'rolling',
      }),
    );

    expect(result.success && result.data).toEqual({
      buildingId: 'eck',
      roomNumber: '260',
      displayName: 'Radiologic Technology',
      roomType: 'classroom',
      floor: 2,
      capacity: 32,
      accessible: true,
      notes: 'X-Ray Room',
      features: {
        projector: { quantity: 2, details: null },
        chairs: { quantity: 32, details: 'rolling' },
      },
    });
  });

  it('reads an unchecked accessible box and empty text as no', () => {
    const result = parseRoomForm(form({}));
    expect(result.success && result.data).toMatchObject({ accessible: false, displayName: null, notes: null, features: {} });
  });

  it('reports each bad field under its own name', () => {
    expect(errorsOf(form({ buildingId: '', roomNumber: ' ', roomType: 'study-roomn', floor: '11', capacity: 'thirty' }))).toEqual({
      buildingId: 'Choose a building.',
      roomNumber: 'Enter a room number.',
      roomType: 'Choose a room type.',
      floor: 'Choose a floor.',
      capacity: 'Enter the number of seats as a whole number.',
    });
  });

  it("puts a feature's quantity error on that feature", () => {
    expect(
      errorsOf(form({ features: ['projector'], 'quantity:projector': '0', 'details:projector': '' })),
    ).toEqual({ 'features.projector.quantity': 'Enter 1 or more.' });
  });

  it('gives a select left on its placeholder the same message as an empty one', () => {
    const formData = form({});
    formData.delete('buildingId');
    formData.delete('floor');
    expect(errorsOf(formData)).toEqual({ buildingId: 'Choose a building.', floor: 'Choose a floor.' });
  });
});
