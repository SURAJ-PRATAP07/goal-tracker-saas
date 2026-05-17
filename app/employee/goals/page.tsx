"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { GoalCard } from "@/components/dashboard/goal-card";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import { uomOptions, thrustAreaOptions } from "@/lib/mock-data"; // static lookup lists only
import { goalsApi, reportsApi, type ApiGoal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Plus, Trash2, AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

// Category enum from the backend (must match server-side CATEGORIES)
const CATEGORY_OPTIONS = [
  { value: "performance",  label: "Performance"  },
  { value: "development",  label: "Development"  },
  { value: "learning",     label: "Learning"     },
  { value: "innovation",   label: "Innovation"   },
  { value: "leadership",   label: "Leadership"   },
  { value: "operational",  label: "Operational"  },
];

interface NewGoal {
  title:       string;
  description: string;
  category:    string;
  uomType:     string;   // stored as unit_of_measure
  target:      number;
  weightage:   number;
  deadline:    string;
}

const emptyGoal: NewGoal = {
  title:       "",
  description: "",
  category:    "",
  uomType:     "Numeric",
  target:      0,
  weightage:   10,
  deadline:    "",
};

type ToastType = "success" | "error";
interface Toast { message: string; type: ToastType }

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium transition-all ${
      toast.type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:border-emerald-800 dark:text-emerald-300"
        : "bg-destructive/10 border-destructive/20 text-destructive"
    }`}>
      {toast.type === "success"
        ? <CheckCircle className="h-4 w-4 shrink-0" />
        : <AlertCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

export default function EmployeeGoalsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newGoals, setNewGoals]         = useState<NewGoal[]>([{ ...emptyGoal }]);
  const [goals, setGoals]               = useState<ApiGoal[]>([]);
  const [activeCycle, setActiveCycle]   = useState<any>(null);
  const [isWindowOpen, setIsWindowOpen] = useState(true);
  const [isLoadingGoals, setIsLoadingGoals] = useState(true);
  const [isSaving, setIsSaving]         = useState(false);
  const [toast, setToast]               = useState<Toast | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch existing goals and cycle info ────────────────────────────────────
  const fetchGoals = useCallback(async () => {
    setIsLoadingGoals(true);
    try {
      const [res, dashboardRes] = await Promise.all([
        goalsApi.getAll(),
        reportsApi.employeeDashboard()
      ]);
      const rows = (res as { success: boolean; data: ApiGoal[] | { rows: ApiGoal[] } }).data;
      setGoals(Array.isArray(rows) ? rows : (rows as { rows: ApiGoal[] }).rows ?? []);
      
      const cycle = dashboardRes.data.activeCycle;
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
      showToast("Failed to load goals", "error");
    } finally {
      setIsLoadingGoals(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  // ── Validation ─────────────────────────────────────────────────────────────
  const totalWeightage   = newGoals.reduce((acc, g) => acc + (Number(g.weightage) || 0), 0);
  const isWeightageValid = totalWeightage === 100;
  const hasMinWeightage  = newGoals.every(g => Number(g.weightage) >= 10);
  const hasMaxGoals      = newGoals.length <= 8;

  // Per-goal inline errors
  const goalErrors = newGoals.map(g => ({
    title:    !g.title.trim()          ? "Title is required"      : null,
    category: !g.category              ? "Category is required"   : null,
    weightage: Number(g.weightage) < 10 ? "Minimum 10% per goal"  :
               Number(g.weightage) > 100 ? "Maximum 100% per goal" : null,
  }));

  // Duplicate title detection within the batch
  const batchTitles       = newGoals.map(g => g.title.trim().toLowerCase());
  const hasDuplicateTitles = batchTitles.some((t, i) => t && batchTitles.indexOf(t) !== i);

  // Summary of blocking issues (drives Submit button disabled state)
  const submitBlockers: string[] = [];
  if (!isWeightageValid)   submitBlockers.push(`Total is ${totalWeightage}% — must equal exactly 100%`);
  if (!hasMinWeightage)    submitBlockers.push("Each goal needs at least 10% weightage");
  if (!hasMaxGoals)        submitBlockers.push("Maximum 8 goals per cycle");
  if (hasDuplicateTitles)  submitBlockers.push("Duplicate goal titles in this batch");
  newGoals.forEach((g, i) => {
    if (!g.title.trim()) submitBlockers.push(`Goal ${i + 1}: title missing`);
    if (!g.category)     submitBlockers.push(`Goal ${i + 1}: category missing`);
  });

  const canSubmit = submitBlockers.length === 0;
  const canDraft  = newGoals.some(g => g.title.trim().length > 0 && g.category.length > 0);


  const addGoal    = () => { if (newGoals.length < 8) setNewGoals([...newGoals, { ...emptyGoal }]); };
  const removeGoal = (index: number) => { if (newGoals.length > 1) setNewGoals(newGoals.filter((_, i) => i !== index)); };
  const updateGoal = (index: number, field: keyof NewGoal, value: string | number) => {
    const updated = [...newGoals];
    updated[index] = { ...updated[index], [field]: value };
    setNewGoals(updated);
  };

  // ── Save as draft ──────────────────────────────────────────────────────────
  const handleSaveDraft = async () => {
    const valid = newGoals.filter(g => g.title.trim() && g.category);
    if (!valid.length) return;

    setIsSaving(true);
    try {
      await Promise.all(
        valid.map(g =>
          goalsApi.create({
            title:         g.title.trim(),
            description:   g.description.trim() || undefined,
            category:      g.category,
            weightage:     g.weightage,
            targetValue:   g.target || undefined,
            unitOfMeasure: g.uomType || undefined,
            dueDate:       g.deadline || undefined,
          })
        )
      );
      showToast(`${valid.length} goal${valid.length > 1 ? "s" : ""} saved as draft`, "success");
      setIsDialogOpen(false);
      setNewGoals([{ ...emptyGoal }]);
      fetchGoals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Submit goals ───────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!canSubmit) return;
    setIsSaving(true);
    try {
      // Step 1: Create all goals as draft
      const created = await Promise.all(
        newGoals.map(g =>
          goalsApi.create({
            title:         g.title.trim(),
            description:   g.description.trim() || undefined,
            category:      g.category,
            weightage:     g.weightage,
            targetValue:   g.target || undefined,
            unitOfMeasure: g.uomType || undefined,
            dueDate:       g.deadline || undefined,
          })
        )
      );

      // Step 2: Submit each for manager approval
      await Promise.all(created.map(res => goalsApi.submit(res.data.id)));

      showToast(`${newGoals.length} goal${newGoals.length > 1 ? "s" : ""} submitted for approval!`, "success");
      setIsDialogOpen(false);
      setNewGoals([{ ...emptyGoal }]);
      fetchGoals();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit goals";
      showToast(msg, "error");
    } finally {
      setIsSaving(false);
    }
  };

  // ── Map API goal to GoalCard's expected shape ──────────────────────────────
  // GoalCard still uses the mock-data Goal shape, so we adapt
  const adaptGoal = (g: ApiGoal) => ({
    id:          g.id,
    userId:      g.employee_id,
    title:       g.title,
    description: "",
    thrustArea:  g.category,
    uomType:     (g.unit_of_measure ?? "Numeric") as "Numeric" | "Percentage" | "Timeline" | "Zero-based",
    target:      Number(g.target_value)  || 0,
    achievement: Number(g.current_value) || 0,
    weightage:   Number(g.weightage)     || 0,
    deadline:    g.due_date              ?? "",
    status:      mapStatus(g.status),
    quarter:     "Q2",
    isShared:    g.is_shared,
    childCount:  Number(g.child_count) || 0,
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">My Goals</h1>
            <p className="text-muted-foreground">Manage and track your quarterly goals</p>
          </div>

          {!isWindowOpen && activeCycle && (
            <div className="flex items-center gap-2 bg-destructive/10 text-destructive px-4 py-2 rounded-lg text-sm font-medium border border-destructive/20">
              <AlertCircle className="h-4 w-4" />
              Submission window closed for {activeCycle.name}
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button disabled={!isWindowOpen || goals.filter(g => g.status !== 'cancelled').length >= 8}>
                <Plus className="mr-2 h-4 w-4" /> Create Goals
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Goals</DialogTitle>
                <DialogDescription>
                  Add your goals for the quarter. Total weightage must equal 100% to submit.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                {/* Weightage Summary */}
                <Card className={!isWeightageValid ? "border-destructive" : ""}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Total Weightage</span>
                      <span className={`text-sm font-bold ${isWeightageValid ? "text-green-600" : "text-destructive"}`}>
                        {totalWeightage}%
                      </span>
                    </div>
                    <Progress value={Math.min(totalWeightage, 100)} className="h-2" />
                    <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                      {[
                        { ok: isWeightageValid, label: "Total = 100%" },
                        { ok: hasMinWeightage,  label: "Min 10% each" },
                        { ok: hasMaxGoals,      label: "Max 8 goals"  },
                      ].map(({ ok, label }) => (
                        <div key={label} className="flex items-center gap-1">
                          {ok
                            ? <CheckCircle className="h-3 w-3 text-green-600" />
                            : <AlertCircle className="h-3 w-3 text-destructive" />}
                          {label}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Goals Form */}
                {newGoals.map((goal, index) => {
                  const errs = goalErrors[index];
                  const isDupTitle = batchTitles.indexOf(goal.title.trim().toLowerCase()) !== index && goal.title.trim().length > 0;
                  return (
                    <Card key={index} className={isDupTitle ? "border-destructive/60" : ""}>
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">Goal {index + 1}</CardTitle>
                          {newGoals.length > 1 && (
                            <Button type="button" variant="ghost" size="icon"
                              onClick={() => removeGoal(index)}
                              className="h-8 w-8 text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        {isDupTitle && (
                          <p className="text-xs text-destructive flex items-center gap-1">
                            <AlertCircle className="h-3 w-3" /> Duplicate title — each goal must have a unique title.
                          </p>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor={`title-${index}`}>Goal Title <span className="text-destructive">*</span></Label>
                            <Input id={`title-${index}`} value={goal.title}
                              onChange={e => updateGoal(index, "title", e.target.value)}
                              placeholder="Enter goal title"
                              className={errs.title ? "border-destructive" : ""} />
                            {errs.title && <p className="text-xs text-destructive">{errs.title}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`category-${index}`}>Category <span className="text-destructive">*</span></Label>
                            <Select value={goal.category}
                              onValueChange={v => updateGoal(index, "category", v)}>
                              <SelectTrigger id={`category-${index}`}
                                className={errs.category ? "border-destructive" : ""}>
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                              <SelectContent>
                                {CATEGORY_OPTIONS.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {errs.category && <p className="text-xs text-destructive">{errs.category}</p>}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`desc-${index}`}>Description</Label>
                          <Textarea id={`desc-${index}`} value={goal.description}
                            onChange={e => updateGoal(index, "description", e.target.value)}
                            placeholder="Describe your goal" rows={2} />
                        </div>

                        <div className="grid gap-4 sm:grid-cols-4">
                          <div className="space-y-2">
                            <Label htmlFor={`uom-${index}`}>UoM Type</Label>
                            <Select value={goal.uomType}
                              onValueChange={v => updateGoal(index, "uomType", v)}>
                              <SelectTrigger id={`uom-${index}`}><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {uomOptions.map(opt => (
                                  <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`target-${index}`}>Target</Label>
                            <Input id={`target-${index}`} type="number"
                              value={goal.target || ""}
                              onChange={e => updateGoal(index, "target", Number(e.target.value))}
                              placeholder="0" />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`weight-${index}`}>Weightage (%)</Label>
                            <Input id={`weight-${index}`} type="number" min={10} max={100}
                              value={goal.weightage || ""}
                              onChange={e => updateGoal(index, "weightage", Number(e.target.value))}
                              placeholder="10"
                              className={errs.weightage ? "border-destructive" : ""} />
                            {errs.weightage && <p className="text-xs text-destructive">{errs.weightage}</p>}
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor={`deadline-${index}`}>Deadline</Label>
                            <Input id={`deadline-${index}`} type="date" value={goal.deadline}
                              onChange={e => updateGoal(index, "deadline", e.target.value)} />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}

                {/* Add Goal */}
                {newGoals.length < 8 && (
                  <Button type="button" variant="outline" onClick={addGoal} className="w-full">
                    <Plus className="mr-2 h-4 w-4" /> Add Another Goal
                  </Button>
                )}
              </div>

              <DialogFooter className="gap-2 flex-col sm:flex-row">
                {/* Blockers list */}
                {submitBlockers.length > 0 && (
                  <div className="flex-1 text-xs text-muted-foreground space-y-0.5 text-left">
                    {submitBlockers.slice(0, 3).map((b, i) => (
                      <p key={i} className="flex items-center gap-1">
                        <AlertCircle className="h-3 w-3 text-destructive shrink-0" /> {b}
                      </p>
                    ))}
                    {submitBlockers.length > 3 && (
                      <p className="text-muted-foreground">+{submitBlockers.length - 3} more issue{submitBlockers.length - 3 > 1 ? "s" : ""}…</p>
                    )}
                  </div>
                )}
                <div className="flex gap-2">
                  <Button type="button" variant="outline"
                    onClick={handleSaveDraft}
                    disabled={isSaving || !canDraft}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Save Draft
                  </Button>
                  <Button type="button"
                    onClick={handleSubmit}
                    disabled={isSaving || !canSubmit}>
                    {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
                    Submit Goals
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Goals Grid */}
        {isLoadingGoals ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : goals.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {goals.map(goal => (
              <GoalCard key={goal.id} goal={adaptGoal(goal)} />
            ))}
          </div>
        ) : (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center justify-center text-center">
              <div className="rounded-full bg-muted p-4 mb-4">
                <Plus className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-sm">
                You haven&apos;t created any goals for this quarter. Click the button above to get started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Toast */}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}

// Map backend status → frontend GoalCard status
function mapStatus(status: string): "not-started" | "on-track" | "completed" {
  switch (status) {
    case "completed":               return "completed";
    case "in_progress": case "approved": return "on-track";
    default:                        return "not-started";
  }
}
