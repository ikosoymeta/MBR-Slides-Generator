import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  dataSources, InsertDataSource,
  pillarConfigs, InsertPillarConfig,
  mbrGenerations, InsertMbrGeneration,
  generationLogs, InsertGenerationLog,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Data Sources ───────────────────────────────────────────────

export async function listDataSources(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(dataSources).where(eq(dataSources.userId, userId)).orderBy(desc(dataSources.updatedAt));
}

export async function createDataSource(data: InsertDataSource) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(dataSources).values(data);
  return { id: result[0].insertId };
}

export async function updateDataSource(id: number, userId: number, data: Partial<InsertDataSource>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(dataSources).set(data).where(and(eq(dataSources.id, id), eq(dataSources.userId, userId)));
}

export async function deleteDataSource(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(dataSources).where(and(eq(dataSources.id, id), eq(dataSources.userId, userId)));
}

// ─── Pillar Configs ─────────────────────────────────────────────

export async function listPillarConfigs() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(pillarConfigs).orderBy(pillarConfigs.pillarName);
}

export async function getPillarConfig(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(pillarConfigs).where(eq(pillarConfigs.id, id)).limit(1);
  return result[0];
}

export async function upsertPillarConfig(data: InsertPillarConfig) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.id) {
    await db.update(pillarConfigs).set(data).where(eq(pillarConfigs.id, data.id));
    return { id: data.id };
  }
  const result = await db.insert(pillarConfigs).values(data);
  return { id: result[0].insertId };
}

export async function deletePillarConfig(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(pillarConfigs).where(eq(pillarConfigs.id, id));
}

// ─── MBR Generations ────────────────────────────────────────────

export async function listMbrGenerations(userId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (userId) {
    return db.select().from(mbrGenerations).where(eq(mbrGenerations.userId, userId)).orderBy(desc(mbrGenerations.createdAt));
  }
  return db.select().from(mbrGenerations).orderBy(desc(mbrGenerations.createdAt));
}

export async function getMbrGeneration(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(mbrGenerations).where(eq(mbrGenerations.id, id)).limit(1);
  return result[0];
}

export async function createMbrGeneration(data: InsertMbrGeneration) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(mbrGenerations).values(data);
  return { id: result[0].insertId };
}

export async function updateMbrGeneration(id: number, data: Partial<InsertMbrGeneration>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(mbrGenerations).set(data).where(eq(mbrGenerations.id, id));
}

// ─── Generation Logs ────────────────────────────────────────────

export async function addGenerationLog(data: InsertGenerationLog) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(generationLogs).values(data);
}

export async function getGenerationLogs(generationId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(generationLogs).where(eq(generationLogs.generationId, generationId)).orderBy(generationLogs.createdAt);
}
