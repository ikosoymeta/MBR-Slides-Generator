import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { getLoginUrl } from "@/const";
import { useIsMobile } from "@/hooks/useMobile";
import {
  LayoutDashboard,
  LogOut,
  PanelLeft,
  PlusCircle,
  History,
  Database,
  Settings,
  Presentation,
  Link2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Loader2,
  FileWarning,
  CalendarClock,
} from "lucide-react";
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";
import { DashboardLayoutSkeleton } from "./DashboardLayoutSkeleton";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: PlusCircle, label: "New MBR", path: "/generate" },
  { icon: History, label: "History", path: "/history" },
  { icon: Database, label: "Data Sources", path: "/data-sources" },
  { icon: Link2, label: "Data Binding", path: "/data-binding" },
  { icon: Presentation, label: "Pillars", path: "/pillars" },
  { icon: CalendarClock, label: "Autopilot", path: "/autopilot" },
  { icon: FileWarning, label: "Error Logs", path: "/error-logs" },
  { icon: Settings, label: "Settings", path: "/settings" },
];

const SIDEBAR_WIDTH_KEY = "sidebar-width";
const DEFAULT_WIDTH = 260;
const MIN_WIDTH = 200;
const MAX_WIDTH = 480;

/** Top-right status indicator showing last Autopilot run and error count */
function AutopilotStatusIndicator() {
  const [, setLocation] = useLocation();
  const { data: lastRun } = trpc.autopilotSchedules.lastRun.useQuery(undefined, {
    refetchInterval: 30_000,
  });
  const { data: errorSummary } = trpc.errorLogs.summary.useQuery(undefined, {
    refetchInterval: 30_000,
  });

  const unresolvedErrors = errorSummary?.unresolved ?? 0;
  const criticalErrors = errorSummary?.critical ?? 0;

  const getStatusIcon = () => {
    if (!lastRun) return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
    if (lastRun.lastRunStatus === "running") return <Loader2 className="h-3.5 w-3.5 text-blue-500 animate-spin" />;
    if (lastRun.lastRunStatus === "failed") return <AlertTriangle className="h-3.5 w-3.5 text-destructive" />;
    if (lastRun.lastRunStatus === "success") return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />;
    return <Clock className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (!lastRun) return "No runs yet";
    const ago = lastRun.lastRunAt ? formatTimeAgo(new Date(lastRun.lastRunAt)) : "never";
    if (lastRun.lastRunStatus === "running") return "Running now...";
    if (lastRun.lastRunStatus === "failed") return `Failed ${ago}`;
    if (lastRun.lastRunStatus === "success") return `Completed ${ago}`;
    return `Scheduled`;
  };

  const getNextRunText = () => {
    if (!lastRun?.isEnabled) return "Schedule disabled";
    if (!lastRun?.frequency) return "";
    const freq = lastRun.frequency;
    const time = `${String(lastRun.hour).padStart(2, "0")}:${String(lastRun.minute).padStart(2, "0")}`;
    if (freq === "daily") return `Next: daily at ${time}`;
    if (freq === "weekly") {
      const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      return `Next: ${days[lastRun.dayOfWeekOrMonth ?? 0]} at ${time}`;
    }
    if (freq === "monthly") return `Next: day ${lastRun.dayOfWeekOrMonth ?? 1} at ${time}`;
    return "";
  };

  return (
    <div className="flex items-center gap-3">
      {/* Error badge */}
      {unresolvedErrors > 0 && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setLocation("/error-logs")}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-accent transition-colors"
              >
                <AlertTriangle className={`h-3.5 w-3.5 ${criticalErrors > 0 ? "text-destructive" : "text-amber-500"}`} />
                <span className="text-xs font-medium">{unresolvedErrors}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <p>{unresolvedErrors} unresolved error{unresolvedErrors !== 1 ? "s" : ""}</p>
              {criticalErrors > 0 && <p className="text-destructive">{criticalErrors} critical</p>}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {/* Autopilot status */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => setLocation("/autopilot")}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              {getStatusIcon()}
              <span className="text-xs text-muted-foreground hidden sm:inline">
                {getStatusText()}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom" align="end">
            <div className="space-y-1">
              <p className="font-medium">Autopilot Status</p>
              <p className="text-xs text-muted-foreground">{getStatusText()}</p>
              {lastRun?.isEnabled && (
                <p className="text-xs text-muted-foreground">{getNextRunText()}</p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_WIDTH_KEY);
    return saved ? parseInt(saved, 10) : DEFAULT_WIDTH;
  });
  const { loading, user } = useAuth();

  useEffect(() => {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, sidebarWidth.toString());
  }, [sidebarWidth]);

  if (loading) {
    return <DashboardLayoutSkeleton />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="flex flex-col items-center gap-8 p-8 max-w-md w-full">
          <div className="flex flex-col items-center gap-4">
            <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
              <Presentation className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-center text-foreground">
              MBR Slide Generator
            </h1>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              Automate your Monthly Business Review slide creation from Google
              Docs and Sheets data sources.
            </p>
          </div>
          <Button
            onClick={() => {
              window.location.href = getLoginUrl();
            }}
            size="lg"
            className="w-full shadow-lg hover:shadow-xl transition-all"
          >
            Sign in to continue
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider
      style={
        {
          "--sidebar-width": `${sidebarWidth}px`,
        } as CSSProperties
      }
    >
      <DashboardLayoutContent setSidebarWidth={setSidebarWidth}>
        {children}
      </DashboardLayoutContent>
    </SidebarProvider>
  );
}

