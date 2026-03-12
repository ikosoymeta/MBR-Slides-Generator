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
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  ChevronLeft,
  FolderPlus,
  ArrowLeft,
  Plus,
  Trash2,
  Eye,
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  Folder,
  FolderOpen,
  CalendarIcon,
} from "lucide-react";
import { useLocation } from "wouter";
import { Streamdown } from "streamdown";
import { PILLAR_TEAMS, PILLARS } from "../../../shared/types";

// ─── Constants ────────────────────────────────────────────────────

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const YEARS = ["2024", "2025", "2026", "2027", "2028"];

/** Template slide definitions — mirrors the actual Google Slides template (15 slides) */
const TEMPLATE_SLIDES = [
  { index: 0, type: "title", name: "Title Slide", icon: "📄", description: "[PILLAR NAME] 2026 Roadmap MBR — [Month] 2026", dataSource: "Auto-populated from config", required: true, dri: "" },
  { index: 1, type: "agenda", name: "Agenda", icon: "📋", description: "Meeting agenda overview", dataSource: "Static template", required: false, dri: "" },
  { index: 2, type: "exclusions", name: "This Template Will Not Include", icon: "🚫", description: "DS Trend Lines / Deep Dives, etc.", dataSource: "Static template", required: false, dri: "" },
  { index: 3, type: "executive_summary", name: "Executive Summary", icon: "📊", description: "Key highlights, spend status, milestones", dataSource: "S&O Leads (via Google Doc)", required: true, dri: "S&O Leads" },
  { index: 4, type: "initiatives_goals", name: "Initiatives & Goals", icon: "🎯", description: "6×7 table: Initiative, Business Outcome, Release Slate, Performance Measurement", dataSource: "S&O Leads + Tiffany & Ryan", required: true, dri: "Tiffany & Ryan" },
  { index: 5, type: "initiative_deep_dive", name: "Initiative Deep Dive", icon: "🔍", description: "Business Outcome & Goal, Progress Updates, Blockers & Risks, Leadership Asks", dataSource: "S&O Leads (via Google Doc)", required: false, dri: "S&O Leads" },
  { index: 6, type: "launch_schedule", name: "Launch Schedule", icon: "🚀", description: "5×3 table: Q1 '26, Q2 '26, H2 '26 with [DATE]: entries", dataSource: "S&O Leads", required: true, dri: "S&O Leads" },
  { index: 7, type: "key_dates", name: "Key Dates & Milestones", icon: "📅", description: "5×3 table: Q1 '26, Q2 '26, H2 '26 with [DATE]: entries", dataSource: "S&O Leads", required: false, dri: "S&O Leads" },
  { index: 8, type: "budget_update", name: "Budget Update", icon: "💰", description: "Linked Sheets chart from budget spreadsheet", dataSource: "Linked Google Sheets chart", required: true, dri: "Tiffany & Ryan" },
  { index: 9, type: "budget_reforecast", name: "Budget Update — Reforecast", icon: "📈", description: "Reforecast comparison vs. original budget", dataSource: "Tiffany & Ryan", required: false, dri: "Tiffany & Ryan" },
  { index: 10, type: "te", name: "T&E", icon: "✈️", description: "Travel & Entertainment spend overview", dataSource: "Expense data", required: false, dri: "" },
  { index: 11, type: "appendix_header", name: "Appendix", icon: "📎", description: "Appendix section divider", dataSource: "Static", required: false, dri: "" },
  { index: 12, type: "budget_detail", name: "Budget Detail Table", icon: "📊", description: "7×16 table: Team, Initiative/Project, QTD Actuals, Forecast, Delta, Quarterly breakdown", dataSource: "SF Main Expense Data", required: false, dri: "" },
  { index: 13, type: "appendix_content", name: "Appendix Content", icon: "📝", description: "Additional reference material as required", dataSource: "Manual entry", required: false, dri: "" },
  { index: 14, type: "end_frame", name: "End Frame", icon: "🏁", description: "Closing slide", dataSource: "Static", required: false, dri: "" },
] as const;

type ChatMessage = { role: "user" | "assistant"; content: string };

interface SlideEntry {
  id: string;
  templateIndex: number;
  content?: string;
}

// ─── Slide Preview Card ───────────────────────────────────────────

