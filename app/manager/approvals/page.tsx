"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { goalsApi, type ApiPendingGoal } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle, XCircle, RotateCcw, Search, Eye,
  MessageSquare, Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

type ActionType = "approve" | "reject" | "rework" | null;

interface EmployeeGroup {
  employeeId:   string;
  employeeName: string;
  empCode:      string;
  department:   string;
  cycleName:    string;
  submittedDate:string;
  goals:        ApiPendingGoal[];
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-blue-500","bg-emerald-500","bg-purple-500",
    "bg-amber-500","bg-rose-500","bg-cyan-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

type ToastType = "success" | "error";
interface Toast { message: string; type: ToastType }

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
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

export default function ManagerApprovalsPage() {
  const [search, setSearch]                   = useState("");
  const [employeeGroups, setEmployeeGroups]   = useState<EmployeeGroup[]>([]);
  const [isLoading, setIsLoading]             = useState(true);
  const [expandedId, setExpandedId]           = useState<string | null>(null);
  const [selectedGroup, setSelectedGroup]     = useState<EmployeeGroup | null>(null);
  const [commentModalOpen, setCommentModalOpen] = useState(false);
  const [comment, setComment]                 = useState("");
  const [actionType, setActionType]           = useState<ActionType>(null);
  const [isActing, setIsActing]               = useState(false);
  const [toast, setToast]                     = useState<Toast | null>(null);

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch pending approvals ─────────────────────────────────────────────────
  const fetchApprovals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await goalsApi.getPendingApprovals();
      const goals: ApiPendingGoal[] = Array.isArray(res.data) ? res.data : [];

      // Group goals by employee
      const map: Record<string, EmployeeGroup> = {};
      for (const g of goals) {
        if (!map[g.employee_id]) {
          map[g.employee_id] = {
            employeeId:    g.employee_id,
            employeeName:  g.employee_name ?? "Unknown",
            empCode:       g.emp_code ?? "",
            department:    "",
            cycleName:     g.cycle_name ?? "Current Cycle",
            submittedDate: g.submitted_at
              ? new Date(g.submitted_at as unknown as string).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
              : "—",
            goals: [],
          };
        }
        map[g.employee_id].goals.push(g);
      }
      setEmployeeGroups(Object.values(map));
    } catch {
      showToast("Failed to load pending approvals", "error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { fetchApprovals(); }, [fetchApprovals]);

  // ── Action flow ─────────────────────────────────────────────────────────────
  const handleAction = (group: EmployeeGroup, action: ActionType) => {
    setSelectedGroup(group);
    setActionType(action);
    setComment("");
    setCommentModalOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedGroup || !actionType) return;
    if ((actionType === "reject" || actionType === "rework") && !comment.trim()) return;

    setIsActing(true);
    try {
      const goalIds = selectedGroup.goals.map(g => g.id);

      if (actionType === "approve") {
        await Promise.all(goalIds.map(id => goalsApi.approve(id)));
        showToast(`${selectedGroup.employeeName}'s goals approved successfully`, "success");
      } else {
        // reject + rework both map to "reject" on the backend — reason differentiates
        const reason = actionType === "rework"
          ? `[Rework requested] ${comment.trim()}`
          : comment.trim();
        await Promise.all(goalIds.map(id => goalsApi.reject(id, reason)));
        showToast(
          actionType === "rework"
            ? `Rework requested for ${selectedGroup.employeeName}'s goals`
            : `${selectedGroup.employeeName}'s goals rejected`,
          "success"
        );
      }

      // Remove employee from the list (optimistic update)
      setEmployeeGroups(prev => prev.filter(g => g.employeeId !== selectedGroup.employeeId));
      setCommentModalOpen(false);
      setSelectedGroup(null);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Action failed. Please try again.";
      showToast(msg, "error");
    } finally {
      setIsActing(false);
    }
  };

  const totalWeightage = (goals: ApiPendingGoal[]) =>
    goals.reduce((a, g) => a + Number(g.weightage), 0);

  const filtered = employeeGroups.filter(group =>
    group.employeeName.toLowerCase().includes(search.toLowerCase()) ||
    group.cycleName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Goal Approvals</h1>
            <p className="text-muted-foreground">Review and approve employee goal sheets</p>
          </div>
          <div className="flex items-center gap-3">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : (
              <Badge variant="outline" className="px-3 py-1">
                {employeeGroups.length} Pending
              </Badge>
            )}
          </div>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by name or cycle..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="pl-8" />
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-36 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Approval Cards */}
        {!isLoading && (
          <div className="space-y-4">
            {filtered.map(group => (
              <Card key={group.employeeId}>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className={`${getAvatarColor(group.employeeName)} text-white font-semibold`}>
                          {getInitials(group.employeeName)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-lg">{group.employeeName}</CardTitle>
                        <CardDescription>
                          {group.empCode && `${group.empCode} · `}Submitted {group.submittedDate}
                        </CardDescription>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline"
                        onClick={() => setExpandedId(expandedId === group.employeeId ? null : group.employeeId)}>
                        <Eye className="mr-2 h-4 w-4" />
                        {expandedId === group.employeeId ? "Hide" : "View"} Goals
                      </Button>
                      <Button size="sm" variant="default"
                        onClick={() => handleAction(group, "approve")}>
                        <CheckCircle className="mr-2 h-4 w-4" /> Approve
                      </Button>
                      <Button size="sm" variant="outline"
                        onClick={() => handleAction(group, "rework")}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Rework
                      </Button>
                      <Button size="sm" variant="destructive"
                        onClick={() => handleAction(group, "reject")}>
                        <XCircle className="mr-2 h-4 w-4" /> Reject
                      </Button>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                    {[
                      { label: "Total Goals",      value: group.goals.length,          highlight: false },
                      { label: "Total Weightage",  value: `${totalWeightage(group.goals)}%`,
                        highlight: totalWeightage(group.goals) === 100 },
                      { label: "Status",           value: <StatusBadge status="submitted" />, highlight: false },
                      { label: "Quarter",          value: group.cycleName,             highlight: false },
                    ].map((stat, i) => (
                      <div key={i} className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">{stat.label}</p>
                        {typeof stat.value === "string" ? (
                          <p className={`text-lg font-semibold ${stat.highlight ? "text-green-600" : ""}`}>
                            {stat.value}
                          </p>
                        ) : (
                          <div className="mt-0.5">{stat.value}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </CardHeader>

                {/* Expandable Goals Table */}
                {expandedId === group.employeeId && (
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50">
                            <TableHead>Goal</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>UoM</TableHead>
                            <TableHead>Target</TableHead>
                            <TableHead>Weightage</TableHead>
                            <TableHead>Deadline</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.goals.map(goal => (
                            <TableRow key={goal.id}>
                              <TableCell>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="font-medium">{goal.title}</p>
                                  {goal.is_shared && (
                                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 hover:bg-purple-100 border-purple-200 text-[10px] px-1.5 py-0">
                                      Shared
                                    </Badge>
                                  )}
                                </div>
                                {goal.rejection_reason && (
                                  <p className="text-xs text-destructive mt-0.5 line-clamp-1">
                                    {goal.rejection_reason}
                                  </p>
                                )}
                              </TableCell>
                              <TableCell className="capitalize">{goal.category}</TableCell>
                              <TableCell>{goal.unit_of_measure ?? "Numeric"}</TableCell>
                              <TableCell>
                                {goal.target_value}
                                {goal.unit_of_measure === "Percentage" ? "%" : ""}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={Number(goal.weightage)} className="h-2 w-12" />
                                  <span className="text-sm">{goal.weightage}%</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                {goal.due_date
                                  ? new Date(goal.due_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                                  : "—"}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                )}
              </Card>
            ))}

            {filtered.length === 0 && (
              <Card className="py-12">
                <CardContent className="flex flex-col items-center justify-center text-center">
                  <CheckCircle2 className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">All Caught Up!</h3>
                  <p className="text-muted-foreground">
                    {search ? "No results match your search." : "No pending approvals at the moment."}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Action Confirmation Modal */}
        <Dialog open={commentModalOpen} onOpenChange={setCommentModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionType === "approve" ? "Approve Goals"
                  : actionType === "reject" ? "Reject Goals"
                  : "Request Rework"}
              </DialogTitle>
              <DialogDescription>
                {actionType === "approve"
                  ? `Approving all ${selectedGroup?.goals.length ?? 0} goals for ${selectedGroup?.employeeName}`
                  : "Please provide a reason for this action."}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              {selectedGroup && (
                <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-3">
                  <Avatar>
                    <AvatarFallback className={`${getAvatarColor(selectedGroup.employeeName)} text-white text-sm font-semibold`}>
                      {getInitials(selectedGroup.employeeName)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedGroup.employeeName}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedGroup.goals.length} goal{selectedGroup.goals.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              )}
              <Textarea
                placeholder={
                  actionType === "approve"
                    ? "Add an optional comment for the employee..."
                    : "Enter your feedback (required)..."
                }
                value={comment}
                onChange={e => setComment(e.target.value)}
                rows={4}
              />
              {(actionType === "reject" || actionType === "rework") && !comment.trim() && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Feedback is required for this action
                </p>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCommentModalOpen(false)} disabled={isActing}>
                Cancel
              </Button>
              <Button
                variant={actionType === "reject" ? "destructive" : "default"}
                onClick={confirmAction}
                disabled={
                  isActing ||
                  ((actionType === "reject" || actionType === "rework") && !comment.trim())
                }>
                {isActing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MessageSquare className="mr-2 h-4 w-4" />
                )}
                {actionType === "approve" ? "Approve"
                  : actionType === "reject" ? "Reject"
                  : "Request Rework"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Toast */}
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
