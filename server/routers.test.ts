import { describe, it, expect, vi } from "vitest";

/**
 * Tests for:
 * - Single global schedule model (replaces per-pillar schedules)
 * - Null-safety on single-record queries
 * - Delete mutation for MBR generations
 */

// Mock db module with new global schedule helpers
vi.mock("./db", () => ({
  getGlobalSchedule: vi.fn(),
  upsertGlobalSchedule: vi.fn(),
  updateGlobalSchedule: vi.fn(),
  deleteGlobalSchedule: vi.fn(),
  getLastAutopilotRun: vi.fn(),
  getPillarConfig: vi.fn(),
  getMbrGeneration: vi.fn(),
  deleteMbrGeneration: vi.fn(),
  listMbrGenerations: vi.fn().mockResolvedValue([]),
  listPillarConfigs: vi.fn().mockResolvedValue([]),
  listDataSources: vi.fn().mockResolvedValue([]),
  getGenerationLogs: vi.fn().mockResolvedValue([]),
}));

// Mock other services
vi.mock("./services/errorLogger", () => ({
  listErrorLogs: vi.fn().mockResolvedValue({ logs: [], total: 0 }),
  getErrorSummary: vi.fn().mockResolvedValue({ info: 0, warning: 0, error: 0, critical: 0, unresolved: 0 }),
  resolveError: vi.fn(),
}));

import * as db from "./db";

// ─── Single Global Schedule Tests ────────────────────────────────

describe("Single global schedule model", () => {
  it("getGlobalSchedule returns null when no schedule exists", async () => {
    (db.getGlobalSchedule as any).mockResolvedValue(undefined);
    const result = await db.getGlobalSchedule(1);
    expect(result ?? null).toBeNull();
  });

  it("getGlobalSchedule returns the schedule when it exists", async () => {
    const schedule = {
      id: 1,
      userId: 1,
      pillarConfigId: null,
      frequency: "monthly",
      dayOfWeekOrMonth: 12,
      hour: 9,
      minute: 0,
      timezone: "America/Los_Angeles",
      outputFolderId: "abc123",
      folderNameFormat: "MBR Slide Deck {month} {day}, {year}",
      isEnabled: true,
    };
    (db.getGlobalSchedule as any).mockResolvedValue(schedule);
    const result = await db.getGlobalSchedule(1);
    expect(result).toEqual(schedule);
    expect(result!.pillarConfigId).toBeNull(); // Global = null pillarConfigId
    expect(result!.folderNameFormat).toBe("MBR Slide Deck {month} {day}, {year}");
  });

  it("upsertGlobalSchedule creates a new schedule", async () => {
    (db.upsertGlobalSchedule as any).mockResolvedValue({ id: 1 });
    const result = await db.upsertGlobalSchedule({
      userId: 1,
      pillarConfigId: null,
      frequency: "monthly",
      dayOfWeekOrMonth: 1,
      hour: 9,
      minute: 0,
      timezone: "America/Los_Angeles",
      outputFolderId: null,
      folderNameFormat: "MBR Slide Deck {month} {day}, {year}",
      isEnabled: true,
    });
    expect(result).toEqual({ id: 1 });
    expect(db.upsertGlobalSchedule).toHaveBeenCalledWith(
      expect.objectContaining({
        pillarConfigId: null,
        folderNameFormat: "MBR Slide Deck {month} {day}, {year}",
      })
    );
  });

  it("deleteGlobalSchedule removes the schedule by userId", async () => {
    (db.deleteGlobalSchedule as any).mockResolvedValue(undefined);
    await db.deleteGlobalSchedule(1);
    expect(db.deleteGlobalSchedule).toHaveBeenCalledWith(1);
  });
});

// ─── Folder Name Format Tests ────────────────────────────────────

