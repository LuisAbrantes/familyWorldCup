import { pgTable, serial, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const matches = pgTable("matches", {
  id: integer("id").primaryKey(),
  stage: text("stage").notNull(),
  groupName: text("group_name"),
  homeTeamName: text("home_team_name").notNull(),
  awayTeamName: text("away_team_name").notNull(),
  homeTeamCrest: text("home_team_crest"),
  awayTeamCrest: text("away_team_crest"),
  utcDate: timestamp("utc_date").notNull(),
  status: text("status").notNull(),
  homeScore: integer("home_score"),
  awayScore: integer("away_score"),
  lastSyncedAt: timestamp("last_synced_at").notNull(),
});

export const authorizedCreators = pgTable("authorized_creators", {
  id: serial("id").primaryKey(),
  email: text("email").unique().notNull(), // lowercased email
  roomsAllowed: integer("rooms_allowed").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const rooms = pgTable("rooms", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").unique().notNull(), // 6 letter code
  creatorUserId: integer("creator_user_id").references(() => users.id).notNull(),
  adminEmail: text("admin_email"), // pre-assigned owner email (lowercased)
  maxMembers: integer("max_members").default(15).notNull(), // default limit of 15 participants
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const roomMembers = pgTable("room_members", {
  id: serial("id").primaryKey(),
  roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  role: text("role").default("member").notNull(), // 'admin' | 'member'
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
}, (table) => [
  uniqueIndex("room_user_idx").on(table.roomId, table.userId),
]);

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
    roomId: integer("room_id").references(() => rooms.id, { onDelete: "cascade" }).notNull(),
    predictedHome: integer("predicted_home").notNull(),
    predictedAway: integer("predicted_away").notNull(),
    pointsAwarded: integer("points_awarded"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    uniqueIndex("user_match_room_idx").on(table.userId, table.matchId, table.roomId),
    index("predictions_match_id_idx").on(table.matchId),
    index("predictions_room_id_idx").on(table.roomId)
  ]
);

