import { cn } from "@/lib/utils";

type Status =
  | "completed" | "on-track" | "at-risk" | "behind"
  | "not-started" | "pending" | "approved" | "rejected"
  | "rework" | "active" | "inactive" | "upcoming" | "future"
  | string;

const variants: Record<string, string> = {
  completed:   "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  "on-track":  "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  "at-risk":   "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  behind:      "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  "not-started":"bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  pending:     "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20",
  approved:    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  rejected:    "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20",
  rework:      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20",
  active:      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20",
  inactive:    "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
  upcoming:    "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20",
  future:      "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

const dots: Record<string, string> = {
  completed:    "bg-emerald-500",
  "on-track":   "bg-blue-500",
  "at-risk":    "bg-amber-500",
  behind:       "bg-rose-500",
  "not-started":"bg-slate-400",
  pending:      "bg-amber-500",
  approved:     "bg-emerald-500",
  rejected:     "bg-rose-500",
  rework:       "bg-purple-500",
  active:       "bg-emerald-500",
  inactive:     "bg-slate-400",
  upcoming:     "bg-blue-500",
  future:       "bg-slate-400",
};

const labels: Record<string, string> = {
  "on-track":   "On Track",
  "not-started":"Not Started",
  "at-risk":    "At Risk",
};

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const key = status.toLowerCase().replace(/ /g, "-");
  const style = variants[key] ?? "bg-slate-500/10 text-slate-600 border-slate-500/20";
  const dot   = dots[key] ?? "bg-slate-400";
  const label = labels[key] ?? status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
      style, className
    )}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot,
        key === "on-track" || key === "pending" ? "animate-pulse" : ""
      )} />
      {label}
    </span>
  );
}
