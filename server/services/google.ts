/**
 * Google Workspace integration service.
 * Wraps the `gws` CLI to interact with Google Sheets, Docs, Slides, and Drive.
 * Uses spawnSync with array args to avoid shell escaping issues.
 */
import { spawnSync, execSync } from "child_process";
import type { ExpenseRecord, LaunchScheduleItem, PlanningDocContent } from "../../shared/types";
import { GOOGLE_IDS } from "../../shared/types";
import { readFileSync } from "fs";

// ─── Core GWS wrapper ────────────────────────────────────────────

/** Read the freshest token from the token file or environment. */
let _cachedToken: string | null = null;
let _tokenFetchedAt = 0;
const TOKEN_FILE = "/tmp/gws_token.txt";

function getFreshEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env as Record<string, string> };
  // The platform injects the token at process creation time.
  // When refreshed, we write the new token to /tmp/gws_token.txt.
  // Cache for 30 seconds to avoid file I/O overhead.
  const now = Date.now();
  if (!_cachedToken || now - _tokenFetchedAt > 30_000) {
    try {
      const raw = readFileSync(TOKEN_FILE, "utf-8").trim();
      if (raw && raw.length > 20) {
        _cachedToken = raw;
        _tokenFetchedAt = now;
      }
    } catch {
      // Fallback: try process.env
      if (process.env.GOOGLE_WORKSPACE_CLI_TOKEN) {
        _cachedToken = process.env.GOOGLE_WORKSPACE_CLI_TOKEN;
        _tokenFetchedAt = now;
      }
    }
  }
  if (_cachedToken) {
    env.GOOGLE_WORKSPACE_CLI_TOKEN = _cachedToken;
  }
  return env;
}

function gwsJson(subcommand: string, params: Record<string, unknown>, jsonBody?: Record<string, unknown>): any {
  const args = [...subcommand.split(" "), "--params", JSON.stringify(params)];
  if (jsonBody) {
    args.push("--json", JSON.stringify(jsonBody));
  }
  const freshEnv = getFreshEnv();
  const result = spawnSync("gws", args, {
    encoding: "utf-8",
    timeout: 120_000,
    maxBuffer: 50 * 1024 * 1024,
    env: freshEnv,
  });
  if (result.error) {
    console.error("[GWS Error] spawn error:", result.error.message);
    throw new Error(`GWS spawn failed: ${result.error.message}`);
  }
  // Parse stdout even on non-zero exit to check for structured error
  let parsed: any;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    if (result.status !== 0) {
      console.error("[GWS Error] stderr:", result.stderr?.substring(0, 500));
      throw new Error(`GWS command failed (exit ${result.status}): ${result.stderr?.substring(0, 200)}`);
    }
    console.error("[GWS Error] JSON parse failed, stdout:", result.stdout?.substring(0, 200));
    throw new Error("GWS returned non-JSON output");
  }
  if (parsed?.error) {
    const code = parsed.error.code || result.status;
    const msg = parsed.error.message || "Unknown GWS API error";
    console.error(`[GWS Error] API error ${code}: ${msg}`);
    throw new Error(`GWS API error (${code}): ${msg}`);
  }
  return parsed;
}

// ─── Helpers ──────────────────────────────────────────────────────

function safeCol(row: string[], idx: number): string {
  return (row[idx] ?? "").trim();
}

function parseDollar(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : (val.includes("(") ? -num : num);
}

// ─── Google Sheets ──────────────────────────────────────────────

