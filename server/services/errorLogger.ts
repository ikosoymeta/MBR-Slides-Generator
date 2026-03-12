/**
 * Error Logging Service
 * Centralized error tracking for troubleshooting and issue resolution.
 */
import { getDb } from "../db";
import { errorLogs, InsertErrorLog } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export type ErrorSeverity = "info" | "warning" | "error" | "critical";

interface LogErrorOptions {
  severity?: ErrorSeverity;
  source: string;
  message: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
  generationId?: number;
  pillarConfigId?: number;
  userId?: number;
}

/**
 * Log an error to the database for tracking and troubleshooting.
 */
export async function logError(opts: LogErrorOptions): Promise<number | null> {
  try {
    const db = await getDb();
    if (!db) {
      console.error(`[ErrorLogger] DB unavailable. ${opts.severity?.toUpperCase() || "ERROR"}: [${opts.source}] ${opts.message}`);
      return null;
    }

    const data: InsertErrorLog = {
      severity: opts.severity || "error",
      source: opts.source,
      message: opts.message,
      stackTrace: opts.stackTrace || undefined,
      context: opts.context || undefined,
      generationId: opts.generationId || undefined,
      pillarConfigId: opts.pillarConfigId || undefined,
      userId: opts.userId || undefined,
    };

    const result = await db.insert(errorLogs).values(data);
    return result[0].insertId;
  } catch (err) {
    // Fallback to console if DB logging fails
    console.error(`[ErrorLogger] Failed to log error: ${err}`);
    console.error(`[ErrorLogger] Original: ${opts.severity?.toUpperCase() || "ERROR"}: [${opts.source}] ${opts.message}`);
    return null;
  }
}

/**
 * Log an error from a caught exception.
 */
export async function logException(
  error: unknown,
  source: string,
  extra?: Partial<Omit<LogErrorOptions, "source" | "message" | "stackTrace">>
): Promise<number | null> {
  const err = error instanceof Error ? error : new Error(String(error));
  return logError({
    severity: extra?.severity || "error",
    source,
    message: err.message,
    stackTrace: err.stack,
    ...extra,
  });
}

/**
 * List error logs with optional filters.
 */
export async function listErrorLogs(opts?: {
  severity?: ErrorSeverity;
  source?: string;
  pillarConfigId?: number;
  generationId?: number;
  isResolved?: boolean;
  limit?: number;
  offset?: number;
}) {
  const db = await getDb();
  if (!db) return { logs: [], total: 0 };

  const conditions = [];
  if (opts?.severity) conditions.push(eq(errorLogs.severity, opts.severity));
  if (opts?.source) conditions.push(eq(errorLogs.source, opts.source));
  if (opts?.pillarConfigId) conditions.push(eq(errorLogs.pillarConfigId, opts.pillarConfigId));
  if (opts?.generationId) conditions.push(eq(errorLogs.generationId, opts.generationId));
  if (opts?.isResolved !== undefined) conditions.push(eq(errorLogs.isResolved, opts.isResolved));

  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const limit = opts?.limit || 50;
  const offset = opts?.offset || 0;

  const [logs, countResult] = await Promise.all([
    where
      ? db.select().from(errorLogs).where(where).orderBy(desc(errorLogs.createdAt)).limit(limit).offset(offset)
      : db.select().from(errorLogs).orderBy(desc(errorLogs.createdAt)).limit(limit).offset(offset),
    where
      ? db.select({ count: sql<number>`count(*)` }).from(errorLogs).where(where)
      : db.select({ count: sql<number>`count(*)` }).from(errorLogs),
  ]);

  return { logs, total: countResult[0]?.count || 0 };
}

/**
 * Mark an error as resolved.
 */
export async function resolveError(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(errorLogs).set({ isResolved: true }).where(eq(errorLogs.id, id));
}

/**
 * Get error summary counts by severity.
 */
export async function getErrorSummary() {
  const db = await getDb();
  if (!db) return { info: 0, warning: 0, error: 0, critical: 0, unresolved: 0 };

  const [counts] = await db.select({
    info: sql<number>`SUM(CASE WHEN severity = 'info' THEN 1 ELSE 0 END)`,
    warning: sql<number>`SUM(CASE WHEN severity = 'warning' THEN 1 ELSE 0 END)`,
    error: sql<number>`SUM(CASE WHEN severity = 'error' THEN 1 ELSE 0 END)`,
    critical: sql<number>`SUM(CASE WHEN severity = 'critical' THEN 1 ELSE 0 END)`,
    unresolved: sql<number>`SUM(CASE WHEN isResolved = false THEN 1 ELSE 0 END)`,
  }).from(errorLogs);

  return {
    info: Number(counts?.info || 0),
    warning: Number(counts?.warning || 0),
    error: Number(counts?.error || 0),
    critical: Number(counts?.critical || 0),
    unresolved: Number(counts?.unresolved || 0),
  };
}
