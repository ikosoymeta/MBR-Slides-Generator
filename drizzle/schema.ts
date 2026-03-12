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

/** Data source configurations - Google Docs and Sheets URLs, scoped to a pillar */
export const dataSources = mysqlTable("data_sources", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  pillarConfigId: int("pillarConfigId"),
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

/** Maps a data source section/field to a specific MBR slide component */
export const sourceSlideMappings = mysqlTable("source_slide_mappings", {
  id: int("id").autoincrement().primaryKey(),
  dataSourceId: int("dataSourceId").notNull(),
  pillarConfigId: int("pillarConfigId").notNull(),
  /** Which section/field within the source to read (e.g. sheet tab, doc heading, column range) */
  sourceSection: varchar("sourceSection", { length: 500 }),
  /** The slide component this feeds into */
  slideType: mysqlEnum("slideType", [
    "title", "agenda", "exclusions", "executive_summary",
    "initiatives_goals", "initiative_deep_dive", "launch_schedule",
    "key_dates", "budget_update", "budget_reforecast",
    "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
  ]).notNull(),
  /** Optional description of what data this mapping provides */
  mappingNotes: text("mappingNotes"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SourceSlideMapping = typeof sourceSlideMappings.$inferSelect;
export type InsertSourceSlideMapping = typeof sourceSlideMappings.$inferInsert;

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

/** Field-level bindings: maps a source field/section to a specific slide section */
export const fieldBindings = mysqlTable("field_bindings", {
  id: int("id").autoincrement().primaryKey(),
  pillarConfigId: int("pillarConfigId").notNull(),
  dataSourceId: int("dataSourceId"),
  /** Free-text: the field or section name in the data source */
  sourceField: varchar("sourceField", { length: 500 }).notNull(),
  /** The data type of the source field */
  sourceFieldType: mysqlEnum("sourceFieldType", [
    "string", "number", "date", "currency", "option", "boolean", "url", "graph_aggregator", "other"
  ]).default("string").notNull(),
  /** Which template slide this binds to */
  slideType: mysqlEnum("slideType", [
    "title", "agenda", "exclusions", "executive_summary",
    "initiatives_goals", "initiative_deep_dive", "launch_schedule",
    "key_dates", "budget_update", "budget_reforecast",
    "te", "appendix_header", "budget_detail", "appendix_content", "end_frame"
  ]).notNull(),
  /** The specific section/field within the slide */
  slideSection: varchar("slideSection", { length: 500 }).notNull(),
  /** The data type expected by the slide section */
  slideSectionType: mysqlEnum("slideSectionType", [
    "string", "number", "date", "currency", "picklist", "boolean", "other"
  ]).default("string").notNull(),
  /** Sync direction: source_to_slide, slide_to_source, or bidirectional */
  syncDirection: mysqlEnum("syncDirection", [
    "source_to_slide", "slide_to_source", "bidirectional"
  ]).default("source_to_slide").notNull(),
  /** Optional transformation or notes */
  transformNotes: text("transformNotes"),
  /** Binding status: connected (has source mapping), not_required (skipped), unbound (placeholder) */
  bindingStatus: mysqlEnum("bindingStatus", [
    "connected", "not_required", "unbound"
  ]).default("connected").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FieldBinding = typeof fieldBindings.$inferSelect;
export type InsertFieldBinding = typeof fieldBindings.$inferInsert;

/** Autopilot schedule configurations — single global schedule (generates all pillars) */
export const autopilotSchedules = mysqlTable("autopilot_schedules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  /** Nullable — null means global (all pillars) */
  pillarConfigId: int("pillarConfigId"),
  /** Schedule frequency */
  frequency: mysqlEnum("frequency", ["daily", "weekly", "monthly"]).default("monthly").notNull(),
  /** Day of week for weekly (0=Sun..6=Sat), day of month for monthly (1-28) */
  dayOfWeekOrMonth: int("dayOfWeekOrMonth"),
  /** Hour of day in 24h format (0-23) */
  hour: int("hour").default(9).notNull(),
  /** Minute (0-59) */
  minute: int("minute").default(0).notNull(),
  /** Timezone string e.g. 'America/Los_Angeles' */
  timezone: varchar("timezone", { length: 100 }).default("America/Los_Angeles").notNull(),
  /** Root output folder ID for generated decks */
  outputFolderId: varchar("outputFolderId", { length: 255 }),
  /** Folder naming format, e.g. 'MBR Slide Deck {month} {day}, {year}' */
  folderNameFormat: varchar("folderNameFormat", { length: 500 }).default("MBR Slide Deck {month} {day}, {year}"),
  /** Whether this schedule is enabled */
  isEnabled: boolean("isEnabled").default(true).notNull(),
  /** Last run timestamp */
  lastRunAt: timestamp("lastRunAt"),
  /** Last run status */
  lastRunStatus: mysqlEnum("lastRunStatus", ["success", "failed", "running", "cancelled"]),
  /** Last run error message */
  lastRunError: text("lastRunError"),
  /** Last generated presentation URL */
  lastRunOutputUrl: varchar("lastRunOutputUrl", { length: 1000 }),
  /** Next scheduled run */
  nextRunAt: timestamp("nextRunAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AutopilotSchedule = typeof autopilotSchedules.$inferSelect;
export type InsertAutopilotSchedule = typeof autopilotSchedules.$inferInsert;

/** Error logs for troubleshooting */
export const errorLogs = mysqlTable("error_logs", {
  id: int("id").autoincrement().primaryKey(),
  /** Error severity */
  severity: mysqlEnum("severity", ["info", "warning", "error", "critical"]).default("error").notNull(),
  /** Source module/service that generated the error */
  source: varchar("source", { length: 255 }).notNull(),
  /** Short error message */
  message: text("message").notNull(),
  /** Full stack trace */
  stackTrace: text("stackTrace"),
  /** Additional context as JSON */
  context: json("context").$type<Record<string, unknown>>(),
  /** Related generation ID if applicable */
  generationId: int("generationId"),
  /** Related pillar config ID if applicable */
  pillarConfigId: int("pillarConfigId"),
  /** User ID who triggered the action */
  userId: int("userId"),
  /** Whether this error has been resolved/acknowledged */
  isResolved: boolean("isResolved").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = typeof errorLogs.$inferInsert;