/**
 * Column mapping for SF Main Expense Data:
 * A(0)=Pillar, B(1)=Team, C(2)=Section, D(3)=Project Name,
 * E(4)=Supplier Name, F(5)=Milestone Name, G(6)=Milestone Status,
 * H(7)=Accounting Treatment, I(8)=Funding Name, J(9)=Funding ID,
 * K(10)=Spend Rec Date, L(11)=Override Reason, M(12)=Approval Date,
 * N(13)=PO Number, O(14)=Payment Amount, P(15)=Description/Notes,
 * Q(16)=Project Vertical, R(17)=Project Sub-Vertical,
 * S(18)=Funding Tier, T(19)=Content Tier, U(20)=Pipeline Status,
 * V(21)=Funding Amount, W(22)=Recognized Amount, X(23)=Actual?,
 * Y(24)=Owner, Z(25)=Buy@ Invoice, AA(26)=Invoice Number,
 * AB(27)=Status, AC(28)=blank, AD(29)=Funding URL,
 * AE(30)=Month, AF(31)=Quarter, AG(32)=Year
 */

export async function fetchSheetValues(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const data = gwsJson("sheets spreadsheets values get", { spreadsheetId, range });
  return data.values || [];
}

function parseExpenseRow(r: string[]): ExpenseRecord | null {
  if (r.length < 15) return null;
  return {
    pillar: safeCol(r, 0),
    team: safeCol(r, 1),
    section: safeCol(r, 2),
    projectName: safeCol(r, 3),
    supplierName: safeCol(r, 4),
    milestoneName: safeCol(r, 5),
    milestoneStatus: safeCol(r, 6),
    accountingTreatment: safeCol(r, 7),
    fundingName: safeCol(r, 8),
    fundingId: safeCol(r, 9),
    spendRecDate: safeCol(r, 10),
    paymentAmount: safeCol(r, 14),
    fundingAmount: r.length > 21 ? safeCol(r, 21) : "",
    recognizedAmount: r.length > 22 ? safeCol(r, 22) : "",
    status: r.length > 27 ? safeCol(r, 27) : "",
    month: r.length > 30 ? safeCol(r, 30) : "",
    quarter: r.length > 31 ? safeCol(r, 31) : "",
    year: r.length > 32 ? safeCol(r, 32) : "",
  };
}

const EXPENSE_RANGES = [
  "SF Main Expense Data!A2:AH5000",
  "SF Main Expense Data!A5001:AH10000",
  "SF Main Expense Data!A10001:AH16000",
];

export async function fetchExpenseData(
  pillar?: string,
  team?: string,
  year?: string,
  month?: string
): Promise<ExpenseRecord[]> {
  const allRecords: ExpenseRecord[] = [];
  for (const range of EXPENSE_RANGES) {
    try {
      const rows = await fetchSheetValues(GOOGLE_IDS.SF_EXPENSE_DATA, range);
      for (const r of rows) {
        const rec = parseExpenseRow(r);
        if (!rec) continue;
        if (pillar && rec.pillar !== pillar) continue;
        if (team && rec.team !== team) continue;
        if (year && rec.year !== year) continue;
        if (month && rec.month !== month) continue;
        allRecords.push(rec);
      }
    } catch {
      break;
    }
  }
  return allRecords;
}

export async function fetchExpenseFilters(): Promise<{
  pillars: string[];
  teams: Record<string, string[]>;
  years: string[];
  months: string[];
}> {
  const pillars = new Set<string>();
  const teamsByPillar: Record<string, Set<string>> = {};
  const years = new Set<string>();
  const months = new Set<string>();

  for (const range of EXPENSE_RANGES) {
    try {
      const rows = await fetchSheetValues(GOOGLE_IDS.SF_EXPENSE_DATA, range);
      for (const r of rows) {
        const p = safeCol(r, 0);
        const t = safeCol(r, 1);
        const y = r.length > 32 ? safeCol(r, 32) : "";
        const m = r.length > 30 ? safeCol(r, 30) : "";
        if (p) {
          pillars.add(p);
          if (!teamsByPillar[p]) teamsByPillar[p] = new Set();
          if (t) teamsByPillar[p].add(t);
        }
        if (y) years.add(y);
        if (m) months.add(m);
      }
    } catch {
      break;
    }
  }

  const teams: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(teamsByPillar)) {
    teams[k] = Array.from(v).sort();
  }

  return {
    pillars: Array.from(pillars).sort(),
    teams,
    years: Array.from(years).sort(),
    months: Array.from(months).sort(),
  };
}

