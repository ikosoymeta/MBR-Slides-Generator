/**
 * Unified type exports
 * Import shared types from this single entry point.
 */

export type * from "../drizzle/schema";
export * from "./_core/errors";

/** Shared types for MBR Generator */

export const PILLARS = [
  "Entertainment",
  "Studios",
  "2P/3P Games",
  "Developer Ecosystem Success",
  "Emerging Experiences",
  "Total Content",
  "1P Studios",
  "BOSS",
  "Business Operations and Strategy",
  "Executive",
  "Games",
  "Horizon",
] as const;

export type PillarName = (typeof PILLARS)[number];

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
] as const;

export const YEARS = [2024, 2025, 2026, 2027, 2028] as const;

/** Default Google resource IDs */
export const GOOGLE_IDS = {
  MBR_TEMPLATE: "1EV76g3VtRF2uwxIoaBnNbEnY74x3X8RMA0HAGGcs1sA",
  HORIZON_CONTENT_CALENDAR: "12Gkpyr_8im8dwW7-N5Gty2e3RHQ2vf5dIs9MsbPB_Lo",
  SF_EXPENSE_DATA: "1K-Hh6SUo5OHbLbqCNwy9V04d97IfgnlnjeX8NanQVyw",
  PLANNING_DOC_TEMPLATE: "17br2BkzHllEkAHCsvrMgdQn0wdPq77dBp-MjYVhLqrA",
  MBR_OUTPUT_ROOT: "1XXg9R7ctvralay50uh5Ei1PBMI1pgJ_V",
  MBR_EXISTING_DECKS: "1pd_ZHdfEznecdpkoFkpvw6Yt173MCIWS",
  OUTPUT_FOLDERS: {
    "2026": "1RGWrIEbvmsarkuBL3fG22Pf1xTlHIdgk",
    "2027": "1x5QVyYFNM-FxmnF-WBhR83_-GxTsj1os",
    "2028": "1zgySmnuA7FHXJiVhAGu6zMp3xCNn0TmI",
  } as Record<string, string>,
} as const;

/** Pillar to Drive folder mapping for existing MBR decks */
export const PILLAR_FOLDERS: Record<string, string> = {
  "Entertainment": "1zR7Rw5qow1SO81dZzLmxYsqyk_L2qc5f",
  "Total Content": "1mL5x0Wy31WxUfUbu_OtL-DC71bO20xna",
  "Emerging Experiences": "1K5ucj_MtIES45j_M2BAlnyBt4s9me-vW",
  "DES": "1uTGA8N8sSjUAAHJCHEU8_QRvHiSjzk07",
  "Studios": "14_RL0Mv1kuUKRvrjUsAHEyqIaDX26osp",
  "2P/3P Games": "1ACPILPP_LO2uMLUBRfSPUnjwUz5euoI-",
};

/** Pillar -> Teams mapping from SF Main Expense Data */
export const PILLAR_TEAMS: Record<string, string[]> = {
  "1P Studios": ["Armature", "Beat Games", "BigBox", "Camouflaj", "Downpour", "Glassworks", "Ouro", "Sanzaru", "Studios Central Tech", "Studios Shared Services", "Studios T&E", "Supernatural", "Twisted Pixel"],
  "BOSS": ["Consumer Insights", "Content Operations", "Developer Trusted Experiences", "Meta Horizon +", "Tools"],
  "Business Operations and Strategy": ["Consumer Insights", "Content Operations", "Growth and Monetization", "MH+", "Studios Strategy", "Tools", "UXR & CWs"],
  "Developer Ecosystem Success": ["Dev Rel Engineering", "Developer Growth & Programs", "Developer Trusted Experiences", "MHCP Scaled Partnerships", "Partner Engineering", "VR Scaled Partnerships"],
  "Emerging Experiences": ["Education", "Gen AI", "Interests", "Productivity", "Wellness"],
  "Entertainment": ["2D Completeness", "Differentiated Experiences", "Entertainment - Central", "Entertainment - Contingency", "Live Sports", "Music", "Sports", "Stereoscopic Production", "Studios & Streamers"],
  "Executive": ["Pre-reorg Fees"],
  "Games": ["2P Horizon", "2P Publishing", "3P Games", "3P Publishing", "Growth and Monetization"],
  "Horizon": ["APAC Partnerships", "Content Engineering", "Core Partners", "Creator Programs", "Partnerships"],
  "Studios": ["Beat Games", "BigBox", "Camouflaj", "Downpour", "Ouro", "Supernatural"],
};

/** MBR Template slide structure */
export const MBR_TEMPLATE_SLIDES = [
  { index: 0, type: "title", name: "Title Slide" },
  { index: 1, type: "agenda", name: "Agenda" },
  { index: 2, type: "exclusions", name: "Template Exclusions" },
  { index: 3, type: "executive_summary", name: "Executive Summary" },
  { index: 4, type: "initiatives_goals", name: "Initiatives & Goals" },
  { index: 5, type: "initiative_deep_dive", name: "Initiative Deep Dive" },
  { index: 6, type: "launch_schedule", name: "Launch Schedule" },
  { index: 7, type: "key_dates", name: "Key Dates & Milestones" },
  { index: 8, type: "budget_update", name: "Budget Update" },
  { index: 9, type: "budget_reforecast", name: "Budget Reforecast" },
  { index: 10, type: "te", name: "T&E" },
  { index: 11, type: "appendix_header", name: "Appendix" },
  { index: 12, type: "budget_detail", name: "Budget Detail Table" },
  { index: 13, type: "appendix_content", name: "Appendix Content" },
  { index: 14, type: "end_frame", name: "End Frame" },
] as const;

export type SlideType = (typeof MBR_TEMPLATE_SLIDES)[number]["type"];

export interface ExpenseRecord {
  pillar: string;
  team: string;
  section: string;
  projectName: string;
  supplierName: string;
  milestoneName: string;
  milestoneStatus: string;
  accountingTreatment: string;
  fundingName: string;
  fundingId: string;
  spendRecDate: string;
  paymentAmount: string;
  fundingAmount: string;
  recognizedAmount: string;
  status: string;
  month: string;
  quarter: string;
  year: string;
}

export interface LaunchScheduleItem {
  source: string;
  studio: string;
  genre: string;
  gameTitle: string;
  spm: string;
  type: string;
  templatePublishDate: string;
  deepWorldLaunch: string;
}

export interface PlanningDocContent {
  executiveSummary: string;
  initiatives: {
    name: string;
    updates: string;
    risks: string;
    supportingDocs: string;
    analyticsViews: string;
  }[];
  otherNotes: string;
}
