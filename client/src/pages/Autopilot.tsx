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
import {
  Zap,
  Clock,
  CalendarDays,
  CalendarClock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Play,
  Trash2,
  Save,
  RefreshCw,
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

export default function Autopilot() {
  const { data: pillars, isLoading: pillarsLoading } = trpc.pillars.list.useQuery();
  const { data: schedules, refetch: refetchSchedules } = trpc.autopilotSchedules.list.useQuery();
  const { data: lastRun, refetch: refetchLastRun } = trpc.autopilotSchedules.lastRun.useQuery();

  const [selectedPillarId, setSelectedPillarId] = useState<number | null>(null);
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [dayOfWeekOrMonth, setDayOfWeekOrMonth] = useState<number>(1);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [isEnabled, setIsEnabled] = useState(true);
  const [outputFolderId, setOutputFolderId] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const upsertMut = trpc.autopilotSchedules.upsert.useMutation({
    onSuccess: () => {
      toast.success("Schedule saved successfully");
      refetchSchedules();
      refetchLastRun();
      setHasChanges(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMut = trpc.autopilotSchedules.toggleEnabled.useMutation({
    onSuccess: () => {
      refetchSchedules();
      refetchLastRun();
    },
  });

  const deleteMut = trpc.autopilotSchedules.delete.useMutation({
    onSuccess: () => {
      toast.success("Schedule deleted");
      refetchSchedules();
      refetchLastRun();
      setSelectedPillarId(null);
    },
  });

  // Load existing schedule when pillar changes
  const existingSchedule = useMemo(() => {
    if (!selectedPillarId || !schedules) return null;
    return schedules.find((s) => s.pillarConfigId === selectedPillarId) ?? null;
  }, [selectedPillarId, schedules]);

  useEffect(() => {
    if (existingSchedule) {
      setFrequency(existingSchedule.frequency as "daily" | "weekly" | "monthly");
      setDayOfWeekOrMonth(existingSchedule.dayOfWeekOrMonth ?? 1);
      setHour(existingSchedule.hour);
      setMinute(existingSchedule.minute);
      setIsEnabled(existingSchedule.isEnabled);
      setOutputFolderId(existingSchedule.outputFolderId ?? "");
      setHasChanges(false);
    } else {
      setFrequency("monthly");
      setDayOfWeekOrMonth(1);
      setHour(9);
      setMinute(0);
      setIsEnabled(true);
      setOutputFolderId("");
      setHasChanges(false);
    }
  }, [existingSchedule]);

  const handleSave = () => {
    if (!selectedPillarId) return;
    upsertMut.mutate({
      pillarConfigId: selectedPillarId,
      frequency,
      dayOfWeekOrMonth: frequency === "daily" ? undefined : dayOfWeekOrMonth,
      hour,
      minute,
      isEnabled,
      outputFolderId: outputFolderId || undefined,
    });
  };

  const handleDelete = () => {
    if (!existingSchedule) return;
    deleteMut.mutate({ id: existingSchedule.id });
  };

  const markChanged = () => setHasChanges(true);

  const selectedPillar = pillars?.find((p) => p.id === selectedPillarId);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Autopilot Scheduling</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure automated MBR slide generation on a recurring schedule. Each pillar can have its own schedule.
          </p>
        </div>

        {/* Last run status */}
        {lastRun && (
          <Card className={
            lastRun.lastRunStatus === "success" ? "border-green-500/30" :
            lastRun.lastRunStatus === "failed" ? "border-destructive/30" :
            lastRun.lastRunStatus === "running" ? "border-blue-500/30" : ""
          }>
            <CardContent className="p-4 flex items-center gap-4">
              {lastRun.lastRunStatus === "success" && <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />}
              {lastRun.lastRunStatus === "failed" && <XCircle className="h-5 w-5 text-destructive shrink-0" />}
              {lastRun.lastRunStatus === "running" && <Loader2 className="h-5 w-5 text-blue-500 animate-spin shrink-0" />}
              {!lastRun.lastRunStatus && <Clock className="h-5 w-5 text-muted-foreground shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">
                  Last run: {lastRun.lastRunStatus || "Never run"}
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
                    View generated deck
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Existing schedules overview */}
        {schedules && schedules.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <CalendarClock className="h-4 w-4" />
                Active Schedules ({schedules.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {schedules.map((s) => {
                  const pillar = pillars?.find((p) => p.id === s.pillarConfigId);
                  return (
                    <div
                      key={s.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedPillarId === s.pillarConfigId
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent/50"
                      }`}
                      onClick={() => setSelectedPillarId(s.pillarConfigId)}
                    >
                      <div className={`h-2 w-2 rounded-full ${s.isEnabled ? "bg-green-500" : "bg-muted-foreground"}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{pillar?.pillarName ?? `Pillar #${s.pillarConfigId}`}</p>
                        <p className="text-xs text-muted-foreground">
                          {s.frequency} at {String(s.hour).padStart(2, "0")}:{String(s.minute).padStart(2, "0")}
                          {s.frequency === "weekly" && ` on ${DAYS_OF_WEEK[s.dayOfWeekOrMonth ?? 0]?.label}`}
                          {s.frequency === "monthly" && ` on day ${s.dayOfWeekOrMonth ?? 1}`}
                        </p>
                      </div>
                      <Badge variant={s.isEnabled ? "default" : "secondary"}>
                        {s.isEnabled ? "Active" : "Paused"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Schedule configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              {existingSchedule ? "Edit Schedule" : "Create Schedule"}
            </CardTitle>
            <CardDescription>
              {existingSchedule
                ? `Editing schedule for ${selectedPillar?.pillarName ?? "selected pillar"}`
                : "Set up a new autopilot schedule for a pillar"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pillar selector */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pillar</Label>
              <Select
                value={selectedPillarId ? String(selectedPillarId) : ""}
                onValueChange={(v) => {
                  setSelectedPillarId(Number(v));
                  markChanged();
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder={pillarsLoading ? "Loading pillars..." : "Select a pillar"} />
                </SelectTrigger>
                <SelectContent>
                  {pillars?.map((p) => (
                    <SelectItem key={p.id} value={String(p.id)}>
                      {p.pillarName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPillarId && (
              <>
                <Separator />

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
                            {d === 1 ? "1st" : d === 2 ? "2nd" : d === 3 ? "3rd" : `${d}th`}
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

                {/* Output folder */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Output Folder ID (optional)</Label>
                  <Input
                    placeholder="Google Drive folder ID for generated decks"
                    value={outputFolderId}
                    onChange={(e) => { setOutputFolderId(e.target.value); markChanged(); }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave blank to use the pillar's default output folder.
                  </p>
                </div>

                {/* Enable/disable toggle */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <Label className="text-sm font-medium">Enable Schedule</Label>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      When enabled, Autopilot will run at the configured time.
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
                    {existingSchedule ? "Update Schedule" : "Create Schedule"}
                  </Button>
                  {existingSchedule && (
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
              </>
            )}
          </CardContent>
        </Card>

        {/* Schedule summary */}
        {selectedPillarId && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Schedule Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                Autopilot will generate MBR slides for{" "}
                <span className="font-medium">{selectedPillar?.pillarName ?? "selected pillar"}</span>
                {" "}
                {frequency === "daily" && "every day"}
                {frequency === "weekly" && `every ${DAYS_OF_WEEK[dayOfWeekOrMonth]?.label ?? "day"}`}
                {frequency === "monthly" && `on day ${dayOfWeekOrMonth} of each month`}
                {" at "}
                <span className="font-mono font-medium">
                  {String(hour).padStart(2, "0")}:{String(minute).padStart(2, "0")}
                </span>
                {" Pacific Time."}
              </p>
              {!isEnabled && (
                <p className="text-xs text-amber-500 mt-2">
                  This schedule is currently paused and will not run automatically.
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