/** Fetch Master Summary by Pillar tab for aggregated budget data */
export async function fetchMasterSummary(): Promise<{
  headers: string[];
  subHeaders: string[];
  monthHeaders: string[];
  data: Record<string, Record<string, string>>;
}> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.SF_EXPENSE_DATA,
    "Master Summary by Pillar!A1:Z20"
  );

  const headers = rows[0] || [];
  const subHeaders = rows[1] || [];
  const monthHeaders = rows[2] || [];

  const data: Record<string, Record<string, string>> = {};
  for (const r of rows.slice(4)) {
    const pillarName = safeCol(r, 0);
    if (!pillarName) continue;
    const row: Record<string, string> = {};
    for (let i = 0; i < r.length; i++) {
      const key = `col_${i}`;
      row[key] = safeCol(r, i);
    }
    data[pillarName] = row;
  }

  return { headers, subHeaders, monthHeaders, data };
}

/** Fetch budget data aggregated by team and project for a specific pillar */
export async function fetchBudgetByTeamProject(
  pillar: string,
  year: string
): Promise<{
  byTeam: Record<string, { recognized: number; funding: number; payment: number; projects: string[] }>;
  byQuarter: Record<string, number>;
  total: { recognized: number; funding: number; payment: number };
}> {
  const records = await fetchExpenseData(pillar, undefined, year);

  const byTeam: Record<string, { recognized: number; funding: number; payment: number; projects: string[] }> = {};
  const byQuarter: Record<string, number> = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
  let totalRec = 0, totalFund = 0, totalPay = 0;

  for (const rec of records) {
    const team = rec.team || "Unassigned";
    if (!byTeam[team]) {
      byTeam[team] = { recognized: 0, funding: 0, payment: 0, projects: [] };
    }
    const recAmt = parseDollar(rec.recognizedAmount);
    const fundAmt = parseDollar(rec.fundingAmount);
    const payAmt = parseDollar(rec.paymentAmount);

    byTeam[team].recognized += recAmt;
    byTeam[team].funding += fundAmt;
    byTeam[team].payment += payAmt;
    if (rec.projectName && !byTeam[team].projects.includes(rec.projectName)) {
      byTeam[team].projects.push(rec.projectName);
    }

    if (rec.quarter) byQuarter[rec.quarter] = (byQuarter[rec.quarter] || 0) + recAmt;
    totalRec += recAmt;
    totalFund += fundAmt;
    totalPay += payAmt;
  }

  return { byTeam, byQuarter, total: { recognized: totalRec, funding: totalFund, payment: totalPay } };
}

export async function fetchLaunchSchedule(quarter?: string): Promise<LaunchScheduleItem[]> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.HORIZON_CONTENT_CALENDAR,
    "'2026 Launch View'!A2:J200"
  );

  return rows
    .filter((r) => r.length >= 4 && safeCol(r, 3))
    .map((r) => ({
      source: safeCol(r, 0),
      studio: safeCol(r, 1),
      genre: safeCol(r, 2),
      gameTitle: safeCol(r, 3),
      spm: safeCol(r, 4),
      type: safeCol(r, 5),
      templatePublishDate: r.length > 8 ? safeCol(r, 8) : "",
      deepWorldLaunch: r.length > 9 ? safeCol(r, 9) : "",
    }));
}

// ─── Google Docs ────────────────────────────────────────────────

