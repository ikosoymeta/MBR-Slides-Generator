import { describe, expect, it, vi } from "vitest";
import { appRouter } from "./routers";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { GOOGLE_IDS, PILLAR_TEAMS, MBR_TEMPLATE_SLIDES, PILLARS } from "../shared/types";

// ─── Helpers ────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext; clearedCookies: any[] } {
  const clearedCookies: any[] = [];
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  const ctx: TrpcContext = {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: (name: string, options: Record<string, unknown>) => {
        clearedCookies.push({ name, options });
      },
    } as TrpcContext["res"],
  };
  return { ctx, clearedCookies };
}

function createPublicContext(): TrpcContext {
  return {
    user: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };
}

// ─── Tests ──────────────────────────────────────────────────────

describe("shared types", () => {
  it("GOOGLE_IDS has all required resource IDs", () => {
    expect(GOOGLE_IDS.MBR_TEMPLATE).toBe("1EV76g3VtRF2uwxIoaBnNbEnY74x3X8RMA0HAGGcs1sA");
    expect(GOOGLE_IDS.SF_EXPENSE_DATA).toBe("1K-Hh6SUo5OHbLbqCNwy9V04d97IfgnlnjeX8NanQVyw");
    expect(GOOGLE_IDS.HORIZON_CONTENT_CALENDAR).toBe("12Gkpyr_8im8dwW7-N5Gty2e3RHQ2vf5dIs9MsbPB_Lo");
    expect(GOOGLE_IDS.MBR_OUTPUT_ROOT).toBe("1XXg9R7ctvralay50uh5Ei1PBMI1pgJ_V");
    expect(GOOGLE_IDS.OUTPUT_FOLDERS["2026"]).toBeDefined();
    expect(GOOGLE_IDS.OUTPUT_FOLDERS["2027"]).toBeDefined();
    expect(GOOGLE_IDS.OUTPUT_FOLDERS["2028"]).toBeDefined();
  });

  it("PILLAR_TEAMS has entries for known pillars", () => {
    expect(PILLAR_TEAMS["Entertainment"]).toBeDefined();
    expect(PILLAR_TEAMS["Entertainment"].length).toBeGreaterThan(0);
    expect(PILLAR_TEAMS["1P Studios"]).toBeDefined();
    expect(PILLAR_TEAMS["Developer Ecosystem Success"]).toBeDefined();
    expect(PILLAR_TEAMS["Games"]).toBeDefined();
  });

  it("MBR_TEMPLATE_SLIDES has correct structure", () => {
    expect(MBR_TEMPLATE_SLIDES.length).toBe(15);
    expect(MBR_TEMPLATE_SLIDES[0].type).toBe("title");
    expect(MBR_TEMPLATE_SLIDES[3].type).toBe("executive_summary");
    expect(MBR_TEMPLATE_SLIDES[6].type).toBe("launch_schedule");
    expect(MBR_TEMPLATE_SLIDES[8].type).toBe("budget_update");
    expect(MBR_TEMPLATE_SLIDES[14].type).toBe("end_frame");
  });

  it("PILLARS includes all expected values", () => {
    expect(PILLARS).toContain("Entertainment");
    expect(PILLARS).toContain("Studios");
    expect(PILLARS).toContain("2P/3P Games");
    expect(PILLARS).toContain("Emerging Experiences");
    expect(PILLARS).toContain("Total Content");
  });
});

describe("auth.me", () => {
  it("returns null for unauthenticated user", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeNull();
  });

  it("returns user for authenticated user", async () => {
    const { ctx } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test User");
    expect(result?.email).toBe("test@example.com");
  });
});

describe("auth.logout", () => {
  it("clears the session cookie and reports success", async () => {
    const { ctx, clearedCookies } = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
    expect(clearedCookies).toHaveLength(1);
    expect(clearedCookies[0]?.name).toBe(COOKIE_NAME);
    expect(clearedCookies[0]?.options).toMatchObject({
      maxAge: -1,
      secure: true,
      sameSite: "none",
      httpOnly: true,
      path: "/",
    });
  });
});

describe("pillars.getTeams", () => {
  it("returns teams for Entertainment pillar", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pillars.getTeams({ pillarName: "Entertainment" });
    expect(result.teams).toBeDefined();
    expect(result.teams.length).toBeGreaterThan(0);
    expect(result.teams).toContain("Music");
    expect(result.teams).toContain("Live Sports");
  });

  it("returns empty array for unknown pillar", async () => {
    const ctx = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.pillars.getTeams({ pillarName: "NonExistent" });
    expect(result.teams).toEqual([]);
  });
});
