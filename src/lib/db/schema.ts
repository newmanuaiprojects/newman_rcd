import { relations } from "drizzle-orm";
import { pgTable, text, timestamp, boolean, integer, primaryKey, pgEnum, unique } from "drizzle-orm/pg-core";
import { ROOM_TYPES } from "@/types/types";
import { PERMISSIONS } from "@/lib/access/permissions";

export const ROOM_TYPE = pgEnum("room_type", ROOM_TYPES);
export const PERMISSION = pgEnum("permission", PERMISSIONS);
export const FEATURE_CATEGORY = pgEnum("feature_category", ["display", "audio", "connectivity", "furniture", "characteristics", "other"]);

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false).notNull(),
  image: text("image"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const session = pgTable("session", {
  id: text("id").primaryKey(),
  expiresAt: timestamp("expires_at").notNull(),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = pgTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at"),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
  scope: text("scope"),
  password: text("password"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export const role = pgTable("role", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const rolePermission = pgTable(
  "role_permission",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    permission: PERMISSION("permission").notNull(),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.roleId, table.permission] }),
  ]
);

export const userRole = pgTable(
  "user_role",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    roleId: text("role_id")
      .notNull()
      .references(() => role.id, { onDelete: "cascade" }),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.roleId] }),
  ]
);

export const userPermission = pgTable(
  "user_permission",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    permission: PERMISSION("permission").notNull(),
    grantedBy: text("granted_by").references(() => user.id, { onDelete: "set null" }),
    grantedAt: timestamp("granted_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.userId, table.permission] }),
  ]
);

// buildings table
export const buildings = pgTable("buildings", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  abbreviation: text("abbreviation").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// rooms table
export const rooms = pgTable("rooms", {
  id: text("id").primaryKey(),
  buildingId: text("building_id")
    .notNull()
    .references(() => buildings.id, { onDelete: "cascade" }),
  roomNumber: text("room_number").notNull(),
  roomType: ROOM_TYPE("room_type").notNull(),
  displayName: text("display_name"), // optional special name like "Chapel"
  capacity: integer("capacity").notNull(),
  floor: integer("floor").notNull(),
  accessible: boolean("accessible").default(true).notNull(),
  notes: text("notes"),
  photoBack: text("photo_back"),
  photoFront: text("photo_front"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
}, (table) => [
  unique().on(table.buildingId, table.roomNumber),
]);

// features table
export const features = pgTable("features", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  category: text("category").notNull(), // display, audio, connectivity, furniture, etc.
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow(),
});

// room features junction table
export const roomFeatures = pgTable(
  "room_features",
  {
    roomId: text("room_id")
      .notNull()
      .references(() => rooms.id, { onDelete: "cascade" }),
    featureId: text("feature_id")
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    quantity: integer("quantity").default(1).notNull(),
    details: text("details"), // extra info like "outlets at tables", "ceiling mounted"
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.roomId, table.featureId] }),
  ]
);

// relations

export const buildingsRelations = relations(buildings, ({ many }) => ({
  rooms: many(rooms),
}));

export const roomsRelations = relations(rooms, ({ one, many }) => ({
  building: one(buildings, {
    fields: [rooms.buildingId],
    references: [buildings.id],
  }),
  roomFeatures: many(roomFeatures),
}));

export const featuresRelations = relations(features, ({ many }) => ({
  roomFeatures: many(roomFeatures),
}));

export const roomFeaturesRelations = relations(roomFeatures, ({ one }) => ({
  room: one(rooms, {
    fields: [roomFeatures.roomId],
    references: [rooms.id],
  }),
  feature: one(features, {
    fields: [roomFeatures.featureId],
    references: [features.id],
  }),
}));