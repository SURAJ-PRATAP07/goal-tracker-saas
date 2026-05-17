import { cn } from "@/lib/utils";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Users, Link } from "lucide-react";
import type { Goal } from "@/lib/mock-data";

interface GoalCardProps {
  goal: Goal;
  showActions?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const statusStyles = {
  "not-started": {
    badge: "bg-muted text-muted-foreground",
    progress: "bg-muted",
  },
  "on-track": {
    badge: "bg-blue-100 text-blue-700",
    progress: "bg-blue-500",
  },
  completed: {
    badge: "bg-green-100 text-green-700",
    progress: "bg-green-500",
  },
};

const statusLabels = {
  "not-started": "Not Started",
  "on-track": "On Track",
  completed: "Completed",
};

export function GoalCard({ goal }: GoalCardProps) {
  const progress =
    goal.target > 0 ? Math.min((goal.achievement / goal.target) * 100, 100) : 0;
  const styles = statusStyles[goal.status];

  return (
    <div className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-card-foreground">{goal.title}</h3>
            {goal.isShared && (
              <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200">
                <Link className="mr-1 h-3 w-3" /> Shared Goal
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {goal.description}
          </p>
        </div>
        <Badge className={cn("shrink-0", styles.badge)}>
          {statusLabels[goal.status]}
        </Badge>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
        <div>
          <p className="text-muted-foreground">Target</p>
          <p className="font-medium">
            {goal.target}
            {goal.uomType === "Percentage" ? "%" : ""}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Achievement</p>
          <p className="font-medium">
            {goal.achievement}
            {goal.uomType === "Percentage" ? "%" : ""}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Weightage</p>
          <p className="font-medium">{goal.weightage}%</p>
        </div>
        <div>
          <p className="text-muted-foreground">Thrust Area</p>
          <p className="font-medium">{goal.thrustArea}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {goal.isShared && goal.childCount !== undefined && goal.childCount > 0 && (
        <div className="mt-4 pt-3 border-t border-border flex items-center gap-1.5 text-xs text-muted-foreground">
          <Users className="h-3.5 w-3.5" />
          <span>Assigned to <span className="font-medium text-foreground">{goal.childCount}</span> employee{goal.childCount === 1 ? '' : 's'}</span>
        </div>
      )}
    </div>
  );
}
