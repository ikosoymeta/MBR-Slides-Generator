import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BookOpen,
  LayoutDashboard,
  Presentation,
  Database,
  CalendarClock,
  PlusCircle,
  History,
  FileWarning,
  Settings,
  Link2,
  Play,
  ChevronRight,
  Users,
  FolderOpen,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { useState } from "react";

const sections = [
  {
    id: "overview",
    icon: BookOpen,
    title: "Overview",
    content: `The MBR Slide Generator automates the creation of Monthly Business Review (MBR) slide decks. It connects to your Google Docs, Sheets, and Slides data sources, maps data fields to specific slide template sections, and generates polished presentation decks organized by pillar.

All data in the system is shared across all users — pillars, data sources, bindings, generated slides, and schedules are visible and editable by everyone on the team.`,
  },
  {
    id: "dashboard",
    icon: LayoutDashboard,
    title: "Dashboard",
    content: `The Dashboard is your home screen, providing a quick overview of:

• **Active Pillars** — How many pillars are configured and active
• **Data Sources** — Total number of connected Google Docs, Sheets, and Slides
• **Recent Generations** — Latest MBR slide decks that have been generated
• **Autopilot Status** — Whether automated scheduling is active and when the next run is due
• **Error Summary** — Count of unresolved errors that need attention

The top-right corner always shows the Autopilot status indicator and error count badge for quick access.`,
  },
  {
    id: "pillars",
    icon: Presentation,
    title: "Pillars",
    content: `Pillars represent the organizational units for your MBR reports. Each pillar (e.g., Executive, Games, Entertainment, Studios, Horizon, BOSS) has its own set of data sources, bindings, and generated slides.

**Managing Pillars:**
• View all configured pillars with their slide type configurations
• Each pillar can have a Google Slides template ID assigned
• Toggle pillars active/inactive to include or exclude them from generation
• Add new pillars from the Pillars page or inline from Data Sources & Binding

**Pillar Configuration:**
Each pillar defines which slide types to include in its MBR deck (Executive Summary, Budget Update, Launch Schedule, etc.) and links to a Google Slides template.`,
  },
  {
    id: "data-sources",
    icon: Database,
    title: "Data Sources & Binding",
    content: `This unified screen manages both your data sources and their bindings to slide template sections.

**Data Sources (Top Section):**
Every data source must be assigned to a specific pillar. Sources can be:
• **Google Sheets** — Spreadsheets with optional tab specification
• **Google Docs** — Planning documents, strategy docs
• **Google Slides** — Existing presentation templates

Each source has a name, category (Planning Doc, Content Calendar, Budget Tracker, etc.), and the Google file URL or ID.

**Data Binding (Bottom Section):**
Bindings connect specific fields from your data sources to sections in the MBR slide template. For each pillar, every template section can be:
• **Connected** — Mapped to a specific data source field
• **Not Required** — Explicitly marked as not needed for this pillar
• **Unbound** — Not yet configured

The coverage summary shows how many sections are connected, skipped, or still unbound.

**Two-Step Flow:**
1. First, add your data sources and assign them to pillars
2. Then, create bindings to map source fields to slide template sections`,
  },
  {
    id: "autopilot",
    icon: CalendarClock,
    title: "Autopilot Scheduling",
    content: `Autopilot provides a single global schedule that automatically generates MBR slides for all active pillars at a set time.

**Schedule Configuration:**
• **Frequency** — Daily, Weekly, or Monthly
• **Day** — Day of week (for weekly) or day of month (for monthly)
• **Time** — Hour and minute in Pacific Time
• **Output Folder** — Google Drive folder ID where generated decks are saved
• **Folder Name Format** — Template for organizing output folders, e.g., "MBR Slide Deck {month} {day}, {year}" produces "MBR Slide Deck March 12th, 2026"

**How It Works:**
When the schedule triggers, the system generates MBR slide decks for every active pillar and saves them into a single output folder named with the configured date format. All pillar decks are organized together in one location.

**Status Indicator:**
The top-right corner of the dashboard shows the current Autopilot status — whether it's running, when it last ran, and when the next run is scheduled.`,
  },
  {
    id: "new-mbr",
    icon: PlusCircle,
    title: "New MBR Generation",
    content: `The New MBR page lets you manually generate MBR slide decks on demand.

**Generation Options:**
• **Select Pillar** — Choose which pillar to generate slides for
• **Select Slide Types** — Pick which slides to include (Executive Summary, Initiatives & Goals, Budget Update, Launch Schedule, etc.)
• **Output Location** — Specify the Google Drive folder for the output

**Generation Process:**
1. Select a pillar with an active template
2. Choose the slide types to include
3. Click "Generate" to start the process
4. The system reads data from connected sources, applies bindings, and creates the slide deck
5. Progress is shown in real-time with status updates
6. Once complete, a link to the generated Google Slides deck is provided

**Slide Types Available:**
Title, Agenda, Template Exclusions, Executive Summary, Initiatives & Goals, Initiative Deep Dive, Launch Schedule, Key Dates & Milestones, Budget Update, Budget Reforecast, T&E, Budget Detail Table, Appendix, and End Frame.`,
  },
  {
    id: "history",
    icon: History,
    title: "Generation History",
    content: `The History page shows all previously generated MBR slide decks with:

• **Pillar Name** — Which pillar the deck was generated for
• **Generation Date** — When the deck was created
• **Status** — Success, Failed, or In Progress
• **Slide Count** — Number of slides generated
• **Output Link** — Direct link to the Google Slides presentation
• **Generated By** — Who initiated the generation (manual or Autopilot)

You can delete old generation records from the history. All users see the same shared history.`,
  },
  {
    id: "error-logs",
    icon: FileWarning,
    title: "Error Logs",
    content: `The Error Logs page provides centralized error tracking for troubleshooting:

• **Error List** — All errors with timestamps, severity levels, and descriptions
• **Severity Levels** — Critical, Warning, and Info
• **Error Categories** — Generation errors, data source connection issues, binding failures
• **Resolution Status** — Mark errors as resolved or unresolved
• **Error Details** — Full error context including stack traces and affected components

The error count badge in the top-right corner shows unresolved errors at a glance. Critical errors are highlighted in red.`,
  },
  {
    id: "audit-trail",
    icon: Users,
    title: "Audit Trail & Activity History",
    content: `All changes to data sources, bindings, autopilot schedules, and output locations are tracked with full audit information:

• **Created By / Updated By** — Name of the user who made the change
• **Created At / Updated At** — Timestamp of when the change was made
• **Activity Log** — Detailed history of all modifications

This helps teams understand who changed what and when, which is essential for shared data environments where multiple users collaborate on MBR configuration.`,
  },
  {
    id: "inactivity",
    icon: Clock,
    title: "Session Inactivity Timeout",
    content: `To prevent stale edit sessions, the system includes an inactivity timeout:

• After **15 minutes** of inactivity in edit mode, a warning dialog appears
• The dialog asks "Do you want to continue your session?" with a **3-minute countdown**
• If you click "Continue", the session stays active
• If you don't respond within 3 minutes, the edit mode automatically exits and unsaved changes are discarded

This prevents situations where someone leaves a form open and blocks others from seeing the latest data.`,
  },
  {
    id: "settings",
    icon: Settings,
    title: "Settings",
    content: `The Settings page allows you to configure:

• **Google Slides Template ID** — The master template used for generating MBR decks
• **Default Output Folder** — Google Drive folder ID for generated presentations
• **Application Preferences** — Theme, display options, and other preferences

Settings are shared across all users.`,
  },
];

