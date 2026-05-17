"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import { goalsApi, checkInsApi, type ApiCheckinGoal, type ApiCheckIn } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle, AlertCircle, Clock, TrendingUp, Calendar,
  Loader2, ChevronDown, ChevronUp, RefreshCw, Target,
  CheckCircle2, MessageSquare,
} from "lucide-react";
import { format } from "date-fns";

// ── Types ─────────────────────────────────────────────────────────────────────
type CheckInStatus = "on_track" | "at_risk" | "behind" | "completed";

const STATUS_CONFIG: Record<CheckInStatus, { label: string; color: string; icon: React.ReactNode }> = {
  on_track:  { label: "On Track",  color: "bg-blue-500/10 text-blue-700 border-blue-500/20",   icon: <TrendingUp className="h-3 w-3" /> },
  at_risk:   { label: "At Risk",   color: "bg-amber-500/10 text-amber-700 border-amber-500/20", icon: <AlertCircle className="h-3 w-3" /> },
  behind:    { label: "Behind",    color: "bg-red-500/10 text-red-700 border-red-500/20",       icon: <Clock className="h-3 w-3" /> },
  completed: { label: "Completed", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20", icon: <CheckCircle className="h-3 w-3" /> },
};

const GOAL_STATUS_ORDER: Record<string, number> = {
  in_progress: 0, approved: 1, completed: 2,
};

// ── Toast ─────────────────────────────────────────────────────────────────────
type ToastType = "success" | "error";
interface Toast { message: string; type: ToastType }

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
      toast.type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
        : "bg-destructive/10 border-destructive/20 text-destructive"
    }`}>
      {toast.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

// ── Check-in History ──────────────────────────────────────────────────────────
function CheckInHistory({ history }: { history: ApiCheckIn[] }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? history : history.slice(0, 2);

  if (history.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic mt-2">
        No check-ins recorded yet.
      </p>
    );
  }

  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
        Check-in History ({history.length})
      </p>
      <div className="space-y-2">
        {shown.map((ci) => {
          const cfg = STATUS_CONFIG[ci.status] ?? STATUS_CONFIG.on_track;
          return (
            <div key={ci.id}
              className="rounded-lg border border-border bg-muted/30 p-3 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  {format(new Date(ci.check_in_date), "MMM dd, yyyy")}
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${cfg.color}`}>
                  {cfg.icon} {cfg.label}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <Progress value={Number(ci.progress_percent)} className="h-1.5" />
                </div>
                <span className="font-semibold w-9 text-right">{Math.round(Number(ci.progress_percent))}%</span>
              </div>
              {ci.employee_notes && (
                <p className="text-muted-foreground line-clamp-2">
                  <span className="font-medium text-foreground">Notes:</span> {ci.employee_notes}
                </p>
              )}
              {ci.manager_notes && (
                <p className="rounded bg-blue-50 dark:bg-blue-950/30 px-2 py-1 text-blue-700 dark:text-blue-300">
                  <span className="font-medium">Manager feedback:</span> {ci.manager_notes}
                </p>
              )}
            </div>
          );
        })}
      </div>
      {history.length > 2 && (
        <button onClick={() => setExpanded(e => !e)}
          className="flex items-center gap-1 text-xs text-primary hover:underline">
          {expanded
            ? <><ChevronUp className="h-3 w-3" /> Show less</>
            : <><ChevronDown className="h-3 w-3" /> Show {history.length - 2} more</>}
        </button>
      )}
    </div>
  );
}

// ── Check-in Form Modal ───────────────────────────────────────────────────────
interface CheckInFormProps {
  goal: ApiCheckinGoal;
  onClose: () => void;
  onSuccess: (goalId: string, newCheckIn: ApiCheckIn) => void;
}

