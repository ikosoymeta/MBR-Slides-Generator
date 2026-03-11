/**
 * Google Workspace integration service.
 * Wraps the `gws` CLI to interact with Google Sheets, Docs, Slides, and Drive.
 * All functions run server-side and shell out to `gws`.
 */
import { execSync } from "child_process";
import type { ExpenseRecord, LaunchScheduleItem, PlanningDocContent } from "../../shared/types";
import { GOOGLE_IDS } from "../../shared/types";

function gws(args: string): string {
  try {
    const result = execSync(`gws ${args}`, {
      encoding: "utf-8",
      timeout: 60_000,
      maxBuffer: 10 * 1024 * 1024,
    });
    return result;
  } catch (err: any) {
    console.error("[GWS Error]", err.stderr || err.message);
    throw new Error(`GWS command failed: ${err.message}`);
  }
}

function gwsJson(args: string): any {
  const raw = gws(`${args} --format json`);
  return JSON.parse(raw);
}

// ─── Google Sheets ──────────────────────────────────────────────

export async function fetchSheetValues(
  spreadsheetId: string,
  range: string
): Promise<string[][]> {
  const data = gwsJson(
    `sheets spreadsheets values get --params '${JSON.stringify({ spreadsheetId, range })}'`
  );
  return data.values || [];
}

export async function fetchExpenseData(
  pillar?: string,
  team?: string,
  year?: string,
  month?: string
): Promise<ExpenseRecord[]> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.SF_EXPENSE_DATA,
    "SF Main Expense Data!A2:AG15753"
  );

  const records: ExpenseRecord[] = rows
    .filter((r) => r.length >= 33)
    .map((r) => ({
      pillar: r[0]?.trim() || "",
      team: r[1]?.trim() || "",
      section: r[2]?.trim() || "",
      projectName: r[3]?.trim() || "",
      supplierName: r[4]?.trim() || "",
      milestoneName: r[5]?.trim() || "",
      milestoneStatus: r[6]?.trim() || "",
      accountingTreatment: r[7]?.trim() || "",
      fundingName: r[8]?.trim() || "",
      fundingId: r[9]?.trim() || "",
      spendRecDate: r[10]?.trim() || "",
      paymentAmount: r[14]?.trim() || "",
      fundingAmount: r[21]?.trim() || "",
      recognizedAmount: r[22]?.trim() || "",
      status: r[27]?.trim() || "",
      month: r[30]?.trim() || "",
      quarter: r[31]?.trim() || "",
      year: r[32]?.trim() || "",
    }));

  return records.filter((rec) => {
    if (pillar && rec.pillar !== pillar) return false;
    if (team && rec.team !== team) return false;
    if (year && rec.year !== year) return false;
    if (month && rec.month !== month) return false;
    return true;
  });
}

export async function fetchExpenseFilters(): Promise<{
  pillars: string[];
  teams: Record<string, string[]>;
  years: string[];
  months: string[];
}> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.SF_EXPENSE_DATA,
    "SF Main Expense Data!A2:AG15753"
  );

  const pillars = new Set<string>();
  const teamsByPillar: Record<string, Set<string>> = {};
  const years = new Set<string>();
  const months = new Set<string>();

  for (const r of rows) {
    if (r.length < 33) continue;
    const p = r[0]?.trim();
    const t = r[1]?.trim();
    const y = r[32]?.trim();
    const m = r[30]?.trim();
    if (p) {
      pillars.add(p);
      if (!teamsByPillar[p]) teamsByPillar[p] = new Set();
      if (t) teamsByPillar[p].add(t);
    }
    if (y) years.add(y);
    if (m) months.add(m);
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

export async function fetchLaunchSchedule(): Promise<LaunchScheduleItem[]> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.HORIZON_CONTENT_CALENDAR,
    "'2026 Launch View'!A2:O200"
  );

  return rows
    .filter((r) => r.length >= 4 && r[3]?.trim())
    .map((r) => ({
      source: r[0]?.trim() || "",
      studio: r[1]?.trim() || "",
      genre: r[2]?.trim() || "",
      gameTitle: r[3]?.trim() || "",
      spm: r[4]?.trim() || "",
      type: r[5]?.trim() || "",
      templatePublishDate: r[8]?.trim() || "",
      deepWorldLaunch: r[10]?.trim() || "",
    }));
}

// ─── Google Docs ────────────────────────────────────────────────

export async function fetchPlanningDoc(docId: string): Promise<PlanningDocContent> {
  const data = gwsJson(
    `docs documents get --params '${JSON.stringify({ documentId: docId })}'`
  );

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

  // Parse structured planning doc
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
  const data = gwsJson(
    `drive files list --params '${JSON.stringify({
      q: `"${folderId}" in parents and trashed=false`,
      fields: "files(id,name,mimeType,createdTime)",
      includeItemsFromAllDrives: true,
      supportsAllDrives: true,
      orderBy: "createdTime desc",
      pageSize: 100,
    })}'`
  );
  return data.files || [];
}

