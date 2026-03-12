/**
 * MBR Slide Generation Engine.
 * Copies the template, then populates each slide with real data from configured sources.
 *
 * Template slide mapping (from presentation 1EV76g3VtRF2uwxIoaBnNbEnY74x3X8RMA0HAGGcs1sA):
 *   0  Title              - CENTERED_TITLE: "[PILLAR NAME] 2026 Roadmap MBR", SUBTITLE: "[Month] 2026"
 *   1  Agenda             - BODY: "[...]"
 *   2  Exclusions         - static
 *   3  Executive Summary  - text box g3cc763c18ef_0_7: "[...]"
 *   4  Initiatives & Goals - TABLE g3cc763c18ef_1_18 (6×7)
 *   5  Initiative Deep Dive - TITLE: "[PROJECT / INITIATIVE #1]", text boxes for updates/risks
 *   6  Launch Schedule    - TABLE g39314f57dc0_0_337 (5×3)
 *   7  Key Dates          - TABLE g3cc763c18ef_1_25 (5×3)
 *   8  Budget Update      - CHART (linked to external sheet, keep as-is)
 *   9  Budget Reforecast  - image placeholder
 *  10  T&E                - static
 *  11  Appendix header    - static
 *  12  Budget Detail      - TABLE g39314f57dc0_0_364 (7×16)
 *  13  Appendix content   - TITLE: "<Appendix as required>"
 *  14  End frame          - empty
 */
import { invokeLLM } from "../_core/llm";
import {
  copyPresentation,
  batchUpdatePresentation,
  getPresentation,
  fetchExpenseData,
  fetchLaunchSchedule,
  fetchPlanningDoc,
  fetchBudgetByTeamProject,
  fetchMasterSummary,
} from "./google";
import { GOOGLE_IDS } from "../../shared/types";
import type { ExpenseRecord, LaunchScheduleItem, PlanningDocContent } from "../../shared/types";
import type { ResolvedBindings } from "./bindingResolver";

// ─── Public types ─────────────────────────────────────────────────

export interface GenerationInput {
  pillarName: string;
  month: number; // 1-12
  year: number;
  teams: string[];
  planningDocId?: string;
  outputFolderId: string;
  templateId?: string;
  customTitle?: string;
  /** Which template slides to include (by index). If omitted, all slides are included. */
  selectedSlides?: number[];
  /** Resolved bindings from the Data Binding matrix — overrides default data sources */
  resolvedBindings?: ResolvedBindings;
  /** Optional: pre-filled slide content from manual entry or AI chat */
  manualContent?: {
    executiveSummary?: string;
    initiatives?: { name: string; outcome: string; updates: string; risks: string }[];
    launchItems?: { date: string; title: string; quarter: string }[];
    keyDates?: { date: string; title: string; quarter: string }[];
  };
}

export interface GenerationResult {
  presentationId: string;
  presentationUrl: string;
  title: string;
  slideCount: number;
  executiveSummary: string;
  aiCommentary: Record<string, string>;
  steps: StepLog[];
}

interface StepLog {
  step: string;
  status: "completed" | "failed" | "skipped";
  message: string;
  durationMs: number;
}

// ─── Constants ────────────────────────────────────────────────────

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function monthFilterStr(month: number): string {
  return `${String(month).padStart(2, "0")}-${MONTH_NAMES[month - 1]}`;
}