function SlidePreviewCard({
  slide,
  slideEntry,
  pillar,
  month,
  year,
  projectData,
  executiveSummary,
}: {
  slide: (typeof TEMPLATE_SLIDES)[number];
  slideEntry: SlideEntry;
  pillar: string;
  month: number;
  year: string;
  projectData: any;
  executiveSummary: string;
}) {
  const monthName = MONTHS[month - 1] || "March";
  const yearShort = year.slice(2);

  // Template colors matching the actual Google Slides template
  const ORANGE = "#E67E22";
  const DARK_BG = "#2D3436";
  const GREEN_DRI = "#5CD6A0";
  const GRAY_HEADER = "#666666";
  const LIGHT_BLUE_ROW = "#D6EAF8";
  const GRAY_PANEL = "#D5D5D5";

  const DriBox = ({ text }: { text: string }) => (
    <div className="absolute top-1 right-1 px-1.5 py-0.5 text-[7px] font-medium text-gray-800 rounded-sm leading-tight text-center" style={{ background: GREEN_DRI, maxWidth: '40%' }}>
      {text}
    </div>
  );

  const OrangeTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="mb-0.5">
      <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ORANGE }}>{children}</p>
      <div className="h-[1.5px] mt-0.5" style={{ background: ORANGE }} />
    </div>
  );

  const SlideNumber = ({ num }: { num: number }) => (
    <div className="absolute bottom-0.5 right-1 text-[7px] text-gray-400">{num}</div>
  );

  const renderContent = () => {
    if (slideEntry.content) {
      return (
        <div className="relative h-full bg-white rounded">
          <OrangeTitle>{slide.name}</OrangeTitle>
          <p className="text-[8px] text-gray-800 whitespace-pre-wrap mt-1">{slideEntry.content}</p>
        </div>
      );
    }
    switch (slide.type) {
      case "title":
        return (
          <div className="relative flex flex-col justify-center h-full rounded px-3 overflow-hidden" style={{ background: DARK_BG }}>
            {/* Geometric watermark pattern */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <polygon points="50,10 90,90 10,90" fill="none" stroke="white" strokeWidth="1" />
                <polygon points="50,25 78,80 22,80" fill="none" stroke="white" strokeWidth="0.5" />
                <text x="70" y="20" fill="white" fontSize="12" fontWeight="bold" transform="rotate(15,70,20)">R</text>
                <text x="85" y="40" fill="white" fontSize="12" fontWeight="bold" transform="rotate(15,85,40)">E</text>
                <text x="88" y="65" fill="white" fontSize="12" fontWeight="bold" transform="rotate(15,88,65)">A</text>
                <text x="75" y="85" fill="white" fontSize="12" fontWeight="bold" transform="rotate(15,75,85)">L</text>
              </svg>
            </div>
            <p className="text-xs font-extrabold text-white leading-tight" style={{ fontStretch: 'condensed' }}>
              {pillar || "[PILLAR NAME]"}<br />{year} Roadmap MBR
            </p>
            <div className="h-[1.5px] my-1 w-full" style={{ background: '#3498DB' }} />
            <p className="text-[9px] text-gray-300">{monthName} {year}</p>
            <SlideNumber num={1} />
          </div>
        );
      case "agenda":
        return (
          <div className="relative flex h-full rounded overflow-hidden">
            {/* Left gray panel */}
            <div className="w-[35%] flex items-center justify-center" style={{ background: GRAY_PANEL }}>
              <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: ORANGE }}>AGENDA</p>
            </div>
            {/* Right content */}
            <div className="flex-1 flex flex-col justify-center pl-2 bg-white">
              <div className="space-y-1">
                {["Executive Summary", "Initiatives & Goals", "Launch Schedule", "Budget Update", "Appendix"].map((item) => (
                  <div key={item} className="flex items-center gap-1">
                    <div className="h-3 w-3 rounded-full bg-gray-400 flex items-center justify-center">
                      <ChevronRight className="h-2 w-2 text-white" />
                    </div>
                    <span className="text-[8px] text-gray-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            <SlideNumber num={2} />
          </div>
        );
      case "exclusions":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>THIS TEMPLATE WILL NOT INCLUDE</OrangeTitle>
            <div className="mt-1 space-y-0.5 text-[8px] text-gray-800 font-medium">
              <p>1. &nbsp;DS TREND LINES / DEEP DIVES</p>
              <p>2. &nbsp;[...]</p>
            </div>
            <SlideNumber num={3} />
          </div>
        );
      case "executive_summary":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>EXECUTIVE SUMMARY</OrangeTitle>
            <DriBox text="DRI: S&O Leads (via Google Doc)" />
            <p className="text-[8px] text-gray-800 mt-1">{executiveSummary ? executiveSummary.substring(0, 120) + "..." : "[...]"}</p>
            <SlideNumber num={4} />
          </div>
        );
      case "initiatives_goals":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>INITIATIVES & GOALS</OrangeTitle>
            <DriBox text="DRI: Tiffany and Ryan (Progress vs Target from S&O leads)" />
            <div className="text-[6px] overflow-hidden mt-1">
              {/* Super header row */}
              <div className="grid grid-cols-6 gap-px">
                <div className="col-span-2" />
                <div className="col-span-2 text-center font-bold text-white px-0.5 py-px" style={{ background: GRAY_HEADER }}>Release Slate</div>
                <div className="col-span-2 text-center font-bold text-white px-0.5 py-px" style={{ background: GRAY_HEADER }}>Performance Measurement</div>
              </div>
              {/* Sub header row */}
              <div className="grid grid-cols-6 gap-px">
                {["Initiative", "Business Outcome", "Target", "Progress vs Target", "KPI Target", "Value vs Target"].map((h) => (
                  <div key={h} className="text-center font-bold text-white px-0.5 py-px truncate" style={{ background: GRAY_HEADER }}>{h}</div>
                ))}
              </div>
              {/* Data rows */}
              {["a.", "b.", "c.", "d."].map((row) => (
                <div key={row} className="grid grid-cols-6 gap-px border-b border-dashed border-gray-400">
                  <div className="px-0.5 py-0.5 font-bold text-gray-700">{row}</div>
                  {[1,2,3,4,5].map((c) => (
                    <div key={c} className="px-0.5 py-1" style={{ background: LIGHT_BLUE_ROW }} />
                  ))}
                </div>
              ))}
            </div>
            <SlideNumber num={5} />
          </div>
        );
      case "initiative_deep_dive":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>[PROJECT / INITIATIVE #1]</OrangeTitle>
            <DriBox text="DRI: S&O Leads" />
            <div className="grid grid-cols-2 gap-0.5 text-[7px] mt-1">
              <div className="border border-gray-300 rounded-sm p-0.5">
                <p className="font-bold text-gray-700">Business Outcome & Goal</p>
                <p className="text-gray-500">[...]</p>
              </div>
              <div className="border border-gray-300 rounded-sm p-0.5">
                <p className="font-bold text-gray-700">Progress Updates</p>
                <p className="text-gray-500">[...]</p>
              </div>
              <div className="border border-gray-300 rounded-sm p-0.5">
                <p className="font-bold text-gray-700">Blockers & Risks</p>
                <p className="text-gray-500">[...]</p>
              </div>
              <div className="border border-gray-300 rounded-sm p-0.5">
                <p className="font-bold text-gray-700">Leadership Asks</p>
                <p className="text-gray-500">[...]</p>
              </div>
            </div>
            <SlideNumber num={6} />
          </div>
        );
      case "launch_schedule":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>LAUNCH SCHEDULE</OrangeTitle>
            <DriBox text="DRI: S&O Leads" />
            <div className="text-[7px] overflow-hidden mt-1">
              <div className="grid grid-cols-3 gap-px">
                {[`Q1 '${yearShort}`, `Q2 '${yearShort}`, `H2 '${yearShort}`].map((q) => (
                  <div key={q} className="text-center font-bold text-white px-0.5 py-0.5" style={{ background: GRAY_HEADER }}>{q}</div>
                ))}
              </div>
              {[0,1,2,3].map((r) => (
                <div key={r} className="grid grid-cols-3 gap-px border-b border-gray-200">
                  {[0,1,2].map((c) => (
                    <div key={c} className="px-0.5 py-0.5 text-gray-500">[DATE]:</div>
                  ))}
                </div>
              ))}
            </div>
            <SlideNumber num={7} />
          </div>
        );
      case "key_dates":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>KEY DATES & MILESTONES</OrangeTitle>
            <DriBox text="DRI: S&O Leads" />
            <div className="text-[7px] overflow-hidden mt-1">
              <div className="grid grid-cols-3 gap-px">
                {[`Q1 '${yearShort}`, `Q2 '${yearShort}`, `H2 '${yearShort}`].map((q) => (
                  <div key={q} className="text-center font-bold text-white px-0.5 py-0.5" style={{ background: GRAY_HEADER }}>{q}</div>
                ))}
              </div>
              {[0,1,2,3].map((r) => (
                <div key={r} className="grid grid-cols-3 gap-px border-b border-gray-200">
                  {[0,1,2].map((c) => (
                    <div key={c} className="px-0.5 py-0.5 text-gray-500">[DATE]:</div>
                  ))}
                </div>
              ))}
            </div>
            <SlideNumber num={8} />
          </div>
        );
      case "budget_update":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>BUDGET UPDATE</OrangeTitle>
            <DriBox text="DRI: Tiffany & Ryan" />
            <div className="flex items-end gap-0.5 h-10 px-1 mt-1">
              {[35, 55, 45, 70, 60, 80, 50, 75].map((h, i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h}%`, background: i % 2 === 0 ? '#5B9BD5' : '#A9CCE3' }} />
              ))}
            </div>
            <p className="text-[7px] text-gray-400 mt-0.5">Linked Google Sheets chart</p>
            <SlideNumber num={9} />
          </div>
        );
      case "budget_reforecast":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>BUDGET UPDATE — REFORECAST</OrangeTitle>
            <DriBox text="DRI: Tiffany & Ryan" />
            <p className="text-[8px] text-gray-500 mt-1">Reforecast comparison vs. original budget</p>
            <SlideNumber num={10} />
          </div>
        );
      case "te":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>T&E</OrangeTitle>
            <p className="text-[8px] text-gray-500 mt-1">Travel & Entertainment spend overview</p>
            <SlideNumber num={11} />
          </div>
        );
      case "appendix_header":
        return (
          <div className="relative flex flex-col justify-center h-full rounded px-3 overflow-hidden" style={{ background: DARK_BG }}>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <polygon points="50,10 90,90 10,90" fill="none" stroke="white" strokeWidth="1" />
              </svg>
            </div>
            <p className="text-sm font-extrabold uppercase tracking-widest text-white" style={{ fontStretch: 'condensed' }}>APPENDIX</p>
            <div className="h-[1.5px] my-1 w-16" style={{ background: '#3498DB' }} />
            <SlideNumber num={12} />
          </div>
        );
      case "budget_detail":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>BUDGET UPDATE</OrangeTitle>
            <div className="text-[6px] overflow-hidden mt-1">
              <div className="grid grid-cols-7 gap-px">
                {["Team", "Initiative", "QTD Actuals", "Forecast", "Delta", "% Forecast", "Notes"].map((h) => (
                  <div key={h} className="text-center font-bold text-white px-0.5 py-px truncate" style={{ background: GRAY_HEADER }}>{h}</div>
                ))}
              </div>
              {[0,1,2,3].map((r) => (
                <div key={r} className="grid grid-cols-7 gap-px border-b border-gray-200">
                  {[0,1,2,3,4,5,6].map((c) => (
                    <div key={c} className="px-0.5 py-0.5 text-center" style={{ background: r % 2 === 0 ? LIGHT_BLUE_ROW : 'white' }}>
                      <span className="text-gray-400">—</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="grid grid-cols-7 gap-px border-t-2 border-gray-600">
                <div className="col-span-2 px-0.5 py-0.5 font-bold text-gray-700">TOTAL</div>
                {[0,1,2,3,4].map((c) => (
                  <div key={c} className="px-0.5 py-0.5 text-center text-gray-400">—</div>
                ))}
              </div>
            </div>
            <SlideNumber num={13} />
          </div>
        );
      case "appendix_content":
        return (
          <div className="relative h-full bg-white rounded p-2">
            <OrangeTitle>&lt;Appendix as required&gt;</OrangeTitle>
            <p className="text-[8px] text-gray-500 mt-1">Additional reference material</p>
            <SlideNumber num={14} />
          </div>
        );
      case "end_frame":
        return (
          <div className="relative flex items-center justify-center h-full rounded overflow-hidden" style={{ background: DARK_BG }}>
            <div className="absolute right-0 top-0 bottom-0 w-1/2 opacity-10">
              <svg viewBox="0 0 100 100" className="h-full w-full">
                <polygon points="50,10 90,90 10,90" fill="none" stroke="white" strokeWidth="1" />
              </svg>
            </div>
            <SlideNumber num={15} />
          </div>
        );
    }
    // Fallback for any unhandled type
    return (
      <div className="flex items-center justify-center h-full bg-white rounded">
        <p className="text-xs text-gray-500">{(slide as any).description}</p>
      </div>
    );
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-card shadow-sm">
      <div className="px-3 py-1.5 border-b bg-muted/50 flex items-center gap-2">
        <span className="text-sm">{slide.icon}</span>
        <span className="text-xs font-medium text-foreground truncate">{slide.name}</span>
        {slide.required && <Badge variant="secondary" className="text-[9px] px-1 py-0 ml-auto">Required</Badge>}
      </div>
      <div className="aspect-video p-1 bg-gray-100">{renderContent()}</div>
      <div className="px-3 py-1 border-t bg-muted/30">
        <p className="text-[9px] text-muted-foreground truncate">{slide.dataSource}</p>
      </div>
    </div>
  );
}

// ─── Main Generate Page ───────────────────────────────────────────

export default function Generate() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState<"configure" | "slides" | "preview" | "generating" | "done">("configure");
  const [inputMode, setInputMode] = useState<"project" | "manual" | "ai">("project");

  // Shared config
  const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedPillar, setSelectedPillar] = useState("");
  const [selectedTeam, setSelectedTeam] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [manualProjectName, setManualProjectName] = useState("");
  const [showManualProjectInput, setShowManualProjectInput] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [outputFolderId, setOutputFolderId] = useState("");

  // Manual mode fields
  const [manualExecSummary, setManualExecSummary] = useState("");
  const [manualInitiatives, setManualInitiatives] = useState<{ name: string; outcome: string; updates: string; risks: string }[]>([]);
  const [manualLaunchItems, setManualLaunchItems] = useState<{ date: string; title: string; quarter: string }[]>([]);

  // AI Chat mode
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Slide builder state
  const [slideEntries, setSlideEntries] = useState<SlideEntry[]>(() =>
    TEMPLATE_SLIDES.filter((s) => s.required).map((s) => ({
      id: `slide-${s.index}-${Date.now()}`,
      templateIndex: s.index,
    }))
  );
  const [addSlideDialogOpen, setAddSlideDialogOpen] = useState(false);

  // Generation result
  const [generationResult, setGenerationResult] = useState<any>(null);

  // ─── Data fetching ──────────────────────────────────────────────

  const { data: filters, isLoading: filtersLoading } = trpc.google.fetchExpenseFilters.useQuery();

  const { data: projectNames, isLoading: projectsLoading } = trpc.google.fetchProjectNames.useQuery(
    { pillar: selectedPillar || undefined, team: selectedTeam || undefined, year: selectedYear || undefined },
    { enabled: inputMode === "project" }
  );

  const { data: projectData, isLoading: projectDataLoading } = trpc.google.fetchProjectData.useQuery(
    { projectName: selectedProject },
    { enabled: !!selectedProject && inputMode === "project" }
  );

  // Output folders - no arguments, lists all year folders from root
  const { data: outputFolders, refetch: refetchOutputFolders } = trpc.google.listOutputFolders.useQuery();

  const { data: pillarConfigs } = trpc.pillars.list.useQuery();

  const generateMutation = trpc.mbr.generate.useMutation({
    onSuccess: (result) => {
      setGenerationResult(result);
      setCurrentStep("done");
      toast.success("MBR deck generated successfully!");
    },
    onError: (err) => {
      setCurrentStep("slides");
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
      toast.success(`Folder "${data.name}" created in Google Drive.`);
      refetchOutputFolders();
    },
  });

  // ─── Derived state ──────────────────────────────────────────────

  // Use API filters if available, otherwise fall back to PILLAR_TEAMS constant
  const pillarList = useMemo(() => {
    if (filters?.pillars && filters.pillars.length > 0) return filters.pillars;
    return Object.keys(PILLAR_TEAMS);
  }, [filters]);

  const teamList = useMemo(() => {
    if (!selectedPillar) return [];
    if (filters?.teams && filters.teams[selectedPillar]) return filters.teams[selectedPillar];
    return PILLAR_TEAMS[selectedPillar] || [];
  }, [filters, selectedPillar]);

  const yearList = useMemo(() => {
    if (filters?.years && filters.years.length > 0) return filters.years;
    return YEARS;
  }, [filters]);

  // Auto-select output folder matching selected year
  useEffect(() => {
    if (outputFolders && outputFolders.length > 0 && !outputFolderId) {
      const yearFolder = outputFolders.find((f) => f.name === selectedYear);
      if (yearFolder) setOutputFolderId(yearFolder.id);
    }
  }, [outputFolders, selectedYear, outputFolderId]);

  // Re-select output folder when year changes
  useEffect(() => {
    if (outputFolders) {
      const yearFolder = outputFolders.find((f) => f.name === selectedYear);
      setOutputFolderId(yearFolder?.id || "");
    }
  }, [selectedYear, outputFolders]);

  // Auto-populate pillar when project data loads
  useEffect(() => {
    if (projectData?.summary?.pillar && !selectedPillar) {
      setSelectedPillar(projectData.summary.pillar);
    }
  }, [projectData, selectedPillar]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ─── Slide management ───────────────────────────────────────────

  const addSlide = useCallback((templateIndex: number) => {
    setSlideEntries((prev) => [
      ...prev,
      { id: `slide-${templateIndex}-${Date.now()}`, templateIndex },
    ]);
  }, []);

  const removeSlide = useCallback((id: string) => {
    setSlideEntries((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const moveSlide = useCallback((id: string, direction: "up" | "down") => {
    setSlideEntries((prev) => {
      const idx = prev.findIndex((s) => s.id === id);
      if (idx < 0) return prev;
      const newIdx = direction === "up" ? idx - 1 : idx + 1;
      if (newIdx < 0 || newIdx >= prev.length) return prev;
      const copy = [...prev];
      [copy[idx], copy[newIdx]] = [copy[newIdx], copy[idx]];
      return copy;
    });
  }, []);

  const updateSlideContent = useCallback((id: string, content: string) => {
    setSlideEntries((prev) =>
      prev.map((s) => (s.id === id ? { ...s, content } : s))
    );
  }, []);

  const addMultipleSlides = useCallback((indices: number[]) => {
    const newEntries = indices.map((idx) => ({
      id: `slide-${idx}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      templateIndex: idx,
    }));
    setSlideEntries((prev) => [...prev, ...newEntries]);
    setAddSlideDialogOpen(false);
  }, []);

  const availableToAdd = useMemo(() => {
    const usedIndices = new Set(slideEntries.map((s) => s.templateIndex));
    return TEMPLATE_SLIDES.filter((s) => !usedIndices.has(s.index));
  }, [slideEntries]);

  // ─── Handlers ───────────────────────────────────────────────────

  const handleSendChat = useCallback(() => {
    if (!chatInput.trim()) return;
    const newMsg: ChatMessage = { role: "user", content: chatInput.trim() };
    const updatedMessages = [...chatMessages, newMsg];
    setChatMessages(updatedMessages);
    setChatInput("");

    const slideNames = slideEntries.map((e) => {
      const s = TEMPLATE_SLIDES.find((t) => t.index === e.templateIndex);
      return s?.name || "";
    }).filter(Boolean);

    aiChatMutation.mutate({
      messages: updatedMessages,
      context: {
        pillarName: selectedPillar || undefined,
        month: selectedMonth,
        year: parseInt(selectedYear),
        projectName: selectedProject || undefined,
        selectedSlides: slideNames,
      },
    });
  }, [chatInput, chatMessages, selectedPillar, selectedMonth, selectedYear, selectedProject, slideEntries, aiChatMutation]);

  const handleGenerate = useCallback(() => {
    if (!outputFolderId) {
      toast.error("Please select or create an output folder first.");
      return;
    }
    if (slideEntries.length === 0) {
      toast.error("Please add at least one slide.");
      return;
    }

    const pillarConfig = pillarConfigs?.find((p) => p.pillarName === selectedPillar);
    const selectedSlideIndices = slideEntries.map((s) => s.templateIndex);

    setCurrentStep("generating");
    generateMutation.mutate({
      pillarConfigId: pillarConfig?.id || 0,
      pillarName: selectedPillar || "General",
      projectName: selectedProject || manualProjectName.trim() || undefined,
      month: selectedMonth,
      year: parseInt(selectedYear),
      teams: selectedTeam ? [selectedTeam] : projectData?.summary?.teams || [],
      outputFolderId,
      customTitle: customTitle || undefined,
      selectedSlides: selectedSlideIndices,
      manualContent: inputMode === "manual" ? {
        executiveSummary: manualExecSummary || undefined,
        initiatives: manualInitiatives.length > 0 ? manualInitiatives : undefined,
        launchItems: manualLaunchItems.length > 0 ? manualLaunchItems : undefined,
      } : undefined,
    });
  }, [outputFolderId, slideEntries, selectedPillar, selectedMonth, selectedYear, selectedTeam, projectData, customTitle, pillarConfigs, generateMutation, inputMode, manualExecSummary, manualInitiatives, manualLaunchItems]);

  const handleCreateFolder = useCallback((folderName: string) => {
    createFolderMutation.mutate({
      name: folderName,
      parentFolderId: "1XXg9R7ctvralay50uh5Ei1PBMI1pgJ_V",
    });
  }, [createFolderMutation]);

  const canProceedToSlides = useMemo(() => {
    if (inputMode === "project") return !!(selectedProject || manualProjectName.trim());
    if (inputMode === "manual") return !!selectedPillar;
    return !!selectedPillar; // AI mode
  }, [inputMode, selectedProject, manualProjectName, selectedPillar]);

  // ─── Step: Generating ───────────────────────────────────────────

  if (currentStep === "generating") {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground">Generating MBR Deck</h2>
            <p className="text-muted-foreground mt-1">
              Copying template, populating {slideEntries.length} slides, generating AI commentary...
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
            {slideEntries.map((entry) => {
              const slide = TEMPLATE_SLIDES.find((s) => s.index === entry.templateIndex);
              return (
                <Badge key={entry.id} variant="outline" className="text-xs">
                  {slide?.icon} {slide?.name}
                </Badge>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Done ─────────────────────────────────────────────────

  if (currentStep === "done" && generationResult) {
    return (
      <DashboardLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="flex flex-col items-center text-center gap-4 pt-8">
            <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground">MBR Deck Created</h2>
            <p className="text-muted-foreground">
              Your presentation with {generationResult.slideCount} slides has been generated and saved to Google Drive.
            </p>
          </div>

          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Title</span>
                <span className="text-sm font-medium text-foreground">{generationResult.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Slides</span>
                <Badge>{generationResult.slideCount} slides</Badge>
              </div>
              <Separator />
              {generationResult.presentationUrl && (
                <Button
                  className="w-full"
                  onClick={() => window.open(generationResult.presentationUrl, "_blank")}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Open in Google Slides (Editable)
                </Button>
              )}
              {outputFolderId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => window.open(`https://drive.google.com/drive/folders/${outputFolderId}`, "_blank")}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Open Output Folder in Google Drive
                </Button>
              )}
              <Separator />
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => {
                  setCurrentStep("configure");
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
              <CardHeader><CardTitle className="text-base">AI Executive Summary</CardTitle></CardHeader>
              <CardContent><Streamdown>{generationResult.executiveSummary}</Streamdown></CardContent>
            </Card>
          )}

          {generationResult.steps && (
            <Card>
              <CardHeader><CardTitle className="text-base">Generation Log</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {generationResult.steps.map((step: any, i: number) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <div className={`h-2 w-2 rounded-full ${step.status === "completed" ? "bg-green-500" : step.status === "failed" ? "bg-red-500" : "bg-gray-300"}`} />
                      <span className="text-muted-foreground flex-1">{step.step.replace(/_/g, " ")}</span>
                      <span className="text-xs text-muted-foreground">{step.durationMs}ms</span>
                      <Badge variant={step.status === "completed" ? "secondary" : step.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                        {step.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Preview ──────────────────────────────────────────────

  if (currentStep === "preview") {
    return (
      <DashboardLayout>
        <div className="max-w-6xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep("slides")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Preview Slides</h1>
                <p className="text-sm text-muted-foreground">
                  {slideEntries.length} slides for {selectedPillar || "General"} — {MONTHS[selectedMonth - 1]} {selectedYear}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("slides")}>
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Edit Slides
              </Button>
              <Button onClick={handleGenerate} disabled={!outputFolderId || generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate Deck
              </Button>
            </div>
          </div>

          {/* Output config bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label className="shrink-0 text-sm">Output:</Label>
                  <OutputFolderSelector
                    outputFolders={outputFolders || []}
                    outputFolderId={outputFolderId}
                    setOutputFolderId={setOutputFolderId}
                    selectedYear={selectedYear}
                    onCreateFolder={handleCreateFolder}
                    isCreating={createFolderMutation.isPending}
                  />
                  {outputFolderId && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => window.open(`https://drive.google.com/drive/folders/${outputFolderId}`, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Open folder in Google Drive</TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="flex-1" />
                <Input
                  placeholder={`${selectedPillar || "Pillar"} Content MBR - ${MONTHS[selectedMonth - 1]} '${selectedYear.slice(2)}`}
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="max-w-sm text-sm"
                />
              </div>
            </CardContent>
          </Card>

          {/* Slide preview grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {slideEntries.map((entry, idx) => {
              const slide = TEMPLATE_SLIDES.find((s) => s.index === entry.templateIndex);
              if (!slide) return null;
              return (
                <div key={entry.id} className="relative group">
                  <div className="absolute -top-2 -left-2 z-10 bg-primary text-primary-foreground rounded-full h-6 w-6 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </div>
                  <SlidePreviewCard
                    slide={slide}
                    slideEntry={entry}
                    pillar={selectedPillar}
                    month={selectedMonth}
                    year={selectedYear}
                    projectData={projectData}
                    executiveSummary={manualExecSummary}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Slides (Slide Builder) ───────────────────────────────

  if (currentStep === "slides") {
    return (
      <DashboardLayout>
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => setCurrentStep("configure")}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-xl font-semibold text-foreground">Build Your Deck</h1>
                <p className="text-sm text-muted-foreground">
                  Add, remove, and reorder slides. {slideEntries.length} slide{slideEntries.length !== 1 ? "s" : ""} selected.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setCurrentStep("preview")} disabled={slideEntries.length === 0}>
                <Eye className="h-4 w-4 mr-1.5" />
                Preview
              </Button>
              <Button onClick={handleGenerate} disabled={!outputFolderId || slideEntries.length === 0 || generateMutation.isPending}>
                {generateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                Generate
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Slide list */}
            <div className="lg:col-span-2 space-y-3">
              {slideEntries.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center">
                    <LayoutGrid className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">No slides added yet. Add slides from the panel on the right.</p>
                  </CardContent>
                </Card>
              ) : (
                slideEntries.map((entry, idx) => {
                  const slide = TEMPLATE_SLIDES.find((s) => s.index === entry.templateIndex);
                  if (!slide) return null;
                  return (
                    <Card key={entry.id} className="group">
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="flex flex-col items-center gap-1 pt-1">
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSlide(entry.id, "up")} disabled={idx === 0}>
                              <ArrowUp className="h-3 w-3" />
                            </Button>
                            <span className="text-xs font-bold text-muted-foreground">{idx + 1}</span>
                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveSlide(entry.id, "down")} disabled={idx === slideEntries.length - 1}>
                              <ArrowDown className="h-3 w-3" />
                            </Button>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-base">{slide.icon}</span>
                              <span className="font-medium text-foreground">{slide.name}</span>
                              {slide.required && <Badge variant="secondary" className="text-[10px]">Core</Badge>}
                              <Badge variant="outline" className="text-[10px]">{slide.dataSource.split(" ")[0]}</Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2">{slide.description}</p>
                            {["executive_summary", "initiatives_goals", "initiative_deep_dive", "key_dates", "appendix_content"].includes(slide.type) && (
                              <Textarea
                                placeholder="Optional: override content for this slide..."
                                value={entry.content || ""}
                                onChange={(e) => updateSlideContent(entry.id, e.target.value)}
                                rows={2}
                                className="text-xs"
                              />
                            )}
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive shrink-0" onClick={() => removeSlide(entry.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })
              )}
            </div>

            {/* Right: Add slides panel + output folder */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Add Slides</CardTitle>
                  <CardDescription className="text-xs">Click to add individual slides</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1.5">
                  {TEMPLATE_SLIDES.map((slide) => {
                    const isAdded = slideEntries.some((s) => s.templateIndex === slide.index);
                    return (
                      <button
                        key={slide.index}
                        onClick={() => addSlide(slide.index)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-left text-sm transition-colors ${
                          isAdded ? "bg-primary/10 text-primary border border-primary/20" : "hover:bg-muted text-foreground"
                        }`}
                      >
                        <span className="text-sm">{slide.icon}</span>
                        <span className="flex-1 truncate">{slide.name}</span>
                        {isAdded ? <Badge variant="secondary" className="text-[9px]">Added</Badge> : <Plus className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              <AddMultipleSlidesDialog
                open={addSlideDialogOpen}
                onOpenChange={setAddSlideDialogOpen}
                available={availableToAdd}
                onAdd={addMultipleSlides}
              />

              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Quick Presets</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => {
                    setSlideEntries(TEMPLATE_SLIDES.map((s) => ({ id: `slide-${s.index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, templateIndex: s.index })));
                  }}>
                    <LayoutGrid className="h-3.5 w-3.5 mr-1.5" /> All Slides (Full Template)
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => {
                    setSlideEntries(TEMPLATE_SLIDES.filter((s) => s.required).map((s) => ({ id: `slide-${s.index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, templateIndex: s.index })));
                  }}>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Core Slides Only
                  </Button>
                  <Button variant="outline" size="sm" className="w-full justify-start text-xs" onClick={() => {
                    const budgetIndices = [0, 8, 9, 12, 14];
                    setSlideEntries(TEMPLATE_SLIDES.filter((s) => budgetIndices.includes(s.index)).map((s) => ({ id: `slide-${s.index}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, templateIndex: s.index })));
                  }}>
                    💰 Budget Focus
                  </Button>
                </CardContent>
              </Card>

              {/* Output Folder */}
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Output Folder</CardTitle></CardHeader>
                <CardContent>
                  <OutputFolderSelector
                    outputFolders={outputFolders || []}
                    outputFolderId={outputFolderId}
                    setOutputFolderId={setOutputFolderId}
                    selectedYear={selectedYear}
                    onCreateFolder={handleCreateFolder}
                    isCreating={createFolderMutation.isPending}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ─── Step: Configure (Input Mode Selection) ─────────────────────

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
            <p className="text-sm text-muted-foreground">Choose how to populate your slide content</p>
          </div>
        </div>

        {/* Step 1: Pillar, Month, Year, Output */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Configuration</CardTitle>
            <CardDescription>Set the pillar, time period, and output destination</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Pillar</Label>
                {filtersLoading ? (
                  <div className="flex items-center gap-2 h-9 px-3 border rounded-md">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span className="text-xs text-muted-foreground">Loading...</span>
                  </div>
                ) : (
                  <Select value={selectedPillar} onValueChange={(v) => { setSelectedPillar(v); setSelectedTeam(""); setSelectedProject(""); }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select pillar" />
                    </SelectTrigger>
                    <SelectContent>
                      <ScrollArea className="max-h-60">
                        {pillarList.map((p) => (
                          <SelectItem key={p} value={p}>{p}</SelectItem>
                        ))}
                      </ScrollArea>
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Team (optional)</Label>
                <Select value={selectedTeam} onValueChange={(v) => { setSelectedTeam(v); setSelectedProject(""); }} disabled={!selectedPillar}>
                  <SelectTrigger>
                    <SelectValue placeholder="All teams" />
                  </SelectTrigger>
                  <SelectContent>
                    <ScrollArea className="max-h-60">
                      {teamList.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </ScrollArea>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Month</Label>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, i) => (
                      <SelectItem key={i} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Year</Label>
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {yearList.map((y) => (
                      <SelectItem key={y} value={y}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Output Folder</Label>
                <OutputFolderSelector
                  outputFolders={outputFolders || []}
                  outputFolderId={outputFolderId}
                  setOutputFolderId={setOutputFolderId}
                  selectedYear={selectedYear}
                  onCreateFolder={handleCreateFolder}
                  isCreating={createFolderMutation.isPending}
                  compact
                />
              </div>
            </div>
          </CardContent>
        </Card>

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
                  Select a project from SF Main Expense Data. All related fields will be auto-populated.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Project Name</Label>
                  {projectsLoading ? (
                    <div className="flex items-center gap-2 p-3 border rounded-md">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm text-muted-foreground">Loading projects from expense data...</span>
                    </div>
                  ) : projectNames && projectNames.length > 0 && !showManualProjectInput ? (
                    <div className="space-y-2">
                      <Select value={selectedProject} onValueChange={setSelectedProject}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a project..." />
                        </SelectTrigger>
                        <SelectContent>
                          <ScrollArea className="h-60">
                            {projectNames.map((name) => (
                              <SelectItem key={name} value={name}>{name}</SelectItem>
                            ))}
                          </ScrollArea>
                        </SelectContent>
                      </Select>
                      <button
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        onClick={() => { setShowManualProjectInput(true); setSelectedProject(""); }}
                      >
                        Or enter a project name manually
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {!showManualProjectInput ? (
                        <div className="p-4 border rounded-md bg-muted/30 space-y-3">
                          <p className="text-sm text-muted-foreground">
                            {selectedPillar
                              ? `No projects found for ${selectedPillar}${selectedTeam ? ` / ${selectedTeam}` : ""}. The data source may be temporarily unavailable.`
                              : "Select a pillar above to filter projects."}
                          </p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowManualProjectInput(true)}
                            className="gap-1.5"
                          >
                            <PenLine className="h-3.5 w-3.5" />
                            Enter project name manually
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Input
                              placeholder="Type project name..."
                              value={manualProjectName}
                              onChange={(e) => setManualProjectName(e.target.value)}
                              className="flex-1"
                            />
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setShowManualProjectInput(false);
                                setManualProjectName("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Enter a project name to proceed. Budget data will not be auto-populated.
                          </p>
                        </div>
                      )}
                    </div>
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
                              {projectData.summary.suppliers.slice(0, 5).map((s: string) => (
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
                  Enter slide content manually. You can also override individual slides in the next step.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Executive Summary</Label>
                  <Textarea
                    placeholder="Key highlights and summary points for this month's review..."
                    value={manualExecSummary}
                    onChange={(e) => setManualExecSummary(e.target.value)}
                    rows={4}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Initiatives</Label>
                    <Button variant="outline" size="sm" onClick={() => setManualInitiatives((prev) => [...prev, { name: "", outcome: "", updates: "", risks: "" }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add Initiative
                    </Button>
                  </div>
                  {manualInitiatives.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No initiatives added. Click "Add Initiative" to start.</p>
                  ) : (
                    manualInitiatives.map((init, i) => (
                      <div key={i} className="border rounded-lg p-3 space-y-2 bg-muted/20">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium text-foreground">Initiative {String.fromCharCode(97 + i)}</span>
                          <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setManualInitiatives((prev) => prev.filter((_, idx) => idx !== i))}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                        <Input placeholder="Initiative name" value={init.name} onChange={(e) => { const copy = [...manualInitiatives]; copy[i] = { ...copy[i], name: e.target.value }; setManualInitiatives(copy); }} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <Textarea placeholder="Business outcome & goal" value={init.outcome} onChange={(e) => { const copy = [...manualInitiatives]; copy[i] = { ...copy[i], outcome: e.target.value }; setManualInitiatives(copy); }} rows={2} className="text-xs" />
                          <Textarea placeholder="Progress updates" value={init.updates} onChange={(e) => { const copy = [...manualInitiatives]; copy[i] = { ...copy[i], updates: e.target.value }; setManualInitiatives(copy); }} rows={2} className="text-xs" />
                        </div>
                        <Textarea placeholder="Risks & blockers" value={init.risks} onChange={(e) => { const copy = [...manualInitiatives]; copy[i] = { ...copy[i], risks: e.target.value }; setManualInitiatives(copy); }} rows={2} className="text-xs" />
                      </div>
                    ))
                  )}
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Launch Items</Label>
                    <Button variant="outline" size="sm" onClick={() => setManualLaunchItems((prev) => [...prev, { date: "", title: "", quarter: "Q1" }])}>
                      <Plus className="h-3 w-3 mr-1" /> Add Launch
                    </Button>
                  </div>
                  {manualLaunchItems.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No launch items added. These will be auto-populated from the Horizon Content Calendar if available.</p>
                  ) : (
                    manualLaunchItems.map((item, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="outline" className={`flex-1 justify-start text-left text-xs font-normal ${!item.date ? 'text-muted-foreground' : ''}`}>
                              <CalendarIcon className="h-3.5 w-3.5 mr-1.5 shrink-0" />
                              {item.date ? new Date(item.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Pick a date'}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={item.date ? new Date(item.date + 'T00:00:00') : undefined}
                              onSelect={(date) => {
                                const copy = [...manualLaunchItems];
                                copy[i] = { ...copy[i], date: date ? `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}` : '' };
                                setManualLaunchItems(copy);
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <Input placeholder="Title" value={item.title} onChange={(e) => { const copy = [...manualLaunchItems]; copy[i] = { ...copy[i], title: e.target.value }; setManualLaunchItems(copy); }} className="flex-[2] text-xs" />
                        <Select value={item.quarter} onValueChange={(v) => { const copy = [...manualLaunchItems]; copy[i] = { ...copy[i], quarter: v }; setManualLaunchItems(copy); }}>
                          <SelectTrigger className="w-20"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["Q1", "Q2", "Q3", "Q4"].map((q) => <SelectItem key={q} value={q}>{q}</SelectItem>)}
                          </SelectContent>
                        </Select>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setManualLaunchItems((prev) => prev.filter((_, idx) => idx !== i))}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Mode 3: AI Chat ─── */}
          <TabsContent value="ai" className="space-y-4 mt-4">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 380px)", minHeight: 450 }}>
              <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-primary" />
                  AI-Guided MBR Interview
                </CardTitle>
                <CardDescription>
                  The AI will walk you through each slide, asking questions to gather content. You can also share Google Doc/Sheet URLs.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 gap-3 overflow-hidden">
                <div className="flex flex-wrap gap-2 text-xs">
                  <Badge variant="outline">
                    {selectedPillar || "No pillar"} &middot; {MONTHS[(selectedMonth || 1) - 1]} {selectedYear}
                  </Badge>
                  {selectedProject && <Badge variant="secondary">{selectedProject}</Badge>}
                </div>

                <ScrollArea className="flex-1 border rounded-lg p-3">
                  {chatMessages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center py-8">
                      <Sparkles className="h-8 w-8 text-muted-foreground/40 mb-3" />
                      <p className="text-sm font-medium text-foreground mb-1">Ready to build your MBR</p>
                      <p className="text-xs text-muted-foreground max-w-sm mb-4">
                        Click a suggestion below or type your own message. The AI will guide you through each slide's content requirements.
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {[
                          "Let's start building the MBR deck",
                          "Help me write an executive summary",
                          "I have a planning doc to share",
                          "What information do you need?",
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
                        <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-lg px-4 py-2.5 text-sm ${
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-foreground"
                          }`}>
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
                  <Button size="icon" onClick={handleSendChat} disabled={!chatInput.trim() || aiChatMutation.isPending}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Next step button */}
        <div className="flex items-center justify-between relative z-50 pb-4">
          <p className="text-xs text-muted-foreground">
            {inputMode === "project" && !selectedProject && !manualProjectName.trim() && "Select or enter a project name to continue"}
            {inputMode === "project" && (selectedProject || manualProjectName.trim()) && "Project selected — ready to build slides"}
            {inputMode === "manual" && !selectedPillar && "Select a pillar to continue"}
            {inputMode === "manual" && selectedPillar && "Ready to build slides"}
            {inputMode === "ai" && !selectedPillar && "Select a pillar to continue"}
            {inputMode === "ai" && selectedPillar && "Ready to build slides"}
          </p>
          <Button
            size="lg"
            onClick={() => setCurrentStep("slides")}
            disabled={!canProceedToSlides}
          >
            Next: Build Slides
            <ChevronRight className="h-4 w-4 ml-1.5" />
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}

// ─── Output Folder Selector ──────────────────────────────────────

function OutputFolderSelector({
  outputFolders,
  outputFolderId,
  setOutputFolderId,
  selectedYear,
  onCreateFolder,
  isCreating,
  compact = false,
}: {
  outputFolders: { id: string; name: string; mimeType: string }[];
  outputFolderId: string;
  setOutputFolderId: (id: string) => void;
  selectedYear: string;
  onCreateFolder: (name: string) => void;
  isCreating: boolean;
  compact?: boolean;
}) {
  const [newFolderName, setNewFolderName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [manualFolderId, setManualFolderId] = useState("");
  const [showManualInput, setShowManualInput] = useState(false);

  const hasYearFolder = outputFolders.some((f) => f.name === selectedYear);

  if (outputFolders.length > 0) {
    return (
      <div className="space-y-2">
        <Select value={outputFolderId} onValueChange={setOutputFolderId}>
          <SelectTrigger className={compact ? "h-9" : ""}>
            <SelectValue placeholder="Select output folder..." />
          </SelectTrigger>
          <SelectContent>
            {outputFolders.map((f) => (
              <SelectItem key={f.id} value={f.id}>
                <div className="flex items-center gap-2">
                  <Folder className="h-3.5 w-3.5 text-muted-foreground" />
                  {f.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {!hasYearFolder && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">No {selectedYear} folder.</span>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-xs"
              onClick={() => onCreateFolder(selectedYear)}
              disabled={isCreating}
            >
              {isCreating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FolderPlus className="h-3 w-3 mr-1" />}
              Create {selectedYear}
            </Button>
          </div>
        )}
        {!compact && (
          <>
            {showCreate ? (
              <div className="flex items-center gap-2">
                <Input
                  placeholder="New folder name..."
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="text-xs h-8"
                />
                <Button
                  size="sm"
                  className="h-8 text-xs"
                  onClick={() => {
                    if (newFolderName.trim()) {
                      onCreateFolder(newFolderName.trim());
                      setNewFolderName("");
                      setShowCreate(false);
                    }
                  }}
                  disabled={isCreating || !newFolderName.trim()}
                >
                  {isCreating ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                </Button>
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setShowCreate(false)}>
                  Cancel
                </Button>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="w-full text-xs h-7" onClick={() => setShowCreate(true)}>
                <FolderPlus className="h-3 w-3 mr-1" /> Create New Folder
              </Button>
            )}
          </>
        )}
      </div>
    );
  }

  // No folders at all — show manual folder ID input + create option
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">No output folders found. Create one or enter a Google Drive folder ID manually.</p>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => onCreateFolder(selectedYear)}
        disabled={isCreating}
      >
        {isCreating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <FolderPlus className="h-3 w-3 mr-1" />}
        Create {selectedYear} Folder
      </Button>
      {!showManualInput ? (
        <button
          className="text-xs text-muted-foreground hover:text-foreground underline w-full text-center"
          onClick={() => setShowManualInput(true)}
        >
          Or enter a folder ID manually
        </button>
      ) : (
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <Input
              placeholder="Google Drive folder ID..."
              value={manualFolderId}
              onChange={(e) => setManualFolderId(e.target.value)}
              className="text-xs h-8 flex-1"
            />
            <Button
              size="sm"
              className="h-8 text-xs"
              onClick={() => {
                if (manualFolderId.trim()) {
                  setOutputFolderId(manualFolderId.trim());
                }
              }}
              disabled={!manualFolderId.trim()}
            >
              Use
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground">Paste the folder ID from the Google Drive URL (the part after /folders/).</p>
          {outputFolderId && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
              <Folder className="h-3 w-3" />
              <span className="truncate">Using folder: {outputFolderId.substring(0, 20)}...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Add Multiple Slides Dialog ───────────────────────────────────

function AddMultipleSlidesDialog({
  open,
  onOpenChange,
  available,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  available: readonly (typeof TEMPLATE_SLIDES)[number][];
  onAdd: (indices: number[]) => void;
}) {
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const toggle = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full">
          <Plus className="h-3.5 w-3.5 mr-1.5" />
          Add Multiple Slides
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add Multiple Slides</DialogTitle>
          <DialogDescription>Select slides to add to your deck.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-80">
          <div className="space-y-1.5 pr-4">
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">All slides already added.</p>
            ) : (
              available.map((slide) => (
                <label
                  key={slide.index}
                  className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-muted cursor-pointer"
                >
                  <Checkbox
                    checked={selected.has(slide.index)}
                    onCheckedChange={() => toggle(slide.index)}
                  />
                  <span className="text-sm">{slide.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{slide.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{slide.description}</p>
                  </div>
                </label>
              ))
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => { setSelected(new Set()); onOpenChange(false); }}>
            Cancel
          </Button>
          <Button onClick={() => { onAdd(Array.from(selected)); setSelected(new Set()); }} disabled={selected.size === 0}>
            Add {selected.size} Slide{selected.size !== 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
