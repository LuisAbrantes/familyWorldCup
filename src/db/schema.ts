import { pgTable, serial, text, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("clerk_user_id").unique().notNull(),
  displayName: text("display_name").notNull(),
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

export const predictions = pgTable(
  "predictions",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
    matchId: integer("match_id").references(() => matches.id, { onDelete: "cascade" }).notNull(),
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
    uniqueIndex("user_match_idx").on(table.userId, table.matchId),
    index("predictions_match_id_idx").on(table.matchId)
  ]
);
