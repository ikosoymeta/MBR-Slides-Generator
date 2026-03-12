import { trpc } from "@/lib/trpc";
import { Clock, User, ArrowRight } from "lucide-react";

interface ActivityHistoryProps {
  entityType?: string;
  limit?: number;
  className?: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  created: { label: "Created", color: "text-green-600" },
  updated: { label: "Updated", color: "text-blue-600" },
  deleted: { label: "Deleted", color: "text-red-600" },
  saved: { label: "Saved", color: "text-purple-600" },
  enabled: { label: "Enabled", color: "text-green-600" },
  disabled: { label: "Disabled", color: "text-orange-600" },
};

const ENTITY_LABELS: Record<string, string> = {
  data_source: "Data Source",
  field_binding: "Data Binding",
  slide_mapping: "Slide Mapping",
  autopilot_schedule: "Autopilot Schedule",
};

export function ActivityHistory({ entityType, limit = 20, className = "" }: ActivityHistoryProps) {
  const { data: activities, isLoading } = trpc.activityLog.list.useQuery(
    { entityType, limit },
    { refetchInterval: 30000 }
  );

  if (isLoading) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        Loading activity...
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className={`text-sm text-muted-foreground ${className}`}>
        No activity recorded yet.
      </div>
    );
  }

  return (
    <div className={`space-y-1 ${className}`}>
      {activities.map((activity) => {
        const actionInfo = ACTION_LABELS[activity.action] || { label: activity.action, color: "text-muted-foreground" };
        const entityLabel = ENTITY_LABELS[activity.entityType] || activity.entityType;
        const timeAgo = getTimeAgo(new Date(activity.createdAt));

        return (
          <div
            key={activity.id}
            className="flex items-start gap-2 py-1.5 text-xs border-b border-border/50 last:border-0"
          >
            <User className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="font-medium">{activity.userName}</span>
              <span className={`ml-1 ${actionInfo.color}`}>{actionInfo.label.toLowerCase()}</span>
              <span className="ml-1 text-muted-foreground">{entityLabel.toLowerCase()}</span>
              {activity.entityName && (
                <>
                  <ArrowRight className="inline h-3 w-3 mx-1 text-muted-foreground" />
                  <span className="font-medium truncate">{activity.entityName}</span>
                </>
              )}
              {activity.details && (
                <span className="block text-muted-foreground mt-0.5 truncate">{activity.details}</span>
              )}
            </div>
            <div className="flex items-center gap-1 text-muted-foreground shrink-0">
              <Clock className="h-3 w-3" />
              <span>{timeAgo}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);

  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

/** Inline audit info for individual items showing created/updated by */
export function AuditInfo({
  createdByName,
  updatedByName,
  createdAt,
  updatedAt,
}: {
  createdByName?: string | null;
  updatedByName?: string | null;
  createdAt?: Date | string | null;
  updatedAt?: Date | string | null;
}) {
  if (!createdByName && !updatedByName) return null;

  const created = createdAt ? new Date(createdAt) : null;
  const updated = updatedAt ? new Date(updatedAt) : null;
  const wasUpdated = updated && created && updated.getTime() - created.getTime() > 1000;

  return (
    <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
      {createdByName && created && (
        <div>
          Created by <span className="font-medium">{createdByName}</span> on{" "}
          {created.toLocaleDateString()} at {created.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
      {wasUpdated && updatedByName && updated && (
        <div>
          Updated by <span className="font-medium">{updatedByName}</span> on{" "}
          {updated.toLocaleDateString()} at {updated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </div>
      )}
    </div>
  );
}
