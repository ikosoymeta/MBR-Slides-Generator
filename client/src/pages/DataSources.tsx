import DashboardLayout from "@/components/DashboardLayout";
import { useInactivityTimeout } from "@/hooks/useInactivityTimeout";
import { InactivityWarningDialog } from "@/components/InactivityWarningDialog";
import { ActivityHistory } from "@/components/ActivityHistory";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  Presentation,
  Loader2,
  Database,
  ExternalLink,
  Link2,
  Layers,
  ArrowRight,
  Settings2,
  Pencil,
  PlusCircle,
  Check,
  X,
  Ban,
  CircleDashed,
  ChevronDown,
  ChevronRight,
  Clock,
  Save,
  Calendar,
  Hash,
  Type,
  Lock,
  Zap,
  Search,
  Info,
  ArrowLeftRight,
  SquarePen,
} from "lucide-react";

// ─── Constants ──────────────────────────────────────────────────

const SOURCE_TYPE_ICONS: Record<string, typeof FileSpreadsheet> = {
  google_sheet: FileSpreadsheet,
  google_doc: FileText,
  google_slides: Presentation,
};

const SOURCE_TYPE_LABELS: Record<string, string> = {
  google_sheet: "Google Sheet",
  google_doc: "Google Doc",
  google_slides: "Google Slides",
};

const CATEGORY_LABELS: Record<string, string> = {
  planning_doc: "Planning Doc",
  content_calendar: "Content Calendar",
  budget_tracker: "Budget Tracker",
  expense_data: "Expense Data",
  template: "Template",
  other: "Other",
};

const SLIDE_TYPE_LABELS: Record<string, string> = {
  title: "Title Slide",
  agenda: "Agenda",
  exclusions: "Template Exclusions",
  executive_summary: "Executive Summary",
  initiatives_goals: "Initiatives & Goals",
  initiative_deep_dive: "Initiative Deep Dive",
  launch_schedule: "Launch Schedule",
  key_dates: "Key Dates & Milestones",
  budget_update: "Budget Update",
  budget_reforecast: "Budget Reforecast",
  te: "T&E",
  appendix_header: "Appendix",
  budget_detail: "Budget Detail Table",
  appendix_content: "Appendix Content",
  end_frame: "End Frame",
};

// ─── Data Binding Constants ─────────────────────────────────────
const SLIDE_SECTIONS: Record<string, { label: string; sections: { value: string; label: string; type: string }[] }> = {
  title: { label: "Title Slide", sections: [
    { value: "pillar_name", label: "Pillar Name", type: "string" },
    { value: "month_year", label: "Month & Year", type: "date" },
    { value: "subtitle", label: "Subtitle", type: "string" },
  ]},
  agenda: { label: "Agenda", sections: [
    { value: "agenda_items", label: "Agenda Items", type: "string" },
  ]},
  exclusions: { label: "Template Exclusions", sections: [
    { value: "exclusion_notes", label: "Exclusion Notes", type: "string" },
  ]},
  executive_summary: { label: "Executive Summary", sections: [
    { value: "business_outcome", label: "Business Outcome & Goal", type: "string" },
    { value: "progress_updates", label: "Progress Updates", type: "string" },
    { value: "blockers_risks", label: "Blockers & Risks", type: "string" },
    { value: "leadership_asks", label: "Leadership Asks", type: "string" },
  ]},
  initiatives_goals: { label: "Initiatives & Goals", sections: [
    { value: "initiative_name", label: "Initiative Name", type: "string" },
    { value: "business_outcome", label: "Business Outcome", type: "string" },
    { value: "target", label: "Target", type: "number" },
    { value: "progress_vs_target", label: "Progress vs Target", type: "number" },
    { value: "kpi_target", label: "KPI Target", type: "number" },
    { value: "value_vs_target", label: "Value vs Target", type: "number" },
  ]},
  initiative_deep_dive: { label: "Initiative Deep Dive", sections: [
    { value: "initiative_name", label: "Initiative Name", type: "string" },
    { value: "business_outcome", label: "Business Outcome & Goal", type: "string" },
    { value: "progress_updates", label: "Progress Updates", type: "string" },
    { value: "blockers_risks", label: "Blockers & Risks", type: "string" },
    { value: "leadership_asks", label: "Leadership Asks", type: "string" },
  ]},
  launch_schedule: { label: "Launch Schedule", sections: [
    { value: "q1_milestones", label: "Q1 Milestones", type: "date" },
    { value: "q2_milestones", label: "Q2 Milestones", type: "date" },
    { value: "q3_milestones", label: "Q3 Milestones", type: "date" },
    { value: "q4_milestones", label: "Q4 Milestones", type: "date" },
  ]},
  key_dates: { label: "Key Dates & Milestones", sections: [
    { value: "q1_dates", label: "Q1 Key Dates", type: "date" },
    { value: "q2_dates", label: "Q2 Key Dates", type: "date" },
    { value: "q3_dates", label: "Q3 Key Dates", type: "date" },
    { value: "q4_dates", label: "Q4 Key Dates", type: "date" },
  ]},
  budget_update: { label: "Budget Update", sections: [
    { value: "total_budget", label: "Total Budget", type: "currency" },
    { value: "spend_ytd", label: "Spend YTD", type: "currency" },
    { value: "forecast", label: "Forecast", type: "currency" },
    { value: "variance", label: "Variance", type: "currency" },
    { value: "commentary", label: "Commentary", type: "string" },
    { value: "budget_chart", label: "Budget Chart Data", type: "graph_aggregator" },
  ]},
  budget_reforecast: { label: "Budget Reforecast", sections: [
    { value: "original_budget", label: "Original Budget", type: "currency" },
    { value: "reforecast_amount", label: "Reforecast Amount", type: "currency" },
    { value: "delta", label: "Delta", type: "currency" },
    { value: "justification", label: "Justification", type: "string" },
  ]},
  te: { label: "T&E", sections: [
    { value: "te_budget", label: "T&E Budget", type: "currency" },
    { value: "te_spend", label: "T&E Spend", type: "currency" },
    { value: "te_forecast", label: "T&E Forecast", type: "currency" },
    { value: "te_variance", label: "T&E Variance", type: "currency" },
  ]},
  budget_detail: { label: "Budget Detail Table", sections: [
    { value: "team_name", label: "Team Name", type: "string" },
    { value: "project_name", label: "Project Name", type: "string" },
    { value: "budget_amount", label: "Budget Amount", type: "currency" },
    { value: "spend_amount", label: "Spend Amount", type: "currency" },
    { value: "payment_amount", label: "Payment Amount", type: "currency" },
    { value: "milestone_status", label: "Milestone Status", type: "picklist" },
    { value: "delivery_date", label: "Delivery Date", type: "date" },
  ]},
  appendix_header: { label: "Appendix", sections: [
    { value: "appendix_title", label: "Appendix Title", type: "string" },
  ]},
  appendix_content: { label: "Appendix Content", sections: [
    { value: "content_body", label: "Content Body", type: "string" },
    { value: "supporting_data", label: "Supporting Data", type: "string" },
  ]},
  end_frame: { label: "End Frame", sections: [
    { value: "closing_text", label: "Closing Text", type: "string" },
  ]},
};

