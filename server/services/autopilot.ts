/**
 * Autopilot Agent Pipeline
 *
 * Implements the Agent Interaction Model:
 *   [Data Source Agents] → [MBR Controller (Gatekeeper)] → [Output Agents]
 *
 * Data Source Agents run in parallel to collect data from:
 *   - SF Main Expense Data (budget/spend)
 *   - Horizon Content Calendar (launch schedule)
 *   - MBR Planning Doc (narrative/commentary)
 *   - Google Drive (existing decks, docs)
 *
 * MBR Controller synthesizes agent outputs, detects conflicts,
 * and routes to output agents (Deck Generator, etc.)
 */

import * as google from "./google";
import { invokeLLM } from "../_core/llm";
import { GOOGLE_IDS } from "../../shared/types";

// ─── Types ──────────────────────────────────────────────────────

export type AgentStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface AgentResult {
  agentName: string;
  status: AgentStatus;
  data: any;
  error?: string;
  durationMs: number;
  dataPoints: number;
}

export interface Conflict {
  id: string;
  field: string;
  description: string;
  sourceA: { agent: string; value: string };
  sourceB: { agent: string; value: string };
  severity: "low" | "medium" | "high";
  resolution?: "use_a" | "use_b" | "merge" | "manual";
  resolvedValue?: string;
}

export interface AutopilotRunResult {
  runId: string;
  status: "collecting" | "synthesizing" | "conflicts_found" | "ready" | "generating" | "done" | "error";
  agents: AgentResult[];
  conflicts: Conflict[];
  synthesizedContent: SynthesizedContent | null;
  outputUrl?: string;
  outputFolderId?: string;
  error?: string;
}

export interface SynthesizedContent {
  executiveSummary: string;
  initiatives: Array<{
    name: string;
    outcome: string;
    target: string;
    progressVsTarget: string;
    kpiTarget: string;
    valueVsTarget: string;
  }>;
  launchItems: Array<{
    date: string;
    title: string;
    quarter: string;
  }>;
  keyDates: Array<{
    date: string;
    title: string;
    quarter: string;
  }>;
  budgetSummary: string;
  teSummary: string;
  risksAndBlockers: string;
  keyWins: string;
  nextPeriodPriorities: string;
}

// ─── Data Source Agents ─────────────────────────────────────────

