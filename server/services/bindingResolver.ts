/**
 * Binding Resolver Service
 * Reads field bindings from the database and resolves them into
 * GenerationInput-compatible data for the slide generator.
 *
 * This bridges the gap between the user-configured Data Binding matrix
 * and the slide generator's GenerationInput format.
 */
import { listFieldBindings, listDataSources, getPillarConfig } from "../db";
import { logError, logException } from "./errorLogger";
import type { FieldBinding } from "../../drizzle/schema";

// ─── Types ──────────────────────────────────────────────────────

export interface ResolvedBindings {
  /** Pillar info */
  pillarName: string;
  teams: string[];
  pillarConfigId: number;

  /** Resolved slide content from bindings */
  executiveSummary?: {
    businessOutcome?: string;
    progressUpdates?: string;
    blockersRisks?: string;
    leadershipAsks?: string;
  };

  initiatives?: {
    name: string;
    outcome: string;
    updates: string;
    risks: string;
  }[];

  launchItems?: {
    date: string;
    title: string;
    quarter: string;
  }[];

  keyDates?: {
    date: string;
    title: string;
    quarter: string;
  }[];

  /** Budget fields */
  budget?: {
    totalBudget?: string;
    spendYtd?: string;
    forecast?: string;
    variance?: string;
    commentary?: string;
  };

  /** Slides marked as not required (skip during generation) */
  skippedSlides: string[];

  /** Binding coverage stats */
  stats: {
    totalSections: number;
    connected: number;
    notRequired: number;
    unbound: number;
  };

  /** Raw bindings for reference */
  rawBindings: FieldBinding[];
}

// ─── Slide section → field mapping ──────────────────────────────

/**
 * Maps slideType + slideSection to a path in the resolved output.
 * This is the bridge between the Data Binding matrix and the GenerationInput.
 */
const SECTION_TO_FIELD: Record<string, Record<string, string>> = {
  executive_summary: {
    business_outcome: "executiveSummary.businessOutcome",
    progress_updates: "executiveSummary.progressUpdates",
    blockers_risks: "executiveSummary.blockersRisks",
    leadership_asks: "executiveSummary.leadershipAsks",
  },
  initiatives_goals: {
    initiative_name: "initiatives.name",
    business_outcome: "initiatives.outcome",
    target: "initiatives.target",
    progress_vs_target: "initiatives.progressVsTarget",
    kpi_target: "initiatives.kpiTarget",
    value_vs_target: "initiatives.valueVsTarget",
  },
  initiative_deep_dive: {
    initiative_name: "initiativeDeepDive.name",
    business_outcome: "initiativeDeepDive.outcome",
    progress_updates: "initiativeDeepDive.updates",
    blockers_risks: "initiativeDeepDive.risks",
    leadership_asks: "initiativeDeepDive.asks",
  },
  launch_schedule: {
    q1_milestones: "launchItems.q1",
    q2_milestones: "launchItems.q2",
    q3_milestones: "launchItems.q3",
    q4_milestones: "launchItems.q4",
  },
  key_dates: {
    q1_dates: "keyDates.q1",
    q2_dates: "keyDates.q2",
    q3_dates: "keyDates.q3",
    q4_dates: "keyDates.q4",
  },
  budget_update: {
    total_budget: "budget.totalBudget",
    spend_ytd: "budget.spendYtd",
    forecast: "budget.forecast",
    variance: "budget.variance",
    commentary: "budget.commentary",
    budget_chart: "budget.chartData",
  },
};

// ─── Resolver ───────────────────────────────────────────────────

/**
 * Resolve all field bindings for a pillar into a structured format
 * that the slide generator can consume.
 */
