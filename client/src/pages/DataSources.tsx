import DashboardLayout from "@/components/DashboardLayout";
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

// ─── Component ──────────────────────────────────────────────────

export default function DataSources() {
  const utils = trpc.useUtils();
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery();
  const { data: allSources, isLoading: sourcesLoading } = trpc.dataSources.list.useQuery();

  const [selectedPillarId, setSelectedPillarId] = useState<string>("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<any>(null);
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [mappingSourceId, setMappingSourceId] = useState<number | null>(null);
  const [mappingPillarId, setMappingPillarId] = useState<number | null>(null);

  // ─── Add Source form state ─────────────────────────────────
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<string>("google_sheet");
  const [googleUrl, setGoogleUrl] = useState("");
  const [sheetTab, setSheetTab] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");
  const [addToPillarId, setAddToPillarId] = useState<string>("");

  // ─── Edit Source form state ────────────────────────────────
  const [editName, setEditName] = useState("");
  const [editSourceType, setEditSourceType] = useState<string>("google_sheet");
  const [editGoogleUrl, setEditGoogleUrl] = useState("");
  const [editSheetTab, setEditSheetTab] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editCategory, setEditCategory] = useState<string>("other");
  const [editPillarId, setEditPillarId] = useState<string>("");

  // ─── Mapping form state ────────────────────────────────────
  const [mappingSlideType, setMappingSlideType] = useState<string>("");
  const [mappingSection, setMappingSection] = useState("");
  const [mappingNotes, setMappingNotes] = useState("");

  // ─── Queries for selected pillar ───────────────────────────
  const numericPillarId = selectedPillarId !== "all" ? Number(selectedPillarId) : null;
  const { data: pillarMappings } = trpc.slideMappings.listByPillar.useQuery(
    { pillarConfigId: numericPillarId! },
    { enabled: numericPillarId !== null }
  );

  // ─── Mutations ─────────────────────────────────────────────
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

  // ─── Derived data ──────────────────────────────────────────
  const sourcesByPillar = useMemo(() => {
    if (!allSources) return {};
    const grouped: Record<string, typeof allSources> = { unassigned: [] };
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

  // ─── Helpers ───────────────────────────────────────────────
  function resetAddForm() {
    setName(""); setSourceType("google_sheet"); setGoogleUrl(""); setSheetTab("");
    setDescription(""); setCategory("other"); setAddToPillarId("");
  }

  function resetMappingForm() {
    setMappingSlideType(""); setMappingSection(""); setMappingNotes("");
    setMappingSourceId(null); setMappingPillarId(null);
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
      id: editingSource.id,
      name: editName.trim(),
      sourceType: editSourceType as any,
      googleFileId: fileId,
      sheetTab: editSheetTab || undefined,
      description: editDescription || undefined,
      category: editCategory as any,
      pillarConfigId: Number(editPillarId),
    });
  }

  function openEditDialog(src: any) {
    setEditingSource(src);
    setEditName(src.name);
    setEditSourceType(src.sourceType);
    setEditGoogleUrl(src.googleFileId);
    setEditSheetTab(src.sheetTab || "");
    setEditDescription(src.description || "");
    setEditCategory(src.category);
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
    if (pillarId) { setMappingPillarId(pillarId); } else {
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

  const isLoading = pillarsLoading || sourcesLoading;

  const pillarSourceCounts = useMemo(() => {
    const counts: Record<string, number> = { all: allSources?.length || 0, unassigned: 0 };
    if (!allSources) return counts;
    for (const src of allSources) {
      if (!src.pillarConfigId) { counts.unassigned = (counts.unassigned || 0) + 1; }
      else { const key = String(src.pillarConfigId); counts[key] = (counts[key] || 0) + 1; }
    }
    return counts;
  }, [allSources]);

  // ─── Source Form (shared between Add and Edit) ─────────────
  // ─── Add New Pillar state ─────────────────────────────────
  const [newPillarDialogOpen, setNewPillarDialogOpen] = useState(false);
  const [newPillarName, setNewPillarName] = useState("");
  const createPillarMutation = trpc.pillars.upsert.useMutation({
    onSuccess: (created: any) => {
      utils.pillars.list.invalidate();
      setNewPillarDialogOpen(false);
      setNewPillarName("");
      toast.success(`Pillar "${newPillarName}" created.`);
      // Auto-select the new pillar in whichever form is open
      if (created?.id) {
        if (addDialogOpen) setAddToPillarId(String(created.id));
        if (editDialogOpen) setEditPillarId(String(created.id));
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

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
          <Input
            placeholder="https://docs.google.com/spreadsheets/d/... or file ID"
            value={gu} onChange={(e) => setGu(e.target.value)}
          />
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

  // ─── Render ────────────────────────────────────────────────
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Data Sources</h1>
            <p className="text-sm text-muted-foreground">
              Configure data sources per pillar and link them to slide components.
            </p>
          </div>
          <Button onClick={openAddDialog}><Plus className="h-4 w-4 mr-1.5" />Add Source</Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Tabs value={selectedPillarId} onValueChange={setSelectedPillarId}>
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

            {/* All sources view */}
            <TabsContent value="all" className="mt-4">
              {!allSources || allSources.length === 0 ? <EmptyState /> : (
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
              <p className="text-xs text-muted-foreground">
                Specify which part of the source feeds this slide (sheet tab, column range, doc heading, etc.)
              </p>
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
    </DashboardLayout>
  );
}

// ─── Sub-components ─────────────────────────────────────────────

function EmptyState() {
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
  source: any;
  mappings: any[];
  showMappings: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onDeleteMapping?: (id: number) => void;
  onOpenMapping: () => void;
  getGoogleUrl: (src: any) => string;
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
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Edit source" onClick={onEdit}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Link to slide component" onClick={onOpenMapping}>
              <Link2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => window.open(getGoogleUrl(src), "_blank")} title="Open in Google">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive hover:text-destructive" onClick={onDelete} title="Delete source">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
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
