import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Data source configurations - Google Docs and Sheets URLs */
export const dataSources = mysqlTable("data_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  sourceType: mysqlEnum("sourceType", ["google_sheet", "google_doc", "google_slides"]).notNull(),
  googleFileId: varchar("googleFileId", { length: 255 }).notNull(),
  sheetTab: varchar("sheetTab", { length: 255 }),
  description: text("description"),
  category: mysqlEnum("category", [
    "planning_doc", "content_calendar", "budget_tracker",
    "expense_data", "template", "other"
  ]).default("other").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  lastSyncedAt: timestamp("lastSyncedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type DataSource = typeof dataSources.$inferSelect;
export type InsertDataSource = typeof dataSources.$inferInsert;

/** Pillar configurations with folder mappings */
export const pillarConfigs = mysqlTable("pillar_configs", {
  id: int("id").autoincrement().primaryKey(),
  pillarName: varchar("pillarName", { length: 255 }).notNull(),
  driveFolderId: varchar("driveFolderId", { length: 255 }),
  templatePresentationId: varchar("templatePresentationId", { length: 255 }),
  planningDocId: varchar("planningDocId", { length: 255 }),
  contentCalendarId: varchar("contentCalendarId", { length: 255 }),
  contentCalendarTab: varchar("contentCalendarTab", { length: 255 }),
  expenseSheetId: varchar("expenseSheetId", { length: 255 }),
  teams: json("teams").$type<string[]>(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PillarConfig = typeof pillarConfigs.$inferSelect;
export type InsertPillarConfig = typeof pillarConfigs.$inferInsert;

/** MBR generation records */
export const mbrGenerations = mysqlTable("mbr_generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pillarConfigId: int("pillarConfigId").notNull(),
  pillarName: varchar("pillarName", { length: 255 }).notNull(),
  month: int("month").notNull(),
  year: int("year").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["draft", "generating", "completed", "failed"]).default("draft").notNull(),
  presentationId: varchar("presentationId", { length: 255 }),
  presentationUrl: varchar("presentationUrl", { length: 1000 }),
  driveFolderId: varchar("driveFolderId", { length: 255 }),
  generatedSlideCount: int("generatedSlideCount"),
  executiveSummary: text("executiveSummary"),
  aiCommentary: json("aiCommentary").$type<Record<string, string>>(),
  inputData: json("inputData").$type<Record<string, unknown>>(),
  errorMessage: text("errorMessage"),
  generatedAt: timestamp("generatedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MbrGeneration = typeof mbrGenerations.$inferSelect;
export type InsertMbrGeneration = typeof mbrGenerations.$inferInsert;

/** Generation logs for audit trail */
export const generationLogs = mysqlTable("generation_logs", {
  id: int("id").autoincrement().primaryKey(),
  generationId: int("generationId").notNull(),
  step: varchar("step", { length: 255 }).notNull(),
  status: mysqlEnum("status", ["started", "completed", "failed", "skipped"]).notNull(),
  message: text("message"),
  details: json("details").$type<Record<string, unknown>>(),
  durationMs: int("durationMs"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type GenerationLog = typeof generationLogs.$inferSelect;
export type InsertGenerationLog = typeof generationLogs.$inferInsert;