export async function resolveBindings(pillarConfigId: number): Promise<ResolvedBindings> {
  const pillar = await getPillarConfig(pillarConfigId);
  if (!pillar) {
    throw new Error(`Pillar config ${pillarConfigId} not found`);
  }

  const bindings = await listFieldBindings(pillarConfigId);

  // Count stats
  const connected = bindings.filter(b => b.bindingStatus === "connected").length;
  const notRequired = bindings.filter(b => b.bindingStatus === "not_required").length;

  // Count total possible sections (from SECTION_TO_FIELD)
  let totalSections = 0;
  for (const slide of Object.values(SECTION_TO_FIELD)) {
    totalSections += Object.keys(slide).length;
  }
  // Add sections not in SECTION_TO_FIELD (title, agenda, etc.)
  totalSections += 10; // approximate for title, agenda, exclusions, te, appendix, etc.

  const skippedSlides: string[] = [];
  const slideSkipCounts: Record<string, { total: number; notRequired: number }> = {};

  // Track which slides have all sections marked as not_required
  for (const binding of bindings) {
    if (!slideSkipCounts[binding.slideType]) {
      slideSkipCounts[binding.slideType] = { total: 0, notRequired: 0 };
    }
    slideSkipCounts[binding.slideType].total++;
    if (binding.bindingStatus === "not_required") {
      slideSkipCounts[binding.slideType].notRequired++;
    }
  }

  // If ALL sections of a slide are not_required, skip the entire slide
  for (const [slideType, counts] of Object.entries(slideSkipCounts)) {
    if (counts.total > 0 && counts.total === counts.notRequired) {
      skippedSlides.push(slideType);
    }
  }

  // Build resolved content from connected bindings
  const resolved: ResolvedBindings = {
    pillarName: pillar.pillarName,
    teams: pillar.teams ? (typeof pillar.teams === "string" ? JSON.parse(pillar.teams) : pillar.teams) : [],
    pillarConfigId,
    skippedSlides,
    stats: {
      totalSections,
      connected,
      notRequired,
      unbound: totalSections - connected - notRequired,
    },
    rawBindings: bindings,
  };

  // Process connected bindings to build content structure
  const connectedBindings = bindings.filter(b => b.bindingStatus === "connected");

  for (const binding of connectedBindings) {
    try {
      applyBinding(resolved, binding);
    } catch (err) {
      await logException(err, "bindingResolver.applyBinding", {
        context: {
          bindingId: binding.id,
          slideType: binding.slideType,
          slideSection: binding.slideSection,
          sourceField: binding.sourceField,
        },
        pillarConfigId,
      });
    }
  }

  await logError({
    severity: "info",
    source: "bindingResolver",
    message: `Resolved ${connected} bindings for pillar "${pillar.pillarName}" (${notRequired} skipped, ${skippedSlides.length} slides fully skipped)`,
    pillarConfigId,
    context: { stats: resolved.stats, skippedSlides },
  });

  return resolved;
}

/**
 * Apply a single binding to the resolved output.
 * This maps the binding's sourceFieldName to the appropriate field
 * in the resolved structure.
 */
function applyBinding(resolved: ResolvedBindings, binding: FieldBinding): void {
  const { slideType, slideSection, sourceField, transformNotes } = binding;

  // For now, the binding stores the source field name as a reference.
  // When real data sources are connected, this will fetch actual data.
  // Currently it creates a placeholder that indicates the binding exists.
  const value = sourceField || "";
  const note = transformNotes ? ` [${transformNotes}]` : "";
  const label = `${value}${note}`;

  switch (slideType) {
    case "executive_summary":
      if (!resolved.executiveSummary) resolved.executiveSummary = {};
      if (slideSection === "business_outcome") resolved.executiveSummary.businessOutcome = label;
      if (slideSection === "progress_updates") resolved.executiveSummary.progressUpdates = label;
      if (slideSection === "blockers_risks") resolved.executiveSummary.blockersRisks = label;
      if (slideSection === "leadership_asks") resolved.executiveSummary.leadershipAsks = label;
      break;

    case "initiatives_goals":
    case "initiative_deep_dive":
      // Table/list-based — bindings define the field mapping
      break;

    case "launch_schedule":
    case "key_dates":
      // Quarter-based items
      break;

    case "budget_update":
      if (!resolved.budget) resolved.budget = {};
      if (slideSection === "total_budget") resolved.budget.totalBudget = label;
      if (slideSection === "spend_ytd") resolved.budget.spendYtd = label;
      if (slideSection === "forecast") resolved.budget.forecast = label;
      if (slideSection === "variance") resolved.budget.variance = label;
      if (slideSection === "commentary") resolved.budget.commentary = label;
      break;
  }
}

/**
 * Get a summary of binding coverage for a pillar.
 * Used by the UI to show status indicators.
 */
export async function getBindingCoverage(pillarConfigId: number) {
  const bindings = await listFieldBindings(pillarConfigId);

  const bySlide: Record<string, { connected: number; notRequired: number; unbound: number }> = {};

  for (const binding of bindings) {
    if (!bySlide[binding.slideType]) {
      bySlide[binding.slideType] = { connected: 0, notRequired: 0, unbound: 0 };
    }
    if (binding.bindingStatus === "connected") bySlide[binding.slideType].connected++;
    else if (binding.bindingStatus === "not_required") bySlide[binding.slideType].notRequired++;
    else bySlide[binding.slideType].unbound++;
  }

  return {
    totalBindings: bindings.length,
    connected: bindings.filter(b => b.bindingStatus === "connected").length,
    notRequired: bindings.filter(b => b.bindingStatus === "not_required").length,
    bySlide,
  };
}