export async function createDriveFolder(
  name: string,
  parentFolderId: string
): Promise<{ id: string; name: string }> {
  const data = gwsJson(
    `drive files create --json '${JSON.stringify({
      name,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    })}' --params '${JSON.stringify({
      fields: "id,name",
      supportsAllDrives: true,
    })}'`
  );
  return { id: data.id, name: data.name };
}

export async function listOutputFolders(year: string): Promise<
  { id: string; name: string; mimeType: string }[]
> {
  const yearFolderId = GOOGLE_IDS.OUTPUT_FOLDERS[year];
  if (!yearFolderId) return [];
  return listDriveFolder(yearFolderId);
}

// ─── Google Slides ──────────────────────────────────────────────

export async function getPresentation(presentationId: string): Promise<any> {
  return gwsJson(
    `slides presentations get --params '${JSON.stringify({ presentationId })}'`
  );
}

export async function copyPresentation(
  sourceId: string,
  title: string,
  folderId: string
): Promise<{ id: string; name: string }> {
  const data = gwsJson(
    `drive files copy --params '${JSON.stringify({
      fileId: sourceId,
      fields: "id,name",
      supportsAllDrives: true,
    })}' --json '${JSON.stringify({
      name: title,
      parents: [folderId],
    })}'`
  );
  return { id: data.id, name: data.name };
}

export async function batchUpdatePresentation(
  presentationId: string,
  requests: any[]
): Promise<any> {
  return gwsJson(
    `slides presentations batchUpdate --params '${JSON.stringify({
      presentationId,
    })}' --json '${JSON.stringify({ requests })}'`
  );
}

/** Fetch unique project names from SF Main Expense Data, optionally filtered */
export async function fetchProjectNames(
  pillar?: string,
  team?: string,
  year?: string
): Promise<string[]> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.SF_EXPENSE_DATA,
    "SF Main Expense Data!A2:AG15753"
  );
  const names = new Set<string>();
  for (const r of rows) {
    if (r.length < 33) continue;
    const pName = r[3]?.trim();
    if (!pName) continue;
    if (pillar && r[0]?.trim() !== pillar) continue;
    if (team && r[1]?.trim() !== team) continue;
    if (year && r[32]?.trim() !== year) continue;
    names.add(pName);
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
    suppliers: string[];
    statuses: string[];
    quarters: string[];
    years: string[];
    accountingTreatments: string[];
  };
}> {
  const rows = await fetchSheetValues(
    GOOGLE_IDS.SF_EXPENSE_DATA,
    "SF Main Expense Data!A2:AG15753"
  );
  const records: ExpenseRecord[] = [];
  const teams = new Set<string>();
  const suppliers = new Set<string>();
  const statuses = new Set<string>();
  const quarters = new Set<string>();
  const years = new Set<string>();
  const treatments = new Set<string>();
  let pillar = "";
  let totalFunding = 0;
  let totalRecognized = 0;

  for (const r of rows) {
    if (r.length < 33) continue;
    if (r[3]?.trim() !== projectName) continue;
    pillar = r[0]?.trim() || pillar;
    const rec: ExpenseRecord = {
      pillar: r[0]?.trim() || "",
      team: r[1]?.trim() || "",
      section: r[2]?.trim() || "",
      projectName: r[3]?.trim() || "",
      supplierName: r[4]?.trim() || "",
      milestoneName: r[5]?.trim() || "",
      milestoneStatus: r[6]?.trim() || "",
      accountingTreatment: r[7]?.trim() || "",
      fundingName: r[8]?.trim() || "",
      fundingId: r[9]?.trim() || "",
      spendRecDate: r[10]?.trim() || "",
      paymentAmount: r[14]?.trim() || "",
      fundingAmount: r[21]?.trim() || "",
      recognizedAmount: r[22]?.trim() || "",
      status: r[27]?.trim() || "",
      month: r[30]?.trim() || "",
      quarter: r[31]?.trim() || "",
      year: r[32]?.trim() || "",
    };
    records.push(rec);
    if (rec.team) teams.add(rec.team);
    if (rec.supplierName) suppliers.add(rec.supplierName);
    if (rec.status) statuses.add(rec.status);
    if (rec.quarter) quarters.add(rec.quarter);
    if (rec.year) years.add(rec.year);
    if (rec.accountingTreatment) treatments.add(rec.accountingTreatment);
    totalFunding += parseFloat(rec.fundingAmount.replace(/[$,]/g, "")) || 0;
    totalRecognized += parseFloat(rec.recognizedAmount.replace(/[$,]/g, "")) || 0;
  }

  return {
    records,
    summary: {
      pillar,
      teams: Array.from(teams).sort(),
      totalFunding,
      totalRecognized,
      suppliers: Array.from(suppliers).sort(),
      statuses: Array.from(statuses).sort(),
      quarters: Array.from(quarters).sort(),
      years: Array.from(years).sort(),
      accountingTreatments: Array.from(treatments).sort(),
    },
  };
}

/** Read content from a Google Doc URL (extract doc ID from URL) */
export async function fetchDocFromUrl(url: string): Promise<string> {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!match) throw new Error("Invalid Google Doc URL");
  const docId = match[1];
  const data = gwsJson(
    `docs documents get --params '${JSON.stringify({ documentId: docId })}'`
  );
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
