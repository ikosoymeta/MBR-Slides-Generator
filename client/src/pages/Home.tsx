import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  PlusCircle,
  History,
  Database,
  Presentation,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function Home() {
  const [, setLocation] = useLocation();
  const { data: generations, isLoading } = trpc.mbr.list.useQuery();

  const recentGenerations = generations?.slice(0, 5) || [];
  const completedCount = generations?.filter((g) => g.status === "completed").length || 0;
  const failedCount = generations?.filter((g) => g.status === "failed").length || 0;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            MBR Slide Generator
          </h1>
          <p className="text-muted-foreground">
            Automate Monthly Business Review slide creation from Google Docs and
            Sheets data sources.
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card
            className="cursor-pointer hover:shadow-md transition-shadow border-dashed border-primary/30 hover:border-primary/60"
            onClick={() => setLocation("/generate")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <PlusCircle className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">New MBR Deck</p>
                <p className="text-xs text-muted-foreground">
                  Generate slides from data
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation("/history")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <History className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">View History</p>
                <p className="text-xs text-muted-foreground">
                  {completedCount} completed deck{completedCount !== 1 ? "s" : ""}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation("/data-sources")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Database className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Data Sources</p>
                <p className="text-xs text-muted-foreground">
                  Configure Google sources
                </p>
              </div>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setLocation("/pillars")}
          >
            <CardContent className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-lg bg-accent flex items-center justify-center shrink-0">
                <Presentation className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <p className="font-medium text-foreground">Pillar Config</p>
                <p className="text-xs text-muted-foreground">
                  Manage pillars & teams
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Generations */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Generations</CardTitle>
                <CardDescription>
                  Latest MBR slide decks created
                </CardDescription>
              </div>
              {recentGenerations.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setLocation("/history")}
                >
                  View all
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentGenerations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Presentation className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-sm text-muted-foreground">
                  No MBR decks generated yet.
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setLocation("/generate")}
                >
                  <PlusCircle className="h-4 w-4 mr-1.5" />
                  Create your first MBR
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {recentGenerations.map((gen) => (
                  <div
                    key={gen.id}
                    className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusIcon status={gen.status} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate text-foreground">
                          {gen.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {gen.pillarName} &middot;{" "}
                          {gen.createdAt
                            ? new Date(gen.createdAt).toLocaleDateString()
                            : ""}
                        </p>
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
                        className="text-xs"
                      >
                        {gen.status}
                      </Badge>
                      {gen.presentationUrl && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() =>
                            window.open(gen.presentationUrl!, "_blank")
                          }
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats row */}
        {generations && generations.length > 0 && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-foreground">{generations.length}</p>
                <p className="text-xs text-muted-foreground">Total Generated</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-green-600">{completedCount}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-semibold text-destructive">{failedCount}</p>
                <p className="text-xs text-muted-foreground">Failed</p>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />;
    case "failed":
      return <AlertCircle className="h-4 w-4 text-destructive shrink-0" />;
    case "generating":
      return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}