function CheckInFormModal({ goal, onClose, onSuccess }: CheckInFormProps) {
  const lastCheckIn = goal.check_ins?.[0];
  const lastPct     = lastCheckIn ? Number(lastCheckIn.progress_percent) : 0;
  const lastVal     = lastCheckIn ? (lastCheckIn.progress_value ?? goal.current_value) : goal.current_value;

  const [progressValue,   setProgressValue]   = useState(String(lastVal ?? ""));
  const [progressPercent, setProgressPercent] = useState(String(lastPct));
  const [status,          setStatus]          = useState<CheckInStatus>(lastCheckIn?.status ?? "on_track");
  const [notes,           setNotes]           = useState("");
  const [isSaving,        setIsSaving]        = useState(false);
  const [error,           setError]           = useState<string | null>(null);

  // Auto-compute percent from value if target is set
  const handleValueChange = (val: string) => {
    setProgressValue(val);
    if (goal.target_value > 0 && val !== "") {
      const pct = Math.min(Math.round((parseFloat(val) / goal.target_value) * 100), 100);
      setProgressPercent(String(isNaN(pct) ? 0 : pct));
    }
  };

  const handleSubmit = async () => {
    const pct = parseFloat(progressPercent);
    if (isNaN(pct) || pct < 0 || pct > 100) {
      setError("Progress percent must be between 0 and 100.");
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await checkInsApi.create({
        goalId:          goal.id,
        progressValue:   progressValue !== "" ? parseFloat(progressValue) : undefined,
        progressPercent: pct,
        status,
        employeeNotes:   notes.trim() || undefined,
      }) as { success: boolean; data: ApiCheckIn };

      onSuccess(goal.id, res.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save check-in.");
    } finally {
      setIsSaving(false);
    }
  };

  const pctNum = Math.min(Math.max(parseFloat(progressPercent) || 0, 0), 100);

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Quarterly Check-in</DialogTitle>
          <DialogDescription className="line-clamp-1">{goal.title}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Goal summary */}
          <div className="rounded-xl bg-muted/50 border border-border p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Target</span>
              <span className="font-semibold">
                {goal.target_value}{goal.unit_of_measure ? ` ${goal.unit_of_measure}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Current</span>
              <span className="font-semibold">
                {goal.current_value}{goal.unit_of_measure ? ` ${goal.unit_of_measure}` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Last progress</span>
              <span className="font-semibold">{lastPct}%</span>
            </div>
          </div>

          {/* Progress fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ci-value">
                Current Value {goal.unit_of_measure && <span className="text-muted-foreground">({goal.unit_of_measure})</span>}
              </Label>
              <Input id="ci-value" type="number" min={0}
                value={progressValue}
                onChange={e => handleValueChange(e.target.value)}
                placeholder={`e.g. ${goal.target_value}`} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ci-pct">Progress % <span className="text-destructive">*</span></Label>
              <Input id="ci-pct" type="number" min={0} max={100}
                value={progressPercent}
                onChange={e => setProgressPercent(e.target.value)}
                placeholder="0–100" />
            </div>
          </div>

          {/* Progress bar preview */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress preview</span>
              <span className="font-semibold text-foreground">{pctNum}%</span>
            </div>
            <Progress value={pctNum} className="h-2" />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="ci-status">Status <span className="text-destructive">*</span></Label>
            <Select value={status} onValueChange={v => setStatus(v as CheckInStatus)}>
              <SelectTrigger id="ci-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_CONFIG) as CheckInStatus[]).map(s => (
                  <SelectItem key={s} value={s}>
                    <div className="flex items-center gap-2">
                      {STATUS_CONFIG[s].icon}
                      {STATUS_CONFIG[s].label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="ci-notes">
              Notes / Comments <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea id="ci-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Describe progress, blockers, or any relevant context..."
              rows={3}
              maxLength={2000} />
            <p className="text-xs text-muted-foreground text-right">{notes.length}/2000</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" /> {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !progressPercent}>
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Save Check-in
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Goal Check-in Card ────────────────────────────────────────────────────────
function GoalCheckinCard({
  goal,
  onCheckIn,
  isWindowOpen,
}: {
  goal: ApiCheckinGoal;
  onCheckIn: (goal: ApiCheckinGoal) => void;
  isWindowOpen: boolean;
}) {
  const [historyOpen, setHistoryOpen] = useState(false);

  const history     = goal.check_ins ?? [];
  const lastCheckIn = history[0];
  const pct         = lastCheckIn
    ? Math.round(Number(lastCheckIn.progress_percent))
    : goal.target_value > 0
    ? Math.min(Math.round((Number(goal.current_value) / Number(goal.target_value)) * 100), 100)
    : 0;

  const lastStatus = lastCheckIn?.status ?? null;
  const cfg = lastStatus ? STATUS_CONFIG[lastStatus] : null;

  const isCompleted = goal.status === "completed";

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-semibold line-clamp-1">{goal.title}</CardTitle>
            <CardDescription className="mt-0.5 capitalize flex items-center gap-2">
              {goal.category} · {goal.weightage}% weight
              {goal.cycle_name && (
                <Badge variant="outline" className="text-xs py-0">
                  {goal.cycle_name}
                </Badge>
              )}
            </CardDescription>
          </div>
          <StatusBadge status={goal.status} className="shrink-0" />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {Number(goal.current_value)}{goal.unit_of_measure ? ` ${goal.unit_of_measure}` : ""}
              {" "}/{" "}
              {Number(goal.target_value)}{goal.unit_of_measure ? ` ${goal.unit_of_measure}` : ""}
            </span>
            <span className="font-bold">{pct}%</span>
          </div>
          <Progress value={pct} className="h-2" />
        </div>

        {/* Last check-in status */}
        {cfg && (
          <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium ${cfg.color}`}>
            {cfg.icon}
            Last check-in: <span className="font-semibold">{cfg.label}</span>
            {lastCheckIn && (
              <span className="ml-auto text-xs opacity-70">
                {format(new Date(lastCheckIn.check_in_date), "MMM dd")}
              </span>
            )}
          </div>
        )}

        {/* Due date */}
        {goal.due_date && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            Due: {format(new Date(goal.due_date), "MMM dd, yyyy")}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            className="flex-1"
            size="sm"
            disabled={isCompleted || !isWindowOpen}
            onClick={() => onCheckIn(goal)}
          >
            <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
            {isCompleted ? "Completed" : history.length > 0 ? "Update Check-in" : "Add Check-in"}
          </Button>
          <Button variant="outline" size="sm"
            onClick={() => setHistoryOpen(h => !h)}>
            {historyOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            {history.length}
          </Button>
        </div>

        {/* History accordion */}
        {historyOpen && <CheckInHistory history={history} />}
      </CardContent>
    </Card>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function EmployeeCheckInsPage() {
  const [goals, setGoals]         = useState<ApiCheckinGoal[]>([]);
  const [activeCycle, setActiveCycle] = useState<any>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]         = useState<string | null>(null);
  const [activeGoal, setActiveGoal] = useState<ApiCheckinGoal | null>(null);
  const [toast, setToast]         = useState<Toast | null>(null);
  const [filter, setFilter]       = useState<"all" | "on_track" | "at_risk" | "behind">("all");

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchGoals = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await goalsApi.getCheckinGoals();
      const sorted = (res.data.goals ?? []).sort(
        (a, b) => (GOAL_STATUS_ORDER[a.status] ?? 9) - (GOAL_STATUS_ORDER[b.status] ?? 9)
      );
      setGoals(sorted);
      
      const cycle = res.data.activeCycle;
      setActiveCycle(cycle);
      if (cycle) {
        const now = new Date();
        const start = new Date(cycle.start_date);
        const end = new Date(cycle.end_date);
        end.setHours(23, 59, 59, 999);
        start.setHours(0, 0, 0, 0);
        setIsWindowOpen(now >= start && now <= end);
      }
    } catch {
      setError("Failed to load goals. Please check your connection and try again.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // Optimistically add new check-in to goal's history
  const handleCheckinSuccess = (goalId: string, newCheckIn: ApiCheckIn) => {
    setGoals(prev => prev.map(g => {
      if (g.id !== goalId) return g;
      const updatedHistory = [newCheckIn, ...(g.check_ins ?? [])];
      const newStatus = newCheckIn.status === "completed" ? "completed" : "in_progress";
      return {
        ...g,
        current_value: newCheckIn.progress_value ?? g.current_value,
        status:        newStatus,
        check_ins:     updatedHistory,
      };
    }));
    setActiveGoal(null);
    showToast("Check-in saved successfully!", "success");
  };

  // Filter
  const filteredGoals = filter === "all"
    ? goals
    : goals.filter(g => {
        const last = g.check_ins?.[0]?.status;
        return last === filter;
      });

  // Stats
  const totalCheckins  = goals.reduce((a, g) => a + (g.check_ins?.length ?? 0), 0);
  const onTrackCount   = goals.filter(g => g.check_ins?.[0]?.status === "on_track").length;
  const atRiskCount    = goals.filter(g => g.check_ins?.[0]?.status === "at_risk" || g.check_ins?.[0]?.status === "behind").length;
  const noCheckinCount = goals.filter(g => !g.check_ins?.length).length;

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quarterly Check-ins</h1>
            <p className="text-muted-foreground">
              Track progress on your approved goals and submit periodic updates.
            </p>
          </div>
          
          {!isWindowOpen && activeCycle && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm font-medium border border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              Check-in window closed for {activeCycle.name}
            </div>
          )}

          <Button variant="outline" size="sm" onClick={fetchGoals} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive flex-1">{error}</p>
              <Button size="sm" variant="outline" onClick={fetchGoals}>Retry</Button>
            </CardContent>
          </Card>
        )}

        {/* Loaded */}
        {!isLoading && !error && (
          <>
            {/* Summary KPI Strip */}
            {goals.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-4">
                {[
                  { label: "Eligible Goals",  value: goals.length,    color: "text-foreground",          bg: "bg-muted/50" },
                  { label: "Total Check-ins", value: totalCheckins,   color: "text-blue-700 dark:text-blue-400",    bg: "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800" },
                  { label: "On Track",        value: onTrackCount,   color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800" },
                  { label: "Need Attention",  value: atRiskCount,   color: "text-amber-700 dark:text-amber-400",  bg: "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800" },
                ].map(s => (
                  <div key={s.label} className={`rounded-xl border p-4 ${s.bg}`}>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-sm text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Filter Tabs */}
            {goals.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                {(["all", "on_track", "at_risk", "behind"] as const).map(f => (
                  <button key={f} onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                      filter === f
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground hover:bg-muted/80"
                    }`}>
                    {f === "all" ? `All (${goals.length})`
                      : f === "on_track" ? `On Track (${onTrackCount})`
                      : f === "at_risk" ? `At Risk (${goals.filter(g => g.check_ins?.[0]?.status === "at_risk").length})`
                      : `Behind (${goals.filter(g => g.check_ins?.[0]?.status === "behind").length})`}
                  </button>
                ))}
              </div>
            )}

            {/* Goal Cards */}
            {filteredGoals.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filteredGoals.map(goal => (
                  <GoalCheckinCard key={goal.id} goal={goal} onCheckIn={setActiveGoal} isWindowOpen={isWindowOpen} />
                ))}
              </div>
            ) : goals.length === 0 ? (
              /* Empty — no approved goals at all */
              <Card className="py-16">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-muted p-5 mb-4">
                    <Target className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Approved Goals Yet</h3>
                  <p className="text-muted-foreground max-w-sm text-sm">
                    Check-ins are only available for goals that have been approved by your manager.
                    Once your goals are approved, they will appear here.
                  </p>
                  {noCheckinCount > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      You have {noCheckinCount} goal{noCheckinCount > 1 ? "s" : ""} awaiting a first check-in.
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              /* Empty — no goals match the current filter */
              <Card className="py-10">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-muted-foreground text-sm">
                    No goals match the &ldquo;{filter.replace("_", " ")}&rdquo; filter.
                  </p>
                  <button onClick={() => setFilter("all")}
                    className="text-primary text-sm mt-2 hover:underline">
                    Clear filter
                  </button>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {/* Check-in Form Modal */}
      {activeGoal && (
        <CheckInFormModal
          goal={activeGoal}
          onClose={() => setActiveGoal(null)}
          onSuccess={handleCheckinSuccess}
        />
      )}

      {/* Toast */}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
