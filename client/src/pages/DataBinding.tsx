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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Plus,
  ArrowRight,
  Settings2,
  Trash2,
  Link2,
  FileText,
  Presentation,
} from "lucide-react";

// ─── Slide sections per slide type ─────────────────────────────
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
  { value: "other", label: "Other" },
];

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
  transformNotes: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export default function DataBinding() {
  const [selectedPillarId, setSelectedPillarId] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editingBinding, setEditingBinding] = useState<FieldBinding | null>(null);

  // Form state
  const [sourceField, setSourceField] = useState("");
  const [sourceFieldType, setSourceFieldType] = useState("string");
  const [slideType, setSlideType] = useState("");
  const [slideSection, setSlideSection] = useState("");
  const [slideSectionType, setSlideSectionType] = useState("string");
  const [transformNotes, setTransformNotes] = useState("");
  const [selectedDataSourceId, setSelectedDataSourceId] = useState<string>("");

  // Queries
  const pillarsQuery = trpc.pillars.list.useQuery();
  const pillars = pillarsQuery.data ?? [];

  const numericPillarId = selectedPillarId !== "all" ? parseInt(selectedPillarId) : undefined;

  const bindingsQuery = trpc.fieldBindings.list.useQuery(
    { pillarConfigId: numericPillarId },
    { enabled: true }
  );
  const bindings = (bindingsQuery.data ?? []) as FieldBinding[];

  const dataSourcesQuery = trpc.dataSources.list.useQuery();
  const dataSources = dataSourcesQuery.data ?? [];

  // Mutations
  const utils = trpc.useUtils();
  const createBinding = trpc.fieldBindings.create.useMutation({
    onSuccess: () => {
      toast.success("Field binding created.");
      utils.fieldBindings.list.invalidate();
      resetForm();
      setAddDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const updateBinding = trpc.fieldBindings.update.useMutation({
    onSuccess: () => {
      toast.success("Field binding updated.");
      utils.fieldBindings.list.invalidate();
      resetForm();
      setConfigDialogOpen(false);
      setEditingBinding(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBinding = trpc.fieldBindings.delete.useMutation({
    onSuccess: () => {
      toast.success("Field binding deleted.");
      utils.fieldBindings.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetForm() {
    setSourceField("");
    setSourceFieldType("string");
    setSlideType("");
    setSlideSection("");
    setSlideSectionType("string");
    setTransformNotes("");
    setSelectedDataSourceId("");
  }

  function openAddDialog() {
    resetForm();
    setAddDialogOpen(true);
  }

  function openConfigDialog(binding: FieldBinding) {
    setEditingBinding(binding);
    setSourceField(binding.sourceField);
    setSourceFieldType(binding.sourceFieldType);
    setSlideType(binding.slideType);
    setSlideSection(binding.slideSection);
    setSlideSectionType(binding.slideSectionType);
    setTransformNotes(binding.transformNotes ?? "");
    setSelectedDataSourceId(binding.dataSourceId?.toString() ?? "");
    setConfigDialogOpen(true);
  }

  function handleCreate() {
    const pillarId = numericPillarId ?? (pillars.length > 0 ? pillars[0].id : undefined);
    if (!pillarId || !sourceField || !slideType || !slideSection) {
      toast.error("Please fill in all required fields.");
      return;
    }
    createBinding.mutate({
      pillarConfigId: pillarId,
      dataSourceId: selectedDataSourceId && selectedDataSourceId !== "none" ? parseInt(selectedDataSourceId) : undefined,
      sourceField,
      sourceFieldType: sourceFieldType as any,
      slideType: slideType as any,
      slideSection,
      slideSectionType: slideSectionType as any,
      syncDirection: "source_to_slide" as any,
      transformNotes: transformNotes || undefined,
    });
  }

  function handleUpdate() {
    if (!editingBinding) return;
    updateBinding.mutate({
      id: editingBinding.id,
      sourceField: sourceField || undefined,
      sourceFieldType: sourceFieldType as any,
      slideType: slideType as any,
      slideSection: slideSection || undefined,
      slideSectionType: slideSectionType as any,
      syncDirection: "source_to_slide" as any,
      transformNotes: transformNotes || undefined,
    });
  }

  // Available slide sections based on selected slide type
  const availableSections = slideType ? (SLIDE_SECTIONS[slideType]?.sections ?? []) : [];

  // When slide type changes, auto-set slideSectionType from the section definition
  function handleSlideSectionChange(val: string) {
    setSlideSection(val);
    const sec = availableSections.find((s) => s.value === val);
    if (sec) setSlideSectionType(sec.type);
  }

  // Group bindings by slide type for the table
  const groupedBindings = useMemo(() => {
    const groups: Record<string, FieldBinding[]> = {};
    for (const b of bindings) {
      if (!groups[b.slideType]) groups[b.slideType] = [];
      groups[b.slideType].push(b);
    }
    return groups;
  }, [bindings]);

  // Get data source name by id
  function getSourceName(dsId: number | null) {
    if (!dsId) return "—";
    const ds = dataSources.find((d) => d.id === dsId);
    return ds?.name ?? `Source #${dsId}`;
  }

  function getSlideLabel(type: string) {
    return SLIDE_SECTIONS[type]?.label ?? type;
  }

  function getSectionLabel(type: string, section: string) {
    const sec = SLIDE_SECTIONS[type]?.sections.find((s) => s.value === section);
    return sec?.label ?? section;
  }

  // ─── Binding Form (shared between Add and Configure dialogs) ──
  function BindingForm({ isEdit }: { isEdit: boolean }) {
    return (
      <div className="grid gap-4 py-2">
        {/* Pillar (if on All tab and adding) */}
        {!isEdit && selectedPillarId === "all" && pillars.length > 0 && (
          <div className="space-y-1.5">
            <Label>Pillar <span className="text-destructive">*</span></Label>
            <Select value={selectedPillarId === "all" ? "" : selectedPillarId} onValueChange={(v) => setSelectedPillarId(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select pillar..." />
              </SelectTrigger>
              <SelectContent>
                {pillars.map((p) => (
                  <SelectItem key={p.id} value={p.id.toString()}>
                    {p.pillarName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Data Source (optional) */}
        {!isEdit && (
          <div className="space-y-1.5">
            <Label>Data Source <span className="text-muted-foreground text-xs">(optional)</span></Label>
            <Select value={selectedDataSourceId} onValueChange={setSelectedDataSourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Link to a data source..." />
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
        )}

        {/* Two-column mapping: Source → Slide */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          {/* Source side */}
          <div className="rounded-lg border p-4 space-y-3 bg-blue-50/50 dark:bg-blue-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-blue-800 dark:text-blue-300">
              <FileText className="h-4 w-4" />
              Data Source
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Field / Section Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="e.g., Due Date, Summary..."
                  value={sourceField}
                  onChange={(e) => setSourceField(e.target.value)}
                />
              </div>
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
            </div>
          </div>

          {/* Arrow */}
          <div className="flex items-center justify-center pt-12">
            <ArrowRight className="h-6 w-6 text-emerald-600" />
          </div>

          {/* Slide side */}
          <div className="rounded-lg border p-4 space-y-3 bg-orange-50/50 dark:bg-orange-950/20">
            <div className="flex items-center gap-2 text-sm font-semibold text-orange-800 dark:text-orange-300">
              <Presentation className="h-4 w-4" />
              MBR Slide
            </div>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Slide <span className="text-destructive">*</span></Label>
                <Select value={slideType} onValueChange={(v) => { setSlideType(v); setSlideSection(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select slide..." />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(SLIDE_SECTIONS).map(([key, val]) => (
                      <SelectItem key={key} value={key}>{val.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Section / Field <span className="text-destructive">*</span></Label>
                <Select value={slideSection} onValueChange={handleSlideSectionChange} disabled={!slideType}>
                  <SelectTrigger>
                    <SelectValue placeholder={slideType ? "Select section..." : "Select slide first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSections.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                        <span className="text-muted-foreground ml-1 text-xs">({s.type})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Transform Notes */}
        <div className="space-y-1.5">
          <Label className="text-xs">Transform / Notes <span className="text-muted-foreground">(optional)</span></Label>
          <Input
            placeholder="e.g., Convert cents to dollars, format as MM/DD/YYYY..."
            value={transformNotes}
            onChange={(e) => setTransformNotes(e.target.value)}
          />
        </div>
      </div>
    );
  }

  // ─── Render ──────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Data Binding</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Map data source fields to MBR slide sections. Each binding defines how source data flows into the generated deck.
            </p>
          </div>
          <Button onClick={openAddDialog} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Binding
          </Button>
        </div>

        {/* Pillar Tabs */}
        <Tabs value={selectedPillarId} onValueChange={setSelectedPillarId}>
          <TabsList>
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-1.5 text-xs">{bindings.length}</Badge>
            </TabsTrigger>
            {pillars.map((p) => (
              <TabsTrigger key={p.id} value={p.id.toString()}>
                {p.pillarName.length > 20 ? p.pillarName.slice(0, 18) + "\u2026" : p.pillarName}
                <Badge variant="secondary" className="ml-1.5 text-xs">
                  {bindings.filter((b) => b.pillarConfigId === p.id).length}
                </Badge>
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={selectedPillarId} className="mt-4">
            {bindings.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Link2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
                  <h3 className="text-lg font-medium text-muted-foreground">No field bindings yet</h3>
                  <p className="text-sm text-muted-foreground/70 mt-1 max-w-md">
                    Create bindings to map data source fields to slide sections. Each binding defines how a source field populates a specific part of your MBR deck.
                  </p>
                  <Button onClick={openAddDialog} variant="outline" className="mt-4 gap-2">
                    <Plus className="h-4 w-4" /> Add First Binding
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedBindings).map(([slideTypeKey, slideBindings]) => (
                  <Card key={slideTypeKey}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-2">
                        <Presentation className="h-4 w-4 text-primary" />
                        <CardTitle className="text-base">{getSlideLabel(slideTypeKey)}</CardTitle>
                      </div>
                      <CardDescription className="text-xs">
                        {slideBindings.length} field {slideBindings.length === 1 ? "mapping" : "mappings"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead className="w-[25%] font-semibold">
                              <div className="flex items-center gap-1.5">
                                <FileText className="h-3.5 w-3.5" />
                                Data Source Field
                              </div>
                            </TableHead>
                            <TableHead className="w-[10%] text-center font-semibold">Type</TableHead>
                            <TableHead className="w-[5%] text-center font-semibold"></TableHead>
                            <TableHead className="w-[25%] font-semibold">
                              <div className="flex items-center gap-1.5">
                                <Presentation className="h-3.5 w-3.5" />
                                Slide Section
                              </div>
                            </TableHead>
                            <TableHead className="w-[10%] text-center font-semibold">Type</TableHead>
                            <TableHead className="w-[15%] font-semibold">Source</TableHead>
                            <TableHead className="w-[10%] text-right font-semibold">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {slideBindings.map((binding) => (
                            <TableRow key={binding.id} className="group">
                              <TableCell>
                                <div className="font-medium">{binding.sourceField}</div>
                                {binding.transformNotes && (
                                  <div className="text-xs text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                    {binding.transformNotes}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs font-normal">
                                  {binding.sourceFieldType}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center">
                                <ArrowRight className="h-4 w-4 text-emerald-600 mx-auto" />
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{getSectionLabel(binding.slideType, binding.slideSection)}</div>
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-xs font-normal">
                                  {binding.slideSectionType}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground truncate block max-w-[120px]">
                                  {getSourceName(binding.dataSourceId)}
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => openConfigDialog(binding)}
                                    title="Configure"
                                  >
                                    <Settings2 className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive hover:text-destructive"
                                    onClick={() => {
                                      if (confirm("Delete this field binding?")) {
                                        deleteBinding.mutate({ id: binding.id });
                                      }
                                    }}
                                    title="Delete"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* ─── Add Binding Dialog ─────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Add Field Binding</DialogTitle>
            <DialogDescription>
              Map a data source field to a specific section in an MBR slide. Data flows from source to slide.
            </DialogDescription>
          </DialogHeader>
          <BindingForm isEdit={false} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={createBinding.isPending || !sourceField || !slideType || !slideSection}
            >
              {createBinding.isPending ? "Creating..." : "Add Binding"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Configure Binding Dialog ───────────────────────────── */}
      <Dialog open={configDialogOpen} onOpenChange={(open) => { setConfigDialogOpen(open); if (!open) setEditingBinding(null); }}>
        <DialogContent className="sm:max-w-[680px]">
          <DialogHeader>
            <DialogTitle>Configure Field Binding</DialogTitle>
            <DialogDescription>
              Update the mapping between source field and slide section.
            </DialogDescription>
          </DialogHeader>
          <BindingForm isEdit={true} />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setConfigDialogOpen(false); setEditingBinding(null); }}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateBinding.isPending}>
              {updateBinding.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