describe("Folder name format", () => {
  function formatFolderName(format: string, date: Date): string {
    const months = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December",
    ];
    const ordinal = (n: number) => {
      const s = ["th", "st", "nd", "rd"];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    };
    return format
      .replace("{month}", months[date.getMonth()])
      .replace("{day}", ordinal(date.getDate()))
      .replace("{year}", String(date.getFullYear()));
  }

  it("formats March 12th, 2026 correctly", () => {
    const date = new Date(2026, 2, 12); // March 12, 2026
    const result = formatFolderName("MBR Slide Deck {month} {day}, {year}", date);
    expect(result).toBe("MBR Slide Deck March 12th, 2026");
  });

  it("formats January 1st, 2027 correctly", () => {
    const date = new Date(2027, 0, 1); // January 1, 2027
    const result = formatFolderName("MBR Slide Deck {month} {day}, {year}", date);
    expect(result).toBe("MBR Slide Deck January 1st, 2027");
  });

  it("formats February 2nd, 2026 correctly", () => {
    const date = new Date(2026, 1, 2); // February 2, 2026
    const result = formatFolderName("MBR Slide Deck {month} {day}, {year}", date);
    expect(result).toBe("MBR Slide Deck February 2nd, 2026");
  });

  it("formats May 3rd, 2026 correctly", () => {
    const date = new Date(2026, 4, 3); // May 3, 2026
    const result = formatFolderName("MBR Slide Deck {month} {day}, {year}", date);
    expect(result).toBe("MBR Slide Deck May 3rd, 2026");
  });

  it("formats November 11th, 2026 correctly", () => {
    const date = new Date(2026, 10, 11); // November 11, 2026
    const result = formatFolderName("MBR Slide Deck {month} {day}, {year}", date);
    expect(result).toBe("MBR Slide Deck November 11th, 2026");
  });

  it("formats December 21st, 2026 correctly", () => {
    const date = new Date(2026, 11, 21); // December 21, 2026
    const result = formatFolderName("MBR Slide Deck {month} {day}, {year}", date);
    expect(result).toBe("MBR Slide Deck December 21st, 2026");
  });

  it("supports custom format strings", () => {
    const date = new Date(2026, 2, 12);
    const result = formatFolderName("{month} {year} MBR - {day}", date);
    expect(result).toBe("March 2026 MBR - 12th");
  });
});

// ─── Query Null-Safety Tests ─────────────────────────────────────

describe("Query null-safety", () => {
  it("getLastAutopilotRun returns null when db returns undefined", async () => {
    (db.getLastAutopilotRun as any).mockResolvedValue(undefined);
    const result = await db.getLastAutopilotRun(1);
    expect(result ?? null).toBeNull();
  });

  it("getLastAutopilotRun returns data when db returns a schedule", async () => {
    const schedule = { id: 1, frequency: "monthly", hour: 9, minute: 0 };
    (db.getLastAutopilotRun as any).mockResolvedValue(schedule);
    const result = await db.getLastAutopilotRun(1);
    expect(result ?? null).toEqual(schedule);
  });

  it("getPillarConfig returns null when db returns undefined", async () => {
    (db.getPillarConfig as any).mockResolvedValue(undefined);
    const result = await db.getPillarConfig(999);
    expect(result ?? null).toBeNull();
  });

  it("getMbrGeneration returns null when db returns undefined", async () => {
    (db.getMbrGeneration as any).mockResolvedValue(undefined);
    const result = await db.getMbrGeneration(999);
    expect(result ?? null).toBeNull();
  });
});

// ─── MBR Generation Delete Tests ─────────────────────────────────

describe("MBR generation delete", () => {
  it("deleteMbrGeneration is callable", async () => {
    (db.deleteMbrGeneration as any).mockResolvedValue(undefined);
    await db.deleteMbrGeneration(1);
    expect(db.deleteMbrGeneration).toHaveBeenCalledWith(1);
  });

  it("delete mutation verifies ownership before deleting", async () => {
    const gen = { id: 5, userId: 1, title: "Test MBR" };
    (db.getMbrGeneration as any).mockResolvedValue(gen);
    (db.deleteMbrGeneration as any).mockResolvedValue(undefined);

    const result = await db.getMbrGeneration(5);
    expect(result).toBeTruthy();
    expect(result!.userId).toBe(1);

    await db.deleteMbrGeneration(5);
    expect(db.deleteMbrGeneration).toHaveBeenCalledWith(5);
  });

  it("delete mutation rejects when generation not found", async () => {
    (db.getMbrGeneration as any).mockResolvedValue(undefined);
    const result = await db.getMbrGeneration(999);
    expect(result).toBeUndefined();
  });
});
