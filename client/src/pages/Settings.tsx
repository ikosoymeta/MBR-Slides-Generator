import DashboardLayout from "@/components/DashboardLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

const KNOWN_SOURCES = [
  {
    name: "MBR Template",
    id: "1EV76g3VtRF2uwxIoaBnNbEnY74x3X8RMA0HAGGcs1sA",
    type: "Google Slides",
    url: "https://docs.google.com/presentation/d/1EV76g3VtRF2uwxIoaBnNbEnY74x3X8RMA0HAGGcs1sA",
  },
  {
    name: "SF Main Expense Data",
    id: "1K-Hh6SUo5OHbLbqCNwy9V04d97IfgnlnjeX8NanQVyw",
    type: "Google Sheet",
    url: "https://docs.google.com/spreadsheets/d/1K-Hh6SUo5OHbLbqCNwy9V04d97IfgnlnjeX8NanQVyw",
  },
  {
    name: "Horizon Content Calendar",
    id: "12Gkpyr_8im8dwW7-N5Gty2e3RHQ2vf5dIs9MsbPB_Lo",
    type: "Google Sheet",
    url: "https://docs.google.com/spreadsheets/d/12Gkpyr_8im8dwW7-N5Gty2e3RHQ2vf5dIs9MsbPB_Lo",
  },
  {
    name: "Output Folder (MBR Decks)",
    id: "1XXg9R7ctvralay50uh5Ei1PBMI1pgJ_V",
    type: "Google Drive",
    url: "https://drive.google.com/drive/folders/1XXg9R7ctvralay50uh5Ei1PBMI1pgJ_V",
  },
  {
    name: "Existing MBR Decks (Entertainment)",
    id: "1pd_ZHdfEznecdpkoFkpvw6Yt173MCIWS",
    type: "Google Drive",
    url: "https://drive.google.com/drive/folders/1pd_ZHdfEznecdpkoFkpvw6Yt173MCIWS",
  },
];

export default function Settings() {
  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Settings</h1>
          <p className="text-sm text-muted-foreground">
            System configuration and linked Google resources.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Linked Google Resources</CardTitle>
            <CardDescription>
              Pre-configured Google Workspace resources used by the MBR generator.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {KNOWN_SOURCES.map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{src.name}</p>
                    <Badge variant="secondary" className="text-xs">
                      {src.type}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {src.id}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 shrink-0"
                  onClick={() => window.open(src.url, "_blank")}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              MBR Slide Generator automates Monthly Business Review presentation
              creation by pulling data from Google Docs and Sheets, generating
              AI-powered commentary, and producing editable Google Slides decks.
            </p>
            <p>
              Supported pillars: Entertainment, Studios, 2P/3P Games, DES,
              Emerging Experiences, Total Content.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
