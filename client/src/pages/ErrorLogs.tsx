import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  AlertOctagon,
  RefreshCw,
  CheckCheck,
} from "lucide-react";
import { useState } from "react";

const SEVERITY_CONFIG = {
  info: { icon: Info, color: "text-blue-500", bg: "bg-blue-500/10", label: "Info" },
  warning: { icon: AlertTriangle, color: "text-amber-500", bg: "bg-amber-500/10", label: "Warning" },
  error: { icon: AlertOctagon, color: "text-red-500", bg: "bg-red-500/10", label: "Error" },
  critical: { icon: AlertOctagon, color: "text-red-700", bg: "bg-red-700/10", label: "Critical" },
} as const;

export default function ErrorLogs() {
  const [severityFilter, setSeverityFilter] = useState<string>("all");
  const [showResolved, setShowResolved] = useState(false);

  const { data: summary } = trpc.errorLogs.summary.useQuery();
  const { data: logs, refetch } = trpc.errorLogs.list.useQuery({
    severity: severityFilter !== "all" ? (severityFilter as any) : undefined,
    isResolved: showResolved ? undefined : false,
    limit: 100,
  });

  const resolveMut = trpc.errorLogs.resolve.useMutation({
    onSuccess: () => refetch(),
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Error Logs</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track and resolve errors from Autopilot runs, data collection, and slide generation.
          </p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card className="border-blue-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Info className="h-4 w-4 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.info ?? 0}</p>
                <p className="text-xs text-muted-foreground">Info</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.warning ?? 0}</p>
                <p className="text-xs text-muted-foreground">Warnings</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertOctagon className="h-4 w-4 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.error ?? 0}</p>
                <p className="text-xs text-muted-foreground">Errors</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-red-700/20">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-red-700/10 flex items-center justify-center">
                <AlertOctagon className="h-4 w-4 text-red-700" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.critical ?? 0}</p>
                <p className="text-xs text-muted-foreground">Critical</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center">
                <CheckCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-2xl font-bold">{summary?.unresolved ?? 0}</p>
                <p className="text-xs text-muted-foreground">Unresolved</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={severityFilter} onValueChange={setSeverityFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="All severities" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Severities</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant={showResolved ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowResolved(!showResolved)}
          >
            {showResolved ? "Showing all" : "Hide resolved"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>

        {/* Log entries */}
        <div className="space-y-2">
          {!logs || logs.logs.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-green-500 mx-auto mb-3" />
                <p className="text-lg font-medium">No errors found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {showResolved
                    ? "No error logs recorded yet."
                    : "All errors have been resolved."}
                </p>
              </CardContent>
            </Card>
          ) : (
            logs.logs.map((log) => {
              const sev =
                SEVERITY_CONFIG[log.severity as keyof typeof SEVERITY_CONFIG] ||
                SEVERITY_CONFIG.info;
              const SevIcon = sev.icon;
              return (
                <Card
                  key={log.id}
                  className={`transition-all ${log.isResolved ? "opacity-60" : ""}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div
                        className={`h-8 w-8 rounded-lg ${sev.bg} flex items-center justify-center shrink-0 mt-0.5`}
                      >
                        <SevIcon className={`h-4 w-4 ${sev.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-xs ${sev.color}`}
                          >
                            {sev.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground font-mono">
                            {log.source}
                          </span>
                          {log.isResolved && (
                            <Badge variant="secondary" className="text-xs">
                              Resolved
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground ml-auto">
                            {new Date(log.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1.5 text-foreground">
                          {log.message}
                        </p>
                        {log.context && (
                          <details className="mt-2">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Context details
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded-md overflow-x-auto max-h-40">
                              {typeof log.context === "string"
                                ? log.context
                                : JSON.stringify(log.context, null, 2)}
                            </pre>
                          </details>
                        )}
                        {log.stackTrace && (
                          <details className="mt-1">
                            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                              Stack trace
                            </summary>
                            <pre className="text-xs mt-1 p-2 bg-muted rounded-md overflow-x-auto max-h-40 whitespace-pre-wrap">
                              {log.stackTrace}
                            </pre>
                          </details>
                        )}
                      </div>
                      {!log.isResolved && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resolveMut.mutate({ id: log.id })}
                          disabled={resolveMut.isPending}
                          className="shrink-0"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolve
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
