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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import {
  Plus,
  Trash2,
  Pencil,
  Loader2,
  Presentation,
  FolderOpen,
} from "lucide-react";

export default function Pillars() {
  const utils = trpc.useUtils();
  const { data: pillars, isLoading } = trpc.pillars.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  // Form state
  const [pillarName, setPillarName] = useState("");
  const [driveFolderId, setDriveFolderId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [planningDocId, setPlanningDocId] = useState("");
  const [contentCalendarId, setContentCalendarId] = useState("");
  const [contentCalendarTab, setContentCalendarTab] = useState("");
  const [expenseSheetId, setExpenseSheetId] = useState("");
  const [teamsInput, setTeamsInput] = useState("");
  const [isActive, setIsActive] = useState(true);

  const upsertMutation = trpc.pillars.upsert.useMutation({
    onSuccess: () => {
      utils.pillars.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success(editingId ? "Pillar updated." : "Pillar created.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.pillars.delete.useMutation({
    onSuccess: () => {
      utils.pillars.list.invalidate();
      toast.success("Pillar removed.");
    },
  });

  function resetForm() {
    setEditingId(null);
    setPillarName("");
    setDriveFolderId("");
    setTemplateId("");
    setPlanningDocId("");
    setContentCalendarId("");
    setContentCalendarTab("");
    setExpenseSheetId("");
    setTeamsInput("");
    setIsActive(true);
  }

  function openEdit(pillar: any) {
    setEditingId(pillar.id);
    setPillarName(pillar.pillarName);
    setDriveFolderId(pillar.driveFolderId || "");
    setTemplateId(pillar.templatePresentationId || "");
    setPlanningDocId(pillar.planningDocId || "");
    setContentCalendarId(pillar.contentCalendarId || "");
    setContentCalendarTab(pillar.contentCalendarTab || "");
    setExpenseSheetId(pillar.expenseSheetId || "");
    setTeamsInput(pillar.teams ? JSON.parse(pillar.teams).join(", ") : "");
    setIsActive(pillar.isActive ?? true);
    setDialogOpen(true);
  }

  function handleSave() {
    if (!pillarName.trim()) {
      toast.error("Pillar name is required.");
      return;
    }
    const teams = teamsInput
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    upsertMutation.mutate({
      id: editingId || undefined,
      pillarName: pillarName.trim(),
      driveFolderId: driveFolderId || undefined,
      templatePresentationId: templateId || undefined,
      planningDocId: planningDocId || undefined,
      contentCalendarId: contentCalendarId || undefined,
      contentCalendarTab: contentCalendarTab || undefined,
      expenseSheetId: expenseSheetId || undefined,
      teams: teams.length > 0 ? teams : undefined,
      isActive,
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Pillar Configuration</h1>
            <p className="text-sm text-muted-foreground">
              Manage pillar/team settings, Drive folders, and data source mappings.
            </p>
          </div>
          <Dialog
            open={dialogOpen}
            onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}
          >
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Pillar
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit Pillar" : "Add Pillar"}</DialogTitle>
                <DialogDescription>
                  Configure the pillar name, associated Drive folder, and data sources.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-2">
                  <Label>Pillar Name</Label>
                  <Input
                    placeholder="e.g., Entertainment"
                    value={pillarName}
                    onChange={(e) => setPillarName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Teams (comma-separated)</Label>
                  <Input
                    placeholder="e.g., Studios, 2P/3P Games, DES"
                    value={teamsInput}
                    onChange={(e) => setTeamsInput(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Drive Folder ID (for output)</Label>
                  <Input
                    placeholder="Google Drive folder ID"
                    value={driveFolderId}
                    onChange={(e) => setDriveFolderId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Template Presentation ID (optional override)</Label>
                  <Input
                    placeholder="Leave blank to use default MBR template"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Planning Doc ID</Label>
                  <Input
                    placeholder="Google Doc ID for planning inputs"
                    value={planningDocId}
                    onChange={(e) => setPlanningDocId(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Content Calendar Sheet ID</Label>
                    <Input
                      placeholder="Sheet ID"
                      value={contentCalendarId}
                      onChange={(e) => setContentCalendarId(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Calendar Tab Name</Label>
                    <Input
                      placeholder="e.g., 2026 Launch View"
                      value={contentCalendarTab}
                      onChange={(e) => setContentCalendarTab(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Expense Sheet ID</Label>
                  <Input
                    placeholder="SF Main Expense Data sheet ID"
                    value={expenseSheetId}
                    onChange={(e) => setExpenseSheetId(e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-3">
                  <Switch checked={isActive} onCheckedChange={setIsActive} />
                  <Label>Active</Label>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSave} disabled={upsertMutation.isPending}>
                  {upsertMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  )}
                  {editingId ? "Update" : "Create"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !pillars || pillars.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Presentation className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">No pillars configured yet.</p>
              <p className="text-xs text-muted-foreground max-w-sm text-center">
                Add pillars like Entertainment, Studios, 2P/3P Games to organize
                MBR generation by team.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {pillars.map((pillar) => {
              const teams: string[] = pillar.teams ? (typeof pillar.teams === 'string' ? JSON.parse(pillar.teams) : pillar.teams) : [];
              return (
                <Card key={pillar.id} className={!pillar.isActive ? "opacity-60" : ""}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Presentation className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-foreground">{pillar.pillarName}</p>
                        {!pillar.isActive && (
                          <Badge variant="outline" className="text-xs">Inactive</Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {teams.map((t: string) => (
                          <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>
                        ))}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        {pillar.driveFolderId && (
                          <span className="flex items-center gap-1">
                            <FolderOpen className="h-3 w-3" /> Folder linked
                          </span>
                        )}
                        {pillar.planningDocId && <span>Planning doc linked</span>}
                        {pillar.contentCalendarId && <span>Calendar linked</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => openEdit(pillar)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: pillar.id })}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
