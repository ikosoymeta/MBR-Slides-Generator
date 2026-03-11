import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  ExternalLink,
  Loader2,
  Presentation,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function History() {
  const { data: generations, isLoading } = trpc.mbr.list.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Generation History</h1>
          <p className="text-sm text-muted-foreground">
            All previously generated MBR slide decks with links to Google Slides.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !generations || generations.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-16">
              <Presentation className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-muted-foreground">No MBR decks generated yet.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {generations.map((gen) => (
              <HistoryItem
                key={gen.id}
                gen={gen}
                isExpanded={expandedId === gen.id}
                onToggle={() => setExpandedId(expandedId === gen.id ? null : gen.id)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function HistoryItem({
  gen,
  isExpanded,
  onToggle,
}: {
  gen: any;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { data: logs } = trpc.mbr.getLogs.useQuery(
    { generationId: gen.id },
    { enabled: isExpanded }
  );

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-accent/30 transition-colors pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <StatusIcon status={gen.status} />
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{gen.title}</CardTitle>
                  <CardDescription className="mt-0.5">
                    {gen.pillarName} &middot;{" "}
                    {gen.createdAt ? new Date(gen.createdAt).toLocaleString() : ""}
                    {gen.generatedSlideCount ? ` · ${gen.generatedSlideCount} slides` : ""}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant={
                    gen.status === "completed"
                      ? "default"
                      : gen.status === "failed"
                        ? "destructive"
                        : "secondary"
                  }
                >
                  {gen.status}
                </Badge>
                {gen.presentationUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(gen.presentationUrl, "_blank");
                    }}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                )}
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {gen.executiveSummary && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Executive Summary</p>
                <p className="text-sm text-foreground">{gen.executiveSummary}</p>
              </div>
            )}
            {gen.errorMessage && (
              <div className="border border-destructive/20 rounded-lg p-3 bg-destructive/5">
                <p className="text-xs font-medium text-destructive mb-1">Error</p>
                <p className="text-sm text-destructive">{gen.errorMessage}</p>
              </div>
            )}
            {logs && logs.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Generation Steps</p>
                <div className="space-y-1">
                  {logs.map((log: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <StatusDot status={log.status} />
                      <span className="text-muted-foreground">{log.step}</span>
                      <span className="text-foreground flex-1">{log.message}</span>
                      {log.durationMs && (
                        <span className="text-muted-foreground">{log.durationMs}ms</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />;
    case "failed":
      return <AlertCircle className="h-5 w-5 text-destructive shrink-0" />;
    case "generating":
      return <Loader2 className="h-5 w-5 animate-spin text-primary shrink-0" />;
    default:
      return <Clock className="h-5 w-5 text-muted-foreground shrink-0" />;
  }
}

function StatusDot({ status }: { status: string }) {
  const color =
    status === "completed" ? "bg-green-500" :
    status === "failed" ? "bg-destructive" :
    status === "running" ? "bg-primary" : "bg-muted-foreground";
  return <div className={`h-1.5 w-1.5 rounded-full ${color} shrink-0`} />;
}