export default function UserManual() {
  const [activeSection, setActiveSection] = useState("overview");

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            User Manual
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Complete guide to using the MBR Slide Generator application.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6">
          {/* Table of Contents */}
          <Card className="h-fit lg:sticky lg:top-20">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Contents</CardTitle>
            </CardHeader>
            <CardContent className="p-0 pb-2">
              <nav className="space-y-0.5 px-2">
                {sections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => {
                        setActiveSection(section.id);
                        document.getElementById(`manual-${section.id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs text-left transition-colors ${
                        isActive
                          ? "bg-primary/10 text-primary font-medium"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{section.title}</span>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>

          {/* Content */}
          <div className="space-y-6">
            {sections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.id} id={`manual-${section.id}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Icon className="h-5 w-5 text-primary" />
                      {section.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      {section.content.split("\n\n").map((paragraph, i) => {
                        if (paragraph.startsWith("•") || paragraph.includes("\n•")) {
                          const lines = paragraph.split("\n").filter(Boolean);
                          return (
                            <ul key={i} className="space-y-1.5 my-3">
                              {lines.map((line, j) => {
                                const text = line.replace(/^[•]\s*/, "");
                                return (
                                  <li key={j} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <ChevronRight className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                                    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                                  </li>
                                );
                              })}
                            </ul>
                          );
                        }
                        if (paragraph.match(/^\d+\./)) {
                          const lines = paragraph.split("\n").filter(Boolean);
                          return (
                            <ol key={i} className="space-y-1.5 my-3 list-decimal list-inside">
                              {lines.map((line, j) => {
                                const text = line.replace(/^\d+\.\s*/, "");
                                return (
                                  <li key={j} className="text-sm text-muted-foreground">
                                    <span dangerouslySetInnerHTML={{ __html: text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                                  </li>
                                );
                              })}
                            </ol>
                          );
                        }
                        return (
                          <p key={i} className="text-sm text-muted-foreground leading-relaxed my-2" dangerouslySetInnerHTML={{ __html: paragraph.replace(/\*\*(.*?)\*\*/g, '<strong class="text-foreground">$1</strong>') }} />
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Training Video Placeholder */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Play className="h-5 w-5 text-primary" />
                  Training Video
                </CardTitle>
                <CardDescription>
                  Watch a walkthrough of the MBR Slide Generator features.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted/50 rounded-lg flex flex-col items-center justify-center border border-dashed">
                  <Play className="h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p className="text-sm text-muted-foreground">Training video coming soon</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">A comprehensive walkthrough will be available here</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
