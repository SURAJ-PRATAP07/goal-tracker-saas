import { cn } from "@/lib/utils";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: { value: number; isPositive: boolean };
  color?: "blue" | "green" | "amber" | "purple" | "rose" | "cyan";
  className?: string;
}

const colorMap = {
  blue:   { bg: "bg-blue-500/10",   icon: "text-blue-500",   border: "border-blue-500/20" },
  green:  { bg: "bg-emerald-500/10",icon: "text-emerald-500",border: "border-emerald-500/20" },
  amber:  { bg: "bg-amber-500/10",  icon: "text-amber-500",  border: "border-amber-500/20" },
  purple: { bg: "bg-purple-500/10", icon: "text-purple-500", border: "border-purple-500/20" },
  rose:   { bg: "bg-rose-500/10",   icon: "text-rose-500",   border: "border-rose-500/20" },
  cyan:   { bg: "bg-cyan-500/10",   icon: "text-cyan-500",   border: "border-cyan-500/20" },
};

export function KPICard({
  title, value, subtitle, icon: Icon, trend, color = "blue", className,
}: KPICardProps) {
  const c = colorMap[color];
  return (
    <div className={cn(
      "group relative rounded-xl border border-border bg-card p-5 transition-all duration-200",
      "hover:shadow-lg hover:-translate-y-0.5 hover:border-border/80",
      className
    )}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-4">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className={cn("rounded-lg p-2.5 transition-transform group-hover:scale-110", c.bg)}>
          <Icon className={cn("h-5 w-5", c.icon)} />
        </div>
      </div>

      {/* Value + trend */}
      <div className="flex items-end gap-2">
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        {trend && (
          <div className={cn(
            "mb-0.5 flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-semibold",
            trend.isPositive
              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
          )}>
            {trend.isPositive
              ? <TrendingUp className="h-3 w-3" />
              : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend.value)}%
          </div>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p className="mt-1.5 text-xs text-muted-foreground">{subtitle}</p>
      )}

      {/* Subtle bottom accent */}
      <div className={cn(
        "absolute bottom-0 left-0 right-0 h-0.5 rounded-b-xl opacity-0 transition-opacity group-hover:opacity-100",
        color === "blue"   ? "bg-blue-500"   :
        color === "green"  ? "bg-emerald-500":
        color === "amber"  ? "bg-amber-500"  :
        color === "purple" ? "bg-purple-500" :
        color === "rose"   ? "bg-rose-500"   : "bg-cyan-500"
      )} />
    </div>
  );
}