const SOURCE_FIELD_TYPES = [
  { value: "string", label: "String" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "currency", label: "Currency" },
  { value: "option", label: "Option/Picklist" },
  { value: "boolean", label: "Boolean" },
  { value: "url", label: "URL" },
  { value: "graph_aggregator", label: "Graph Aggregator" },
  { value: "other", label: "Other" },
];

const DYNAMIC_DATE_OPTIONS = [
  { value: "generation_date", label: "Generation Date", preview: "e.g., March 12, 2026" },
  { value: "current_month_year", label: "Current Month & Year", preview: "e.g., March 2026" },
  { value: "previous_month_year", label: "Previous Month & Year", preview: "e.g., February 2026" },
  { value: "current_quarter", label: "Current Quarter", preview: "e.g., Q1 2026" },
  { value: "fiscal_year", label: "Fiscal Year", preview: "e.g., FY2026" },
  { value: "q1_dynamic_year", label: "Q1 + Dynamic Year", preview: "e.g., Q1 2026" },
  { value: "q2_dynamic_year", label: "Q2 + Dynamic Year", preview: "e.g., Q2 2026" },
  { value: "q3_dynamic_year", label: "Q3 + Dynamic Year", preview: "e.g., Q3 2026" },
  { value: "q4_dynamic_year", label: "Q4 + Dynamic Year", preview: "e.g., Q4 2026" },
  { value: "custom_interval", label: "Custom Interval", preview: "e.g., Jan-Mar 2026" },
  { value: "custom_format", label: "Custom Format", preview: "Specify your own format" },
];

// Binding modes for Autopilot autonomy
type BindingMode = "source" | "dynamic" | "fixed" | "free_text" | "skip";

