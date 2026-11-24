import { parse, type Info } from 'csv-parse/sync';
import type { buildings, features, roomFeatures, rooms } from '@/lib/db/schema';
import { ROOM_TYPES } from '@/types/types';

export type SeedBuilding = Pick<typeof buildings.$inferSelect, 'abbreviation' | 'name'>;
export type SeedFeature = Pick<typeof features.$inferSelect, 'name' | 'category' | 'counted'>;
export type SeedRoomFeature = Pick<typeof roomFeatures.$inferSelect, 'quantity' | 'details'> & {
  feature: SeedFeature;
};
export type SeedRoom = Pick<
  typeof rooms.$inferSelect,
  'roomNumber' | 'roomType' | 'displayName' | 'capacity' | 'fireMarshalCapacity' | 'floor' | 'notes' | 'photoFront' | 'photoBack'
> & {
  buildingAbbreviation: string;
  features: SeedRoomFeature[];
};

export interface SeedData {
  buildings: SeedBuilding[];
  features: SeedFeature[];
  rooms: SeedRoom[];
}

export interface SeedError {
  line: number;
  message: string;
}

export type SeedParseResult = { ok: true; data: SeedData } | { ok: false; errors: SeedError[] };

const FEATURE_MAP: Record<string, SeedFeature> = {
  projector_qty: { name: 'Projector', category: 'display', counted: true },
  tv_qty: { name: 'TV/Monitor', category: 'display', counted: true },
  whiteboard: { name: 'Whiteboard', category: 'display', counted: false },
  chalkboard: { name: 'Chalkboard', category: 'display', counted: false },
  smartboard: { name: 'Smartboard', category: 'display', counted: false },
  speaker: { name: 'Speakers', category: 'audio', counted: false },
  microphone: { name: 'Microphone', category: 'audio', counted: false },
  camera: { name: 'Camera', category: 'audio', counted: false },
  hdmi: { name: 'HDMI', category: 'connectivity', counted: false },
  vga: { name: 'VGA', category: 'connectivity', counted: false },
  usb_c: { name: 'USB-C', category: 'connectivity', counted: false },
  presentation_stand: { name: 'Presentation Stand', category: 'furniture', counted: false },
  workstation: { name: 'Workstation', category: 'furniture', counted: false },
  windows: { name: 'Windows', category: 'characteristics', counted: false },
  wash_station: { name: 'Wash Station', category: 'characteristics', counted: false },
};
const TABLES: SeedFeature = { name: 'Tables', category: 'furniture', counted: true };
const CHAIRS: SeedFeature = { name: 'Chairs', category: 'furniture', counted: true };

const COLUMNS = [
  'building_name',
  'building_abbrev',
  'room_number',
  'room_display_name',
  'room_type',
  'floor',
  ...Object.keys(FEATURE_MAP),
  'table_qty',
  'table_details',
  'chair_qty',
  'chair_type',
  'notes',
  'photo_back',
  'photo_front',
  'fire_marshal_capacity',
];

type CsvRow = Record<string, string>;

export function roomLabel(buildingAbbreviation: string, roomNumber: string): string {
  return `${buildingAbbreviation} ${roomNumber}`;
}