function parseDollar(val: string): number {
  if (!val) return 0;
  const cleaned = val.replace(/[$,\s]/g, "").replace(/[()]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : (val.includes("(") ? -num : num);
}

function fmtDollar(n: number): string {
  if (n === 0) return "$0";
  const abs = Math.abs(n);
  const formatted = abs >= 1_000_000
    ? `$${(abs / 1_000_000).toFixed(1)}M`
    : abs >= 1_000
      ? `$${(abs / 1_000).toFixed(0)}K`
      : `$${abs.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
  return n < 0 ? `(${formatted})` : formatted;
}

function fmtDollarFull(n: number): string {
  if (n === 0) return "$0";
  return n < 0
    ? `($${Math.abs(n).toLocaleString("en-US", { maximumFractionDigits: 0 })})`
    : `$${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

// ─── Main generation function ─────────────────────────────────────

export async function generateMbrDeck(input: GenerationInput): Promise<GenerationResult> {
  const steps: StepLog[] = [];
  const templateId = input.templateId || GOOGLE_IDS.MBR_TEMPLATE;
  const monthName = MONTH_NAMES[input.month - 1];
  const yearShort = String(input.year).slice(2);
  const title = input.customTitle ||
    `${input.pillarName} Content MBR - ${monthName} '${yearShort}`;

  // Step 1: Copy template
  let t0 = Date.now();
  const copied = await copyPresentation(templateId, title, input.outputFolderId);
  steps.push({ step: "copy_template", status: "completed", message: `Created: ${copied.name}`, durationMs: Date.now() - t0 });

  // Step 2: Read presentation structure
  t0 = Date.now();
  const pres = await getPresentation(copied.id);
  const slides = pres.slides || [];
  steps.push({ step: "read_structure", status: "completed", message: `${slides.length} slides`, durationMs: Date.now() - t0 });

  // Step 3: Fetch expense data for the pillar + year
  t0 = Date.now();
  let expenseData: ExpenseRecord[] = [];
  try {
    expenseData = await fetchExpenseData(input.pillarName, undefined, String(input.year));
    steps.push({ step: "fetch_expenses", status: "completed", message: `${expenseData.length} records for ${input.pillarName} ${input.year}`, durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "fetch_expenses", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 4: Fetch budget summary from Master Summary tab
  t0 = Date.now();
  let masterSummary: Awaited<ReturnType<typeof fetchMasterSummary>> | null = null;
  try {
    masterSummary = await fetchMasterSummary();
    steps.push({ step: "fetch_master_summary", status: "completed", message: "Master Summary loaded", durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "fetch_master_summary", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 5: Fetch budget by team/project
  t0 = Date.now();
  let budgetData: Awaited<ReturnType<typeof fetchBudgetByTeamProject>> | null = null;
  try {
    budgetData = await fetchBudgetByTeamProject(input.pillarName, String(input.year));
    steps.push({ step: "fetch_budget_detail", status: "completed", message: `${Object.keys(budgetData.byTeam).length} teams`, durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "fetch_budget_detail", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 6: Fetch launch schedule
  t0 = Date.now();
  let launchData: LaunchScheduleItem[] = [];
  try {
    launchData = await fetchLaunchSchedule();
    steps.push({ step: "fetch_launch_schedule", status: "completed", message: `${launchData.length} items`, durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "fetch_launch_schedule", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 7: Fetch planning doc
  t0 = Date.now();
  let planningDoc: PlanningDocContent | null = null;
  if (input.planningDocId) {
    try {
      planningDoc = await fetchPlanningDoc(input.planningDocId);
      steps.push({ step: "fetch_planning_doc", status: "completed", message: `${planningDoc.initiatives.length} initiatives`, durationMs: Date.now() - t0 });
    } catch (e: any) {
      steps.push({ step: "fetch_planning_doc", status: "failed", message: e.message, durationMs: Date.now() - t0 });
    }
  } else {
    steps.push({ step: "fetch_planning_doc", status: "skipped", message: "No planning doc configured", durationMs: 0 });
  }

  // Step 8: Generate AI commentary
  t0 = Date.now();
  let executiveSummary = "";
  const aiCommentary: Record<string, string> = {};
  try {
    const aiResult = await generateAiCommentary(input, expenseData, launchData, planningDoc, budgetData);
    executiveSummary = aiResult.executiveSummary;
    Object.assign(aiCommentary, aiResult.commentary);
    steps.push({ step: "ai_commentary", status: "completed", message: "Generated", durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "ai_commentary", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Use manual content overrides if provided
  if (input.manualContent?.executiveSummary) {
    executiveSummary = input.manualContent.executiveSummary;
  }

  // Use resolved bindings to build executive summary if available
  if (input.resolvedBindings?.executiveSummary && !executiveSummary) {
    const rb = input.resolvedBindings.executiveSummary;
    const parts: string[] = [];
    if (rb.businessOutcome) parts.push(`\u2022 ${rb.businessOutcome}`);
    if (rb.progressUpdates) parts.push(`\u2022 ${rb.progressUpdates}`);
    if (rb.blockersRisks) parts.push(`\u2022 Risks: ${rb.blockersRisks}`);
    if (rb.leadershipAsks) parts.push(`\u2022 Leadership Asks: ${rb.leadershipAsks}`);
    if (parts.length > 0) executiveSummary = parts.join("\n");
  }

  // Merge resolved binding initiatives with manual/planning doc data
  if (input.resolvedBindings?.initiatives && input.resolvedBindings.initiatives.length > 0 && !input.manualContent?.initiatives) {
    input.manualContent = input.manualContent || {};
    input.manualContent.initiatives = input.resolvedBindings.initiatives;
  }

  // Merge resolved binding launch items
  if (input.resolvedBindings?.launchItems && input.resolvedBindings.launchItems.length > 0 && !input.manualContent?.launchItems) {
    input.manualContent = input.manualContent || {};
    input.manualContent.launchItems = input.resolvedBindings.launchItems;
  }

  // Merge resolved binding key dates
  if (input.resolvedBindings?.keyDates && input.resolvedBindings.keyDates.length > 0 && !input.manualContent?.keyDates) {
    input.manualContent = input.manualContent || {};
    input.manualContent.keyDates = input.resolvedBindings.keyDates;
  }

  // Apply skipped slides from bindings (mark slides as not needed)
  if (input.resolvedBindings?.skippedSlides && input.resolvedBindings.skippedSlides.length > 0) {
    // Map slide type names to template indices
    const slideTypeToIndex: Record<string, number> = {
      title: 0, agenda: 1, exclusions: 2, executive_summary: 3,
      initiatives_goals: 4, initiative_deep_dive: 5, launch_schedule: 6,
      key_dates: 7, budget_update: 8, budget_reforecast: 9,
      te: 10, appendix_header: 11, budget_detail: 12, appendix_content: 13, end_frame: 14,
    };
    const skipIndices = input.resolvedBindings.skippedSlides
      .map(s => slideTypeToIndex[s])
      .filter((i): i is number => i !== undefined);
    if (skipIndices.length > 0 && !input.selectedSlides) {
      // If no slides were explicitly selected, include all except skipped
      const allIndices = Array.from({ length: slides.length }, (_, i) => i);
      input.selectedSlides = allIndices.filter(i => !skipIndices.includes(i));
    }
  }

  // Step 9: Build all slide update requests
  t0 = Date.now();
  const requests = buildAllSlideRequests(
    slides, input, expenseData, launchData, planningDoc,
    executiveSummary, aiCommentary, budgetData, masterSummary
  );
  steps.push({ step: "build_requests", status: "completed", message: `${requests.length} updates`, durationMs: Date.now() - t0 });

  // Step 10: Apply updates in batches (Slides API has a limit per batch)
  t0 = Date.now();
  if (requests.length > 0) {
    // Separate replaceAllText (safe, global) from other requests (may fail on empty cells)
    const globalReplacements = requests.filter((r: any) => r.replaceAllText);
    const otherRequests = requests.filter((r: any) => !r.replaceAllText);

    // Apply global replacements first (these never fail)
    if (globalReplacements.length > 0) {
      try {
        await batchUpdatePresentation(copied.id, globalReplacements);
      } catch (e: any) {
        steps.push({ step: "apply_updates", status: "failed", message: `Global replacements: ${e.message}`, durationMs: Date.now() - t0 });
      }
    }

    // Group deleteText+insertText pairs and apply in batches
    // If a batch fails, retry individual pairs to skip empty-cell deletes
    const BATCH_SIZE = 40;
    for (let i = 0; i < otherRequests.length; i += BATCH_SIZE) {
      const batch = otherRequests.slice(i, i + BATCH_SIZE);
      try {
        await batchUpdatePresentation(copied.id, batch);
      } catch (e: any) {
        // Batch failed - retry individual request pairs
        steps.push({ step: "apply_updates", status: "failed", message: `Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${e.message} — retrying individually`, durationMs: Date.now() - t0 });
        // Group into delete+insert pairs and try each pair
        for (let j = 0; j < batch.length; j++) {
          const req = batch[j];
          if (req.deleteText) {
            // Try delete+insert pair together, skip delete if it fails
            const nextReq = batch[j + 1];
            if (nextReq?.insertText) {
              try {
                await batchUpdatePresentation(copied.id, [req, nextReq]);
              } catch {
                // Delete failed (empty cell) - try just the insert
                try {
                  await batchUpdatePresentation(copied.id, [nextReq]);
                } catch { /* skip this cell entirely */ }
              }
              j++; // skip the insert we already handled
            }
          } else if (req.insertText) {
            try {
              await batchUpdatePresentation(copied.id, [req]);
            } catch { /* skip */ }
          }
        }
      }
    }
    steps.push({ step: "apply_updates", status: "completed", message: `Applied ${requests.length} updates`, durationMs: Date.now() - t0 });
  }

  // Step 11: Remove unselected slides (if selectedSlides specified)
  if (input.selectedSlides && input.selectedSlides.length > 0 && input.selectedSlides.length < slides.length) {
    t0 = Date.now();
    try {
      // Delete slides NOT in the selected set, in reverse order to preserve indices
      const toDelete = slides
        .map((_: any, idx: number) => idx)
        .filter((idx: number) => !input.selectedSlides!.includes(idx))
        .reverse();
      if (toDelete.length > 0) {
        const deleteRequests = toDelete.map((idx: number) => ({
          deleteObject: { objectId: slides[idx].objectId },
        }));
        await batchUpdatePresentation(copied.id, deleteRequests);
        steps.push({ step: "remove_slides", status: "completed", message: `Removed ${toDelete.length} unselected slides`, durationMs: Date.now() - t0 });
      }
    } catch (e: any) {
      steps.push({ step: "remove_slides", status: "failed", message: e.message, durationMs: Date.now() - t0 });
    }
  }

  const finalSlideCount = input.selectedSlides?.length || slides.length;

  return {
    presentationId: copied.id,
    presentationUrl: `https://docs.google.com/presentation/d/${copied.id}/edit`,
    title,
    slideCount: finalSlideCount,
    executiveSummary,
    aiCommentary,
    steps,
  };
}

// ─── AI Commentary ────────────────────────────────────────────────

async function generateAiCommentary(
  input: GenerationInput,
  expenses: ExpenseRecord[],
  launches: LaunchScheduleItem[],
  planningDoc: PlanningDocContent | null,
  budgetData: Awaited<ReturnType<typeof fetchBudgetByTeamProject>> | null
): Promise<{ executiveSummary: string; commentary: Record<string, string> }> {
  const monthName = MONTH_NAMES[input.month - 1];

  // Aggregate spend by month for the current year
  const monthlySpend: Record<string, number> = {};
  for (const r of expenses) {
    if (r.month) {
      monthlySpend[r.month] = (monthlySpend[r.month] || 0) + parseDollar(r.recognizedAmount);
    }
  }

  const currentMonthKey = monthFilterStr(input.month);
  const currentMonthSpend = monthlySpend[currentMonthKey] || 0;

  // QTD spend
  const currentQ = Math.ceil(input.month / 3);
  const qMonths = Array.from({ length: 3 }, (_, i) => (currentQ - 1) * 3 + i + 1)
    .filter(m => m <= input.month);
  const qtdSpend = qMonths.reduce((s, m) => s + (monthlySpend[monthFilterStr(m)] || 0), 0);

  // Team breakdown
  const teamBreakdown = budgetData?.byTeam || {};
  const teamSummary = Object.entries(teamBreakdown)
    .sort((a, b) => b[1].recognized - a[1].recognized)
    .slice(0, 8)
    .map(([t, v]) => `${t}: ${fmtDollar(v.recognized)}`)
    .join(", ");

  // Upcoming launches
  const upcomingLaunches = launches.filter(l => {
    if (!l.templatePublishDate) return false;
    const d = new Date(l.templatePublishDate);
    return d.getFullYear() === input.year && d.getMonth() + 1 >= input.month;
  }).slice(0, 10);

  const planningContext = planningDoc
    ? `Planning Doc:\n- Executive Summary: ${planningDoc.executiveSummary || "Not provided"}\n- Initiatives: ${planningDoc.initiatives.map(i => `${i.name}: ${i.updates}`).join("; ")}\n- Notes: ${planningDoc.otherNotes || "None"}`
    : "No planning document provided.";

  const prompt = `You are a business analyst writing a Monthly Business Review (MBR) for the ${input.pillarName} pillar at Meta Reality Labs. Generate professional, concise commentary for ${monthName} ${input.year}.

Data Context:
- Pillar: ${input.pillarName}
- Teams: ${input.teams.join(", ") || "All teams"}
- Current month recognized spend: ${fmtDollarFull(currentMonthSpend)}
- QTD recognized spend (Q${currentQ}): ${fmtDollarFull(qtdSpend)}
- Full year recognized total: ${fmtDollarFull(budgetData?.total.recognized || 0)}
- Team breakdown (top): ${teamSummary || "No data"}
- Upcoming launches: ${upcomingLaunches.map(l => `${l.gameTitle} (${l.studio}, ${l.templatePublishDate})`).join("; ") || "None scheduled"}
- Total expense records for year: ${expenses.length}
${planningContext}

Generate the following sections as JSON:
1. "executiveSummary" - 3-5 bullet points (each starting with "• ") summarizing key highlights, spend status, and upcoming milestones for this month
2. "budgetCommentary" - 2-3 sentences on budget status, QTD vs forecast, and notable variances
3. "launchCommentary" - 2-3 sentences on upcoming launches and schedule status
4. "initiativesCommentary" - 2-3 sentences on initiative progress
5. "risksCommentary" - 1-2 sentences on key risks or blockers

Return ONLY valid JSON. Use professional business language. Reference actual dollar amounts from the data provided. Do not fabricate numbers.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional business analyst at a high-tech company. Return only valid JSON." },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "mbr_commentary",
        strict: true,
        schema: {
          type: "object",
          properties: {
            executiveSummary: { type: "string" },
            budgetCommentary: { type: "string" },
            launchCommentary: { type: "string" },
            initiativesCommentary: { type: "string" },
            risksCommentary: { type: "string" },
          },
          required: ["executiveSummary", "budgetCommentary", "launchCommentary", "initiativesCommentary", "risksCommentary"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const parsed = JSON.parse(typeof rawContent === "string" ? rawContent : "{}");

  return {
    executiveSummary: parsed.executiveSummary || "",
    commentary: {
      budget: parsed.budgetCommentary || "",
      launch: parsed.launchCommentary || "",
      initiatives: parsed.initiativesCommentary || "",
      risks: parsed.risksCommentary || "",
    },
  };
}

// ─── Slide Update Request Builder ─────────────────────────────────

function buildAllSlideRequests(
  slides: any[],
  input: GenerationInput,
  expenses: ExpenseRecord[],
  launches: LaunchScheduleItem[],
  planningDoc: PlanningDocContent | null,
  executiveSummary: string,
  aiCommentary: Record<string, string>,
  budgetData: Awaited<ReturnType<typeof fetchBudgetByTeamProject>> | null,
  masterSummary: Awaited<ReturnType<typeof fetchMasterSummary>> | null
): any[] {
  const requests: any[] = [];
  const monthName = MONTH_NAMES[input.month - 1];
  const yearShort = String(input.year).slice(2);

  // ── Global text replacements ──
  const replacements: [string, string][] = [
    ["[PILLAR NAME]", input.pillarName],
    ["[Month]", monthName],
  ];
  for (const [find, replace] of replacements) {
    requests.push({
      replaceAllText: {
        containsText: { text: find, matchCase: false },
        replaceText: replace,
      },
    });
  }

  // ── Slide 3: Executive Summary ──
  if (slides[3] && executiveSummary) {
    // Try multiple strategies to find the exec summary text box
    let textBoxId = findElementId(slides[3], (elem) => {
      if (elem.shape?.placeholder?.type !== "NONE" && elem.shape?.placeholder?.type) return false;
      const text = extractText(elem);
      return text === "[...]" || text === "[\u2026]";
    });
    // Fallback: look for any non-title, non-DRI text box
    if (!textBoxId) {
      textBoxId = findElementId(slides[3], (elem) => {
        const text = extractText(elem);
        if (!text || text.includes("DRI:") || text.includes("EXECUTIVE")) return false;
        if (elem.shape?.placeholder?.type === "TITLE" || elem.shape?.placeholder?.type === "CENTERED_TITLE") return false;
        return text.includes("[") || text.length < 10;
      });
    }
    // Fallback 2: search inside groups
    if (!textBoxId) {
      textBoxId = findElementInGroups(slides[3], (elem) => {
        const text = extractText(elem);
        return text === "[...]" || text === "[\u2026]" || (text.includes("[") && text.length < 10);
      });
    }
    if (textBoxId) {
      requests.push(
        { deleteText: { objectId: textBoxId, textRange: { type: "ALL" } } },
        { insertText: { objectId: textBoxId, text: executiveSummary, insertionIndex: 0 } }
      );
    }
  }

  // ── Slide 4: Initiatives & Goals Table ──
  // Col 0 is only 0.42 in wide — use just the letter prefix.
  // Col 1 is 1.33 in — truncate outcome to ~60 chars.
  if (slides[4] && (planningDoc || input.manualContent?.initiatives)) {
    const tableId = findTableId(slides[4]);
    if (tableId) {
      const initiatives = input.manualContent?.initiatives ||
        planningDoc?.initiatives.map(i => ({
          name: i.name,
          outcome: i.updates.split("\n")[0] || "",
          updates: i.updates,
          risks: i.risks,
        })) || [];

      // Fill rows 2-5 (indices 2-5) with initiative data
      for (let i = 0; i < Math.min(initiatives.length, 4); i++) {
        const rowIdx = i + 2; // rows 2-5 are data rows (a, b, c, d)
        const init = initiatives[i];
        // Col 0: Just the letter — column is only 0.42" wide
        requests.push(
          deleteTableCellText(tableId, rowIdx, 0),
          insertTableCellText(tableId, rowIdx, 0, `${String.fromCharCode(97 + i)}.`)
        );
        // Col 1: Business Outcome — truncate to fit 1.33" column
        if (init.outcome) {
          const cleanOutcome = stripSourceAnnotations(init.outcome);
          requests.push(
            deleteTableCellText(tableId, rowIdx, 1),
            insertTableCellText(tableId, rowIdx, 1, truncateText(cleanOutcome, 80))
          );
        }
      }
    }
  }

  // ── Slide 5: Initiative Deep Dive ──
  // The Progress Updates box (y=2275350) and Blockers & Risks box (y=2898139)
  // have only ~0.68" vertical gap, so text must be kept very short (1-2 lines each).
  if (slides[5]) {
    const firstInit = input.manualContent?.initiatives?.[0] ||
      (planningDoc?.initiatives[0] ? {
        name: planningDoc.initiatives[0].name,
        outcome: planningDoc.initiatives[0].updates.split("\n")[0] || "",
        updates: planningDoc.initiatives[0].updates,
        risks: planningDoc.initiatives[0].risks,
      } : null);

    if (firstInit) {
      requests.push({
        replaceAllText: {
          containsText: { text: "[PROJECT / INITIATIVE #1]", matchCase: false },
          replaceText: stripSourceAnnotations(firstInit.name),
        },
      });

      // Fill the "[...]" content box with outcome (keep to ~2 lines)
      const contentBoxId = findElementId(slides[5], (elem) => {
        const text = extractText(elem);
        return text === "[...]" || text === "[…]";
      });
      if (contentBoxId && firstInit.outcome) {
        const cleanOutcome = stripSourceAnnotations(firstInit.outcome);
        requests.push(
          { deleteText: { objectId: contentBoxId, textRange: { type: "ALL" } } },
          { insertText: { objectId: contentBoxId, text: truncateText(cleanOutcome, 120), insertionIndex: 0 } }
        );
      }

      // Fill progress updates — keep to 1 line to avoid overlapping Blockers box
      const progressBoxId = findElementId(slides[5], (elem) => {
        const text = extractText(elem);
        return text.includes("Progress Updates:");
      });
      if (progressBoxId && firstInit.updates) {
        const cleanUpdates = stripSourceAnnotations(firstInit.updates);
        requests.push(
          { deleteText: { objectId: progressBoxId, textRange: { type: "ALL" } } },
          { insertText: { objectId: progressBoxId, text: `Progress Updates:\n${truncateText(cleanUpdates, 100)}`, insertionIndex: 0 } }
        );
      }

      // Fill risks — keep to 1 line
      const risksBoxId = findElementId(slides[5], (elem) => {
        const text = extractText(elem);
        return text.includes("Blockers & Risks:");
      });
      if (risksBoxId && firstInit.risks) {
        const cleanRisks = stripSourceAnnotations(firstInit.risks);
        requests.push(
          { deleteText: { objectId: risksBoxId, textRange: { type: "ALL" } } },
          { insertText: { objectId: risksBoxId, text: `Blockers & Risks:\n${truncateText(cleanRisks, 100)}\n\nLeadership Asks:`, insertionIndex: 0 } }
        );
      }
    }
  }

  // ── Slide 6: Launch Schedule Table ──
  if (slides[6]) {
    const tableId = findTableId(slides[6]);
    if (tableId) {
      // Update quarter headers
      const q1Label = `Q1 '${yearShort}`;
      const q2Label = `Q2 '${yearShort}`;
      const h2Label = `H2 '${yearShort}`;
      requests.push(
        deleteTableCellText(tableId, 0, 0),
        insertTableCellText(tableId, 0, 0, q1Label),
        deleteTableCellText(tableId, 0, 1),
        insertTableCellText(tableId, 0, 1, q2Label),
        deleteTableCellText(tableId, 0, 2),
        insertTableCellText(tableId, 0, 2, h2Label)
      );

      // Categorize launches by quarter
      const manualLaunches = input.manualContent?.launchItems;
      if (manualLaunches && manualLaunches.length > 0) {
        const byQ: Record<string, string[]> = { Q1: [], Q2: [], H2: [] };
        for (const item of manualLaunches) {
          const q = item.quarter || "Q1";
          const key = q.startsWith("Q1") ? "Q1" : q.startsWith("Q2") ? "Q2" : "H2";
          byQ[key].push(`${item.date}: ${item.title}`);
        }
        fillLaunchTable(requests, tableId, byQ);
      } else {
        // Auto-populate from Horizon Content Calendar
        const byQ: Record<string, string[]> = { Q1: [], Q2: [], H2: [] };
        for (const l of launches) {
          if (!l.templatePublishDate) continue;
          const d = new Date(l.templatePublishDate);
          if (d.getFullYear() !== input.year) continue;
          const m = d.getMonth() + 1;
          const label = `${MONTH_ABBR[m - 1]} ${d.getDate()}: ${l.gameTitle} (${l.studio})`;
          if (m <= 3) byQ.Q1.push(label);
          else if (m <= 6) byQ.Q2.push(label);
          else byQ.H2.push(label);
        }
        fillLaunchTable(requests, tableId, byQ);
      }
    }
  }

  // ── Slide 7: Key Dates & Milestones Table ──
  if (slides[7]) {
    const tableId = findTableId(slides[7]);
    if (tableId) {
      requests.push(
        deleteTableCellText(tableId, 0, 0),
        insertTableCellText(tableId, 0, 0, `Q1 '${yearShort}`),
        deleteTableCellText(tableId, 0, 1),
        insertTableCellText(tableId, 0, 1, `Q2 '${yearShort}`),
        deleteTableCellText(tableId, 0, 2),
        insertTableCellText(tableId, 0, 2, `H2 '${yearShort}`)
      );

      if (input.manualContent?.keyDates && input.manualContent.keyDates.length > 0) {
        const byQ: Record<string, string[]> = { Q1: [], Q2: [], H2: [] };
        for (const item of input.manualContent.keyDates) {
          const q = item.quarter || "Q1";
          const key = q.startsWith("Q1") ? "Q1" : q.startsWith("Q2") ? "Q2" : "H2";
          byQ[key].push(`${item.date}: ${item.title}`);
        }
        fillLaunchTable(requests, tableId, byQ);
      } else {
        // No key dates provided — clear all placeholder cells
        fillLaunchTable(requests, tableId, { Q1: [], Q2: [], H2: [] });
      }
    }
  }

  // ── Slide 12: Budget Detail Table ──
  if (slides[12] && budgetData) {
    const tableId = findTableId(slides[12]);
    if (tableId) {
      // Update header row with correct year
      requests.push(
        deleteTableCellText(tableId, 1, 3),
        insertTableCellText(tableId, 1, 3, `Q1-${yearShort} FORECAST`)
      );

      // Fill data rows (rows 2-5) with team budget data
      const teamEntries = Object.entries(budgetData.byTeam)
        .sort((a, b) => b[1].recognized - a[1].recognized)
        .slice(0, 4);

      for (let i = 0; i < Math.min(teamEntries.length, 4); i++) {
        const rowIdx = i + 2;
        const [teamName, teamData] = teamEntries[i];
        const topProject = teamData.projects[0] || "";

        // Col 0: TEAM
        requests.push(
          deleteTableCellText(tableId, rowIdx, 0),
          insertTableCellText(tableId, rowIdx, 0, teamName)
        );
        // Col 1: INITIATIVE / PROJECT
        requests.push(
          deleteTableCellText(tableId, rowIdx, 1),
          insertTableCellText(tableId, rowIdx, 1, topProject)
        );
        // Col 2: QTD ACTUALS
        requests.push(
          deleteTableCellText(tableId, rowIdx, 2),
          insertTableCellText(tableId, rowIdx, 2, fmtDollarFull(teamData.recognized))
        );
        // Col 3: FORECAST
        requests.push(
          deleteTableCellText(tableId, rowIdx, 3),
          insertTableCellText(tableId, rowIdx, 3, fmtDollarFull(teamData.funding))
        );
        // Col 4: DELTA
        const delta = teamData.recognized - teamData.funding;
        requests.push(
          deleteTableCellText(tableId, rowIdx, 4),
          insertTableCellText(tableId, rowIdx, 4, fmtDollarFull(delta))
        );
        // Col 5: % OF FORECAST
        const pct = teamData.funding !== 0 ? ((teamData.recognized / teamData.funding) * 100).toFixed(0) + "%" : "N/A";
        requests.push(
          deleteTableCellText(tableId, rowIdx, 5),
          insertTableCellText(tableId, rowIdx, 5, pct)
        );

        // Quarterly columns (7-10)
        const qData = budgetData.byQuarter;
        if (i === 0) {
          requests.push(
            deleteTableCellText(tableId, rowIdx, 7),
            insertTableCellText(tableId, rowIdx, 7, fmtDollarFull(qData.Q1 || 0)),
            deleteTableCellText(tableId, rowIdx, 8),
            insertTableCellText(tableId, rowIdx, 8, fmtDollarFull(qData.Q2 || 0)),
            deleteTableCellText(tableId, rowIdx, 9),
            insertTableCellText(tableId, rowIdx, 9, fmtDollarFull(qData.Q3 || 0)),
            deleteTableCellText(tableId, rowIdx, 10),
            insertTableCellText(tableId, rowIdx, 10, fmtDollarFull(qData.Q4 || 0))
          );
        }
      }

      // TOTAL row (row 6)
      requests.push(
        deleteTableCellText(tableId, 6, 2),
        insertTableCellText(tableId, 6, 2, fmtDollarFull(budgetData.total.recognized)),
        deleteTableCellText(tableId, 6, 3),
        insertTableCellText(tableId, 6, 3, fmtDollarFull(budgetData.total.funding)),
        deleteTableCellText(tableId, 6, 4),
        insertTableCellText(tableId, 6, 4, fmtDollarFull(budgetData.total.recognized - budgetData.total.funding))
      );

      // Full year columns
      const totalPct = budgetData.total.funding !== 0
        ? ((budgetData.total.recognized / budgetData.total.funding) * 100).toFixed(0) + "%"
        : "N/A";
      requests.push(
        deleteTableCellText(tableId, 6, 5),
        insertTableCellText(tableId, 6, 5, totalPct),
        deleteTableCellText(tableId, 6, 12),
        insertTableCellText(tableId, 6, 12, fmtDollarFull(budgetData.total.funding)),
        deleteTableCellText(tableId, 6, 13),
        insertTableCellText(tableId, 6, 13, fmtDollarFull(budgetData.total.recognized)),
        deleteTableCellText(tableId, 6, 14),
        insertTableCellText(tableId, 6, 14, fmtDollarFull(budgetData.total.recognized - budgetData.total.funding))
      );
    }
  }

  // ── Reposition DRI boxes to top-right corner (small, non-overlapping) ──
  const driBoxIds = findDriBoxIds(slides);
  for (const driId of driBoxIds) {
    requests.push({
      updatePageElementTransform: {
        objectId: driId,
        applyMode: "ABSOLUTE",
        transform: {
          scaleX: 0.55,
          scaleY: 0.55,
          translateX: 7200000,  // ~7.87" from left (right edge area on 10" wide slide)
          translateY: 50000,    // ~0.05" from top
          unit: "EMU",
          shearX: 0,
          shearY: 0,
        },
      },
    });
  }

  return requests;
}

// ─── Helpers ──────────────────────────────────────────────────────

function fillLaunchTable(
  requests: any[],
  tableId: string,
  byQ: Record<string, string[]>
): void {
  const quarters = ["Q1", "Q2", "H2"];
  for (let col = 0; col < 3; col++) {
    const items = byQ[quarters[col]] || [];
    for (let row = 1; row <= 4; row++) {
      const rawText = items[row - 1] || "";
      if (rawText) {
        // Strip source annotations and truncate to fit table cells (~2.5" wide)
        const cleanText = stripSourceAnnotations(rawText);
        requests.push(
          deleteTableCellText(tableId, row, col),
          insertTableCellText(tableId, row, col, truncateText(cleanText, 60))
        );
      } else {
        // Clear empty cells — remove template placeholder text like "● [DATE]:"
        requests.push(
          deleteTableCellText(tableId, row, col),
          insertTableCellText(tableId, row, col, "\u2014") // em dash
        );
      }
    }
  }
}

/** Remove [SIMULATED], [Source: ...], [Real source: ...] annotations from text */
function stripSourceAnnotations(text: string): string {
  return text
    .replace(/\[SIMULATED\]\s*/gi, "")
    .replace(/\[Source:\s*[^\]]*\]/gi, "")
    .replace(/\[Real source:\s*[^\]]*\]/gi, "")
    .replace(/\[When connected[^\]]*\]/gi, "")
    .replace(/\n\s*\n/g, "\n") // collapse double newlines
    .trim();
}

/** Truncate text to maxLen characters, adding ellipsis if needed */
function truncateText(text: string, maxLen: number): string {
  // First, collapse to single line if it has newlines and is too long
  const singleLine = text.replace(/\n/g, " ").replace(/\s+/g, " ").trim();
  if (singleLine.length <= maxLen) return singleLine;
  return singleLine.slice(0, maxLen - 1) + "\u2026"; // ellipsis
}

function findElementId(slide: any, predicate: (elem: any) => boolean): string | null {
  for (const elem of slide.pageElements || []) {
    if (predicate(elem)) return elem.objectId;
  }
  return null;
}

/** Find all DRI boxes across all slides and return their objectIds */
function findDriBoxIds(slides: any[]): string[] {
  const ids: string[] = [];
  for (const slide of slides) {
    for (const elem of slide.pageElements || []) {
      const text = extractText(elem);
      if (text && text.includes("DRI:")) {
        ids.push(elem.objectId);
      }
      // Also check inside groups
      if (elem.group) {
        for (const child of elem.group.children || []) {
          const childText = extractText(child);
          if (childText && childText.includes("DRI:")) {
            ids.push(child.objectId);
          }
        }
      }
    }
  }
  return ids;
}

/** Search inside group elements for a matching shape */
function findElementInGroups(slide: any, predicate: (elem: any) => boolean): string | null {
  for (const elem of slide.pageElements || []) {
    if (elem.group) {
      for (const child of elem.group.children || []) {
        if (predicate(child)) return child.objectId;
      }
    }
  }
  return null;
}

function findTableId(slide: any): string | null {
  for (const elem of slide.pageElements || []) {
    if (elem.table) return elem.objectId;
  }
  return null;
}

function extractText(elem: any): string {
  if (!elem.shape?.text) return "";
  return (elem.shape.text.textElements || [])
    .map((te: any) => te.textRun?.content || "")
    .join("")
    .trim();
}

function deleteTableCellText(tableId: string, row: number, col: number): any {
  return {
    deleteText: {
      objectId: tableId,
      cellLocation: { rowIndex: row, columnIndex: col },
      textRange: { type: "ALL" },
    },
  };
}

function insertTableCellText(tableId: string, row: number, col: number, text: string): any {
  return {
    insertText: {
      objectId: tableId,
      cellLocation: { rowIndex: row, columnIndex: col },
      text: text,
      insertionIndex: 0,
    },
  };
}