async function runExpenseAgent(pillar: string, year: string, month: string): Promise<AgentResult> {
  const start = Date.now();
  try {
    const data = await google.fetchExpenseData(pillar, undefined, year, month);
    return {
      agentName: "Finance Data Agent",
      status: "done",
      data: { expenses: data, rowCount: data.length },
      durationMs: Date.now() - start,
      dataPoints: data.length,
    };
  } catch (e: any) {
    return {
      agentName: "Finance Data Agent",
      status: "error",
      data: null,
      error: e.message,
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
}

async function runBudgetAgent(pillar: string, year: string): Promise<AgentResult> {
  const start = Date.now();
  try {
    const data = await google.fetchBudgetByTeamProject(pillar, year);
    return {
      agentName: "Budget Tracker Agent",
      status: "done",
      data: { budget: data, rowCount: Array.isArray(data) ? data.length : 0 },
      durationMs: Date.now() - start,
      dataPoints: Array.isArray(data) ? data.length : 0,
    };
  } catch (e: any) {
    return {
      agentName: "Budget Tracker Agent",
      status: "error",
      data: null,
      error: e.message,
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
}

async function runLaunchScheduleAgent(): Promise<AgentResult> {
  const start = Date.now();
  try {
    const data = await google.fetchLaunchSchedule();
    return {
      agentName: "Content Calendar Agent",
      status: "done",
      data: { launches: data, rowCount: data.length },
      durationMs: Date.now() - start,
      dataPoints: data.length,
    };
  } catch (e: any) {
    return {
      agentName: "Content Calendar Agent",
      status: "error",
      data: null,
      error: e.message,
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
}

async function runPlanningDocAgent(docId?: string): Promise<AgentResult> {
  const start = Date.now();
  if (!docId) {
    return {
      agentName: "Planning Doc Collector",
      status: "skipped",
      data: null,
      error: "No planning doc configured",
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
  try {
    const content = await google.fetchPlanningDoc(docId);
    return {
      agentName: "Planning Doc Collector",
      status: "done",
      data: { content, charCount: content.executiveSummary.length + content.initiatives.length },
      durationMs: Date.now() - start,
      dataPoints: 1,
    };
  } catch (e: any) {
    return {
      agentName: "Planning Doc Collector",
      status: "error",
      data: null,
      error: e.message,
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
}

async function runMasterSummaryAgent(): Promise<AgentResult> {
  const start = Date.now();
  try {
    const data = await google.fetchMasterSummary();
    return {
      agentName: "Master Summary Agent",
      status: "done",
      data: { summary: data, rowCount: Array.isArray(data) ? data.length : 0 },
      durationMs: Date.now() - start,
      dataPoints: Array.isArray(data) ? data.length : 0,
    };
  } catch (e: any) {
    return {
      agentName: "Master Summary Agent",
      status: "error",
      data: null,
      error: e.message,
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
}

async function runProjectDataAgent(projectName?: string): Promise<AgentResult> {
  const start = Date.now();
  if (!projectName) {
    return {
      agentName: "Project Data Agent",
      status: "skipped",
      data: null,
      error: "No project name specified",
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
  try {
    const data = await google.fetchProjectData(projectName);
    return {
      agentName: "Project Data Agent",
      status: "done",
      data,
      durationMs: Date.now() - start,
      dataPoints: data ? Object.keys(data).length : 0,
    };
  } catch (e: any) {
    return {
      agentName: "Project Data Agent",
      status: "error",
      data: null,
      error: e.message,
      durationMs: Date.now() - start,
      dataPoints: 0,
    };
  }
}

// ─── MBR Controller (Gatekeeper) ────────────────────────────────

function detectConflicts(agents: AgentResult[]): Conflict[] {
  const conflicts: Conflict[] = [];
  let conflictIdx = 0;

  const financeAgent = agents.find(a => a.agentName === "Finance Data Agent");
  const budgetAgent = agents.find(a => a.agentName === "Budget Tracker Agent");

  // Check for budget discrepancies between expense data and budget tracker
  if (financeAgent?.status === "done" && budgetAgent?.status === "done") {
    const expenses = financeAgent.data?.expenses || [];
    const budget = budgetAgent.data?.budget || [];

    // Compare total spend figures if both have data
    if (expenses.length > 0 && budget.length > 0) {
      // Look for team-level mismatches
      const expenseTeams = new Set(expenses.map((e: any) => e.team || e.Team || "").filter(Boolean));
      const budgetTeams = new Set((Array.isArray(budget) ? budget : []).map((b: any) => b.team || b.Team || "").filter(Boolean));

      const missingInBudget = Array.from(expenseTeams).filter(t => !budgetTeams.has(t));
      const missingInExpense = Array.from(budgetTeams).filter(t => !expenseTeams.has(t));

      if (missingInBudget.length > 0) {
        conflicts.push({
          id: `conflict-${conflictIdx++}`,
          field: "Team Coverage",
          description: `Teams found in expense data but missing from budget tracker: ${missingInBudget.join(", ")}`,
          sourceA: { agent: "Finance Data Agent", value: `${expenseTeams.size} teams` },
          sourceB: { agent: "Budget Tracker Agent", value: `${budgetTeams.size} teams` },
          severity: "medium",
        });
      }
      if (missingInExpense.length > 0) {
        conflicts.push({
          id: `conflict-${conflictIdx++}`,
          field: "Team Coverage",
          description: `Teams found in budget tracker but missing from expense data: ${missingInExpense.join(", ")}`,
          sourceA: { agent: "Budget Tracker Agent", value: `${budgetTeams.size} teams` },
          sourceB: { agent: "Finance Data Agent", value: `${expenseTeams.size} teams` },
          severity: "low",
        });
      }
    }
  }

  // Check for data freshness issues
  const errorAgents = agents.filter(a => a.status === "error");
  if (errorAgents.length > 0) {
    for (const agent of errorAgents) {
      conflicts.push({
        id: `conflict-${conflictIdx++}`,
        field: "Data Availability",
        description: `${agent.agentName} failed to retrieve data: ${agent.error?.substring(0, 100)}`,
        sourceA: { agent: agent.agentName, value: "Error" },
        sourceB: { agent: "Expected", value: "Data available" },
        severity: "high",
      });
    }
  }

  // Check for missing critical data
  const criticalAgents = ["Finance Data Agent", "Content Calendar Agent"];
  for (const name of criticalAgents) {
    const agent = agents.find(a => a.agentName === name);
    if (agent && agent.status === "done" && agent.dataPoints === 0) {
      conflicts.push({
        id: `conflict-${conflictIdx++}`,
        field: "Data Completeness",
        description: `${name} returned no data points. The MBR may be incomplete.`,
        sourceA: { agent: name, value: "0 data points" },
        sourceB: { agent: "Expected", value: ">0 data points" },
        severity: "medium",
      });
    }
  }

  return conflicts;
}

async function synthesizeContent(
  agents: AgentResult[],
  pillar: string,
  month: string,
  year: string
): Promise<SynthesizedContent> {
  // Gather all available data
  const financeData = agents.find(a => a.agentName === "Finance Data Agent")?.data?.expenses || [];
  const budgetData = agents.find(a => a.agentName === "Budget Tracker Agent")?.data?.budget || [];
  const launchData = agents.find(a => a.agentName === "Content Calendar Agent")?.data?.launches || [];
  const planningDocRaw = agents.find(a => a.agentName === "Planning Doc Collector")?.data?.content;
    const planningDocContent = typeof planningDocRaw === "string" ? planningDocRaw : (planningDocRaw?.text || "");
  const masterSummary = agents.find(a => a.agentName === "Master Summary Agent")?.data?.summary || [];
  const projectData = agents.find(a => a.agentName === "Project Data Agent")?.data || {};

  // Build context for LLM synthesis
  const dataContext = `
## Available Data for ${pillar} — ${month} ${year}

### Finance/Expense Data (${financeData.length} rows):
${financeData.slice(0, 15).map((r: any) => JSON.stringify(r)).join("\n")}

### Budget Data (${Array.isArray(budgetData) ? budgetData.length : 0} rows):
${Array.isArray(budgetData) ? budgetData.slice(0, 10).map((r: any) => JSON.stringify(r)).join("\n") : "No budget data"}

### Launch Schedule (${launchData.length} items):
${launchData.slice(0, 20).map((r: any) => JSON.stringify(r)).join("\n")}

### Planning Doc Content:
${planningDocContent ? planningDocContent.substring(0, 2000) : "No planning doc available"}

### Master Summary:
${Array.isArray(masterSummary) ? masterSummary.slice(0, 10).map((r: any) => JSON.stringify(r)).join("\n") : "No master summary"}

### Project Data:
${projectData ? JSON.stringify(projectData).substring(0, 1000) : "No project data"}
`;

  const systemPrompt = `You are an MBR (Monthly Business Review) content synthesizer for ${pillar}. 
You receive data from multiple automated agents and must synthesize it into structured MBR slide content.

Your job:
1. Analyze all data sources provided
2. Generate professional executive-level content for each MBR section
3. Identify key metrics, trends, risks, and wins
4. Use specific numbers and data points from the source data
5. Keep language concise and suitable for executive presentations

Output MUST be valid JSON matching this exact structure:
{
  "executiveSummary": "2-3 paragraph executive summary with key highlights, spend status, milestones",
  "initiatives": [{"name": "...", "outcome": "...", "target": "...", "progressVsTarget": "...", "kpiTarget": "...", "valueVsTarget": "..."}],
  "launchItems": [{"date": "YYYY-MM-DD", "title": "...", "quarter": "Q1/Q2/Q3/Q4"}],
  "keyDates": [{"date": "YYYY-MM-DD", "title": "...", "quarter": "Q1/Q2/Q3/Q4"}],
  "budgetSummary": "Budget status commentary",
  "teSummary": "T&E highlights or N/A",
  "risksAndBlockers": "Key risks and blockers",
  "keyWins": "Notable achievements",
  "nextPeriodPriorities": "Top priorities for next period"
}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: dataContext },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "mbr_content",
          strict: true,
          schema: {
            type: "object",
            properties: {
              executiveSummary: { type: "string" },
              initiatives: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string" },
                    outcome: { type: "string" },
                    target: { type: "string" },
                    progressVsTarget: { type: "string" },
                    kpiTarget: { type: "string" },
                    valueVsTarget: { type: "string" },
                  },
                  required: ["name", "outcome", "target", "progressVsTarget", "kpiTarget", "valueVsTarget"],
                  additionalProperties: false,
                },
              },
              launchItems: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    title: { type: "string" },
                    quarter: { type: "string" },
                  },
                  required: ["date", "title", "quarter"],
                  additionalProperties: false,
                },
              },
              keyDates: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    date: { type: "string" },
                    title: { type: "string" },
                    quarter: { type: "string" },
                  },
                  required: ["date", "title", "quarter"],
                  additionalProperties: false,
                },
              },
              budgetSummary: { type: "string" },
              teSummary: { type: "string" },
              risksAndBlockers: { type: "string" },
              keyWins: { type: "string" },
              nextPeriodPriorities: { type: "string" },
            },
            required: [
              "executiveSummary", "initiatives", "launchItems", "keyDates",
              "budgetSummary", "teSummary", "risksAndBlockers", "keyWins", "nextPeriodPriorities"
            ],
            additionalProperties: false,
          },
        },
      },
    });

    const content = response.choices?.[0]?.message?.content;
    if (typeof content === "string") {
      return JSON.parse(content);
    }
  } catch (e: any) {
    console.error("[Autopilot] LLM synthesis failed:", e.message);
  }

  // Fallback: build content from raw data
  return {
    executiveSummary: planningDocContent
      ? planningDocContent.substring(0, 500)
      : `${pillar} MBR for ${month} ${year}. Data collected from ${agents.filter(a => a.status === "done").length} sources.`,
    initiatives: [],
    launchItems: launchData.slice(0, 12).map((l: any) => ({
      date: l.date || l.Date || l["Launch Date"] || "",
      title: l.title || l.Title || l["Project Name"] || "",
      quarter: l.quarter || l.Quarter || "Q1",
    })),
    keyDates: [],
    budgetSummary: financeData.length > 0
      ? `${financeData.length} expense line items tracked for ${pillar}.`
      : "No budget data available.",
    teSummary: "T&E data not yet available.",
    risksAndBlockers: "No risks identified from automated data sources.",
    keyWins: "Review planning doc for key wins.",
    nextPeriodPriorities: "Review planning doc for next period priorities.",
  };
}

// ─── Main Autopilot Runner ──────────────────────────────────────

export interface AutopilotConfig {
  pillarName: string;
  month: number;
  year: number;
  projectName?: string;
  planningDocId?: string;
  outputFolderId: string;
  autoFileToStaging: boolean;
}

export async function runAutopilotCollection(config: AutopilotConfig): Promise<{
  agents: AgentResult[];
  conflicts: Conflict[];
  synthesizedContent: SynthesizedContent;
}> {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const monthStr = monthNames[config.month - 1] || "January";
  const yearStr = String(config.year);

  // Phase 1: Run all data source agents in parallel
  const agentPromises = [
    runExpenseAgent(config.pillarName, yearStr, monthStr),
    runBudgetAgent(config.pillarName, yearStr),
    runLaunchScheduleAgent(),
    runPlanningDocAgent(config.planningDocId),
    runMasterSummaryAgent(),
    runProjectDataAgent(config.projectName),
  ];

  const agents = await Promise.all(agentPromises);

  // Phase 2: Detect conflicts
  const conflicts = detectConflicts(agents);

  // Phase 3: Synthesize content via LLM
  const synthesizedContent = await synthesizeContent(agents, config.pillarName, monthStr, yearStr);

  return { agents, conflicts, synthesizedContent };
}