export async function fetchPlanningDoc(docId: string): Promise<PlanningDocContent> {
  const data = gwsJson("docs documents get", { documentId: docId });

  let fullText = "";
  for (const elem of data.body?.content || []) {
    if (elem.paragraph) {
      for (const e of elem.paragraph.elements || []) {
        if (e.textRun) fullText += e.textRun.content;
        if (e.richLink) {
          const props = e.richLink.richLinkProperties || {};
          fullText += `[${props.title || "link"}](${props.uri || ""})`;
        }
      }
    }
  }

  const sections = fullText.split(/\d+\.\s*Initiative:/i);
  const execMatch = fullText.match(/Executive Summary[\s\S]*?Key Points:([\s\S]*?)(?=1\.\s*Initiative:|$)/i);
  const executiveSummary = execMatch?.[1]?.trim() || "";

  const initiatives = sections.slice(1).map((section) => {
    const nameMatch = section.match(/^\s*(.+?)(?:\n|INSTRUCTIONS)/);
    const updatesMatch = section.match(/Updates:([\s\S]*?)(?=Risks:|$)/i);
    const risksMatch = section.match(/Risks:([\s\S]*?)(?=Additional Relevant|$)/i);
    const docsMatch = section.match(/Additional Relevant Supporting Documents:([\s\S]*?)(?=Requested Analytics|$)/i);
    const analyticsMatch = section.match(/Requested Analytics Views:([\s\S]*?)$/i);

    return {
      name: nameMatch?.[1]?.replace(/\[.*?\]/g, "").trim() || "Unnamed Initiative",
      updates: updatesMatch?.[1]?.trim() || "",
      risks: risksMatch?.[1]?.trim() || "",
      supportingDocs: docsMatch?.[1]?.trim() || "",
      analyticsViews: analyticsMatch?.[1]?.trim() || "",
    };
  });

  const notesMatch = fullText.match(/Any Other Notes\?([\s\S]*?)$/i);

  return {
    executiveSummary,
    initiatives,
    otherNotes: notesMatch?.[1]?.trim() || "",
  };
}

// ─── Google Drive ───────────────────────────────────────────────

export async function listDriveFolder(folderId: string): Promise<
  { id: string; name: string; mimeType: string; createdTime?: string }[]
> {
  const data = gwsJson("drive files list", {
    q: `"${folderId}" in parents and trashed=false`,
    fields: "files(id,name,mimeType,createdTime)",
    includeItemsFromAllDrives: true,
    supportsAllDrives: true,
    orderBy: "name",
    pageSize: 100,
  });
  return data.files || [];
}

export async function createDriveFolder(
  name: string,
  parentFolderId: string
): Promise<{ id: string; name: string }> {
  const data = gwsJson(
    "drive files create",
    { fields: "id,name", supportsAllDrives: true },
    { name, mimeType: "application/vnd.google-apps.folder", parents: [parentFolderId] }
  );
  return { id: data.id, name: data.name };
}

/** List output folders from the root output folder */
export async function listOutputFolders(): Promise<
  { id: string; name: string; mimeType: string }[]
> {
  return listDriveFolder(GOOGLE_IDS.MBR_OUTPUT_ROOT);
}

/** List subfolders within a year folder */
export async function listYearSubfolders(yearFolderId: string): Promise<
  { id: string; name: string; mimeType: string }[]
> {
  const files = await listDriveFolder(yearFolderId);
  return files.filter(f => f.mimeType === "application/vnd.google-apps.folder");
}

// ─── Google Slides ──────────────────────────────────────────────

export async function getPresentation(presentationId: string): Promise<any> {
  return gwsJson("slides presentations get", { presentationId });
}

export async function copyPresentation(
  sourceId: string,
  title: string,
  folderId: string
): Promise<{ id: string; name: string }> {
  const data = gwsJson(
    "drive files copy",
    { fileId: sourceId, fields: "id,name", supportsAllDrives: true },
    { name: title, parents: [folderId] }
  );
  return { id: data.id, name: data.name };
}

export async function batchUpdatePresentation(
  presentationId: string,
  requests: any[]
): Promise<any> {
  return gwsJson(
    "slides presentations batchUpdate",
    { presentationId },
    { requests }
  );
}

