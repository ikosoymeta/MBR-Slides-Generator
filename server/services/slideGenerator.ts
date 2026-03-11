/**
 * MBR Slide Generation Engine.
 * Copies the template, then populates each slide with data from configured sources.
 */
import { invokeLLM } from "../_core/llm";
import {
  copyPresentation,
  batchUpdatePresentation,
  getPresentation,
  fetchExpenseData,
  fetchLaunchSchedule,
  fetchPlanningDoc,
} from "./google";
import { GOOGLE_IDS } from "../../shared/types";
import type { ExpenseRecord, LaunchScheduleItem, PlanningDocContent } from "../../shared/types";

export interface GenerationInput {
  pillarName: string;
  month: number; // 1-12
  year: number;
  teams: string[];
  planningDocId?: string;
  outputFolderId: string;
  templateId?: string;
  customTitle?: string;
}

export interface GenerationResult {
  presentationId: string;
  presentationUrl: string;
  title: string;
  slideCount: number;
  executiveSummary: string;
  aiCommentary: Record<string, string>;
  steps: { step: string; status: string; message: string; durationMs: number }[];
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function monthToFilterString(month: number): string {
  const num = month.toString().padStart(2, "0");
  return `${num}-${MONTH_NAMES[month - 1]}`;
}

export async function generateMbrDeck(input: GenerationInput): Promise<GenerationResult> {
  const steps: GenerationResult["steps"] = [];
  const templateId = input.templateId || GOOGLE_IDS.MBR_TEMPLATE;
  const title = input.customTitle ||
    `${input.pillarName} Content MBR - ${MONTH_NAMES[input.month - 1]} '${String(input.year).slice(2)}`;

  // Step 1: Copy template
  let t0 = Date.now();
  const copied = await copyPresentation(templateId, title, input.outputFolderId);
  steps.push({ step: "copy_template", status: "completed", message: `Created: ${copied.name}`, durationMs: Date.now() - t0 });

  // Step 2: Get presentation structure
  t0 = Date.now();
  const pres = await getPresentation(copied.id);
  const slides = pres.slides || [];
  steps.push({ step: "read_structure", status: "completed", message: `${slides.length} slides found`, durationMs: Date.now() - t0 });

  // Step 3: Fetch expense data
  t0 = Date.now();
  let expenseData: ExpenseRecord[] = [];
  try {
    expenseData = await fetchExpenseData(
      input.pillarName,
      undefined,
      String(input.year),
      monthToFilterString(input.month)
    );
    steps.push({ step: "fetch_expenses", status: "completed", message: `${expenseData.length} records`, durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "fetch_expenses", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 4: Fetch launch schedule
  t0 = Date.now();
  let launchData: LaunchScheduleItem[] = [];
  try {
    launchData = await fetchLaunchSchedule();
    steps.push({ step: "fetch_launch_schedule", status: "completed", message: `${launchData.length} items`, durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "fetch_launch_schedule", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 5: Fetch planning doc (if provided)
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

  // Step 6: Generate AI commentary
  t0 = Date.now();
  let executiveSummary = "";
  const aiCommentary: Record<string, string> = {};
  try {
    const aiResult = await generateAiCommentary(input, expenseData, launchData, planningDoc);
    executiveSummary = aiResult.executiveSummary;
    Object.assign(aiCommentary, aiResult.commentary);
    steps.push({ step: "ai_commentary", status: "completed", message: "Generated", durationMs: Date.now() - t0 });
  } catch (e: any) {
    steps.push({ step: "ai_commentary", status: "failed", message: e.message, durationMs: Date.now() - t0 });
  }

  // Step 7: Build slide update requests
  t0 = Date.now();
  const requests = buildSlideUpdateRequests(
    slides, input, expenseData, launchData, planningDoc, executiveSummary, aiCommentary
  );
  steps.push({ step: "build_requests", status: "completed", message: `${requests.length} updates`, durationMs: Date.now() - t0 });

  // Step 8: Apply updates to presentation
  t0 = Date.now();
  if (requests.length > 0) {
    try {
      await batchUpdatePresentation(copied.id, requests);
      steps.push({ step: "apply_updates", status: "completed", message: "Slides updated", durationMs: Date.now() - t0 });
    } catch (e: any) {
      steps.push({ step: "apply_updates", status: "failed", message: e.message, durationMs: Date.now() - t0 });
    }
  }

  return {
    presentationId: copied.id,
    presentationUrl: `https://docs.google.com/presentation/d/${copied.id}/edit`,
    title,
    slideCount: slides.length,
    executiveSummary,
    aiCommentary,
    steps,
  };
}

// ─── AI Commentary Generation ───────────────────────────────────

async function generateAiCommentary(
  input: GenerationInput,
  expenses: ExpenseRecord[],
  launches: LaunchScheduleItem[],
  planningDoc: PlanningDocContent | null
): Promise<{ executiveSummary: string; commentary: Record<string, string> }> {
  const monthName = MONTH_NAMES[input.month - 1];
  const totalSpend = expenses.reduce((sum, r) => {
    const amt = parseFloat(r.recognizedAmount.replace(/[$,]/g, "")) || 0;
    return sum + amt;
  }, 0);

  const teamBreakdown = expenses.reduce((acc, r) => {
    if (!acc[r.team]) acc[r.team] = 0;
    acc[r.team] += parseFloat(r.recognizedAmount.replace(/[$,]/g, "")) || 0;
    return acc;
  }, {} as Record<string, number>);

  const upcomingLaunches = launches.filter((l) => {
    if (!l.templatePublishDate) return false;
    const d = new Date(l.templatePublishDate);
    return d.getMonth() + 1 >= input.month && d.getFullYear() === input.year;
  }).slice(0, 10);

  const planningContext = planningDoc
    ? `Planning Doc Content:\n- Executive Summary: ${planningDoc.executiveSummary || "Not provided"}\n- Initiatives: ${planningDoc.initiatives.map((i) => `${i.name}: ${i.updates}`).join("; ")}\n- Notes: ${planningDoc.otherNotes || "None"}`
    : "No planning document provided.";

  const prompt = `You are a business analyst writing a Monthly Business Review (MBR) for the ${input.pillarName} pillar at a high-tech company. Generate professional, concise commentary for ${monthName} ${input.year}.

Data Context:
- Pillar: ${input.pillarName}
- Teams: ${input.teams.join(", ")}
- Total recognized spend this month: $${totalSpend.toLocaleString()}
- Team breakdown: ${Object.entries(teamBreakdown).map(([t, v]) => `${t}: $${v.toLocaleString()}`).join(", ")}
- Upcoming launches: ${upcomingLaunches.map((l) => `${l.gameTitle} (${l.studio}, ${l.templatePublishDate})`).join("; ") || "None scheduled"}
- Total expense records: ${expenses.length}
${planningContext}

Generate the following sections as JSON:
1. "executiveSummary" - 3-4 bullet points summarizing key highlights, spend status, and upcoming milestones
2. "budgetCommentary" - 2-3 sentences on budget status and trends
3. "launchCommentary" - 2-3 sentences on upcoming launches and schedule status
4. "initiativesCommentary" - 2-3 sentences on initiative progress (if planning doc data available)
5. "risksCommentary" - 1-2 sentences on key risks or blockers (if any identified)

Return ONLY valid JSON with these keys. Use professional business language. Do not fabricate specific numbers not provided in the data.`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: "You are a professional business analyst. Return only valid JSON." },
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
            executiveSummary: { type: "string", description: "Executive summary bullet points" },
            budgetCommentary: { type: "string", description: "Budget status commentary" },
            launchCommentary: { type: "string", description: "Launch schedule commentary" },
            initiativesCommentary: { type: "string", description: "Initiatives progress commentary" },
            risksCommentary: { type: "string", description: "Risks and blockers commentary" },
          },
          required: ["executiveSummary", "budgetCommentary", "launchCommentary", "initiativesCommentary", "risksCommentary"],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices?.[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : "{}";
  const parsed = JSON.parse(content);

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

// ─── Slide Update Request Builder ───────────────────────────────

function buildSlideUpdateRequests(
  slides: any[],
  input: GenerationInput,
  expenses: ExpenseRecord[],
  launches: LaunchScheduleItem[],
  planningDoc: PlanningDocContent | null,
  executiveSummary: string,
  aiCommentary: Record<string, string>
): any[] {
  const requests: any[] = [];
  const monthName = MONTH_NAMES[input.month - 1];
  const yearShort = String(input.year).slice(2);

  // Global text replacements across all slides
  requests.push({
    replaceAllText: {
      containsText: { text: "[PILLAR NAME]", matchCase: false },
      replaceText: input.pillarName,
    },
  });
  requests.push({
    replaceAllText: {
      containsText: { text: "[Month]", matchCase: false },
      replaceText: monthName,
    },
  });
  requests.push({
    replaceAllText: {
      containsText: { text: "Mar '26", matchCase: false },
      replaceText: `${monthName.slice(0, 3)} '${yearShort}`,
    },
  });

  // Update executive summary slide (slide index 3)
  if (slides[3]) {
    const summaryText = executiveSummary || (planningDoc?.executiveSummary || "Executive summary will be populated from planning doc inputs.");
    for (const elem of slides[3].pageElements || []) {
      if (elem.shape?.placeholder?.type === "none" && elem.shape?.text) {
        const textElems = elem.shape.text.textElements || [];
        for (const te of textElems) {
          if (te.textRun && te.textRun.content.includes("[")) {
            requests.push({
              replaceAllText: {
                containsText: { text: te.textRun.content.trim(), matchCase: true },
                replaceText: summaryText,
              },
            });
            break;
          }
        }
      }
    }
  }

  // Update initiative deep dive (slide index 5) if planning doc available
  if (planningDoc && planningDoc.initiatives.length > 0 && slides[5]) {
    const init = planningDoc.initiatives[0];
    requests.push({
      replaceAllText: {
        containsText: { text: "[PROJECT / INITIATIVE #1]", matchCase: false },
        replaceText: init.name || "Initiative 1",
      },
    });
  }

  // Budget commentary
  if (aiCommentary.budget && slides[8]) {
    for (const elem of slides[8].pageElements || []) {
      if (elem.shape?.placeholder?.type === "none" && elem.shape?.text) {
        const textContent = (elem.shape.text.textElements || [])
          .map((te: any) => te.textRun?.content || "").join("");
        if (textContent.trim() === "" || textContent.includes("[")) {
          requests.push({
            insertText: {
              objectId: elem.objectId,
              text: aiCommentary.budget,
              insertionIndex: 0,
            },
          });
          break;
        }
      }
    }
  }

  return requests;
}
