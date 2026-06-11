import { pgTable, serial, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const demosTable = pgTable("demos", {
  id: serial("id").primaryKey(),
  filename: text("filename").notNull(),
  matchId: text("match_id"),
  map: text("map").notNull().default("unknown"),
  importedAt: timestamp("imported_at").notNull().defaultNow(),
  status: text("status").notNull().default("ready"),
  team1Name: text("team1_name"),
  team2Name: text("team2_name"),
});

export const playersTable = pgTable("players", {
  id: serial("id").primaryKey(),
  demoId: integer("demo_id").notNull().references(() => demosTable.id, { onDelete: "cascade" }),
  steamId: text("steam_id").notNull(),
  name: text("name").notNull(),
  slot: integer("slot").notNull(),
  team: integer("team").notNull(),
});

export const settingsTable = pgTable("settings", {
  id: serial("id").primaryKey(),
  cs2Path: text("cs2_path"),
  watchedFolders: text("watched_folders").notNull().default("[]"),
  autoImport: boolean("auto_import").notNull().default(false),
  replaysSubfolder: text("replays_subfolder").notNull().default("replays"),
});

export const insertDemoSchema = createInsertSchema(demosTable).omit({ id: true, importedAt: true });
export const insertPlayerSchema = createInsertSchema(playersTable).omit({ id: true });
export const insertSettingsSchema = createInsertSchema(settingsTable).omit({ id: true });

export type InsertDemo = z.infer<typeof insertDemoSchema>;
export type Demo = typeof demosTable.$inferSelect;
export type InsertPlayer = z.infer<typeof insertPlayerSchema>;
export type Player = typeof playersTable.$inferSelect;
export type InsertSettings = z.infer<typeof insertSettingsSchema>;
export type Settings = typeof settingsTable.$inferSelect;