export function parseSeedCsv(content: string): SeedParseResult {
  const records = parse<{ record: CsvRow; info: Info }>(content, {
    columns: true,
    info: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) {
    return { ok: false, errors: [{ line: 1, message: 'no rooms below the header' }] };
  }
  const missing = COLUMNS.filter((column) => !(column in records[0].record));
  if (missing.length > 0) {
    return { ok: false, errors: [{ line: 1, message: `missing columns: ${missing.join(', ')}` }] };
  }

  const errors: SeedError[] = [];
  const buildingsByAbbreviation = new Map<string, SeedBuilding & { line: number }>();
  const lineByRoom = new Map<string, number>();
  const seedRooms: SeedRoom[] = [];

  for (const { record, info } of records) {
    const line = info.lines;
    const rowErrors: string[] = [];
    const abbreviation = record.building_abbrev;
    const roomNumber = record.room_number;

    if (!abbreviation) rowErrors.push('building_abbrev is empty');
    if (!record.building_name) rowErrors.push('building_name is empty');
    if (!roomNumber) rowErrors.push('room_number is empty');

    const building = buildingsByAbbreviation.get(abbreviation);
    if (!building) {
      buildingsByAbbreviation.set(abbreviation, { abbreviation, name: record.building_name, line });
    } else if (building.name !== record.building_name) {
      rowErrors.push(`building ${abbreviation} is "${building.name}" on line ${building.line}, not "${record.building_name}"`);
    }

    const label = roomLabel(abbreviation, roomNumber);
    const firstLine = lineByRoom.get(label);
    if (firstLine === undefined) {
      lineByRoom.set(label, line);
    } else {
      rowErrors.push(`${label} is already on line ${firstLine}`);
    }

    const roomType = ROOM_TYPES.find((type) => type === record.room_type);
    if (!roomType) {
      rowErrors.push(`room_type "${record.room_type}" is not one of ${ROOM_TYPES.join(', ')}`);
    }

    const floor = parseInteger(record.floor);
    if (floor === undefined) rowErrors.push(`floor "${record.floor}" is not an integer`);

    const roomFeatures: SeedRoomFeature[] = [];
    for (const [column, feature] of Object.entries(FEATURE_MAP)) {
      if (feature.counted) {
        const quantity = parseQuantity(record, column, rowErrors);
        if (quantity) roomFeatures.push({ feature, quantity, details: null });
      } else if (isPresent(record[column])) {
        roomFeatures.push({ feature, quantity: 1, details: null });
      }
    }

    const tables = parseQuantity(record, 'table_qty', rowErrors);
    if (tables) {
      const details = [record.table_qty, record.table_details].filter(Boolean).join(', ');
      roomFeatures.push({ feature: TABLES, quantity: tables, details });
    }

    const chairs = parseQuantity(record, 'chair_qty', rowErrors);
    if (chairs) {
      roomFeatures.push({ feature: CHAIRS, quantity: chairs, details: record.chair_type || null });
    }

    const fireMarshalCapacity = parseQuantity(record, 'fire_marshal_capacity', rowErrors);

    if (rowErrors.length > 0 || !roomType || floor === undefined) {
      errors.push(...rowErrors.map((message) => ({ line, message })));
      continue;
    }

    seedRooms.push({
      buildingAbbreviation: abbreviation,
      roomNumber,
      roomType,
      displayName: record.room_display_name || null,
      capacity: chairs ?? 0,
      fireMarshalCapacity: fireMarshalCapacity ?? null,
      floor,
      notes: record.notes || null,
      photoFront: record.photo_front || null,
      photoBack: record.photo_back || null,
      features: roomFeatures,
    });
  }

  if (errors.length > 0) return { ok: false, errors };

  const seedFeatures = new Map<string, SeedFeature>();
  for (const room of seedRooms) {
    for (const { feature } of room.features) seedFeatures.set(feature.name, feature);
  }

  return {
    ok: true,
    data: {
      buildings: [...buildingsByAbbreviation.values()].map(({ abbreviation, name }) => ({ abbreviation, name })),
      features: [...seedFeatures.values()],
      rooms: seedRooms,
    },
  };
}

function parseInteger(value: string): number | undefined {
  return /^-?\d+$/.test(value) ? Number(value) : undefined;
}

function parseQuantity(record: CsvRow, column: string, rowErrors: string[]): number | undefined {
  const value = record[column];
  if (!value) return undefined;
  const quantity = parseInteger(value);
  if (quantity === undefined || quantity < 0) {
    rowErrors.push(`${column} "${value}" is not a whole number`);
    return undefined;
  }
  return quantity;
}

function isPresent(value: string): boolean {
  return value !== '' && value !== '0' && value !== 'no';
}
