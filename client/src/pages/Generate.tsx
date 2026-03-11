import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import {
  Loader2,
  Sparkles,
  FileSpreadsheet,
  PenLine,
  MessageSquare,
  Send,
  ExternalLink,
  CheckCircle2,
  ChevronRight,
  FolderPlus,
  ArrowLeft,
} from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

type ChatMessage = { role: "user" | "assistant"; content: string };

export default function Generate() {
  const [, setLocation] = useLocation();
  const [inputMode, setInputMode] = useState<"project" | "manual" | "ai">("project");
  const [step, setStep] = useState<"configure" | "preview" | "generating" | "done">("configure");

  // Shared config
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedPillar, setSelectedPillar] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [outputFolderId, setOutputFolderId] = useState("");

  // Manual mode fields
  const [manualExecSummary, setManualExecSummary] = useState("");
  const [manualInitiatives, setManualInitiatives] = useState("");
  const [manualBudgetNotes, setManualBudgetNotes] = useState("");
  const [manualRisks, setManualRisks] = useState("");

  // AI Chat mode
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Generation result
  const [generationResult, setGenerationResult] = useState<any>(null);

  // Data fetching
  const { data: filters, isLoading: filtersLoading } = trpc.google.fetchExpenseFilters.useQuery();
  const { data: projectNames, isLoading: projectsLoading } = trpc.google.fetchProjectNames.useQuery(
    { pillar: selectedPillar || undefined, team: selectedTeam || undefined, year: selectedYear || undefined },
    { enabled: inputMode === "project" }
  );
  const { data: projectData, isLoading: projectDataLoading } = trpc.google.fetchProjectData.useQuery(
    { projectName: selectedProject },
    { enabled: !!selectedProject && inputMode === "project" }
  );
  const { data: outputFolders } = trpc.google.listOutputFolders.useQuery(
    { year: selectedYear },
    { enabled: !!selectedYear }
  );
  const { data: pillarConfigs } = trpc.pillars.list.useQuery();

  const generateMutation = trpc.mbr.generate.useMutation({
    onSuccess: (result) => {
      setGenerationResult(result);
      setStep("done");
      toast.success("MBR deck generated successfully!");
    },
    onError: (err) => {
      setStep("configure");
      toast.error(`Generation failed: ${err.message}`);
    },
  });

  const aiChatMutation = trpc.mbr.aiChat.useMutation({
    onSuccess: (data) => {
      setChatMessages((prev) => [...prev, { role: "assistant", content: data.content }]);
    },
    onError: () => {
      toast.error("AI response failed. Please try again.");
    },
  });

  const createFolderMutation = trpc.google.createDriveFolder.useMutation({
    onSuccess: (data) => {
      setOutputFolderId(data.id);
      toast.success(`Folder "${data.name}" created.`);
    },
  });

  // Auto-populate pillar when project data loads
  useEffect(() => {
    if (projectData?.summary?.pillar && !selectedPillar) {
      setSelectedPillar(projectData.summary.pillar);
    }
  }, [projectData, selectedPillar]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const teams = useMemo(() => {
    if (!filters?.teams || !selectedPillar) return [];
    return filters.teams[selectedPillar] || [];
  }, [filters, selectedPillar]);

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    setChatMessages((prev) => [...prev, newMsg]);
    setChatInput("");
    aiChatMutation.mutate({
      messages: [...chatMessages, newMsg],
      context: {
        pillarName: selectedPillar || undefined,
        month: selectedMonth,
        year: parseInt(selectedYear),
        projectName: selectedProject || undefined,
      },
    });
  }, [chatInput, chatMessages, selectedPillar, selectedMonth, selectedYear, selectedProject, aiChatMutation]);

  const handleGenerate = useCallback(() => {
    if (!outputFolderId) {
      toast.error("Please select or create an output folder.");
      return;
    }

    const pillarConfig = pillarConfigs?.find((p) => p.pillarName === selectedPillar);

    setStep("generating");
    generateMutation.mutate({
      pillarConfigId: pillarConfig?.id || 0,
      pillarName: selectedPillar || "General",
      month: selectedMonth,
      year: parseInt(selectedYear),
      teams: selectedTeam ? [selectedTeam] : projectData?.summary?.teams || [],
      outputFolderId,
      customTitle: customTitle || undefined,
    });
  }, [outputFolderId, selectedPillar, selectedMonth, selectedYear, selectedTeam, projectData, customTitle, pillarConfigs, generateMutation]);

  const handleCreateYearFolder = useCallback(() => {
    createFolderMutation.mutate({
      name: selectedYear,
      parentFolderId: "1XXg9R7ctvralay50uh5Ei1PBMI1pgJ_V",
    });
  }, [selectedYear, createFolderMutation]);

  if (step === "generating") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Generating MBR Deck</h2>
            <p className="text-muted-foreground mt-1">
              Copying template, populating slides, generating AI commentary...
            </p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (step === "done" && generationResult) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-col items-center text-center gap-4 pt-8">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">MBR Deck Created</h2>
            <p className="text-muted-foreground">
              Your presentation has been generated and saved to Google Drive.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Slides created</span>
                <Badge>{generationResult.slideCount} slides</Badge>
              </div>
              {generationResult.presentationUrl && (
                <Button
                  className="w-full"
                  onClick={() => window.open(generationResult.presentationUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Slides
                </Button>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setStep("configure");
                  setGenerationResult(null);
                }}>
                  Generate Another
                </Button>
                <Button variant="outline" className="flex-1" onClick={() => setLocation("/history")}>
                  View History
                </Button>
              </div>
            </CardContent>
          </Card>

          {generationResult.executiveSummary && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Executive Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <Streamdown>{generationResult.executiveSummary}</Streamdown>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">New MBR Deck</h1>
            <p className="text-sm text-muted-foreground">
              Choose how to populate your slide content
            </p>
          </div>
        </div>

        {/* Input Mode Tabs */}
        <Tabs value={inputMode} onValueChange={(v) => setInputMode(v as any)}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="project" className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              <span className="hidden sm:inline">From Project</span>
              <span className="sm:hidden">Project</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-2">
              <PenLine className="h-4 w-4" />
              <span className="hidden sm:inline">Manual Entry</span>
              <span className="sm:hidden">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="ai" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">AI Chat</span>
              <span className="sm:hidden">AI</span>
            </TabsTrigger>
          </TabsList>

          {/* ─── Mode 1: From Project ─── */}
          <TabsContent value="project" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" />
                  Auto-Generate from Project
                </CardTitle>
                <CardDescription>
                  Select a project from SF Main Expense Data. All related fields
                  will be auto-populated from the data source.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters row */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Pillar (optional filter)</Label>
                    <Select value={selectedPillar} onValueChange={(v) => { setSelectedPillar(v); setSelectedTeam(""); setSelectedProject(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="All pillars" />
                      </SelectTrigger>
                      <SelectContent>
                        {filters?.pillars?.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Team (optional filter)</Label>
                    <Select value={selectedTeam} onValueChange={(v) => { setSelectedTeam(v); setSelectedProject(""); }} disabled={!selectedPillar}>
                      <SelectTrigger>
                        <SelectValue placeholder="All teams" />
                      </SelectTrigger>
                      <SelectContent>
                        {teams.map((t) => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(filters?.years || ["2024", "2025", "2026"]).map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Project selector */}
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  {projectsLoading ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading projects...</span>
                    </div>
                  ) : (
                    <Select value={selectedProject} onValueChange={setSelectedProject}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <ScrollArea className="h-60">
                          {projectNames?.map((name) => (
                            <SelectItem key={name} value={name}>{name}</SelectItem>
                          ))}
                        </ScrollArea>
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Project data preview */}
                {selectedProject && (
                  <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                    {projectDataLoading ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading project data...</span>
                      </div>
                    ) : projectData ? (
                      <>
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium text-foreground">Auto-populated data</span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Pillar</span>
                            <p className="font-medium text-foreground">{projectData.summary.pillar}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Teams</span>
                            <p className="font-medium text-foreground">{projectData.summary.teams.join(", ") || "N/A"}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Total Funding</span>
                            <p className="font-medium text-foreground">${projectData.summary.totalFunding.toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Recognized</span>
                            <p className="font-medium text-foreground">${projectData.summary.totalRecognized.toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <span className="text-muted-foreground">Suppliers</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {projectData.summary.suppliers.slice(0, 5).map((s) => (
                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                              ))}
                              {projectData.summary.suppliers.length > 5 && (
                                <Badge variant="outline" className="text-xs">+{projectData.summary.suppliers.length - 5}</Badge>
                              )}
                            </div>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Records</span>
                            <p className="font-medium text-foreground">{projectData.records.length} expense records</p>
                          </div>
                        </div>
                      </>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Mode 2: Manual Entry ─── */}
          <TabsContent value="manual" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <PenLine className="h-4 w-4 text-primary" />
                  Manual Content Entry
                </CardTitle>
                <CardDescription>
                  Enter slide content manually for each MBR section.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Pillar</Label>
                    <Select value={selectedPillar} onValueChange={setSelectedPillar}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select pillar" />
                      </SelectTrigger>
                      <SelectContent>
                        {filters?.pillars?.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Month</Label>
                    <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, i) => (
                          <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {["2024", "2025", "2026", "2027", "2028"].map((y) => (
                          <SelectItem key={y} value={y}>{y}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                <div className="space-y-2">
                  <Label>Executive Summary</Label>
                  <Textarea
                    placeholder="Key highlights and summary points for this month's review..."
                    value={manualExecSummary}
                    onChange={(e) => setManualExecSummary(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Initiative Updates</Label>
                  <Textarea
                    placeholder="List each initiative and its current status, progress, and next steps..."
                    value={manualInitiatives}
                    onChange={(e) => setManualInitiatives(e.target.value)}
                    rows={6}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Budget & Spend Notes</Label>
                  <Textarea
                    placeholder="Budget utilization, spend trends, and financial highlights..."
                    value={manualBudgetNotes}
                    onChange={(e) => setManualBudgetNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Risks & Blockers</Label>
                  <Textarea
                    placeholder="Key risks, blockers, and mitigation plans..."
                    value={manualRisks}
                    onChange={(e) => setManualRisks(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Mode 3: AI Chat ─── */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 320px)", minHeight: 400 }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  AI-Assisted Content Creation
                </CardTitle>
                <CardDescription>
                  Share details, paste Google Doc/Sheet links, or describe your
                  initiatives. AI will help structure content for MBR slides.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
                {/* Context bar */}
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    {selectedPillar || "No pillar"} &middot; {MONTHS[(selectedMonth || 1) - 1]} {selectedYear}
                  </Badge>
                  {selectedProject && (
                    <Badge variant="secondary">{selectedProject}</Badge>
                  )}
                </div>

                {/* Chat messages */}
                <ScrollArea className="flex-1 border rounded-lg p-3">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-12">
                      <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Start by describing your initiatives, sharing a Google Doc
                        link, or asking for help structuring your MBR content.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-4 justify-center">
                        {[
                          "Help me write an executive summary",
                          "Summarize our Q1 initiatives",
                          "What should I include in the budget section?",
                        ].map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            className="text-xs"
                            onClick={() => {
                              setChatInput(suggestion);
                            }}
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {chatMessages.map((msg, i) => (
                        <div
                          key={i}
                          className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                              msg.role === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                            }`}
                          >
                            {msg.role === "assistant" ? (
                              <Streamdown>{msg.content}</Streamdown>
                            ) : (
                              msg.content
                            )}
                          </div>
                        </div>
                      ))}
                      {aiChatMutation.isPending && (
                        <div className="flex justify-start">
                          <div className="bg-muted rounded-lg px-4 py-2.5">
                            <Loader2 className="h-4 w-4 animate-spin" />
                          </div>
                        </div>
                      )}
                      <div ref={chatEndRef} />
                    </div>
                  )}
                </ScrollArea>

                {/* Chat input */}
                <div className="flex gap-2 shrink-0">
                  <Input
                    placeholder="Type a message or paste a Google Doc/Sheet URL..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendChat();
                      }
                    }}
                    disabled={aiChatMutation.isPending}
                  />
                  <Button
                    size="icon"
                    onClick={handleSendChat}
                    disabled={!chatInput.trim() || aiChatMutation.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* ─── Output Configuration (shared across all modes) ─── */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Output Configuration</CardTitle>
            <CardDescription>
              Set the month, title, and destination folder for the generated deck.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {inputMode === "project" && (
                <div className="space-y-2">
                  <Label>Month</Label>
                  <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((m, i) => (
                        <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2 sm:col-span-2">
                <Label>Custom Title (optional)</Label>
                <Input
                  placeholder={`${selectedPillar || "Pillar"} Content MBR - ${MONTHS[(selectedMonth || 1) - 1]} '${selectedYear.slice(2)}`}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                />
              </div>
            </div>

            <Separator />

            {/* Output folder */}
            <div className="space-y-2">
              <Label>Output Folder</Label>
              {outputFolders && outputFolders.length > 0 ? (
                <Select value={outputFolderId} onValueChange={setOutputFolderId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select output folder..." />
                  </SelectTrigger>
                  <SelectContent>
                    {outputFolders.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No output folder found for year {selectedYear}. Create one?
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreateYearFolder}
                    disabled={createFolderMutation.isPending}
                  >
                    {createFolderMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                    ) : (
                      <FolderPlus className="h-4 w-4 mr-1.5" />
                    )}
                    Create {selectedYear} Folder
                  </Button>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <Button
                size="lg"
                onClick={handleGenerate}
                disabled={generateMutation.isPending || !outputFolderId}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate MBR Deck
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
