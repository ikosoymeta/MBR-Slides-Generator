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

  // Pillar tab selection — default to first pillar
  const [selectedPillarId, setSelectedPillarId] = useState<string>("");

  // Auto-select first pillar when loaded
  const effectivePillarId = useMemo(() => {
    if (selectedPillarId && pillars?.some(p => String(p.id) === selectedPillarId)) return selectedPillarId;
    if (pillars && pillars.length > 0) return String(pillars[0].id);
    return "";
  }, [selectedPillarId, pillars]);

  const numericPillarId = effectivePillarId ? Number(effectivePillarId) : null;

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

  // Expanded sources (to show bindings)
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());

  // Inline binding edit state: sourceId -> editing state
  const [editingBindings, setEditingBindings] = useState<Map<number, Map<string, { sourceField: string; sourceFieldType: string; transformNotes: string }>>>(new Map());

  // Add New Pillar state
  const [newPillarDialogOpen, setNewPillarDialogOpen] = useState(false);
  const [newPillarName, setNewPillarName] = useState("");

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

  // Binding mutations
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

  // Binding map: key = "slideType::sectionValue"
  const bindingMap = useMemo(() => {
    const map = new Map<string, FieldBinding>();
    for (const b of bindings) map.set(`${b.slideType}::${b.slideSection}`, b);
    return map;
  }, [bindings]);

  // Bindings grouped by dataSourceId
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

  // Binding stats for the current pillar
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
        // Clear any editing state for this source
        setEditingBindings(prev => {
          const next = new Map(prev);
          next.delete(sourceId);
          return next;
        });
      } else {
        next.add(sourceId);
      }
      return next;
    });
  }

  // ─── Inline binding edit helpers ─────────────────────────────
  function startEditBinding(sourceId: number, slideType: string, sectionValue: string, existing?: FieldBinding) {
    setEditingBindings(prev => {
      const next = new Map(prev);
      const sourceEdits = new Map(next.get(sourceId) || new Map());
      const key = `${slideType}::${sectionValue}`;
      sourceEdits.set(key, {
        sourceField: existing?.sourceField && existing.sourceField !== "—" ? existing.sourceField : "",
        sourceFieldType: existing?.sourceFieldType || "string",
        transformNotes: existing?.transformNotes || "",
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

  function updateEditBinding(sourceId: number, slideType: string, sectionValue: string, field: string, value: string) {
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
    if (!editState.sourceField.trim()) { toast.error("Source field name is required."); return; }
    upsertBinding.mutate({
      pillarConfigId: numericPillarId,
      slideType: slideType as any,
      slideSection: sectionValue,
      bindingStatus: "connected",
      sourceField: editState.sourceField.trim(),
      sourceFieldType: editState.sourceFieldType as any,
      slideSectionType: sectionType as any,
      dataSourceId: sourceId,
      transformNotes: editState.transformNotes || undefined,
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
      sourceField: "—",
      slideSectionType: "string" as any,
      dataSourceId: sourceId,
    }, {
      onSuccess: () => toast.success("Marked as not required."),
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

  // Inactivity timeout for edit dialogs
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
              <div className="text-xs text-muted-foreground">Not Required</div>
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
                                  <p className="text-sm font-medium truncate text-foreground">{src.name}</p>
                                  <Badge variant="secondary" className="text-[10px] shrink-0">{CATEGORY_LABELS[src.category] || src.category}</Badge>
                                  <Badge variant="outline" className="text-[10px] shrink-0">{SOURCE_TYPE_LABELS[src.sourceType] || src.sourceType}</Badge>
                                  {sourceBindingCount > 0 && (
                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px] shrink-0">
                                      {sourceBindingCount} binding{sourceBindingCount !== 1 ? "s" : ""}
                                    </Badge>
                                  )}
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
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit source" onClick={() => openEditDialog(src)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(getGoogleUrl(src), "_blank")} title="Open in Google">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={() => deleteSourceMutation.mutate({ id: src.id })} title="Delete source">
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                            {src.description && <p className="text-xs text-muted-foreground pl-12 mt-1">{src.description}</p>}

                            {/* Expand/collapse bindings button */}
                            <button
                              className="flex items-center gap-1.5 mt-3 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
                              onClick={() => toggleSource(src.id)}
                            >
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                              <Link2 className="h-3.5 w-3.5" />
                              Source Bindings
                              {sourceBindingCount > 0 && (
                                <span className="text-muted-foreground font-normal">({sourceBindingCount} connected)</span>
                              )}
                            </button>
                          </div>

                          {/* Expanded bindings section */}
                          {isExpanded && (
                            <div className="border-t bg-muted/20">
                              <div className="px-4 py-3">
                                <p className="text-xs text-muted-foreground mb-3">
                                  Map fields from this source to MBR slide sections. Each section can be connected, marked as not required, or left unbound.
                                </p>
                                <div className="space-y-2">
                                  {Object.entries(SLIDE_SECTIONS).map(([slideType, slide]) => {
                                    // Check if any section in this slide has a binding from this source
                                    const slideSectionBindings = slide.sections.map(sec => {
                                      const b = bindingMap.get(`${slideType}::${sec.value}`);
                                      return { sec, binding: b, isThisSource: b?.dataSourceId === src.id };
                                    });
                                    const hasBindingsFromThisSource = slideSectionBindings.some(s => s.isThisSource);
                                    const hasAnyBinding = slideSectionBindings.some(s => s.binding);

                                    return (
                                      <div key={slideType} className="rounded-lg border bg-background">
                                        <div className="px-3 py-2 flex items-center gap-2 text-xs">
                                          <Presentation className="h-3.5 w-3.5 text-primary shrink-0" />
                                          <span className="font-semibold">{slide.label}</span>
                                          <span className="text-muted-foreground">({slide.sections.length} sections)</span>
                                          {hasBindingsFromThisSource && (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[9px] ml-auto">
                                              {slideSectionBindings.filter(s => s.isThisSource && s.binding?.bindingStatus === "connected").length} from this source
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="border-t">
                                          {slide.sections.map((sec, idx) => {
                                            const binding = bindingMap.get(`${slideType}::${sec.value}`);
                                            const isThisSource = binding?.dataSourceId === src.id;
                                            const status: "connected" | "not_required" | "unbound" =
                                              !binding ? "unbound" :
                                              (binding.bindingStatus as any) === "not_required" ? "not_required" : "connected";
                                            const editState = getEditState(src.id, slideType, sec.value);
                                            const isEditing = !!editState;

                                            return (
                                              <div key={sec.value} className={`flex items-center gap-3 px-3 py-2.5 ${idx < slide.sections.length - 1 ? "border-b" : ""} ${
                                                isEditing ? "bg-blue-50/50 dark:bg-blue-950/20" :
                                                isThisSource && status === "connected" ? "bg-emerald-50/30 dark:bg-emerald-950/10" :
                                                status === "not_required" && isThisSource ? "bg-gray-50/50 dark:bg-gray-900/10" :
                                                ""
                                              }`}>
                                                {isEditing ? (
                                                  /* ─── Inline Edit Mode ─── */
                                                  <div className="flex-1 space-y-2">
                                                    <div className="flex items-center gap-2">
                                                      <span className="text-xs font-medium text-foreground">{sec.label}</span>
                                                      <Badge variant="outline" className="text-[9px]">{sec.type}</Badge>
                                                    </div>
                                                    <div className="grid grid-cols-3 gap-2">
                                                      <div>
                                                        <Label className="text-[10px] text-muted-foreground">Source Field *</Label>
                                                        <Input
                                                          className="h-7 text-xs"
                                                          placeholder="e.g., Budget Amount"
                                                          value={editState.sourceField}
                                                          onChange={(e) => updateEditBinding(src.id, slideType, sec.value, "sourceField", e.target.value)}
                                                          autoFocus
                                                        />
                                                      </div>
                                                      <div>
                                                        <Label className="text-[10px] text-muted-foreground">Field Type</Label>
                                                        <Select value={editState.sourceFieldType} onValueChange={(v) => updateEditBinding(src.id, slideType, sec.value, "sourceFieldType", v)}>
                                                          <SelectTrigger className="h-7 text-xs"><SelectValue /></SelectTrigger>
                                                          <SelectContent>
                                                            {SOURCE_FIELD_TYPES.map(t => (
                                                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                                            ))}
                                                          </SelectContent>
                                                        </Select>
                                                      </div>
                                                      <div>
                                                        <Label className="text-[10px] text-muted-foreground">Notes</Label>
                                                        <Input
                                                          className="h-7 text-xs"
                                                          placeholder="Transform notes..."
                                                          value={editState.transformNotes}
                                                          onChange={(e) => updateEditBinding(src.id, slideType, sec.value, "transformNotes", e.target.value)}
                                                        />
                                                      </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 pt-1">
                                                      <Button size="sm" className="h-6 text-xs gap-1 px-2.5" onClick={() => saveBinding(src.id, slideType, sec.value, sec.type)} disabled={upsertBinding.isPending}>
                                                        <Save className="h-3 w-3" /> Save
                                                      </Button>
                                                      <Button variant="outline" size="sm" className="h-6 text-xs gap-1 px-2.5" onClick={() => cancelEditBinding(src.id, slideType, sec.value)}>
                                                        <X className="h-3 w-3" /> Cancel
                                                      </Button>
                                                    </div>
                                                  </div>
                                                ) : (
                                                  /* ─── View Mode ─── */
                                                  <>
                                                    <div className="min-w-[160px]">
                                                      <div className="text-xs font-medium text-foreground">{sec.label}</div>
                                                      <div className="text-[10px] text-muted-foreground">Type: {sec.type}</div>
                                                    </div>
                                                    <div className="min-w-[90px]">
                                                      <StatusBadge status={isThisSource ? status : (binding ? "connected" : "unbound")} />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      {isThisSource && status === "connected" && binding ? (
                                                        <div className="flex items-center gap-1.5">
                                                          <ArrowRight className="h-3 w-3 text-emerald-500 shrink-0" />
                                                          <span className="text-xs font-medium truncate">{binding.sourceField}</span>
                                                          <Badge variant="outline" className="text-[9px]">{binding.sourceFieldType}</Badge>
                                                          {binding.transformNotes && <span className="text-[10px] text-muted-foreground italic truncate">{binding.transformNotes}</span>}
                                                        </div>
                                                      ) : isThisSource && status === "not_required" ? (
                                                        <span className="text-[10px] text-muted-foreground italic">Skipped — not needed</span>
                                                      ) : binding && !isThisSource ? (
                                                        <span className="text-[10px] text-muted-foreground italic">
                                                          Bound to: {getSourceName(binding.dataSourceId) || "another source"}
                                                        </span>
                                                      ) : (
                                                        <span className="text-[10px] text-amber-600 italic">No source connected</span>
                                                      )}
                                                    </div>
                                                    <div className="flex items-center gap-1 shrink-0">
                                                      {isThisSource && status === "connected" ? (
                                                        <>
                                                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5 px-1.5" onClick={() => startEditBinding(src.id, slideType, sec.value, binding)}>
                                                            <Pencil className="h-3 w-3" /> Edit
                                                          </Button>
                                                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive gap-0.5 px-1.5" onClick={() => clearBinding(slideType, sec.value)}>
                                                            <X className="h-3 w-3" /> Clear
                                                          </Button>
                                                        </>
                                                      ) : isThisSource && status === "not_required" ? (
                                                        <>
                                                          <Button variant="ghost" size="sm" className="h-6 text-[10px] gap-0.5 px-1.5" onClick={() => startEditBinding(src.id, slideType, sec.value)}>
                                                            <Link2 className="h-3 w-3" /> Connect
                                                          </Button>
                                                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-destructive hover:text-destructive gap-0.5 px-1.5" onClick={() => clearBinding(slideType, sec.value)}>
                                                            <X className="h-3 w-3" /> Clear
                                                          </Button>
                                                        </>
                                                      ) : !binding ? (
                                                        <>
                                                          <Button variant="outline" size="sm" className="h-6 text-[10px] gap-0.5 px-1.5" onClick={() => startEditBinding(src.id, slideType, sec.value)}>
                                                            <Link2 className="h-3 w-3" /> Connect
                                                          </Button>
                                                          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground gap-0.5 px-1.5" onClick={() => markNotRequired(slideType, sec.value, src.id)}>
                                                            <Ban className="h-3 w-3" /> Skip
                                                          </Button>
                                                        </>
                                                      ) : (
                                                        <span className="text-[10px] text-muted-foreground italic">Other source</span>
                                                      )}
                                                    </div>
                                                  </>
                                                )}
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
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

// ─── Sub-components ─────────────────────────────────────────────

function StatusBadge({ status }: { status: "connected" | "not_required" | "unbound" }) {
  if (status === "connected") {
    return (
      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 font-normal text-[10px]">
        <Check className="h-3 w-3" /> Connected
      </Badge>
    );
  }
  if (status === "not_required") {
    return (
      <Badge className="bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700 gap-1 font-normal text-[10px]">
        <Ban className="h-3 w-3" /> Not Required
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800 gap-1 font-normal text-[10px]">
      <CircleDashed className="h-3 w-3" /> Unbound
    </Badge>
  );
}
