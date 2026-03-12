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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useEffect, useMemo } from "react";
import { ActivityHistory } from "@/components/ActivityHistory";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Zap,
  Clock,
  CalendarDays,
  CalendarClock,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
  Save,
  FolderOpen,
  Info,
} from "lucide-react";

const DAYS_OF_WEEK = [
  { value: "0", label: "Sunday" },
  { value: "1", label: "Monday" },
  { value: "2", label: "Tuesday" },
  { value: "3", label: "Wednesday" },
  { value: "4", label: "Thursday" },
  { value: "5", label: "Friday" },
  { value: "6", label: "Saturday" },
];

/** Format a date ordinal suffix (1st, 2nd, 3rd, 4th, etc.) */
function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/** Preview the folder name that will be created on the run date */
function previewFolderName(format: string): string {
  const now = new Date();
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return format
    .replace("{month}", months[now.getMonth()])
    .replace("{day}", ordinal(now.getDate()))
    .replace("{year}", String(now.getFullYear()));
}

export default function Autopilot() {
  const { data: pillars } = trpc.pillars.list.useQuery();
  const { data: schedule, refetch: refetchSchedule } = trpc.autopilotSchedules.get.useQuery();
  const { data: lastRun, refetch: refetchLastRun } = trpc.autopilotSchedules.lastRun.useQuery();

  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [dayOfWeekOrMonth, setDayOfWeekOrMonth] = useState<number>(1);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [outputFolderId, setOutputFolderId] = useState("");
  const [folderNameFormat, setFolderNameFormat] = useState("MBR Slide Deck {month} {day}, {year}");
  const [hasChanges, setHasChanges] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const upsertMut = trpc.autopilotSchedules.upsert.useMutation({
    onSuccess: () => {
      toast.success("Schedule saved successfully");
      refetchSchedule();
      refetchLastRun();
      setHasChanges(false);
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteMut = trpc.autopilotSchedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      refetchSchedule();
      refetchLastRun();
      setHasChanges(false);
    },
  });

  // Load existing schedule into form
  useEffect(() => {
    if (schedule) {
      setFrequency(schedule.frequency as "daily" | "weekly" | "monthly");
      setDayOfWeekOrMonth(schedule.dayOfWeekOrMonth ?? 1);
      setHour(schedule.hour);
      setMinute(schedule.minute);
      setIsEnabled(schedule.isEnabled);
      setOutputFolderId(schedule.outputFolderId ?? "");
      setFolderNameFormat(schedule.folderNameFormat ?? "MBR Slide Deck {month} {day}, {year}");
      setHasChanges(false);
    }
  }, [schedule]);

  const handleSave = () => {
    upsertMut.mutate({
      frequency,
      dayOfWeekOrMonth: frequency === "daily" ? undefined : dayOfWeekOrMonth,
      hour,
      minute,
      isEnabled,
      outputFolderId: outputFolderId || undefined,
      folderNameFormat,
    });
  };

  const handleDelete = () => {
    deleteMut.mutate();
  };

  const markChanged = () => setHasChanges(true);

  const activePillarCount = pillars?.filter((p) => p.isActive).length ?? 0;
  const folderPreview = useMemo(() => previewFolderName(folderNameFormat), [folderNameFormat]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Autopilot Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a single automated schedule that generates MBR slides for all active pillars.
            Each run creates a dated folder containing all pillar decks.
          </p>
        </div>

        {/* Last run status */}
        {lastRun && lastRun.lastRunStatus && (
          <Card className={
            lastRun.lastRunStatus === "success" ? "border-green-500/30" :
            lastRun.lastRunStatus === "failed" ? "border-destructive/30" :
            lastRun.lastRunStatus === "running" ? "border-blue-500/30" : ""
          }>
            <CardContent className="p-4 flex items-center gap-4">
              {lastRun.lastRunStatus === "success" && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
              {lastRun.lastRunStatus === "failed" && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
              {lastRun.lastRunStatus === "running" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Last run: {lastRun.lastRunStatus}
                  {lastRun.lastRunAt && (
                    <span className="text-muted-foreground font-normal ml-2">
                      {new Date(lastRun.lastRunAt).toLocaleString()}
                    </span>
                  )}
                </p>
                {lastRun.lastRunError && (
                  <p className="text-xs text-destructive mt-0.5 truncate">{lastRun.lastRunError}</p>
                )}
                {lastRun.lastRunOutputUrl && (
                  <a
                    href={lastRun.lastRunOutputUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline mt-0.5 inline-block"
                  >
                    View generated folder
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Pillars overview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Pillars Included
            </CardTitle>
            <CardDescription>
              Autopilot generates slides for all active pillars. Manage pillars on the Pillars page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pillars?.filter((p) => p.isActive).map((p) => (
                <Badge key={p.id} variant="secondary" className="text-xs">
                  {p.pillarName}
                </Badge>
              ))}
              {activePillarCount === 0 && (
                <p className="text-sm text-muted-foreground">No active pillars configured.</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {activePillarCount} active pillar{activePillarCount !== 1 ? "s" : ""} will be included in each Autopilot run.
            </p>
          </CardContent>
        </Card>

        {/* Schedule configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {schedule ? "Edit Schedule" : "Create Schedule"}
            </CardTitle>
            <CardDescription>
              {schedule
                ? "Modify the global Autopilot schedule"
                : "Set up a recurring schedule to generate all pillar MBR decks automatically"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Frequency */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Frequency</Label>
              <div className="grid grid-cols-3 gap-2">
                {(["daily", "weekly", "monthly"] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => { setFrequency(f); markChanged(); }}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-3 text-sm transition-colors ${
                      frequency === f
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    {f === "daily" && <Clock className="h-4 w-4" />}
                    {f === "weekly" && <CalendarDays className="h-4 w-4" />}
                    {f === "monthly" && <CalendarClock className="h-4 w-4" />}
                    <span className="capitalize">{f}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Day selector (weekly/monthly) */}
            {frequency === "weekly" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Day of Week</Label>
                <Select
                  value={String(dayOfWeekOrMonth)}
                  onValueChange={(v) => { setDayOfWeekOrMonth(Number(v)); markChanged(); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {frequency === "monthly" && (
              <div className="space-y-2">
                <Label className="text-sm font-medium">Day of Month</Label>
                <Select
                  value={String(dayOfWeekOrMonth)}
                  onValueChange={(v) => { setDayOfWeekOrMonth(Number(v)); markChanged(); }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <SelectItem key={d} value={String(d)}>
                        {ordinal(d)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Time picker */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Time (24h)</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={(e) => { setHour(Number(e.target.value)); markChanged(); }}
                  className="w-20 text-center"
                />
                <span className="text-lg font-medium text-muted-foreground">:</span>
                <Input
                  type="number"
                  min={0}
                  max={59}
                  step={5}
                  value={minute}
                  onChange={(e) => { setMinute(Number(e.target.value)); markChanged(); }}
                  className="w-20 text-center"
                />
                <span className="text-xs text-muted-foreground ml-2">Pacific Time</span>
              </div>
            </div>

            <Separator />

            {/* Output folder */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <FolderOpen className="h-4 w-4" />
                Root Output Folder ID
              </Label>
              <Input
                placeholder="Google Drive folder ID (root for all generated decks)"
                value={outputFolderId}
                onChange={(e) => { setOutputFolderId(e.target.value); markChanged(); }}
              />
              <p className="text-xs text-muted-foreground">
                All generated decks will be placed inside dated sub-folders within this root folder.
              </p>
            </div>

            {/* Folder naming format */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Folder Name Format</Label>
              <Input
                value={folderNameFormat}
                onChange={(e) => { setFolderNameFormat(e.target.value); markChanged(); }}
              />
              <p className="text-xs text-muted-foreground">
                Available tokens: <code className="bg-muted px-1 rounded">{"{month}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{day}"}</code>{" "}
                <code className="bg-muted px-1 rounded">{"{year}"}</code>
              </p>
              <div className="flex items-center gap-2 mt-1">
                <FolderOpen className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Preview:</span>
                <Badge variant="outline" className="font-mono text-xs">
                  {folderPreview}
                </Badge>
              </div>
            </div>

            <Separator />

            {/* Enable/disable toggle */}
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <Label className="text-sm font-medium">Enable Schedule</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  When enabled, Autopilot will run at the configured time and generate all pillar decks.
                </p>
              </div>
              <Switch
                checked={isEnabled}
                onCheckedChange={(v) => { setIsEnabled(v); markChanged(); }}
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleSave}
                disabled={upsertMut.isPending}
                className="gap-2"
              >
                {upsertMut.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                {schedule ? "Update Schedule" : "Create Schedule"}
              </Button>
              {schedule && (
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleteMut.isPending}
                  className="gap-2"
                >
                  {deleteMut.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                  Delete
                </Button>
              )}
              {hasChanges && (
                <span className="text-xs text-amber-500 ml-2">Unsaved changes</span>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Schedule summary / preview */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Schedule Preview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm">
              Autopilot will generate MBR slides for{" "}
              <span className="font-medium">{activePillarCount} active pillar{activePillarCount !== 1 ? "s" : ""}</span>
              {" "}
              {frequency === "daily" && "every day"}
              {frequency === "weekly" && `every ${DAYS_OF_WEEK[dayOfWeekOrMonth]?.label ?? "day"}`}
              {frequency === "monthly" && `on the ${ordinal(dayOfWeekOrMonth)} of each month`}
              {" at "}
              <span className="font-mono font-medium">
                {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
              </span>
              {" Pacific Time."}
            </p>
            <p className="text-sm text-muted-foreground">
              Output will be organized into folders like:{" "}
              <span className="font-mono font-medium">{folderPreview}</span>
            </p>
            {!isEnabled && (
              <p className="text-xs text-amber-500 mt-2">
                This schedule is currently paused and will not run automatically.
              </p>
            )}
          </CardContent>
        </Card>
        {/* Activity Log */}
        <div className="mt-2">
          <button
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-3"
            onClick={() => setShowActivityLog(!showActivityLog)}
          >
            <Clock className="h-4 w-4" />
            Schedule Activity
            {showActivityLog ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {showActivityLog && (
            <Card>
              <CardContent className="p-4">
                <ActivityHistory entityType="autopilot_schedule" limit={20} />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
