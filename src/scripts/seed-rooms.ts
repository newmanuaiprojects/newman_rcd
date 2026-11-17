import { readFileSync } from 'fs';
import { nanoid } from 'nanoid';
import { and, eq, notInArray, sql, type SQL } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { db } from '@/lib/db';
import { buildings, features, roomFeatures, rooms } from '@/lib/db/schema';
import { parseSeedCsv, roomLabel, type SeedData } from '@/scripts/seed-csv';

const CSV_PATH = './seed-data.csv';

interface Tally {
  inserted: number;
  updated: number;
  unchanged: number;
}

interface Report {
  buildings: Tally;
  features: Tally;
  rooms: Tally;
  roomFeatures: Tally & { removed: number };
  roomsNotInCsv: string[];
}

async function main() {
  const result = parseSeedCsv(readFileSync(CSV_PATH, 'utf-8'));
  if (!result.ok) {
    console.error(`${CSV_PATH} has ${result.errors.length} problems, so nothing was written:`);
    for (const { line, message } of result.errors) console.error(`  line ${line}: ${message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Read ${result.data.rooms.length} rooms from ${CSV_PATH}\n`);
  printReport(await seed(result.data));
}

async function seed(data: SeedData): Promise<Report> {
  const [existingBuildings, existingFeatures, existingRooms, existingRoomFeatures] = await db.batch([
    db.select({ id: buildings.id, abbreviation: buildings.abbreviation }).from(buildings),
    db.select({ id: features.id, name: features.name }).from(features),
    db
      .select({ id: rooms.id, roomNumber: rooms.roomNumber, abbreviation: buildings.abbreviation })
      .from(rooms)
      .innerJoin(buildings, eq(rooms.buildingId, buildings.id)),
    db.select({ roomId: roomFeatures.roomId, featureId: roomFeatures.featureId }).from(roomFeatures),
  ]);

  const buildingIds = new Map(existingBuildings.map(({ abbreviation, id }) => [abbreviation, id]));
  const featureIds = new Map(existingFeatures.map(({ name, id }) => [name, id]));
  const roomIds = new Map(existingRooms.map(({ abbreviation, roomNumber, id }) => [roomLabel(abbreviation, roomNumber), id]));
  const featureIdsByRoom = new Map<string, Set<string>>();
  for (const { roomId, featureId } of existingRoomFeatures) {
    featureIdsByRoom.set(roomId, (featureIdsByRoom.get(roomId) ?? new Set<string>()).add(featureId));
  }

  const buildingId = stableIds(buildingIds);
  const featureId = stableIds(featureIds);
  const roomId = stableIds(roomIds);

  const changedBuildings = await db
    .insert(buildings)
    .values(data.buildings.map((building) => ({ id: buildingId(building.abbreviation), ...building })))
    .onConflictDoUpdate({
      target: buildings.abbreviation,
      set: { name: excluded(buildings.name), updatedAt: sql`now()` },
      setWhere: changed(buildings.name),
    })
    .returning({ abbreviation: buildings.abbreviation });

  const changedFeatures =
    data.features.length === 0
      ? []
      : await db
          .insert(features)
          .values(data.features.map((feature) => ({ id: featureId(feature.name), ...feature })))
          .onConflictDoUpdate({
            target: features.name,
            set: { category: excluded(features.category), updatedAt: sql`now()` },
            setWhere: changed(features.category),
          })
          .returning({ name: features.name });

  const changedRooms: string[] = [];
  const roomFeatureCounts = { inserted: 0, updated: 0, unchanged: 0, removed: 0 };

  for (const room of data.rooms) {
    const { buildingAbbreviation, features: seededFeatures, ...columns } = room;
    const label = roomLabel(buildingAbbreviation, columns.roomNumber);
    const id = roomId(label);
    const featureRows = seededFeatures.map(({ feature, quantity, details }) => ({
      roomId: id,
      featureId: featureId(feature.name),
      quantity,
      details,
    }));

    const [changedRoom, removed, ...upserted] = await db.batch([
      db
        .insert(rooms)
        .values({ id, buildingId: buildingId(buildingAbbreviation), ...columns })
        .onConflictDoUpdate({
          target: [rooms.buildingId, rooms.roomNumber],
          set: {
            roomType: excluded(rooms.roomType),
            displayName: excluded(rooms.displayName),
            capacity: excluded(rooms.capacity),
            floor: excluded(rooms.floor),
            notes: excluded(rooms.notes),
            photoFront: excluded(rooms.photoFront),
            photoBack: excluded(rooms.photoBack),
            updatedAt: sql`now()`,
          },
          setWhere: changed(
            rooms.roomType,
            rooms.displayName,
            rooms.capacity,
            rooms.floor,
            rooms.notes,
            rooms.photoFront,
            rooms.photoBack,
          ),
        })
        .returning({ id: rooms.id }),
      db
        .delete(roomFeatures)
        .where(
          and(
            eq(roomFeatures.roomId, id),
            notInArray(
              roomFeatures.featureId,
              featureRows.map((row) => row.featureId),
            ),
          ),
        )
        .returning({ featureId: roomFeatures.featureId }),
      ...(featureRows.length === 0
        ? []
        : [
            db
              .insert(roomFeatures)
              .values(featureRows)
              .onConflictDoUpdate({
                target: [roomFeatures.roomId, roomFeatures.featureId],
                set: { quantity: excluded(roomFeatures.quantity), details: excluded(roomFeatures.details) },
                setWhere: changed(roomFeatures.quantity, roomFeatures.details),
              })
              .returning({ featureId: roomFeatures.featureId }),
          ]),
    ]);

    if (changedRoom.length > 0) changedRooms.push(label);
    const counts = tally(
      featureRows.length,
      upserted.flat().map((row) => row.featureId),
      featureIdsByRoom.get(id) ?? new Set<string>(),
    );
    roomFeatureCounts.inserted += counts.inserted;
    roomFeatureCounts.updated += counts.updated;
    roomFeatureCounts.unchanged += counts.unchanged;
    roomFeatureCounts.removed += removed.length;
  }

  const seededRooms = new Set(data.rooms.map((room) => roomLabel(room.buildingAbbreviation, room.roomNumber)));

  return {
    buildings: tally(data.buildings.length, changedBuildings.map((row) => row.abbreviation), buildingIds),
    features: tally(data.features.length, changedFeatures.map((row) => row.name), featureIds),
    rooms: tally(data.rooms.length, changedRooms, roomIds),
    roomFeatures: roomFeatureCounts,
    roomsNotInCsv: [...roomIds.keys()].filter((label) => !seededRooms.has(label)).sort(),
  };
}

// The id already in the database for a key, or a new one that the rest of the run reuses.
function stableIds(existing: ReadonlyMap<string, string>): (key: string) => string {
  const ids = new Map(existing);
  return (key) => {
    const id = ids.get(key) ?? nanoid();
    ids.set(key, id);
    return id;
  };
}

function excluded(column: AnyPgColumn): SQL {
  return sql`excluded.${sql.identifier(column.name)}`;
}

// Skips the update, and leaves updated_at alone, when the CSV matches what is stored.
function changed(...columns: AnyPgColumn[]): SQL {
  return sql`(${sql.join(columns, sql`, `)}) is distinct from (${sql.join(columns.map(excluded), sql`, `)})`;
}

function tally(total: number, changedKeys: string[], existing: { has(key: string): boolean }): Tally {
  const inserted = changedKeys.filter((key) => !existing.has(key)).length;
  return { inserted, updated: changedKeys.length - inserted, unchanged: total - changedKeys.length };
}

function printReport(report: Report) {
  const describe = ({ inserted, updated, unchanged }: Tally) =>
    `${inserted} inserted, ${updated} updated, ${unchanged} unchanged`;

  console.log(`buildings: ${describe(report.buildings)}`);
  console.log(`features: ${describe(report.features)}`);
  console.log(`rooms: ${describe(report.rooms)}`);
  console.log(`room_features: ${describe(report.roomFeatures)}, ${report.roomFeatures.removed} removed`);

  if (report.roomsNotInCsv.length === 0) {
    console.log('\nEvery room in the database is in the CSV.');
    return;
  }
  console.log('\nIn the database but not in the CSV, left alone:');
  for (const label of report.roomsNotInCsv) console.log(`  ${label}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