const BINDING_MODE_CONFIG: Record<BindingMode, { label: string; icon: typeof Link2; color: string; bgClass: string; description: string }> = {
  source: { label: "From Source", icon: Link2, color: "text-emerald-700", bgClass: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800", description: "Pull value from a connected data source column" },
  dynamic: { label: "Dynamic Date", icon: Calendar, color: "text-blue-700", bgClass: "bg-blue-50 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800", description: "Auto-generate date/quarter/year at deck creation" },
  fixed: { label: "Fixed Value", icon: Lock, color: "text-purple-700", bgClass: "bg-purple-50 border-purple-200 dark:bg-purple-950/20 dark:border-purple-800", description: "Same constant value every Autopilot run" },
  free_text: { label: "Free Text", icon: SquarePen, color: "text-orange-700", bgClass: "bg-orange-50 border-orange-200 dark:bg-orange-950/20 dark:border-orange-800", description: "Enter custom text directly for this field" },
  skip: { label: "Skip", icon: Ban, color: "text-gray-500", bgClass: "bg-gray-50 border-gray-200 dark:bg-gray-800/30 dark:border-gray-700", description: "Not required — Autopilot will leave blank" },
};

function getAvailableModes(sectionType: string): BindingMode[] {
  if (sectionType === "date") return ["source", "dynamic", "fixed", "free_text", "skip"];
  return ["source", "fixed", "free_text", "skip"];
}

function getAllSections() {
  const result: { slideType: string; slideLabel: string; sectionValue: string; sectionLabel: string; sectionType: string }[] = [];
  for (const [slideType, slide] of Object.entries(SLIDE_SECTIONS)) {
    for (const sec of slide.sections) {
      result.push({ slideType, slideLabel: slide.label, sectionValue: sec.value, sectionLabel: sec.label, sectionType: sec.type });
    }
  }
  return result;
}

const ALL_SECTIONS = getAllSections();

type FieldBinding = {
  id: number; pillarConfigId: number; dataSourceId: number | null;
  sourceField: string; sourceFieldType: string; slideType: string;
  slideSection: string; slideSectionType: string; syncDirection: string;
  bindingStatus?: string; transformNotes: string | null; isActive: boolean;
  sourceReference?: string | null;
  isDynamic?: boolean;
  dynamicDateType?: string | null;
  dynamicDateFormat?: string | null;
  hardcodedValue?: string | null;
  createdAt: Date; updatedAt: Date;
};

type EditBindingState = {
  sourceField: string;
  sourceFieldType: string;
  transformNotes: string;
  sourceReference: string;
  isDynamic: boolean;
  dynamicDateType: string;
  dynamicDateFormat: string;
  hardcodedValue: string;
  bindingMode: BindingMode;
};

function isDateType(sectionType: string): boolean {
  return sectionType === "date";
}

// ─── Main Component ────────────────────────────────────────────

export default function DataSources() {
  const utils = trpc.useUtils();
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery();
  const { data: allSources, isLoading: sourcesLoading } = trpc.dataSources.list.useQuery();

  // Pillar tab selection
  const [selectedPillarId, setSelectedPillarId] = useState<string>("");

  const effectivePillarId = useMemo(() => {
    if (selectedPillarId && pillars?.some(p => String(p.id) === selectedPillarId)) return selectedPillarId;
    if (pillars && pillars.length > 0) return String(pillars[0].id);
    return "";
  }, [selectedPillarId, pillars]);

  const numericPillarId = effectivePillarId ? Number(effectivePillarId) : null;

  const currentPillarName = useMemo(() => {
    if (!pillars || !numericPillarId) return "";
    return pillars.find(p => p.id === numericPillarId)?.pillarName || "";
  }, [pillars, numericPillarId]);

  // ─── Source Dialogs ───────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);

  // Add Source form state
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<string>("google_sheet");
  const [googleUrl, setGoogleUrl] = useState("");
  const [sheetTab, setSheetTab] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [addToPillarId, setAddToPillarId] = useState<string>("");

  // Edit Source form state
  const [editName, setEditName] = useState("");
  const [editSourceType, setEditSourceType] = useState<string>("google_sheet");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const [editSheetTab, setEditSheetTab] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("other");
  const [editPillarId, setEditPillarId] = useState<string>("");

  // Expanded sources
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  // Inline binding edit state
  const [editingBindings, setEditingBindings] = useState<Map<number, Map<string, EditBindingState>>>(new Map());

  // Column suggestions
  const [fetchingColumns, setFetchingColumns] = useState<Set<number>>(new Set());

  // Add New Pillar state
  const [newPillarDialogOpen, setNewPillarDialogOpen] = useState(false);
  const [newPillarName, setNewPillarName] = useState("");

  // Configure dialog state (for the reference-style Configure action)
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [configTarget, setConfigTarget] = useState<{ sourceId: number; slideType: string; sectionValue: string; sectionType: string; sectionLabel: string } | null>(null);

  // ─── Queries ──────────────────────────────────────────────────
  const bindingsQuery = trpc.fieldBindings.list.useQuery(
    { pillarConfigId: numericPillarId ?? undefined },
    { enabled: numericPillarId !== null }
  );
  const bindings = (bindingsQuery.data ?? []) as FieldBinding[];

  // ─── Mutations ────────────────────────────────────────────────
  const createSourceMutation = trpc.dataSources.create.useMutation({
    onSuccess: () => {
      utils.dataSources.list.invalidate();
      setAddDialogOpen(false);
      resetAddForm();
      toast.success("Data source added.");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateSourceMutation = trpc.dataSources.update.useMutation({
    onSuccess: () => {
      utils.dataSources.list.invalidate();
      setEditDialogOpen(false);
      setEditingSource(null);
      toast.success("Data source updated.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteSourceMutation = trpc.dataSources.delete.useMutation({
    onSuccess: () => {
      utils.dataSources.list.invalidate();
      toast.success("Data source removed.");
    },
  });

  const createPillarMutation = trpc.pillars.upsert.useMutation({
    onSuccess: (created: any) => {
      utils.pillars.list.invalidate();
      setNewPillarDialogOpen(false);
      setNewPillarName("");
      toast.success(`Pillar "${newPillarName}" created.`);
      if (created?.id) {
        setSelectedPillarId(String(created.id));
        if (addDialogOpen) setAddToPillarId(String(created.id));
        if (editDialogOpen) setEditPillarId(String(created.id));
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const upsertBinding = trpc.fieldBindings.upsert.useMutation({
    onSuccess: () => {
      utils.fieldBindings.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBinding = trpc.fieldBindings.delete.useMutation({
    onSuccess: () => {
      utils.fieldBindings.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Derived data ─────────────────────────────────────────────
  const pillarSources = useMemo(() => {
    if (!allSources || !numericPillarId) return [];
    return allSources.filter(s => s.pillarConfigId === numericPillarId);
  }, [allSources, numericPillarId]);

  const pillarSourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (!allSources) return counts;
    for (const src of allSources) {
      if (src.pillarConfigId) {
        const key = String(src.pillarConfigId);
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [allSources]);

  const bindingMap = useMemo(() => {
    const map = new Map<string, FieldBinding>();
    for (const b of bindings) map.set(`${b.slideType}::${b.slideSection}`, b);
    return map;
  }, [bindings]);

  const bindingsBySource = useMemo(() => {
    const map = new Map<number, FieldBinding[]>();
    for (const b of bindings) {
      if (b.dataSourceId) {
        const arr = map.get(b.dataSourceId) || [];
        arr.push(b);
        map.set(b.dataSourceId, arr);
      }
    }
    return map;
  }, [bindings]);

  const bindingStats = useMemo(() => {
    let connected = 0, notRequired = 0, unbound = 0;
    for (const sec of ALL_SECTIONS) {
      const b = bindingMap.get(`${sec.slideType}::${sec.sectionValue}`);
      if (!b) { unbound++; continue; }
      const status = (b.bindingStatus as string) ?? "connected";
      if (status === "connected") connected++;
      else if (status === "not_required") notRequired++;
      else unbound++;
    }
    return { connected, notRequired, unbound, total: ALL_SECTIONS.length };
  }, [bindingMap]);

  function getSourceName(dsId: number | null) {
    if (!dsId) return null;
    const ds = allSources?.find((d) => d.id === dsId);
    return ds?.name ?? `Source #${dsId}`;
  }

  // ─── Helpers ──────────────────────────────────────────────────
  function resetAddForm() {
    setName(""); setSourceType("google_sheet"); setGoogleUrl(""); setSheetTab("");
    setDescription(""); setCategory("other"); setAddToPillarId("");
  }

  function extractFileId(url: string): string {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || url;
  }

  function handleAddSource() {
    const fileId = extractFileId(googleUrl);
    if (!addToPillarId) { toast.error("Please select a pillar."); return; }
    if (!name.trim() || !fileId) { toast.error("Name and Google URL/ID are required."); return; }
    createSourceMutation.mutate({
      name: name.trim(), sourceType: sourceType as any, googleFileId: fileId,
      sheetTab: sheetTab || undefined, description: description || undefined,
      category: category as any, pillarConfigId: Number(addToPillarId),
    });
  }

  function handleEditSource() {
    if (!editingSource) return;
    const fileId = extractFileId(editGoogleUrl);
    if (!editPillarId) { toast.error("Please select a pillar."); return; }
    if (!editName.trim() || !fileId) { toast.error("Name and Google URL/ID are required."); return; }
    updateSourceMutation.mutate({
      id: editingSource.id, name: editName.trim(), sourceType: editSourceType as any,
      googleFileId: fileId, sheetTab: editSheetTab || undefined,
      description: editDescription || undefined, category: editCategory as any,
      pillarConfigId: Number(editPillarId),
    });
  }

  function openEditDialog(src: any) {
    setEditingSource(src); setEditName(src.name); setEditSourceType(src.sourceType);
    setEditGoogleUrl(src.googleFileId); setEditSheetTab(src.sheetTab || "");
    setEditDescription(src.description || ""); setEditCategory(src.category);
    setEditPillarId(src.pillarConfigId ? String(src.pillarConfigId) : "");
    setEditDialogOpen(true);
  }

  function openAddDialog() {
    resetAddForm();
    if (numericPillarId) setAddToPillarId(String(numericPillarId));
    setAddDialogOpen(true);
  }

  function getGoogleUrl(src: { sourceType: string; googleFileId: string }) {
    if (src.sourceType === "google_sheet") return `https://docs.google.com/spreadsheets/d/${src.googleFileId}`;
    if (src.sourceType === "google_doc") return `https://docs.google.com/document/d/${src.googleFileId}`;
    return `https://docs.google.com/presentation/d/${src.googleFileId}`;
  }

  // ─── Source expand/collapse ──────────────────────────────────
  function toggleSource(sourceId: number) {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
        setEditingBindings(prev => { const n = new Map(prev); n.delete(sourceId); return n; });
      } else {
        next.add(sourceId);
      }
      return next;
    });
  }

  // ─── Inline binding edit helpers ─────────────────────────────
  function determineBindingMode(existing?: FieldBinding, sectionType?: string): BindingMode {
    if (existing) {
      if ((existing.bindingStatus as string) === "not_required") return "skip";
      if (existing.isDynamic) return "dynamic";
      if (existing.hardcodedValue && existing.sourceField === "[Hardcoded]") return "fixed";
      if (existing.hardcodedValue && existing.sourceField === "[Free Text]") return "free_text";
      // Legacy: check if sourceField looks like free text
      if (existing.sourceField?.startsWith("[Free Text]")) return "free_text";
      return "source";
    }
    // Default for new bindings
    if (isDateType(sectionType || "")) return "dynamic";
    return "source";
  }

  function isPillarNameSection(slideType: string, sectionValue: string): boolean {
    return slideType === "title" && sectionValue === "pillar_name";
  }

  function startEditBinding(sourceId: number, slideType: string, sectionValue: string, sectionType: string, existing?: FieldBinding) {
    // If it's pillar_name and no existing binding, auto-create fixed with pillar name
    if (isPillarNameSection(slideType, sectionValue) && !existing && currentPillarName) {
      if (!numericPillarId) { toast.error("No pillar selected."); return; }
      upsertBinding.mutate({
        pillarConfigId: numericPillarId,
        slideType: slideType as any,
        slideSection: sectionValue,
        bindingStatus: "connected",
        sourceField: "[Hardcoded]",
        sourceFieldType: "string" as any,
        slideSectionType: "string" as any,
        dataSourceId: sourceId,
        hardcodedValue: currentPillarName,
      }, {
        onSuccess: () => toast.success(`Pillar Name auto-filled with "${currentPillarName}".`),
      });
      return;
    }

    setEditingBindings(prev => {
      const next = new Map(prev);
      const sourceEdits = new Map(next.get(sourceId) || new Map());
      const key = `${slideType}::${sectionValue}`;
      const defaultMode = determineBindingMode(existing, sectionType);
      sourceEdits.set(key, {
        sourceField: existing?.sourceField && !existing.sourceField.startsWith("[") ? existing.sourceField : "",
        sourceFieldType: existing?.sourceFieldType || sectionType || "string",
        transformNotes: existing?.transformNotes || "",
        sourceReference: existing?.sourceReference || "",
        isDynamic: existing?.isDynamic || false,
        dynamicDateType: existing?.dynamicDateType || "generation_date",
        dynamicDateFormat: existing?.dynamicDateFormat || "",
        hardcodedValue: existing?.hardcodedValue || (isPillarNameSection(slideType, sectionValue) ? currentPillarName : ""),
        bindingMode: defaultMode,
      });
      next.set(sourceId, sourceEdits);
      return next;
    });
  }

  function cancelEditBinding(sourceId: number, slideType: string, sectionValue: string) {
    setEditingBindings(prev => {
      const next = new Map(prev);
      const sourceEdits = new Map(next.get(sourceId) || new Map());
      sourceEdits.delete(`${slideType}::${sectionValue}`);
      if (sourceEdits.size === 0) next.delete(sourceId);
      else next.set(sourceId, sourceEdits);
      return next;
    });
  }

  function updateEditBinding(sourceId: number, slideType: string, sectionValue: string, field: string, value: any) {
    setEditingBindings(prev => {
      const next = new Map(prev);
      const sourceEdits = new Map(next.get(sourceId) || new Map());
      const key = `${slideType}::${sectionValue}`;
      const current = sourceEdits.get(key);
      if (current) {
        sourceEdits.set(key, { ...current, [field]: value });
        next.set(sourceId, sourceEdits);
      }
      return next;
    });
  }

  function getEditState(sourceId: number, slideType: string, sectionValue: string) {
    return editingBindings.get(sourceId)?.get(`${slideType}::${sectionValue}`);
  }

  function saveBinding(sourceId: number, slideType: string, sectionValue: string, sectionType: string) {
    const editState = getEditState(sourceId, slideType, sectionValue);
    if (!editState) return;
    if (!numericPillarId) { toast.error("No pillar selected."); return; }

    const mode = editState.bindingMode;

    if (mode === "skip") {
      markNotRequired(slideType, sectionValue, sourceId);
      cancelEditBinding(sourceId, slideType, sectionValue);
      return;
    }

    if (mode === "source" && !editState.sourceField.trim()) {
      toast.error("Source field name is required.");
      return;
    }

    if (mode === "fixed" && !editState.hardcodedValue.trim()) {
      toast.error("Fixed value is required.");
      return;
    }

    if (mode === "free_text" && !editState.hardcodedValue.trim()) {
      toast.error("Free text value is required.");
      return;
    }

    upsertBinding.mutate({
      pillarConfigId: numericPillarId,
      slideType: slideType as any,
      slideSection: sectionValue,
      bindingStatus: "connected",
      sourceField: mode === "source" ? editState.sourceField.trim() :
                   mode === "dynamic" ? `[Dynamic: ${DYNAMIC_DATE_OPTIONS.find(d => d.value === editState.dynamicDateType)?.label || editState.dynamicDateType}]` :
                   mode === "free_text" ? "[Free Text]" :
                   "[Hardcoded]",
      sourceFieldType: editState.sourceFieldType as any,
      slideSectionType: sectionType as any,
      dataSourceId: sourceId,
      transformNotes: editState.transformNotes || undefined,
      sourceReference: editState.sourceReference || undefined,
      isDynamic: mode === "dynamic",
      dynamicDateType: mode === "dynamic" ? editState.dynamicDateType as any : undefined,
      dynamicDateFormat: mode === "dynamic" && (editState.dynamicDateType === "custom_format" || editState.dynamicDateType === "custom_interval") ? editState.dynamicDateFormat : undefined,
      hardcodedValue: (mode === "fixed" || mode === "free_text") ? editState.hardcodedValue : undefined,
    }, {
      onSuccess: () => {
        toast.success("Binding saved.");
        cancelEditBinding(sourceId, slideType, sectionValue);
      },
    });
  }

  function markNotRequired(slideType: string, sectionValue: string, sourceId: number) {
    if (!numericPillarId) { toast.error("No pillar selected."); return; }
    upsertBinding.mutate({
      pillarConfigId: numericPillarId,
      slideType: slideType as any,
      slideSection: sectionValue,
      bindingStatus: "not_required",
      sourceField: "\u2014",
      slideSectionType: "string" as any,
      dataSourceId: sourceId,
    }, {
      onSuccess: () => toast.success("Marked as skipped."),
    });
  }

  function clearBinding(slideType: string, sectionValue: string) {
    const existing = bindingMap.get(`${slideType}::${sectionValue}`);
    if (existing) {
      deleteBinding.mutate({ id: existing.id }, {
        onSuccess: () => toast.success("Binding cleared."),
      });
    }
  }

  const isLoading = pillarsLoading || sourcesLoading;

  // Inactivity timeout
  const anyDialogOpen = addDialogOpen || editDialogOpen;
  const { showWarning, remainingSeconds, continueSession } = useInactivityTimeout({
    isActive: anyDialogOpen,
    onTimeout: () => {
      setAddDialogOpen(false);
      setEditDialogOpen(false);
      setEditingSource(null);
      toast.error("Edit session closed due to inactivity.");
    },
  });

  const [showActivityLog, setShowActivityLog] = useState(false);

  // ─── Source Form ──────────────────────────────────────────────
  function SourceForm({ mode }: { mode: "add" | "edit" }) {
    const isAdd = mode === "add";
    const n = isAdd ? name : editName;
    const setN = isAdd ? setName : setEditName;
    const st = isAdd ? sourceType : editSourceType;
    const setSt = isAdd ? setSourceType : setEditSourceType;
    const gu = isAdd ? googleUrl : editGoogleUrl;
    const setGu = isAdd ? setGoogleUrl : setEditGoogleUrl;
    const stab = isAdd ? sheetTab : editSheetTab;
    const setStab = isAdd ? setSheetTab : setEditSheetTab;
    const desc = isAdd ? description : editDescription;
    const setDesc = isAdd ? setDescription : setEditDescription;
    const cat = isAdd ? category : editCategory;
    const setCat = isAdd ? setCategory : setEditCategory;
    const pid = isAdd ? addToPillarId : editPillarId;
    const setPid = isAdd ? setAddToPillarId : setEditPillarId;

    return (
      <div className="space-y-4 py-2">
        <div className="space-y-2">
          <Label>Pillar <span className="text-destructive">*</span></Label>
          <div className="flex gap-2">
            <Select value={pid} onValueChange={setPid}>
              <SelectTrigger className="flex-1"><SelectValue placeholder="Select a pillar..." /></SelectTrigger>
              <SelectContent>
                {pillars?.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>{p.pillarName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="icon" className="shrink-0" title="Add new pillar" onClick={() => setNewPillarDialogOpen(true)}>
              <PlusCircle className="h-4 w-4" />
            </Button>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Name</Label>
          <Input placeholder="e.g., Horizon Content Calendar" value={n} onChange={(e) => setN(e.target.value)} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Source Type</Label>
            <Select value={st} onValueChange={setSt}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="google_sheet">Google Sheet</SelectItem>
                <SelectItem value="google_doc">Google Doc</SelectItem>
                <SelectItem value="google_slides">Google Slides</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Category</Label>
            <Select value={cat} onValueChange={setCat}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="planning_doc">Planning Doc</SelectItem>
                <SelectItem value="content_calendar">Content Calendar</SelectItem>
                <SelectItem value="budget_tracker">Budget Tracker</SelectItem>
                <SelectItem value="expense_data">Expense Data</SelectItem>
                <SelectItem value="template">Template</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label>Google URL or File ID <span className="text-destructive">*</span></Label>
          <Input placeholder="Paste the full Google Docs/Sheets/Slides URL" value={gu} onChange={(e) => setGu(e.target.value)} />
        </div>
        {(st === "google_sheet") && (
          <div className="space-y-2">
            <Label>Sheet Tab (optional)</Label>
            <Input placeholder="e.g., Sheet1, Budget Data" value={stab} onChange={(e) => setStab(e.target.value)} />
          </div>
        )}
        <div className="space-y-2">
          <Label>Description (optional)</Label>
          <Input placeholder="Brief description of this data source" value={desc} onChange={(e) => setDesc(e.target.value)} />
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Data Sources & Binding</h1>
            <p className="text-sm text-muted-foreground">
              Configure data sources per pillar and bind them to MBR slide template sections.
            </p>
          </div>
          <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-1.5" />Add Source</Button>
        </div>

        {/* Binding coverage summary */}
        {numericPillarId && (
          <div className="grid grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="text-2xl font-bold">{bindingStats.total}</div>
              <div className="text-xs text-muted-foreground">Total Sections</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-emerald-600">{bindingStats.connected}</div>
              <div className="text-xs text-muted-foreground">Connected</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-gray-400">{bindingStats.notRequired}</div>
              <div className="text-xs text-muted-foreground">Skipped</div>
            </Card>
            <Card className="p-4">
              <div className="text-2xl font-bold text-amber-600">{bindingStats.unbound}</div>
              <div className="text-xs text-muted-foreground">Unbound</div>
            </Card>
          </div>
        )}

        {/* Pillar Tabs */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !pillars || pillars.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Layers className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">No pillars configured yet.</p>
              <p className="text-xs text-muted-foreground mb-4">Create a pillar first to start adding data sources.</p>
              <Button onClick={() => setNewPillarDialogOpen(true)}><PlusCircle className="h-4 w-4 mr-1.5" />Create Pillar</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={effectivePillarId} onValueChange={setSelectedPillarId}>
            <div className="flex items-center gap-2 flex-wrap">
              <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                {pillars.map((p) => (
                  <TabsTrigger key={p.id} value={String(p.id)} className="text-xs">
                    {p.pillarName.length > 20 ? p.pillarName.slice(0, 18) + "\u2026" : p.pillarName}
                    {(pillarSourceCounts[String(p.id)] || 0) > 0 && (
                      <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{pillarSourceCounts[String(p.id)]}</Badge>
                    )}
                  </TabsTrigger>
                ))}
              </TabsList>
              <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setNewPillarDialogOpen(true)}>
                <PlusCircle className="h-3.5 w-3.5" /> Add Pillar
              </Button>
            </div>

            {pillars.map((p) => (
              <TabsContent key={p.id} value={String(p.id)} className="mt-4">
                {pillarSources.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
                      <p className="text-sm text-muted-foreground mb-1">No sources configured for <span className="font-medium">{p.pillarName}</span>.</p>
                      <p className="text-xs text-muted-foreground mb-4">Add data sources and expand them to configure bindings.</p>
                      <Button variant="outline" onClick={openAddDialog}><Plus className="h-4 w-4 mr-1.5" />Add Source</Button>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {pillarSources.map((src) => {
                      const Icon = SOURCE_TYPE_ICONS[src.sourceType] || FileText;
                      const isExpanded = expandedSources.has(src.id);
                      const sourceBindings = bindingsBySource.get(src.id) || [];
                      const sourceBindingCount = sourceBindings.filter(b => b.bindingStatus === "connected").length;

                      return (
                        <Card key={src.id} className="overflow-hidden">
                          {/* Source header */}
                          <div className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
                                <Icon className="h-4.5 w-4.5 text-accent-foreground" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{src.name}</span>
                                  <Badge variant="outline" className="text-[10px] shrink-0">{SOURCE_TYPE_LABELS[src.sourceType]}</Badge>
                                  {src.category && src.category !== "other" && (
                                    <Badge variant="secondary" className="text-[10px] shrink-0">{CATEGORY_LABELS[src.category] || src.category}</Badge>
                                  )}
                                </div>
                                {src.description && <p className="text-[11px] text-muted-foreground truncate mt-0.5">{src.description}</p>}
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <a href={getGoogleUrl(src)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center h-8 w-8 rounded-md hover:bg-accent transition-colors" title="Open in Google">
                                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                                </a>
                                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditDialog(src)} title="Edit source">
                                  <Settings2 className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => { if (confirm("Delete this source and all its bindings?")) deleteSourceMutation.mutate({ id: src.id }); }} title="Delete source">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>

                          {/* Source Bindings toggle */}
                          <div className="border-t">
                            <button
                              className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
                              onClick={() => toggleSource(src.id)}
                            >
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Link2 className="h-3.5 w-3.5" />
                              Source Data Binding
                              {sourceBindingCount > 0 && (
                                <span className="text-muted-foreground font-normal">({sourceBindingCount} connected)</span>
                              )}
                            </button>
                          </div>

                          {/* ═══ Expanded: Reference-style binding table ═══ */}
                          {isExpanded && (
                            <div className="border-t bg-muted/10">
                              {/* Table header */}
                              <div className="bg-muted/40 border-b">
                                <div className="grid grid-cols-[1fr_40px_1fr_auto] items-center px-4 py-2.5">
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">Source Field</div>
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-center">Sync</div>
                                  <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">Slide Title / Section / Field</div>
                                  <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground text-right w-[140px]">Actions</div>
                                </div>
                              </div>

                              {/* Binding rows grouped by slide type */}
                              <div>
                                {Object.entries(SLIDE_SECTIONS).map(([slideType, slide]) => (
                                  <div key={slideType}>
                                    {/* Slide group header */}
                                    <div className="px-4 py-1.5 bg-muted/20 border-b flex items-center gap-2">
                                      <Presentation className="h-3 w-3 text-primary" />
                                      <span className="text-[10px] font-semibold text-primary uppercase tracking-wide">{slide.label}</span>
                                      <span className="text-[10px] text-muted-foreground">({slide.sections.length})</span>
                                    </div>

                                    {slide.sections.map((sec, idx) => {
                                      const binding = bindingMap.get(`${slideType}::${sec.value}`);
                                      const isThisSource = binding?.dataSourceId === src.id;
                                      const status: "connected" | "not_required" | "unbound" =
                                        !binding ? "unbound" :
                                        (binding.bindingStatus as any) === "not_required" ? "not_required" : "connected";
                                      const editState = getEditState(src.id, slideType, sec.value);
                                      const isEditing = !!editState;
                                      const isPillarAuto = isPillarNameSection(slideType, sec.value);

                                      return (
                                        <div key={sec.value} className={`border-b last:border-b-0 ${
                                          isEditing ? "bg-blue-50/60 dark:bg-blue-950/20" :
                                          isThisSource && status === "connected" ? "" :
                                          ""
                                        }`}>
                                          {isEditing ? (
                                            /* ─── Inline Edit Mode ─── */
                                            <div className="px-4 py-3">
                                              <BindingEditForm
                                                editState={editState}
                                                sec={sec}
                                                slideType={slideType}
                                                sourceId={src.id}
                                                sourceType={src.sourceType}
                                                pillarName={currentPillarName}
                                                onUpdate={updateEditBinding}
                                                onSave={() => saveBinding(src.id, slideType, sec.value, sec.type)}
                                                onCancel={() => cancelEditBinding(src.id, slideType, sec.value)}
                                                isSaving={upsertBinding.isPending}
                                              />
                                            </div>
                                          ) : (
                                            /* ─── View Row: Source Field → Slide Target ─── */
                                            <div className="grid grid-cols-[1fr_40px_1fr_auto] items-center px-4 py-2.5 hover:bg-muted/20 transition-colors">
                                              {/* LEFT: Source Field */}
                                              <div className="min-w-0">
                                                {isThisSource && status === "connected" && binding ? (
                                                  <SourceFieldDisplay binding={binding} />
                                                ) : status === "not_required" && isThisSource ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <Ban className="h-3.5 w-3.5 text-gray-400" />
                                                    <span className="text-xs text-gray-400 italic">Skipped</span>
                                                  </div>
                                                ) : binding && !isThisSource ? (
                                                  <div className="flex items-center gap-1.5">
                                                    <span className="text-xs text-muted-foreground italic truncate">
                                                      {getSourceName(binding.dataSourceId) || "Other source"}
                                                    </span>
                                                  </div>
                                                ) : (
                                                  <div className="flex items-center gap-1.5">
                                                    <CircleDashed className="h-3.5 w-3.5 text-amber-500" />
                                                    <span className="text-xs text-amber-600 italic">Not configured</span>
                                                    {isPillarAuto && (
                                                      <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-[8px]">Auto</Badge>
                                                    )}
                                                  </div>
                                                )}
                                              </div>

                                              {/* CENTER: Arrow */}
                                              <div className="flex justify-center">
                                                <ArrowRight className={`h-3.5 w-3.5 ${
                                                  isThisSource && status === "connected" ? "text-emerald-500" :
                                                  status === "not_required" ? "text-gray-300" :
                                                  "text-muted-foreground/30"
                                                }`} />
                                              </div>

                                              {/* RIGHT: Slide Target */}
                                              <div className="min-w-0">
                                                <div className="flex items-center gap-1.5">
                                                  <span className="text-xs font-medium text-foreground">{sec.label}</span>
                                                  <Badge variant="outline" className="text-[9px] shrink-0">{sec.type}</Badge>
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">
                                                  {slide.label} &rarr; {sec.label}
                                                </div>
                                              </div>

                                              {/* ACTIONS: Configure · Delete */}
                                              <div className="flex items-center gap-2 w-[140px] justify-end">
                                                {isThisSource && (status === "connected" || status === "not_required") ? (
                                                  <>
                                                    <button
                                                      className="text-[11px] font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                                                      onClick={() => startEditBinding(src.id, slideType, sec.value, sec.type, binding)}
                                                    >
                                                      Configure
                                                    </button>
                                                    <span className="text-muted-foreground/40">·</span>
                                                    <button
                                                      className="text-[11px] font-medium text-destructive hover:text-destructive/80 hover:underline transition-colors"
                                                      onClick={() => clearBinding(slideType, sec.value)}
                                                    >
                                                      Delete
                                                    </button>
                                                  </>
                                                ) : !binding ? (
                                                  <button
                                                    className="text-[11px] font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
                                                    onClick={() => startEditBinding(src.id, slideType, sec.value, sec.type)}
                                                  >
                                                    Configure
                                                  </button>
                                                ) : (
                                                  <span className="text-[10px] text-muted-foreground italic">Other source</span>
                                                )}
                                              </div>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                ))}
                              </div>

                              {/* Bottom Save/Cancel bar (when any bindings are being edited) */}
                              {(editingBindings.get(src.id)?.size ?? 0) > 0 && (
                                <div className="bg-muted/30 border-t px-4 py-3 flex items-center justify-end gap-2">
                                  <span className="text-xs text-muted-foreground mr-auto">
                                    {editingBindings.get(src.id)?.size} binding(s) being configured
                                  </span>
                                </div>
                              )}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            ))}
          </Tabs>
        )}
      </div>

      {/* ─── Add Source Dialog ──────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Data Source</DialogTitle>
            <DialogDescription>Add a Google Doc, Sheet, or Slides file and assign it to a pillar.</DialogDescription>
          </DialogHeader>
          <SourceForm mode="add" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddSource} disabled={createSourceMutation.isPending}>
              {createSourceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Add Source
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Edit Source Dialog ─────────────────────────────── */}
      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) setEditingSource(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Data Source</DialogTitle>
            <DialogDescription>Update the source name, type, URL, category, or pillar assignment.</DialogDescription>
          </DialogHeader>
          <SourceForm mode="edit" />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setEditDialogOpen(false); setEditingSource(null); }}>Cancel</Button>
            <Button onClick={handleEditSource} disabled={updateSourceMutation.isPending}>
              {updateSourceMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Inactivity Warning ─────────────────────────── */}
      <InactivityWarningDialog
        open={showWarning}
        remainingSeconds={remainingSeconds}
        onContinue={continueSession}
        onExit={() => {
          setAddDialogOpen(false);
          setEditDialogOpen(false);
          setEditingSource(null);
          toast.error("Edit session closed.");
        }}
      />

      {/* ─── Add New Pillar Dialog ─────────────────────────── */}
      <Dialog open={newPillarDialogOpen} onOpenChange={setNewPillarDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Pillar</DialogTitle>
            <DialogDescription>Create a new pillar to organize your data sources.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label>Pillar Name</Label>
            <Input placeholder="e.g., Horizon" value={newPillarName} onChange={(e) => setNewPillarName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPillarDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => { if (!newPillarName.trim()) { toast.error("Pillar name is required."); return; } createPillarMutation.mutate({ pillarName: newPillarName.trim() }); }} disabled={createPillarMutation.isPending}>
              {createPillarMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Create Pillar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Activity Log ──────────────────────────────── */}
      <div className="mt-8">
        <button
          className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
          onClick={() => setShowActivityLog(!showActivityLog)}
        >
          <Clock className="h-4 w-4" />
          Recent Activity
          {showActivityLog ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
        {showActivityLog && (
          <Card>
            <CardContent className="p-4">
              <ActivityHistory entityType={undefined} limit={30} />
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// ─── Source Field Display (left column in view mode) ──────────────

function SourceFieldDisplay({ binding }: { binding: FieldBinding }) {
  if (binding.isDynamic && binding.dynamicDateType) {
    const dateLabel = DYNAMIC_DATE_OPTIONS.find(d => d.value === binding.dynamicDateType)?.label || binding.dynamicDateType;
    return (
      <div>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <span className="text-xs font-medium text-blue-700 dark:text-blue-400">{dateLabel}</span>
        </div>
        <div className="text-[10px] text-blue-500/70 mt-0.5">
          Type: dynamic date
          {binding.dynamicDateFormat && <> &middot; Format: {binding.dynamicDateFormat}</>}
        </div>
      </div>
    );
  }

  if (binding.sourceField === "[Free Text]" && binding.hardcodedValue) {
    return (
      <div>
        <div className="flex items-center gap-1.5">
          <SquarePen className="h-3.5 w-3.5 text-orange-500 shrink-0" />
          <span className="text-xs font-medium text-orange-700 dark:text-orange-400 truncate max-w-[250px]">{binding.hardcodedValue}</span>
        </div>
        <div className="text-[10px] text-orange-500/70 mt-0.5">Type: free text</div>
      </div>
    );
  }

  if (binding.sourceField === "[Hardcoded]" && binding.hardcodedValue) {
    return (
      <div>
        <div className="flex items-center gap-1.5">
          <Lock className="h-3.5 w-3.5 text-purple-500 shrink-0" />
          <span className="text-xs font-medium text-purple-700 dark:text-purple-400 truncate max-w-[250px]">{binding.hardcodedValue}</span>
        </div>
        <div className="text-[10px] text-purple-500/70 mt-0.5">Type: fixed value</div>
      </div>
    );
  }

  // From source
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-foreground truncate">{binding.sourceField}</span>
        <Badge variant="outline" className="text-[8px] shrink-0">{binding.sourceFieldType}</Badge>
      </div>
      <div className="text-[10px] text-muted-foreground mt-0.5">
        Type: {binding.sourceFieldType}
        {binding.sourceReference && <> &middot; Ref: {binding.sourceReference}</>}
        {binding.transformNotes && <> &middot; {binding.transformNotes}</>}
      </div>
    </div>
  );
}

// ─── Binding Edit Form (inline, reference-style) ─────────────────

function BindingEditForm({
  editState,
  sec,
  slideType,
  sourceId,
  sourceType,
  pillarName,
  onUpdate,
  onSave,
  onCancel,
  isSaving,
}: {
  editState: EditBindingState;
  sec: { value: string; label: string; type: string };
  slideType: string;
  sourceId: number;
  sourceType: string;
  pillarName: string;
  onUpdate: (sourceId: number, slideType: string, sectionValue: string, field: string, value: any) => void;
  onSave: () => void;
  onCancel: () => void;
  isSaving: boolean;
}) {
  const availableModes = getAvailableModes(sec.type);

  // Fetch sheet columns
  const sheetColumnsQuery = trpc.dataSources.sheetColumns.useQuery(
    { dataSourceId: sourceId },
    { enabled: sourceType === "google_sheet" && editState.bindingMode === "source" }
  );

  // Fetch doc sections
  const docSectionsQuery = trpc.dataSources.docSections.useQuery(
    { dataSourceId: sourceId },
    { enabled: sourceType === "google_doc" && editState.bindingMode === "source" }
  );

  const columns = sheetColumnsQuery.data?.columns || [];
  const docSections = docSectionsQuery.data?.sections || [];
  const isLoadingSuggestions = sheetColumnsQuery.isLoading || docSectionsQuery.isLoading;

  const modeConfig = BINDING_MODE_CONFIG[editState.bindingMode];

  return (
    <div className="space-y-3">
      {/* Target info */}
      <div className="flex items-center gap-2 pb-2 border-b border-border/50">
        <Presentation className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold text-foreground">{sec.label}</span>
        <Badge variant="outline" className="text-[9px]">{sec.type}</Badge>
        <ArrowRight className="h-3 w-3 text-muted-foreground mx-1" />
        <span className="text-xs text-muted-foreground">{SLIDE_TYPE_LABELS[slideType] || slideType}</span>
      </div>

      {/* Mode selector — pill buttons */}
      <div>
        <Label className="text-[10px] text-muted-foreground mb-1.5 block">Binding Mode</Label>
        <div className="flex gap-1.5 flex-wrap">
          {availableModes.map((mode) => {
            const cfg = BINDING_MODE_CONFIG[mode];
            const ModeIcon = cfg.icon;
            const isActive = editState.bindingMode === mode;
            return (
              <TooltipProvider key={mode}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-all border ${
                        isActive
                          ? "bg-primary text-primary-foreground border-primary shadow-sm"
                          : "bg-background text-muted-foreground border-border hover:bg-accent hover:text-accent-foreground"
                      }`}
                      onClick={() => onUpdate(sourceId, slideType, sec.value, "bindingMode", mode)}
                    >
                      <ModeIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs max-w-[200px]">
                    {cfg.description}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </div>
      </div>

      {/* ─── Source Mode ─── */}
      {editState.bindingMode === "source" && (
        <div className={`space-y-2.5 rounded-lg border p-3 ${BINDING_MODE_CONFIG.source.bgClass}`}>
          <div className="flex items-center gap-2 mb-1">
            <Link2 className="h-3.5 w-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-800 dark:text-emerald-300">Map from data source</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Source Field *</Label>
              {sourceType === "google_sheet" && columns.length > 0 ? (
                <Select
                  value={editState.sourceField || "___custom___"}
                  onValueChange={(v) => {
                    onUpdate(sourceId, slideType, sec.value, "sourceField", v === "___custom___" ? "" : v);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select column..." />
                  </SelectTrigger>
                  <SelectContent>
                    {columns.map((col) => (
                      <SelectItem key={col} value={col}>{col}</SelectItem>
                    ))}
                    <SelectItem value="___custom___">Custom field name...</SelectItem>
                  </SelectContent>
                </Select>
              ) : sourceType === "google_doc" && docSections.length > 0 ? (
                <Select
                  value={editState.sourceField || "___custom___"}
                  onValueChange={(v) => {
                    onUpdate(sourceId, slideType, sec.value, "sourceField", v === "___custom___" ? "" : v);
                  }}
                >
                  <SelectTrigger className="h-7 text-xs">
                    <SelectValue placeholder="Select section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {docSections.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                    <SelectItem value="___custom___">Custom field name...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  className="h-7 text-xs"
                  placeholder={isLoadingSuggestions ? "Loading..." : "e.g., Budget Amount"}
                  value={editState.sourceField}
                  onChange={(e) => onUpdate(sourceId, slideType, sec.value, "sourceField", e.target.value)}
                  autoFocus
                />
              )}
              {((sourceType === "google_sheet" && columns.length > 0) || (sourceType === "google_doc" && docSections.length > 0)) && !editState.sourceField && (
                <Input
                  className="h-7 text-xs mt-1"
                  placeholder="Type custom field name..."
                  value=""
                  onChange={(e) => onUpdate(sourceId, slideType, sec.value, "sourceField", e.target.value)}
                />
              )}
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Field Type</Label>
              <Select value={editState.sourceFieldType} onValueChange={(v) => onUpdate(sourceId, slideType, sec.value, "sourceFieldType", v)}>
                <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SOURCE_FIELD_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">
                {sourceType === "google_sheet" ? "Cell Range / Tab" : "Doc Section"}
              </Label>
              <Input
                className="h-7 text-xs"
                placeholder={sourceType === "google_sheet" ? "e.g., Sheet1!A1:B10" : "e.g., Section 2"}
                value={editState.sourceReference}
                onChange={(e) => onUpdate(sourceId, slideType, sec.value, "sourceReference", e.target.value)}
              />
            </div>
          </div>
          <div>
            <Label className="text-[10px] text-muted-foreground">Transform Notes (optional)</Label>
            <Input
              className="h-7 text-xs"
              placeholder="e.g., Sum column values, format as currency..."
              value={editState.transformNotes}
              onChange={(e) => onUpdate(sourceId, slideType, sec.value, "transformNotes", e.target.value)}
            />
          </div>
          {isLoadingSuggestions && (
            <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading column suggestions from source...
            </div>
          )}
        </div>
      )}

      {/* ─── Dynamic Date Mode ─── */}
      {editState.bindingMode === "dynamic" && (
        <div className={`rounded-lg border p-3 ${BINDING_MODE_CONFIG.dynamic.bgClass}`}>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-3.5 w-3.5 text-blue-600" />
            <span className="text-xs font-medium text-blue-800 dark:text-blue-300">Dynamic Date</span>
            <span className="text-[10px] text-blue-600 dark:text-blue-400">Auto-generated at deck creation</span>
          </div>
          <Select
            value={editState.dynamicDateType}
            onValueChange={(v) => onUpdate(sourceId, slideType, sec.value, "dynamicDateType", v)}
          >
            <SelectTrigger className="h-8 text-xs bg-white dark:bg-background">
              <SelectValue placeholder="Select date type..." />
            </SelectTrigger>
            <SelectContent>
              {DYNAMIC_DATE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  <div className="flex items-center gap-2">
                    <span>{opt.label}</span>
                    <span className="text-muted-foreground text-[10px]">{opt.preview}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(editState.dynamicDateType === "custom_format" || editState.dynamicDateType === "custom_interval") && (
            <div className="mt-2">
              <Label className="text-[10px] text-muted-foreground">
                {editState.dynamicDateType === "custom_interval" ? "Interval Pattern" : "Custom Format String"}
              </Label>
              <Input
                className="h-7 text-xs bg-white dark:bg-background"
                placeholder={editState.dynamicDateType === "custom_interval" ? "e.g., Jan-Mar {YYYY}, Week {W}" : "e.g., MMMM yyyy, MM/dd/yyyy"}
                value={editState.dynamicDateFormat}
                onChange={(e) => onUpdate(sourceId, slideType, sec.value, "dynamicDateFormat", e.target.value)}
              />
              <p className="text-[9px] text-muted-foreground mt-1">
                {editState.dynamicDateType === "custom_interval"
                  ? "Use {YYYY} for year, {MM} for month, {Q} for quarter, {W} for week number"
                  : "MMMM = full month, MMM = short month, yyyy = year, dd = day, Q = quarter"
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* ─── Fixed Value Mode ─── */}
      {editState.bindingMode === "fixed" && (
        <div className={`rounded-lg border p-3 ${BINDING_MODE_CONFIG.fixed.bgClass}`}>
          <div className="flex items-center gap-2 mb-2">
            <Lock className="h-3.5 w-3.5 text-purple-600" />
            <span className="text-xs font-medium text-purple-800 dark:text-purple-300">Fixed Value</span>
            <span className="text-[10px] text-purple-600 dark:text-purple-400">Same value every Autopilot run</span>
          </div>
          {sec.type === "currency" || sec.type === "number" ? (
            <Input
              className="h-8 text-xs bg-white dark:bg-background"
              type="text"
              placeholder={sec.type === "currency" ? "e.g., $1,250,000" : "e.g., 42"}
              value={editState.hardcodedValue}
              onChange={(e) => onUpdate(sourceId, slideType, sec.value, "hardcodedValue", e.target.value)}
              autoFocus
            />
          ) : (
            <Textarea
              className="text-xs bg-white dark:bg-background min-h-[60px] resize-none"
              placeholder="Enter the fixed value to use..."
              value={editState.hardcodedValue}
              onChange={(e) => onUpdate(sourceId, slideType, sec.value, "hardcodedValue", e.target.value)}
              autoFocus
            />
          )}
        </div>
      )}

      {/* ─── Free Text Mode ─── */}
      {editState.bindingMode === "free_text" && (
        <div className={`rounded-lg border p-3 ${BINDING_MODE_CONFIG.free_text.bgClass}`}>
          <div className="flex items-center gap-2 mb-2">
            <SquarePen className="h-3.5 w-3.5 text-orange-600" />
            <span className="text-xs font-medium text-orange-800 dark:text-orange-300">Free Text</span>
            <span className="text-[10px] text-orange-600 dark:text-orange-400">Custom text for this slide field</span>
          </div>
          <Textarea
            className="text-xs bg-white dark:bg-background min-h-[80px] resize-y"
            placeholder="Enter custom text content for this field..."
            value={editState.hardcodedValue}
            onChange={(e) => onUpdate(sourceId, slideType, sec.value, "hardcodedValue", e.target.value)}
            autoFocus
          />
          <p className="text-[9px] text-orange-600/60 mt-1">
            This text will be placed directly into the slide. Supports multi-line content.
          </p>
        </div>
      )}

      {/* ─── Skip Mode ─── */}
      {editState.bindingMode === "skip" && (
        <div className={`rounded-lg border p-3 ${BINDING_MODE_CONFIG.skip.bgClass}`}>
          <div className="flex items-center gap-2">
            <Ban className="h-3.5 w-3.5 text-gray-500" />
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Skip this field</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Autopilot will leave this field empty or use the template default. The slide section will not be populated.
          </p>
        </div>
      )}

      {/* ─── Save / Cancel ─── */}
      <div className="flex items-center gap-2 pt-1 border-t border-border/30">
        <Button size="sm" className="h-7 text-xs gap-1 px-3" onClick={onSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />} Save
        </Button>
        <Button variant="outline" size="sm" className="h-7 text-xs gap-1 px-3" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
