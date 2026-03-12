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
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo } from "react";
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
  Unlink,
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

const MAPPABLE_SLIDE_TYPES = [
  "executive_summary",
  "initiatives_goals",
  "initiative_deep_dive",
  "launch_schedule",
  "key_dates",
  "budget_update",
  "budget_reforecast",
  "te",
  "budget_detail",
  "appendix_content",
] as const;

// ─── Data Binding Constants ─────────────────────────────────────
const SLIDE_SECTIONS: Record<string, { label: string; sections: { value: string; label: string; type: string }[] }> = {
  title: { label: "Title Slide", sections: [
    { value: "pillar_name", label: "Pillar Name", type: "string" },
    { value: "month_year", label: "Month & Year", type: "string" },
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
    { value: "target", label: "Target", type: "string" },
    { value: "progress_vs_target", label: "Progress vs Target", type: "string" },
    { value: "kpi_target", label: "KPI Target", type: "string" },
    { value: "value_vs_target", label: "Value vs Target", type: "string" },
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
  createdAt: Date; updatedAt: Date;
};

// ─── Main Component ─────────────────────────────────────────────

export default function DataSources() {
  const utils = trpc.useUtils();
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery();
  const { data: allSources, isLoading: sourcesLoading } = trpc.dataSources.list.useQuery();

  // Top-level tab: "sources" or "bindings"
  const [mainTab, setMainTab] = useState<string>("sources");
  const [selectedPillarId, setSelectedPillarId] = useState<string>("all");

  // ─── Source Dialogs ───────────────────────────────────────────
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingSourceId, setMappingSourceId] = useState<number | null>(null);
  const [mappingPillarId, setMappingPillarId] = useState<number | null>(null);

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

  // Mapping form state
  const [mappingSlideType, setMappingSlideType] = useState<string>("");
  const [mappingSection, setMappingSection] = useState("");
  const [mappingNotes, setMappingNotes] = useState("");

  // ─── Binding Dialog state ─────────────────────────────────────
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<{ slideType: string; sectionValue: string; sectionLabel: string; sectionType: string } | null>(null);
  const [editingExistingBinding, setEditingExistingBinding] = useState<FieldBinding | null>(null);
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set(Object.keys(SLIDE_SECTIONS)));
  const [sourceField, setSourceField] = useState("");
  const [sourceFieldType, setSourceFieldType] = useState("string");
  const [transformNotes, setTransformNotes] = useState("");
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");

  // Add New Pillar state
  const [newPillarDialogOpen, setNewPillarDialogOpen] = useState(false);
  const [newPillarName, setNewPillarName] = useState("");

  // ─── Queries ──────────────────────────────────────────────────
  const numericPillarId = selectedPillarId !== "all" ? Number(selectedPillarId) : null;
  const { data: pillarMappings } = trpc.slideMappings.listByPillar.useQuery(
    { pillarConfigId: numericPillarId! },
    { enabled: numericPillarId !== null }
  );

  const bindingsQuery = trpc.fieldBindings.list.useQuery(
    { pillarConfigId: numericPillarId ?? undefined },
    { enabled: true }
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
      if (numericPillarId) utils.slideMappings.listByPillar.invalidate({ pillarConfigId: numericPillarId });
      toast.success("Data source removed.");
    },
  });

  const createMappingMutation = trpc.slideMappings.create.useMutation({
    onSuccess: () => {
      if (numericPillarId) utils.slideMappings.listByPillar.invalidate({ pillarConfigId: numericPillarId });
      setMappingDialogOpen(false);
      resetMappingForm();
      toast.success("Slide mapping created.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMappingMutation = trpc.slideMappings.delete.useMutation({
    onSuccess: () => {
      if (numericPillarId) utils.slideMappings.listByPillar.invalidate({ pillarConfigId: numericPillarId });
      toast.success("Mapping removed.");
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

  // Binding mutations
  const upsertBinding = trpc.fieldBindings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Binding saved.");
      utils.fieldBindings.list.invalidate();
      setConnectDialogOpen(false);
      setEditingSection(null);
      setEditingExistingBinding(null);
      resetBindingForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBinding = trpc.fieldBindings.delete.useMutation({
    onSuccess: () => {
      toast.success("Binding removed.");
      utils.fieldBindings.list.invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ─── Derived data ─────────────────────────────────────────────
  const sourcesByPillar = useMemo(() => {
    if (!allSources) return {};
    const grouped: Record<string, typeof allSources> = {};
    for (const src of allSources) {
      const key = src.pillarConfigId ? String(src.pillarConfigId) : "unassigned";
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(src);
    }
    return grouped;
  }, [allSources]);

  const mappingsBySource = useMemo(() => {
    if (!pillarMappings) return {};
    const grouped: Record<number, typeof pillarMappings> = {};
    for (const m of pillarMappings) {
      if (!grouped[m.dataSourceId]) grouped[m.dataSourceId] = [];
      grouped[m.dataSourceId].push(m);
    }
    return grouped;
  }, [pillarMappings]);

  const pillarSourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allSources?.length || 0 };
    if (!allSources) return counts;
    for (const src of allSources) {
      if (src.pillarConfigId) {
        const key = String(src.pillarConfigId);
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }, [allSources]);

  // Binding map
  const bindingMap = useMemo(() => {
    const map = new Map<string, FieldBinding>();
    for (const b of bindings) map.set(`${b.slideType}::${b.slideSection}`, b);
    return map;
  }, [bindings]);

  function getBinding(slideType: string, sectionValue: string) { return bindingMap.get(`${slideType}::${sectionValue}`); }
  function getStatus(slideType: string, sectionValue: string): "connected" | "not_required" | "unbound" {
    const b = getBinding(slideType, sectionValue);
    if (!b) return "unbound";
    return (b.bindingStatus as any) ?? "connected";
  }
  function getSourceName(dsId: number | null) {
    if (!dsId) return null;
    const ds = allSources?.find((d) => d.id === dsId);
    return ds?.name ?? `Source #${dsId}`;
  }

  const bindingStats = useMemo(() => {
    let connected = 0, notRequired = 0, unbound = 0;
    for (const sec of ALL_SECTIONS) {
      const status = getStatus(sec.slideType, sec.sectionValue);
      if (status === "connected") connected++;
      else if (status === "not_required") notRequired++;
      else unbound++;
    }
    return { connected, notRequired, unbound, total: ALL_SECTIONS.length };
  }, [bindings]);

  // ─── Helpers ──────────────────────────────────────────────────
  function resetAddForm() {
    setName(""); setSourceType("google_sheet"); setGoogleUrl(""); setSheetTab("");
    setDescription(""); setCategory("other"); setAddToPillarId("");
  }
  function resetMappingForm() {
    setMappingSlideType(""); setMappingSection(""); setMappingNotes("");
    setMappingSourceId(null); setMappingPillarId(null);
  }
  function resetBindingForm() {
    setSourceField(""); setSourceFieldType("string"); setTransformNotes(""); setSelectedDataSourceId("");
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

  function handleAddMapping() {
    const effectivePillarId = mappingPillarId || numericPillarId;
    if (!mappingSourceId || !mappingSlideType || !effectivePillarId) {
      toast.error("Source and slide component are required."); return;
    }
    createMappingMutation.mutate({
      dataSourceId: mappingSourceId, pillarConfigId: effectivePillarId,
      sourceSection: mappingSection || undefined, slideType: mappingSlideType as any,
      mappingNotes: mappingNotes || undefined,
    });
  }

  function openAddDialog() {
    resetAddForm();
    if (numericPillarId) setAddToPillarId(String(numericPillarId));
    setAddDialogOpen(true);
  }

  function openMappingDialog(sourceId: number, pillarId?: number | null) {
    resetMappingForm(); setMappingSourceId(sourceId);
    if (pillarId) setMappingPillarId(pillarId);
    else {
      const src = allSources?.find((s) => s.id === sourceId);
      if (src?.pillarConfigId) setMappingPillarId(src.pillarConfigId);
    }
    setMappingDialogOpen(true);
  }

  function getGoogleUrl(src: { sourceType: string; googleFileId: string }) {
    if (src.sourceType === "google_sheet") return `https://docs.google.com/spreadsheets/d/${src.googleFileId}`;
    if (src.sourceType === "google_doc") return `https://docs.google.com/document/d/${src.googleFileId}`;
    return `https://docs.google.com/presentation/d/${src.googleFileId}`;
  }

  // Binding helpers
  function openConnect(slideType: string, sectionValue: string, sectionLabel: string, sectionType: string) {
    const existing = getBinding(slideType, sectionValue);
    setEditingSection({ slideType, sectionValue, sectionLabel, sectionType });
    if (existing && existing.bindingStatus !== "not_required") {
      setEditingExistingBinding(existing);
      setSourceField(existing.sourceField === "—" ? "" : existing.sourceField);
      setSourceFieldType(existing.sourceFieldType);
      setTransformNotes(existing.transformNotes ?? "");
      setSelectedDataSourceId(existing.dataSourceId?.toString() ?? "");
    } else {
      setEditingExistingBinding(null);
      resetBindingForm();
    }
    setConnectDialogOpen(true);
  }

  function handleSaveConnect() {
    if (!editingSection) return;
    const pillarId = numericPillarId ?? (pillars && pillars.length > 0 ? pillars[0].id : undefined);
    if (!pillarId) { toast.error("Please select a pillar first."); return; }
    if (!sourceField.trim()) { toast.error("Please enter a source field name."); return; }
    upsertBinding.mutate({
      pillarConfigId: pillarId, slideType: editingSection.slideType as any,
      slideSection: editingSection.sectionValue, bindingStatus: "connected",
      sourceField: sourceField.trim(), sourceFieldType: sourceFieldType as any,
      slideSectionType: editingSection.sectionType as any,
      dataSourceId: selectedDataSourceId && selectedDataSourceId !== "none" ? parseInt(selectedDataSourceId) : null,
      transformNotes: transformNotes || undefined,
    });
  }

  function markNotRequired(slideType: string, sectionValue: string) {
    const pillarId = numericPillarId ?? (pillars && pillars.length > 0 ? pillars[0].id : undefined);
    if (!pillarId) { toast.error("Please select a pillar first."); return; }
    upsertBinding.mutate({
      pillarConfigId: pillarId, slideType: slideType as any,
      slideSection: sectionValue, bindingStatus: "not_required",
      sourceField: "—", slideSectionType: "string" as any,
    });
  }

  function clearBinding(slideType: string, sectionValue: string) {
    const existing = getBinding(slideType, sectionValue);
    if (existing) deleteBinding.mutate({ id: existing.id });
  }

  function toggleSlide(slideType: string) {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(slideType)) next.delete(slideType); else next.add(slideType);
      return next;
    });
  }

  function slideStats(slideType: string) {
    const sections = SLIDE_SECTIONS[slideType]?.sections ?? [];
    let connected = 0, notRequired = 0, unbound = 0;
    for (const sec of sections) {
      const status = getStatus(slideType, sec.value);
      if (status === "connected") connected++;
      else if (status === "not_required") notRequired++;
      else unbound++;
    }
    return { connected, notRequired, unbound, total: sections.length };
  }

  const isLoading = pillarsLoading || sourcesLoading;

  // Inactivity timeout for edit dialogs
  const anyDialogOpen = addDialogOpen || editDialogOpen || mappingDialogOpen || connectDialogOpen;
  const { showWarning, remainingSeconds, continueSession } = useInactivityTimeout({
    isActive: anyDialogOpen,
    onTimeout: () => {
      setAddDialogOpen(false);
      setEditDialogOpen(false);
      setMappingDialogOpen(false);
      setConnectDialogOpen(false);
      setEditingSource(null);
      setEditingSection(null);
      setEditingExistingBinding(null);
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
          <Label>Google URL or File ID</Label>
          <Input placeholder="https://docs.google.com/spreadsheets/d/... or file ID" value={gu} onChange={(e) => setGu(e.target.value)} />
        </div>
        {st === "google_sheet" && (
          <div className="space-y-2">
            <Label>Sheet Tab (optional)</Label>
            <Input placeholder="e.g., SF Main Expense Data" value={stab} onChange={(e) => setStab(e.target.value)} />
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
          {mainTab === "sources" && (
            <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-1.5" />Add Source</Button>
          )}
        </div>

        {/* Top-level tabs: Sources / Bindings */}
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="sources" className="gap-1.5">
              <Database className="h-3.5 w-3.5" /> Sources
            </TabsTrigger>
            <TabsTrigger value="bindings" className="gap-1.5">
              <Link2 className="h-3.5 w-3.5" /> Bindings
            </TabsTrigger>
          </TabsList>

          {/* ═══ SOURCES TAB ═══ */}
          <TabsContent value="sources" className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Tabs value={selectedPillarId} onValueChange={setSelectedPillarId}>
                <div className="flex items-center gap-2 flex-wrap">
                  <TabsList className="flex flex-wrap h-auto gap-1 bg-muted/50 p-1">
                    <TabsTrigger value="all" className="text-xs">
                      All <Badge variant="secondary" className="ml-1.5 text-[10px] px-1.5 py-0">{pillarSourceCounts.all}</Badge>
                    </TabsTrigger>
                    {pillars?.map((p) => (
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

                {/* All sources view */}
                <TabsContent value="all" className="mt-4">
                  {!allSources || allSources.length === 0 ? <EmptySourceState /> : (
                    <div className="space-y-6">
                      {pillars?.map((p) => {
                        const pSources = sourcesByPillar[String(p.id)] || [];
                        if (pSources.length === 0) return null;
                        return (
                          <PillarSourceGroup key={p.id} pillarName={p.pillarName} pillarId={p.id}
                            sources={pSources} mappings={[]} showMappings={false}
                            onDelete={(id) => deleteSourceMutation.mutate({ id })}
                            onEdit={openEditDialog}
                            onOpenMapping={openMappingDialog} getGoogleUrl={getGoogleUrl}
                          />
                        );
                      })}
                    </div>
                  )}
                </TabsContent>

                {/* Per-pillar views */}
                {pillars?.map((p) => (
                  <TabsContent key={p.id} value={String(p.id)} className="mt-4">
                    <PillarDetailView pillarName={p.pillarName} pillarId={p.id}
                      sources={sourcesByPillar[String(p.id)] || []}
                      mappings={pillarMappings || []} mappingsBySource={mappingsBySource}
                      onDelete={(id) => deleteSourceMutation.mutate({ id })}
                      onEdit={openEditDialog}
                      onDeleteMapping={(id) => deleteMappingMutation.mutate({ id })}
                      onOpenMapping={openMappingDialog} getGoogleUrl={getGoogleUrl}
                    />
                  </TabsContent>
                ))}
              </Tabs>
            )}
          </TabsContent>

          {/* ═══ BINDINGS TAB ═══ */}
          <TabsContent value="bindings" className="mt-4">
            {/* Coverage Summary */}
            <div className="grid grid-cols-4 gap-3 mb-4">
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
                <div className="text-xs text-muted-foreground">Not Required</div>
              </Card>
              <Card className="p-4">
                <div className="text-2xl font-bold text-amber-600">{bindingStats.unbound}</div>
                <div className="text-xs text-muted-foreground">Unbound</div>
              </Card>
            </div>

            {/* Pillar Tabs for bindings */}
            <Tabs value={selectedPillarId} onValueChange={setSelectedPillarId}>
              <div className="flex items-center gap-2 mb-4">
                <TabsList>
                  <TabsTrigger value="all">All Pillars</TabsTrigger>
                  {pillars?.map((p) => (
                    <TabsTrigger key={p.id} value={p.id.toString()}>
                      {p.pillarName.length > 22 ? p.pillarName.slice(0, 20) + "\u2026" : p.pillarName}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setNewPillarDialogOpen(true)}>
                  <PlusCircle className="h-3.5 w-3.5" /> Add Pillar
                </Button>
              </div>

              <TabsContent value={selectedPillarId} className="mt-0">
                {selectedPillarId === "all" && pillars?.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                      <Link2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">No pillars configured</h3>
                      <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
                        Create a pillar first, then come back to set up data bindings.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(SLIDE_SECTIONS).map(([slideType, slide]) => {
                      const isExpanded = expandedSlides.has(slideType);
                      const ss = slideStats(slideType);
                      return (
                        <Card key={slideType} className="overflow-hidden">
                          <button
                            className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
                            onClick={() => toggleSlide(slideType)}
                          >
                            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                            <Presentation className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-semibold text-sm">{slide.label}</span>
                            <span className="text-xs text-muted-foreground ml-1">({slide.sections.length} {slide.sections.length === 1 ? "section" : "sections"})</span>
                            <div className="ml-auto flex items-center gap-2">
                              {ss.connected > 0 && <span className="text-xs text-emerald-600 font-medium">{ss.connected} connected</span>}
                              {ss.notRequired > 0 && <span className="text-xs text-gray-400 font-medium">{ss.notRequired} skipped</span>}
                              {ss.unbound > 0 && <span className="text-xs text-amber-600 font-medium">{ss.unbound} unbound</span>}
                            </div>
                          </button>
                          {isExpanded && (
                            <div className="border-t">
                              {slide.sections.map((sec, idx) => {
                                const status = getStatus(slideType, sec.value);
                                const binding = getBinding(slideType, sec.value);
                                return (
                                  <div key={sec.value} className={`flex items-center gap-3 px-5 py-3 ${idx < slide.sections.length - 1 ? "border-b" : ""} ${
                                    status === "connected" ? "bg-emerald-50/40 dark:bg-emerald-950/10" :
                                    status === "not_required" ? "bg-gray-50/60 dark:bg-gray-900/20" :
                                    "bg-amber-50/30 dark:bg-amber-950/10"
                                  }`}>
                                    <div className="flex items-center gap-2 min-w-[220px]">
                                      <Presentation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                      <div>
                                        <div className="text-sm font-medium">{sec.label}</div>
                                        <div className="text-xs text-muted-foreground">Type: {sec.type}</div>
                                      </div>
                                    </div>
                                    <div className="min-w-[120px]">
                                      <StatusBadge status={status} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      {status === "connected" && binding ? (
                                        <div className="flex items-center gap-2">
                                          <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                          <div className="min-w-0">
                                            <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                              <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                                              {binding.sourceField}
                                              <Badge variant="outline" className="text-[10px] font-normal ml-1">{binding.sourceFieldType}</Badge>
                                            </div>
                                            <div className="text-xs text-muted-foreground truncate">
                                              {getSourceName(binding.dataSourceId) && <span>Source: {getSourceName(binding.dataSourceId)}</span>}
                                              {binding.transformNotes && <span className="ml-2 italic">{binding.transformNotes}</span>}
                                            </div>
                                          </div>
                                        </div>
                                      ) : status === "not_required" ? (
                                        <span className="text-xs text-muted-foreground italic">Skipped — not needed for this pillar</span>
                                      ) : (
                                        <span className="text-xs text-amber-600 italic">No source connected yet</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0">
                                      {status === "connected" ? (
                                        <>
                                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openConnect(slideType, sec.value, sec.label, sec.type)}>
                                            <Settings2 className="h-3 w-3" /> Edit
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1" onClick={() => clearBinding(slideType, sec.value)}>
                                            <X className="h-3 w-3" /> Clear
                                          </Button>
                                        </>
                                      ) : status === "not_required" ? (
                                        <>
                                          <Button variant="ghost" size="sm" className="h-7 text-xs gap-1" onClick={() => openConnect(slideType, sec.value, sec.label, sec.type)}>
                                            <Link2 className="h-3 w-3" /> Connect
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive hover:text-destructive gap-1" onClick={() => clearBinding(slideType, sec.value)}>
                                            <X className="h-3 w-3" /> Clear
                                          </Button>
                                        </>
                                      ) : (
                                        <>
                                          <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => openConnect(slideType, sec.value, sec.label, sec.type)}>
                                            <Link2 className="h-3 w-3" /> Connect
                                          </Button>
                                          <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground gap-1" onClick={() => markNotRequired(slideType, sec.value)}>
                                            <Ban className="h-3 w-3" /> Not Required
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
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

      {/* ─── Add Slide Mapping Dialog ──────────────────────── */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Link Source to Slide Component</DialogTitle>
            <DialogDescription>Map a section of this data source to a specific MBR slide component.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Slide Component</Label>
              <Select value={mappingSlideType} onValueChange={setMappingSlideType}>
                <SelectTrigger><SelectValue placeholder="Select slide component..." /></SelectTrigger>
                <SelectContent>
                  {MAPPABLE_SLIDE_TYPES.map((st) => (
                    <SelectItem key={st} value={st}>{SLIDE_TYPE_LABELS[st]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Source Section (optional)</Label>
              <Input placeholder="e.g., Tab: Q1 Data, Column: B-F, Heading: Initiatives"
                value={mappingSection} onChange={(e) => setMappingSection(e.target.value)} />
              <p className="text-xs text-muted-foreground">Specify which part of the source feeds this slide.</p>
            </div>
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input placeholder="e.g., Use rows where Status = Active"
                value={mappingNotes} onChange={(e) => setMappingNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMappingDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddMapping} disabled={createMappingMutation.isPending}>
              {createMappingMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
              Link to Slide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Connect / Edit Binding Dialog ─────────────────── */}
      <Dialog open={connectDialogOpen} onOpenChange={(open) => { setConnectDialogOpen(open); if (!open) { setEditingSection(null); setEditingExistingBinding(null); } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>{editingExistingBinding ? "Edit Binding" : "Connect Source Field"}</DialogTitle>
            <DialogDescription>
              {editingSection && (
                <>Map a data source field to <strong>{editingSection.sectionLabel}</strong> in the <strong>{SLIDE_SECTIONS[editingSection.slideType]?.label}</strong> slide.</>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="rounded-lg border p-3 bg-orange-50/50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
                <Presentation className="h-4 w-4" /> MBR Slide Target
              </div>
              <div className="text-sm">
                <span className="font-medium">{SLIDE_SECTIONS[editingSection?.slideType ?? ""]?.label}</span>
                {" → "}
                <span className="font-medium">{editingSection?.sectionLabel}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">{editingSection?.sectionType}</Badge>
              </div>
            </div>
            <div className="rounded-lg border p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                <FileText className="h-4 w-4" /> Data Source Field
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Field / Section Name <span className="text-destructive">*</span></Label>
                <Input placeholder="e.g., Due Date, Summary, Payment Amount..." value={sourceField} onChange={(e) => setSourceField(e.target.value)} autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Field Type</Label>
                  <Select value={sourceFieldType} onValueChange={setSourceFieldType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SOURCE_FIELD_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Data Source</Label>
                  <Select value={selectedDataSourceId} onValueChange={setSelectedDataSourceId}>
                    <SelectTrigger><SelectValue placeholder="Optional..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific source</SelectItem>
                      {allSources?.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id.toString()}>{ds.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Transform / Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input placeholder="e.g., Sum all rows, format as currency..." value={transformNotes} onChange={(e) => setTransformNotes(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveConnect} disabled={upsertBinding.isPending || !sourceField.trim()}>
              {upsertBinding.isPending ? "Saving..." : editingExistingBinding ? "Save Changes" : "Connect"}
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
          setMappingDialogOpen(false);
          setConnectDialogOpen(false);
          setEditingSource(null);
          setEditingSection(null);
          setEditingExistingBinding(null);
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

// ─── Sub-components ─────────────────────────────────────────────

function StatusBadge({ status }: { status: "connected" | "not_required" | "unbound" }) {
  if (status === "connected") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 font-normal">
        <Check className="h-3 w-3" /> Connected
      </Badge>
    );
  }
  if (status === "not_required") {
    return (
      <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 gap-1 font-normal">
        <Ban className="h-3 w-3" /> Not Required
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1 font-normal">
      <CircleDashed className="h-3 w-3" /> Unbound
    </Badge>
  );
}

function EmptySourceState() {
  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-16">
        <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-muted-foreground mb-2">No data sources configured yet.</p>
        <p className="text-xs text-muted-foreground max-w-sm text-center">
          Add Google Docs, Sheets, or Slides that contain your MBR planning documents, content calendars, and budget data.
        </p>
      </CardContent>
    </Card>
  );
}

interface SourceCardProps {
  source: any; mappings: any[]; showMappings: boolean;
  onDelete: () => void; onEdit: () => void; onDeleteMapping?: (id: number) => void;
  onOpenMapping: () => void; getGoogleUrl: (src: any) => string;
}

function SourceCard({ source: src, mappings, showMappings, onDelete, onEdit, onDeleteMapping, onOpenMapping, getGoogleUrl }: SourceCardProps) {
  const Icon = SOURCE_TYPE_ICONS[src.sourceType] || FileText;
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-accent flex items-center justify-center shrink-0">
            <Icon className="h-4.5 w-4.5 text-accent-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium truncate text-foreground">{src.name}</p>
              <Badge variant="secondary" className="text-[10px] shrink-0">{CATEGORY_LABELS[src.category] || src.category}</Badge>
              <Badge variant="outline" className="text-[10px] shrink-0">{SOURCE_TYPE_LABELS[src.sourceType] || src.sourceType}</Badge>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {src.googleFileId.slice(0, 24)}…{src.sheetTab ? ` · Tab: ${src.sheetTab}` : ""}
            </p>
            {(src.createdByName || src.updatedByName) && (
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                {src.createdByName && <>Created by {src.createdByName}</>}
                {src.updatedByName && src.updatedByName !== src.createdByName && <> · Updated by {src.updatedByName}</>}
              </p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit source" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Link to slide component" onClick={onOpenMapping}><Link2 className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(getGoogleUrl(src), "_blank")} title="Open in Google"><ExternalLink className="h-3.5 w-3.5" /></Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete} title="Delete source"><Trash2 className="h-3.5 w-3.5" /></Button>
          </div>
        </div>
        {src.description && <p className="text-xs text-muted-foreground pl-12">{src.description}</p>}
        {showMappings && mappings.length > 0 && (
          <div className="pl-12 space-y-1.5">
            <Separator className="mb-2" />
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Linked Slide Components</p>
            {mappings.map((m) => (
              <div key={m.id} className="flex items-center gap-2 text-xs bg-muted/50 rounded-md px-2.5 py-1.5">
                <ArrowRight className="h-3 w-3 text-primary shrink-0" />
                <span className="font-medium text-foreground">{SLIDE_TYPE_LABELS[m.slideType] || m.slideType}</span>
                {m.sourceSection && <span className="text-muted-foreground">· {m.sourceSection}</span>}
                {m.mappingNotes && <span className="text-muted-foreground italic">({m.mappingNotes})</span>}
                <div className="ml-auto">
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-destructive hover:text-destructive"
                    onClick={() => onDeleteMapping?.(m.id)} title="Remove mapping">
                    <Unlink className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PillarSourceGroupProps {
  pillarName: string; pillarId: number | null; sources: any[]; mappings: any[];
  showMappings: boolean; onDelete: (id: number) => void; onEdit: (src: any) => void;
  onOpenMapping: (sourceId: number) => void; getGoogleUrl: (src: any) => string;
}

function PillarSourceGroup({ pillarName, sources, mappings, showMappings, onDelete, onEdit, onOpenMapping, getGoogleUrl }: PillarSourceGroupProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{pillarName}</h3>
        <Badge variant="outline" className="text-[10px]">{sources.length} source{sources.length !== 1 ? "s" : ""}</Badge>
      </div>
      <div className="grid gap-2 pl-6">
        {sources.map((src) => (
          <SourceCard key={src.id} source={src}
            mappings={mappings.filter((m) => m.dataSourceId === src.id)} showMappings={showMappings}
            onDelete={() => onDelete(src.id)} onEdit={() => onEdit(src)}
            onOpenMapping={() => onOpenMapping(src.id)} getGoogleUrl={getGoogleUrl}
          />
        ))}
      </div>
    </div>
  );
}

interface PillarDetailViewProps {
  pillarName: string; pillarId: number; sources: any[]; mappings: any[];
  mappingsBySource: Record<number, any[]>; onDelete: (id: number) => void;
  onEdit: (src: any) => void; onDeleteMapping: (id: number) => void;
  onOpenMapping: (sourceId: number) => void; getGoogleUrl: (src: any) => string;
}

function PillarDetailView({ pillarName, pillarId, sources, mappings, mappingsBySource, onDelete, onEdit, onDeleteMapping, onOpenMapping, getGoogleUrl }: PillarDetailViewProps) {
  const coveredSlides = useMemo(() => {
    const covered = new Set<string>();
    for (const m of mappings) covered.add(m.slideType);
    return covered;
  }, [mappings]);

  if (sources.length === 0) {
    return (
      <div className="space-y-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Database className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm text-muted-foreground mb-1">No sources configured for <span className="font-medium">{pillarName}</span>.</p>
            <p className="text-xs text-muted-foreground">Add data sources and link them to slide components.</p>
          </CardContent>
        </Card>
        <SlideCoverageMap coveredSlides={coveredSlides} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3">
        {sources.map((src) => (
          <SourceCard key={src.id} source={src}
            mappings={mappingsBySource[src.id] || []} showMappings={true}
            onDelete={() => onDelete(src.id)} onEdit={() => onEdit(src)}
            onDeleteMapping={onDeleteMapping} onOpenMapping={() => onOpenMapping(src.id)}
            getGoogleUrl={getGoogleUrl}
          />
        ))}
      </div>
      <SlideCoverageMap coveredSlides={coveredSlides} />
    </div>
  );
}

function SlideCoverageMap({ coveredSlides }: { coveredSlides: Set<string> }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2"><Settings2 className="h-4 w-4" />Slide Component Coverage</CardTitle>
        <CardDescription className="text-xs">Green = linked, gray = no source yet.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {MAPPABLE_SLIDE_TYPES.map((st) => {
            const linked = coveredSlides.has(st);
            return (
              <div key={st} className={`flex items-center gap-2 rounded-md border px-3 py-2 text-xs ${linked ? "border-green-500/30 bg-green-500/5 text-green-700 dark:text-green-400" : "border-border bg-muted/30 text-muted-foreground"}`}>
                <div className={`h-2 w-2 rounded-full shrink-0 ${linked ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                <span className="truncate">{SLIDE_TYPE_LABELS[st]}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
