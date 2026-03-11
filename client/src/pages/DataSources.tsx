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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState } from "react";
import {
  Plus,
  Trash2,
  FileSpreadsheet,
  FileText,
  Presentation,
  Loader2,
  Database,
  ExternalLink,
} from "lucide-react";

const SOURCE_TYPE_ICONS: Record<string, typeof FileSpreadsheet> = {
  google_sheet: FileSpreadsheet,
  google_doc: FileText,
  google_slides: Presentation,
};

const CATEGORY_LABELS: Record<string, string> = {
  planning_doc: "Planning Doc",
  content_calendar: "Content Calendar",
  budget_tracker: "Budget Tracker",
  expense_data: "Expense Data",
  template: "Template",
  other: "Other",
};

export default function DataSources() {
  const utils = trpc.useUtils();
  const { data: sources, isLoading } = trpc.dataSources.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [sourceType, setSourceType] = useState<string>("google_sheet");
  const [googleUrl, setGoogleUrl] = useState("");
  const [sheetTab, setSheetTab] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("other");

  const createMutation = trpc.dataSources.create.useMutation({
    onSuccess: () => {
      utils.dataSources.list.invalidate();
      setDialogOpen(false);
      resetForm();
      toast.success("Data source added.");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.dataSources.delete.useMutation({
    onSuccess: () => {
      utils.dataSources.list.invalidate();
      toast.success("Data source removed.");
    },
  });

  function resetForm() {
    setName("");
    setSourceType("google_sheet");
    setGoogleUrl("");
    setSheetTab("");
    setDescription("");
    setCategory("other");
  }

  function extractFileId(url: string): string {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    return match?.[1] || url;
  }

  function handleAdd() {
    const fileId = extractFileId(googleUrl);
    if (!name.trim() || !fileId) {
      toast.error("Name and Google URL/ID are required.");
      return;
    }
    createMutation.mutate({
      name: name.trim(),
      sourceType: sourceType as any,
      googleFileId: fileId,
      sheetTab: sheetTab || undefined,
      description: description || undefined,
      category: category as any,
    });
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-foreground">Data Sources</h1>
            <p className="text-sm text-muted-foreground">
              Configure Google Docs, Sheets, and Slides used for MBR generation.
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-1.5" />
                Add Source
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Data Source</DialogTitle>
                <DialogDescription>
                  Provide the Google Doc, Sheet, or Slides URL and metadata.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    placeholder="e.g., Horizon Content Calendar"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Source Type</Label>
                    <Select value={sourceType} onValueChange={setSourceType}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="google_sheet">Google Sheet</SelectItem>
                        <SelectItem value="google_doc">Google Doc</SelectItem>
                        <SelectItem value="google_slides">Google Slides</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
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
                    value={googleUrl}
                    onChange={(e) => setGoogleUrl(e.target.value)}
                  />
                </div>
                {sourceType === "google_sheet" && (
                  <div className="space-y-2">
                    <Label>Sheet Tab (optional)</Label>
                    <Input
                      placeholder="e.g., SF Main Expense Data"
                      value={sheetTab}
                      onChange={(e) => setSheetTab(e.target.value)}
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Input
                    placeholder="Brief description of this data source"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAdd} disabled={createMutation.isPending}>
                  {createMutation.isPending && (
                    <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                  )}
                  Add Source
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !sources || sources.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Database className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground mb-2">No data sources configured yet.</p>
              <p className="text-xs text-muted-foreground max-w-sm text-center">
                Add Google Docs, Sheets, or Slides that contain your MBR planning
                documents, content calendars, and budget data.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-3">
            {sources.map((src) => {
              const Icon = SOURCE_TYPE_ICONS[src.sourceType] || FileText;
              const googleUrl =
                src.sourceType === "google_sheet"
                  ? `https://docs.google.com/spreadsheets/d/${src.googleFileId}`
                  : src.sourceType === "google_doc"
                    ? `https://docs.google.com/document/d/${src.googleFileId}`
                    : `https://docs.google.com/presentation/d/${src.googleFileId}`;

              return (
                <Card key={src.id}>
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium truncate text-foreground">{src.name}</p>
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {CATEGORY_LABELS[src.category] || src.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">
                        {src.googleFileId}
                        {src.sheetTab ? ` · Tab: ${src.sheetTab}` : ""}
                      </p>
                      {src.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">{src.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => window.open(googleUrl, "_blank")}
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: src.id })}
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