/** Fetch unique project names from SF Main Expense Data, optionally filtered */
export async function fetchProjectNames(
  pillar?: string,
  team?: string,
  year?: string
): Promise<string[]> {
  const names = new Set<string>();
  for (const range of EXPENSE_RANGES) {
    try {
      const rows = await fetchSheetValues(GOOGLE_IDS.SF_EXPENSE_DATA, range);
      for (const r of rows) {
        const pName = safeCol(r, 3);
        if (!pName) continue;
        if (pillar && safeCol(r, 0) !== pillar) continue;
        if (team && safeCol(r, 1) !== team) continue;
        if (year && (r.length <= 32 || safeCol(r, 32) !== year)) continue;
        names.add(pName);
      }
    } catch {
      break;
    }
  }
  return Array.from(names).sort();
}

/** Fetch all data for a specific project name */
export async function fetchProjectData(
  projectName: string
): Promise<{
  records: ExpenseRecord[];
  summary: {
    pillar: string;
    teams: string[];
    totalFunding: number;
    totalRecognized: number;
    totalPayment: number;
    suppliers: string[];
    statuses: string[];
    quarters: string[];
    years: string[];
    accountingTreatments: string[];
  };
}> {
  const records: ExpenseRecord[] = [];
  const teams = new Set<string>();
  const suppliers = new Set<string>();
  const statuses = new Set<string>();
  const quarters = new Set<string>();
  const years = new Set<string>();
  const treatments = new Set<string>();
  let pillar = "";
  let totalFunding = 0, totalRecognized = 0, totalPayment = 0;

  for (const range of EXPENSE_RANGES) {
    try {
      const rows = await fetchSheetValues(GOOGLE_IDS.SF_EXPENSE_DATA, range);
      for (const r of rows) {
        if (safeCol(r, 3) !== projectName) continue;
        const rec = parseExpenseRow(r);
        if (!rec) continue;
        pillar = rec.pillar || pillar;
        records.push(rec);
        if (rec.team) teams.add(rec.team);
        if (rec.supplierName) suppliers.add(rec.supplierName);
        if (rec.status) statuses.add(rec.status);
        if (rec.quarter) quarters.add(rec.quarter);
        if (rec.year) years.add(rec.year);
        if (rec.accountingTreatment) treatments.add(rec.accountingTreatment);
        totalFunding += parseDollar(rec.fundingAmount);
        totalRecognized += parseDollar(rec.recognizedAmount);
        totalPayment += parseDollar(rec.paymentAmount);
      }
    } catch {
      break;
    }
  }

  return {
    records,
    summary: {
      pillar,
      teams: Array.from(teams).sort(),
      totalFunding,
      totalRecognized,
      totalPayment,
      suppliers: Array.from(suppliers).sort(),
      statuses: Array.from(statuses).sort(),
      quarters: Array.from(quarters).sort(),
      years: Array.from(years).sort(),
      accountingTreatments: Array.from(treatments).sort(),
    },
  };
}

/** Read content from a Google Doc URL */
export async function fetchDocFromUrl(url: string): Promise<string> {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Invalid Google Doc URL");
  const docId = match[1];
  const data = gwsJson("docs documents get", { documentId: docId });
  let fullText = "";
  for (const elem of data.body?.content || []) {
    if (elem.paragraph) {
      for (const e of elem.paragraph.elements || []) {
        if (e.textRun) fullText += e.textRun.content;
      }
    }
  }
  return fullText;
}

/** Read content from a Google Sheet URL */
export async function fetchSheetFromUrl(url: string, tab?: string): Promise<string[][]> {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Invalid Google Sheet URL");
  const sheetId = match[1];
  const range = tab ? `'${tab}'!A1:Z1000` : "A1:Z1000";
  return fetchSheetValues(sheetId, range);
}

export async function listExistingMbrDecks(pillarFolderId: string): Promise<
  { id: string; name: string; createdTime: string }[]
> {
  const files = await listDriveFolder(pillarFolderId);
  return files
    .filter((f) => f.mimeType === "application/vnd.google-apps.presentation")
    .map((f) => ({
      id: f.id,
      name: f.name,
      createdTime: f.createdTime || "",
    }));
}