type DashboardLayoutContentProps = {
  children: React.ReactNode;
  setSidebarWidth: (width: number) => void;
};

function DashboardLayoutContent({
  children,
  setSidebarWidth,
}: DashboardLayoutContentProps) {
  const { user, logout } = useAuth();
  const [location, setLocation] = useLocation();
  const { state, toggleSidebar } = useSidebar();
  const isCollapsed = state === "collapsed";
  const [isResizing, setIsResizing] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const activeMenuItem = menuItems.find((item) => item.path === location);
  const isMobile = useIsMobile();

  useEffect(() => {
    if (isCollapsed) {
      setIsResizing(false);
    }
  }, [isCollapsed]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const sidebarLeft =
        sidebarRef.current?.getBoundingClientRect().left ?? 0;
      const newWidth = e.clientX - sidebarLeft;
      if (newWidth >= MIN_WIDTH && newWidth <= MAX_WIDTH) {
        setSidebarWidth(newWidth);
      }
    };
    const handleMouseUp = () => setIsResizing(false);

    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    }
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizing, setSidebarWidth]);

  return (
    <>
      <div className="relative" ref={sidebarRef}>
        <Sidebar
          collapsible="icon"
          className="border-r-0"
          disableTransition={isResizing}
        >
          <SidebarHeader className="h-16 justify-center">
            <div className="flex items-center gap-3 px-2 transition-all w-full">
              <button
                onClick={toggleSidebar}
                className="h-8 w-8 flex items-center justify-center hover:bg-accent rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring shrink-0"
                aria-label="Toggle navigation"
              >
                <PanelLeft className="h-4 w-4 text-muted-foreground" />
              </button>
              {!isCollapsed ? (
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-semibold tracking-tight truncate text-foreground">
                    MBR Generator
                  </span>
                </div>
              ) : null}
            </div>
          </SidebarHeader>

          <SidebarContent className="gap-0">
            <SidebarMenu className="px-2 py-1">
              {menuItems.map((item) => {
                const isActive = location === item.path;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      isActive={isActive}
                      onClick={() => setLocation(item.path)}
                      tooltip={item.label}
                      className="h-10 transition-all font-normal"
                    >
                      <item.icon
                        className={`h-4 w-4 ${isActive ? "text-primary" : ""}`}
                      />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 rounded-lg px-1 py-1 hover:bg-accent/50 transition-colors w-full text-left group-data-[collapsible=icon]:justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Avatar className="h-9 w-9 border shrink-0">
                    <AvatarFallback className="text-xs font-medium">
                      {user?.name?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0 group-data-[collapsible=icon]:hidden">
                    <p className="text-sm font-medium truncate leading-none text-foreground">
                      {user?.name || "-"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-1.5">
                      {user?.email || "-"}
                    </p>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={logout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Sign out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarFooter>
        </Sidebar>
        <div
          className={`absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/20 transition-colors ${isCollapsed ? "hidden" : ""}`}
          onMouseDown={() => {
            if (isCollapsed) return;
            setIsResizing(true);
          }}
          style={{ zIndex: 50 }}
        />
      </div>

      <SidebarInset>
        {/* Top bar with status indicator */}
        <div className="flex border-b h-14 items-center justify-between bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:backdrop-blur sticky top-0 z-40">
          <div className="flex items-center gap-2">
            {isMobile && (
              <SidebarTrigger className="h-9 w-9 rounded-lg bg-background" />
            )}
            <span className="tracking-tight text-foreground font-medium">
              {activeMenuItem?.label ?? "Menu"}
            </span>
          </div>
          <AutopilotStatusIndicator />
        </div>
        <main className="flex-1 p-4 md:p-6">{children}</main>
      </SidebarInset>
    </>
  );
}
