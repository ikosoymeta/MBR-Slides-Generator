import { useState, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ArrowRight,
  Check,
  X,
  Link2,
  FileText,
  Presentation,
  Settings2,
  Ban,
  CircleDashed,
  ChevronDown,
  ChevronRight,
  PlusCircle,
  Loader2,
} from "lucide-react";

// ─── All template slide sections ─────────────────────────────
const SLIDE_SECTIONS: Record<string, { label: string; sections: { value: string; label: string; type: string }[] }> = {
  title: {
    label: "Title Slide",
    sections: [
      { value: "pillar_name", label: "Pillar Name", type: "string" },
      { value: "month_year", label: "Month & Year", type: "string" },
      { value: "subtitle", label: "Subtitle", type: "string" },
    ],
  },
  agenda: {
    label: "Agenda",
    sections: [
      { value: "agenda_items", label: "Agenda Items", type: "string" },
    ],
  },
  exclusions: {
    label: "Template Exclusions",
    sections: [
      { value: "exclusion_notes", label: "Exclusion Notes", type: "string" },
    ],
  },
  executive_summary: {
    label: "Executive Summary",
    sections: [
      { value: "business_outcome", label: "Business Outcome & Goal", type: "string" },
      { value: "progress_updates", label: "Progress Updates", type: "string" },
      { value: "blockers_risks", label: "Blockers & Risks", type: "string" },
      { value: "leadership_asks", label: "Leadership Asks", type: "string" },
    ],
  },
  initiatives_goals: {
    label: "Initiatives & Goals",
    sections: [
      { value: "initiative_name", label: "Initiative Name", type: "string" },
      { value: "business_outcome", label: "Business Outcome", type: "string" },
      { value: "target", label: "Target", type: "string" },
      { value: "progress_vs_target", label: "Progress vs Target", type: "string" },
      { value: "kpi_target", label: "KPI Target", type: "string" },
      { value: "value_vs_target", label: "Value vs Target", type: "string" },
    ],
  },
  initiative_deep_dive: {
    label: "Initiative Deep Dive",
    sections: [
      { value: "initiative_name", label: "Initiative Name", type: "string" },
      { value: "business_outcome", label: "Business Outcome & Goal", type: "string" },
      { value: "progress_updates", label: "Progress Updates", type: "string" },
      { value: "blockers_risks", label: "Blockers & Risks", type: "string" },
      { value: "leadership_asks", label: "Leadership Asks", type: "string" },
    ],
  },
  launch_schedule: {
    label: "Launch Schedule",
    sections: [
      { value: "q1_milestones", label: "Q1 Milestones", type: "date" },
      { value: "q2_milestones", label: "Q2 Milestones", type: "date" },
      { value: "q3_milestones", label: "Q3 Milestones", type: "date" },
      { value: "q4_milestones", label: "Q4 Milestones", type: "date" },
    ],
  },
  key_dates: {
    label: "Key Dates & Milestones",
    sections: [
      { value: "q1_dates", label: "Q1 Key Dates", type: "date" },
      { value: "q2_dates", label: "Q2 Key Dates", type: "date" },
      { value: "q3_dates", label: "Q3 Key Dates", type: "date" },
      { value: "q4_dates", label: "Q4 Key Dates", type: "date" },
    ],
  },
  budget_update: {
    label: "Budget Update",
    sections: [
      { value: "total_budget", label: "Total Budget", type: "currency" },
      { value: "spend_ytd", label: "Spend YTD", type: "currency" },
      { value: "forecast", label: "Forecast", type: "currency" },
      { value: "variance", label: "Variance", type: "currency" },
      { value: "commentary", label: "Commentary", type: "string" },
      { value: "budget_chart", label: "Budget Chart Data", type: "graph_aggregator" },
    ],
  },
  budget_reforecast: {
    label: "Budget Reforecast",
    sections: [
      { value: "original_budget", label: "Original Budget", type: "currency" },
      { value: "reforecast_amount", label: "Reforecast Amount", type: "currency" },
      { value: "delta", label: "Delta", type: "currency" },
      { value: "justification", label: "Justification", type: "string" },
    ],
  },
  te: {
    label: "T&E",
    sections: [
      { value: "te_budget", label: "T&E Budget", type: "currency" },
      { value: "te_spend", label: "T&E Spend", type: "currency" },
      { value: "te_forecast", label: "T&E Forecast", type: "currency" },
      { value: "te_variance", label: "T&E Variance", type: "currency" },
    ],
  },
  budget_detail: {
    label: "Budget Detail Table",
    sections: [
      { value: "team_name", label: "Team Name", type: "string" },
      { value: "project_name", label: "Project Name", type: "string" },
      { value: "budget_amount", label: "Budget Amount", type: "currency" },
      { value: "spend_amount", label: "Spend Amount", type: "currency" },
      { value: "payment_amount", label: "Payment Amount", type: "currency" },
      { value: "milestone_status", label: "Milestone Status", type: "picklist" },
      { value: "delivery_date", label: "Delivery Date", type: "date" },
    ],
  },
  appendix_header: {
    label: "Appendix",
    sections: [
      { value: "appendix_title", label: "Appendix Title", type: "string" },
    ],
  },
  appendix_content: {
    label: "Appendix Content",
    sections: [
      { value: "content_body", label: "Content Body", type: "string" },
      { value: "supporting_data", label: "Supporting Data", type: "string" },
    ],
  },
  end_frame: {
    label: "End Frame",
    sections: [
      { value: "closing_text", label: "Closing Text", type: "string" },
    ],
  },
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

// Flatten all sections into a single list for the matrix
function getAllSections() {
  const result: { slideType: string; slideLabel: string; sectionValue: string; sectionLabel: string; sectionType: string }[] = [];
  for (const [slideType, slide] of Object.entries(SLIDE_SECTIONS)) {
    for (const sec of slide.sections) {
      result.push({
        slideType,
        slideLabel: slide.label,
        sectionValue: sec.value,
        sectionLabel: sec.label,
        sectionType: sec.type,
      });
    }
  }
  return result;
}

const ALL_SECTIONS = getAllSections();

type FieldBinding = {
  id: number;
  pillarConfigId: number;
  dataSourceId: number | null;
  sourceField: string;
  sourceFieldType: string;
  slideType: string;
  slideSection: string;
  slideSectionType: string;
  syncDirection: string;
  bindingStatus?: string;
  transformNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function DataBinding() {
  const [selectedPillarId, setSelectedPillarId] = useState<string>("all");
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [editingSection, setEditingSection] = useState<{ slideType: string; sectionValue: string; sectionLabel: string; sectionType: string } | null>(null);
  const [editingExistingBinding, setEditingExistingBinding] = useState<FieldBinding | null>(null);
  const [expandedSlides, setExpandedSlides] = useState<Set<string>>(new Set(Object.keys(SLIDE_SECTIONS)));

  // Form state
  const [sourceField, setSourceField] = useState("");
  const [sourceFieldType, setSourceFieldType] = useState("string");
  const [transformNotes, setTransformNotes] = useState("");
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");

  // Add New Pillar state
  const [newPillarDialogOpen, setNewPillarDialogOpen] = useState(false);
  const [newPillarName, setNewPillarName] = useState("");

  // Queries
  const pillarsQuery = trpc.pillars.list.useQuery();
  const pillars = pillarsQuery.data ?? [];
  const utils = trpc.useUtils();

  const createPillarMutation = trpc.pillars.upsert.useMutation({
    onSuccess: (created: any) => {
      utils.pillars.list.invalidate();
      setNewPillarDialogOpen(false);
      setNewPillarName("");
      toast.success(`Pillar "${newPillarName}" created.`);
      if (created?.id) setSelectedPillarId(String(created.id));
    },
    onError: (err: any) => toast.error(err.message),
  });

  const numericPillarId = selectedPillarId !== "all" ? parseInt(selectedPillarId) : undefined;

  const bindingsQuery = trpc.fieldBindings.list.useQuery(
    { pillarConfigId: numericPillarId },
    { enabled: true }
  );
  const bindings = (bindingsQuery.data ?? []) as FieldBinding[];

  const dataSourcesQuery = trpc.dataSources.list.useQuery();
  const dataSources = dataSourcesQuery.data ?? [];

  // Mutations
  const upsertBinding = trpc.fieldBindings.upsert.useMutation({
    onSuccess: () => {
      toast.success("Binding saved.");
      utils.fieldBindings.list.invalidate();
      setConnectDialogOpen(false);
      setEditingSection(null);
      setEditingExistingBinding(null);
      resetForm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBinding = trpc.fieldBindings.update.useMutation({
    onSuccess: () => {
      toast.success("Binding updated.");
      utils.fieldBindings.list.invalidate();
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

  function resetForm() {
    setSourceField("");
    setSourceFieldType("string");
    setTransformNotes("");
    setSelectedDataSourceId("");
  }

  // Build a lookup: slideType+sectionValue -> binding
  const bindingMap = useMemo(() => {
    const map = new Map<string, FieldBinding>();
    for (const b of bindings) {
      map.set(`${b.slideType}::${b.slideSection}`, b);
    }
    return map;
  }, [bindings]);

  function getBinding(slideType: string, sectionValue: string): FieldBinding | undefined {
    return bindingMap.get(`${slideType}::${sectionValue}`);
  }

  function getStatus(slideType: string, sectionValue: string): "connected" | "not_required" | "unbound" {
    const b = getBinding(slideType, sectionValue);
    if (!b) return "unbound";
    return (b.bindingStatus as any) ?? "connected";
  }

  function getSourceName(dsId: number | null) {
    if (!dsId) return null;
    const ds = dataSources.find((d) => d.id === dsId);
    return ds?.name ?? `Source #${dsId}`;
  }

  // Coverage stats
  const stats = useMemo(() => {
    let connected = 0, notRequired = 0, unbound = 0;
    for (const sec of ALL_SECTIONS) {
      const status = getStatus(sec.slideType, sec.sectionValue);
      if (status === "connected") connected++;
      else if (status === "not_required") notRequired++;
      else unbound++;
    }
    return { connected, notRequired, unbound, total: ALL_SECTIONS.length };
  }, [bindings]);

  // Open connect dialog for a section
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
      resetForm();
    }
    setConnectDialogOpen(true);
  }

  // Save connect
  function handleSaveConnect() {
    if (!editingSection) return;
    const pillarId = numericPillarId ?? (pillars.length > 0 ? pillars[0].id : undefined);
    if (!pillarId) {
      toast.error("Please select a pillar first.");
      return;
    }
    if (!sourceField.trim()) {
      toast.error("Please enter a source field name.");
      return;
    }
    upsertBinding.mutate({
      pillarConfigId: pillarId,
      slideType: editingSection.slideType as any,
      slideSection: editingSection.sectionValue,
      bindingStatus: "connected",
      sourceField: sourceField.trim(),
      sourceFieldType: sourceFieldType as any,
      slideSectionType: editingSection.sectionType as any,
      dataSourceId: selectedDataSourceId && selectedDataSourceId !== "none" ? parseInt(selectedDataSourceId) : null,
      transformNotes: transformNotes || undefined,
    });
  }

  // Mark as not required
  function markNotRequired(slideType: string, sectionValue: string) {
    const pillarId = numericPillarId ?? (pillars.length > 0 ? pillars[0].id : undefined);
    if (!pillarId) {
      toast.error("Please select a pillar first.");
      return;
    }
    upsertBinding.mutate({
      pillarConfigId: pillarId,
      slideType: slideType as any,
      slideSection: sectionValue,
      bindingStatus: "not_required",
      sourceField: "—",
      slideSectionType: "string" as any,
    });
  }

  // Clear binding (reset to unbound)
  function clearBinding(slideType: string, sectionValue: string) {
    const existing = getBinding(slideType, sectionValue);
    if (existing) {
      deleteBinding.mutate({ id: existing.id });
    }
  }

  // Toggle slide expansion
  function toggleSlide(slideType: string) {
    setExpandedSlides((prev) => {
      const next = new Set(prev);
      if (next.has(slideType)) next.delete(slideType);
      else next.add(slideType);
      return next;
    });
  }

  // Count per slide
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

  // Status badge
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

  // Pillar required check
  const hasPillar = selectedPillarId !== "all" || pillars.length > 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Data Binding</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Connect each MBR template section to a data source field, or mark it as not required. All template sections are shown below.
          </p>
        </div>

        {/* Coverage Summary */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Sections</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-emerald-600">{stats.connected}</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-gray-400">{stats.notRequired}</div>
            <div className="text-xs text-muted-foreground">Not Required</div>
          </Card>
          <Card className="p-4">
            <div className="text-2xl font-bold text-amber-600">{stats.unbound}</div>
            <div className="text-xs text-muted-foreground">Unbound</div>
          </Card>
        </div>

        {/* Pillar Tabs */}
        <Tabs value={selectedPillarId} onValueChange={setSelectedPillarId}>
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="all">All Pillars</TabsTrigger>
              {pillars.map((p) => (
                <TabsTrigger key={p.id} value={p.id.toString()}>
                  {p.pillarName.length > 22 ? p.pillarName.slice(0, 20) + "\u2026" : p.pillarName}
                </TabsTrigger>
              ))}
            </TabsList>
            <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => setNewPillarDialogOpen(true)}>
              <PlusCircle className="h-3.5 w-3.5" /> Add Pillar
            </Button>
          </div>

          <TabsContent value={selectedPillarId} className="mt-4">
            {selectedPillarId === "all" && pillars.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Link2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No pillars configured</h3>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
                    Create a pillar first in the Pillars page, then come back to set up data bindings.
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
                      {/* Slide header - collapsible */}
                      <button
                        className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-muted/30 transition-colors"
                        onClick={() => toggleSlide(slideType)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <Presentation className="h-4 w-4 text-primary shrink-0" />
                        <span className="font-semibold text-sm">{slide.label}</span>
                        <span className="text-xs text-muted-foreground ml-1">
                          ({slide.sections.length} {slide.sections.length === 1 ? "section" : "sections"})
                        </span>
                        <div className="ml-auto flex items-center gap-2">
                          {ss.connected > 0 && (
                            <span className="text-xs text-emerald-600 font-medium">{ss.connected} connected</span>
                          )}
                          {ss.notRequired > 0 && (
                            <span className="text-xs text-gray-400 font-medium">{ss.notRequired} skipped</span>
                          )}
                          {ss.unbound > 0 && (
                            <span className="text-xs text-amber-600 font-medium">{ss.unbound} unbound</span>
                          )}
                        </div>
                      </button>

                      {/* Section rows */}
                      {isExpanded && (
                        <div className="border-t">
                          {slide.sections.map((sec, idx) => {
                            const status = getStatus(slideType, sec.value);
                            const binding = getBinding(slideType, sec.value);
                            return (
                              <div
                                key={sec.value}
                                className={`flex items-center gap-3 px-5 py-3 ${idx < slide.sections.length - 1 ? "border-b" : ""} ${
                                  status === "connected"
                                    ? "bg-emerald-50/40 dark:bg-emerald-950/10"
                                    : status === "not_required"
                                    ? "bg-gray-50/60 dark:bg-gray-900/20"
                                    : "bg-amber-50/30 dark:bg-amber-950/10"
                                }`}
                              >
                                {/* Slide section info */}
                                <div className="flex items-center gap-2 min-w-[220px]">
                                  <Presentation className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                  <div>
                                    <div className="text-sm font-medium">{sec.label}</div>
                                    <div className="text-xs text-muted-foreground">Type: {sec.type}</div>
                                  </div>
                                </div>

                                {/* Status badge */}
                                <div className="min-w-[120px]">
                                  <StatusBadge status={status} />
                                </div>

                                {/* Connected source info */}
                                <div className="flex-1 min-w-0">
                                  {status === "connected" && binding ? (
                                    <div className="flex items-center gap-2">
                                      <ArrowRight className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                      <div className="min-w-0">
                                        <div className="text-sm font-medium truncate flex items-center gap-1.5">
                                          <FileText className="h-3 w-3 text-blue-500 shrink-0" />
                                          {binding.sourceField}
                                          <Badge variant="outline" className="text-[10px] font-normal ml-1">
                                            {binding.sourceFieldType}
                                          </Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate">
                                          {getSourceName(binding.dataSourceId) && (
                                            <span>Source: {getSourceName(binding.dataSourceId)}</span>
                                          )}
                                          {binding.transformNotes && (
                                            <span className="ml-2 italic">{binding.transformNotes}</span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ) : status === "not_required" ? (
                                    <span className="text-xs text-muted-foreground italic">Skipped — not needed for this pillar</span>
                                  ) : (
                                    <span className="text-xs text-amber-600 italic">No source connected yet</span>
                                  )}
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1 shrink-0">
                                  {status === "connected" ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => openConnect(slideType, sec.value, sec.label, sec.type)}
                                      >
                                        <Settings2 className="h-3 w-3" /> Edit
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                                        onClick={() => clearBinding(slideType, sec.value)}
                                      >
                                        <X className="h-3 w-3" /> Clear
                                      </Button>
                                    </>
                                  ) : status === "not_required" ? (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => openConnect(slideType, sec.value, sec.label, sec.type)}
                                      >
                                        <Link2 className="h-3 w-3" /> Connect
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-destructive hover:text-destructive gap-1"
                                        onClick={() => clearBinding(slideType, sec.value)}
                                      >
                                        <X className="h-3 w-3" /> Clear
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1"
                                        onClick={() => openConnect(slideType, sec.value, sec.label, sec.type)}
                                      >
                                        <Link2 className="h-3 w-3" /> Connect
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 text-xs text-muted-foreground gap-1"
                                        onClick={() => markNotRequired(slideType, sec.value)}
                                      >
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
      </div>

      {/* ─── Connect / Edit Binding Dialog ─────────────────────────── */}
      <Dialog open={connectDialogOpen} onOpenChange={(open) => { setConnectDialogOpen(open); if (!open) { setEditingSection(null); setEditingExistingBinding(null); } }}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>
              {editingExistingBinding ? "Edit Binding" : "Connect Source Field"}
            </DialogTitle>
            <DialogDescription>
              {editingSection && (
                <>
                  Map a data source field to <strong>{editingSection.sectionLabel}</strong> in the{" "}
                  <strong>{SLIDE_SECTIONS[editingSection.slideType]?.label}</strong> slide.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            {/* Target section (read-only display) */}
            <div className="rounded-lg border p-3 bg-orange-50/50 dark:bg-orange-950/20">
              <div className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-300 mb-1">
                <Presentation className="h-4 w-4" />
                MBR Slide Target
              </div>
              <div className="text-sm">
                <span className="font-medium">{SLIDE_SECTIONS[editingSection?.slideType ?? ""]?.label}</span>
                {" → "}
                <span className="font-medium">{editingSection?.sectionLabel}</span>
                <Badge variant="outline" className="ml-2 text-[10px]">{editingSection?.sectionType}</Badge>
              </div>
            </div>

            {/* Source field input */}
            <div className="rounded-lg border p-3 bg-blue-50/50 dark:bg-blue-950/20 space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
                <FileText className="h-4 w-4" />
                Data Source Field
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Field / Section Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g., Due Date, Summary, Payment Amount..."
                  value={sourceField}
                  onChange={(e) => setSourceField(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Field Type</Label>
                  <Select value={sourceFieldType} onValueChange={setSourceFieldType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Optional..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific source</SelectItem>
                      {dataSources.map((ds) => (
                        <SelectItem key={ds.id} value={ds.id.toString()}>
                          {ds.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Transform / Notes <span className="text-muted-foreground">(optional)</span></Label>
                <Input
                  placeholder="e.g., Sum all rows, format as currency..."
                  value={transformNotes}
                  onChange={(e) => setTransformNotes(e.target.value)}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setConnectDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveConnect}
              disabled={upsertBinding.isPending || !sourceField.trim()}
            >
              {upsertBinding.isPending ? "Saving..." : editingExistingBinding ? "Save Changes" : "Connect"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ─── Add New Pillar Dialog ──────────────────────────── */}
      <Dialog open={newPillarDialogOpen} onOpenChange={setNewPillarDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add New Pillar</DialogTitle>
            <DialogDescription>Create a new pillar to organize your data bindings.</DialogDescription>
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
    </DashboardLayout>
  );
}
