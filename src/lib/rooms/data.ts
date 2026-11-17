import 'server-only';
import { and, desc, eq, notInArray, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { db } from '@/lib/db';
import { buildings, ROOM_NUMBER_UNIQUE, roomFeatures, roomRevision, rooms, user } from '@/lib/db/schema';
import { excluded } from '@/lib/db/sql';
import type { RoomInput } from '@/lib/rooms/form';

export type SaveResult = { ok: true; roomId: string } | { ok: false; error: 'room-number-taken' };

export interface RoomHistoryEntry {
  id: string;
  change: 'created' | 'updated';
  changedAt: Date;
  editorName: string | null;
}

export async function getRoomForEdit(roomId: string): Promise<{ title: string; values: RoomInput } | null> {
  const [found, featureRows] = await db.batch([
    db
      .select({
        abbreviation: buildings.abbreviation,
        buildingId: rooms.buildingId,
        roomNumber: rooms.roomNumber,
        displayName: rooms.displayName,
        roomType: rooms.roomType,
        floor: rooms.floor,
        capacity: rooms.capacity,
        accessible: rooms.accessible,
        notes: rooms.notes,
      })
      .from(rooms)
      .innerJoin(buildings, eq(buildings.id, rooms.buildingId))
      .where(eq(rooms.id, roomId)),
    db
      .select({ featureId: roomFeatures.featureId, quantity: roomFeatures.quantity, details: roomFeatures.details })
      .from(roomFeatures)
      .where(eq(roomFeatures.roomId, roomId)),
  ]);
  const room = found[0];
  if (!room) return null;

  const { abbreviation, ...values } = room;
  return {
    title: `${abbreviation} ${room.roomNumber}`,
    values: {
      ...values,
      features: Object.fromEntries(featureRows.map(({ featureId, quantity, details }) => [featureId, { quantity, details }])),
    },
  };
}

export async function getRoomHistory(roomId: string): Promise<RoomHistoryEntry[]> {
  return db
    .select({ id: roomRevision.id, change: roomRevision.change, changedAt: roomRevision.changedAt, editorName: user.name })
    .from(roomRevision)
    .leftJoin(user, eq(user.id, roomRevision.changedBy))
    .where(eq(roomRevision.roomId, roomId))
    .orderBy(desc(roomRevision.changedAt));
}

export async function createRoom(input: RoomInput, editorId: string): Promise<SaveResult> {
  const roomId = nanoid();
  const featureRows = roomFeatureRows(roomId, input);
  return saved(roomId, () =>
    db.batch([
      db.insert(rooms).values({ id: roomId, ...roomColumns(input) }),
      db.insert(roomRevision).values(revision(roomId, 'created', input, editorId)),
      ...(featureRows.length > 0 ? [db.insert(roomFeatures).values(featureRows)] : []),
    ]),
  );
}

export async function updateRoom(roomId: string, input: RoomInput, editorId: string): Promise<SaveResult> {
  const featureRows = roomFeatureRows(roomId, input);
  return saved(roomId, () =>
    db.batch([
      db
        .update(rooms)
        .set({ ...roomColumns(input), updatedAt: sql`now()` })
        .where(eq(rooms.id, roomId)),
      db.delete(roomFeatures).where(
        and(
          eq(roomFeatures.roomId, roomId),
          notInArray(
            roomFeatures.featureId,
            featureRows.map((row) => row.featureId),
          ),
        ),
      ),
      db.insert(roomRevision).values(revision(roomId, 'updated', input, editorId)),
      ...(featureRows.length > 0
        ? [
            db
              .insert(roomFeatures)
              .values(featureRows)
              .onConflictDoUpdate({
                target: [roomFeatures.roomId, roomFeatures.featureId],
                set: { quantity: excluded(roomFeatures.quantity), details: excluded(roomFeatures.details) },
              }),
          ]
        : []),
    ]),
  );
}

function roomColumns(input: RoomInput) {
  const { buildingId, roomNumber, displayName, roomType, floor, capacity, accessible, notes } = input;
  return { buildingId, roomNumber, displayName, roomType, floor, capacity, accessible, notes };
}

function roomFeatureRows(roomId: string, input: RoomInput) {
  return Object.entries(input.features).map(([featureId, { quantity, details }]) => ({
    roomId,
    featureId,
    quantity,
    details,
  }));
}

function revision(roomId: string, change: RoomHistoryEntry['change'], snapshot: RoomInput, changedBy: string) {
  return { id: nanoid(), roomId, change, snapshot, changedBy };
}

async function saved(roomId: string, write: () => Promise<unknown>): Promise<SaveResult> {
  try {
    await write();
    return { ok: true, roomId };
  } catch (error) {
    if (violates(error, ROOM_NUMBER_UNIQUE)) return { ok: false, error: 'room-number-taken' };
    throw error;
  }
}

function violates(error: unknown, constraint: string): boolean {
  for (let current = error; current instanceof Error; current = current.cause) {
    if ('constraint' in current && current.constraint === constraint) return true;
  }
  return false;
}
