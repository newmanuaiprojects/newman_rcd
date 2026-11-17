import { describe, expect, it } from 'vitest';
import { parseSeedCsv } from '@/scripts/seed-csv';

const HEADER =
  'building_name,building_abbrev,room_number,room_display_name,room_type,floor,projector_qty,tv_qty,whiteboard,chalkboard,smartboard,speaker,microphone,camera,hdmi,usb_c,vga,table_qty,table_details,chair_qty,chair_type,presentation_stand,workstation,windows,wash_station,notes,photo_back,photo_front';
const COLUMNS = HEADER.split(',');

type Row = Partial<Record<string, string>>;

const ROOM: Row = {
  building_name: 'Eck Hall',
  building_abbrev: 'ECK',
  room_number: '260',
  room_type: 'classroom',
  floor: '2',
};

function csv(...rows: Row[]): string {
  return [HEADER, ...rows.map((row) => COLUMNS.map((column) => row[column] ?? '').join(','))].join('\n');
}

function parsed(content: string) {
  const result = parseSeedCsv(content);
  if (!result.ok) throw new Error(`expected no errors, got ${JSON.stringify(result.errors)}`);
  return result.data;
}

describe('parseSeedCsv', () => {
  it('maps a row to a room and its features', () => {
    const data = parsed(
      csv({
        ...ROOM,
        room_display_name: 'Radiologic Technology',
        projector_qty: '2',
        tv_qty: '0',
        whiteboard: '1',
        chalkboard: '0',
        smartboard: 'no',
        table_qty: '16',
        table_details: 'normal',
        chair_qty: '32',
        chair_type: 'rolling',
        notes: 'X-Ray Room',
        photo_front: 'https://example.ufs.sh/f/front',
      }),
    );

    expect(data.rooms).toEqual([
      {
        buildingAbbreviation: 'ECK',
        roomNumber: '260',
        roomType: 'classroom',
        displayName: 'Radiologic Technology',
        capacity: 32,
        floor: 2,
        notes: 'X-Ray Room',
        photoFront: 'https://example.ufs.sh/f/front',
        photoBack: null,
        features: [
          { feature: { name: 'Projector', category: 'display' }, quantity: 2, details: null },
          { feature: { name: 'Whiteboard', category: 'display' }, quantity: 1, details: null },
          { feature: { name: 'Tables', category: 'furniture' }, quantity: 16, details: '16, normal' },
          { feature: { name: 'Chairs', category: 'furniture' }, quantity: 32, details: 'rolling' },
        ],
      },
    ]);
  });

  it('gives a room with no chairs a capacity of 0 and no features', () => {
    const [room] = parsed(csv(ROOM)).rooms;
    expect(room.capacity).toBe(0);
    expect(room.features).toEqual([]);
    expect(room.displayName).toBeNull();
  });

  it('lists each building and feature once', () => {
    const data = parsed(csv({ ...ROOM, chair_qty: '10' }, { ...ROOM, room_number: '262', chair_qty: '20' }));
    expect(data.buildings).toEqual([{ abbreviation: 'ECK', name: 'Eck Hall' }]);
    expect(data.features).toEqual([{ name: 'Chairs', category: 'furniture' }]);
  });

  it('reports every bad row by its line and returns nothing to write', () => {
    const result = parseSeedCsv(
      csv(
        ROOM,
        { ...ROOM, room_number: '262', room_type: 'study-roomn' },
        { ...ROOM, room_number: '264', floor: 'two', tv_qty: '-1' },
        ROOM,
      ),
    );

    expect(result).toEqual({
      ok: false,
      errors: [
        { line: 3, message: expect.stringContaining('room_type "study-roomn" is not one of classroom') },
        { line: 4, message: 'floor "two" is not an integer' },
        { line: 4, message: 'tv_qty "-1" is not a whole number' },
        { line: 5, message: 'ECK 260 is already on line 2' },
      ],
    });
  });

  it('rejects a building that has two names', () => {
    expect(parseSeedCsv(csv(ROOM, { ...ROOM, room_number: '262', building_name: 'Eck' }))).toEqual({
      ok: false,
      errors: [{ line: 3, message: 'building ECK is "Eck Hall" on line 2, not "Eck"' }],
    });
  });

  it('rejects a header that is missing a column', () => {
    expect(parseSeedCsv(csv(ROOM).replace('room_type', 'type'))).toEqual({
      ok: false,
      errors: [{ line: 1, message: 'missing columns: room_type' }],
    });
  });

  it('rejects a file with no rooms', () => {
    expect(parseSeedCsv(HEADER)).toEqual({
      ok: false,
      errors: [{ line: 1, message: 'no rooms below the header' }],
    });
  });
});
