"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import { reportsApi, checkInsApi, type ApiManagerDashboard, type ApiCheckIn } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RefreshCw, AlertCircle, Users, CheckCircle, ChevronDown, ChevronUp, MessageSquare, Loader2
} from "lucide-react";
import { format } from "date-fns";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  on_track:  { label: "On Track",  color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400" },
  at_risk:   { label: "At Risk",   color: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400" },
  behind:    { label: "Behind",    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400" },
  completed: { label: "Completed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-400" },
};

function CheckInRow({ ci, onFeedbackSaved }: { ci: any, onFeedbackSaved: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const [feedback, setFeedback] = useState(ci.manager_notes || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await checkInsApi.addFeedback(ci.id, feedback);
      onFeedbackSaved();
    } catch {
      alert("Failed to save feedback");
    } finally {
      setIsSaving(false);
    }
  };

  const cfg = STATUS_CONFIG[ci.status] || STATUS_CONFIG.on_track;

  return (
    <div className="border rounded-lg mb-2 overflow-hidden bg-background">
      <div 
        className="flex items-center justify-between p-3 cursor-pointer hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 grid grid-cols-4 gap-4 items-center">
          <div className="col-span-2">
            <p className="font-medium text-sm line-clamp-1">{ci.goal_title}</p>
            <p className="text-xs text-muted-foreground">{format(new Date(ci.check_in_date), "MMM dd, yyyy")}</p>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <Progress value={Number(ci.progress_percent)} className="h-1.5 flex-1" />
              <span className="text-xs font-medium">{Math.round(Number(ci.progress_percent))}%</span>
            </div>
          </div>
          <div className="flex justify-end">
            <Badge variant="secondary" className={`text-xs ${cfg.color}`}>
              {cfg.label}
            </Badge>
          </div>
        </div>
        <div className="ml-4 pl-4 border-l">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </div>
      
      {expanded && (
        <div className="p-4 bg-muted/20 border-t space-y-4">
          {ci.employee_notes && (
            <div className="bg-background border rounded p-3 text-sm">
              <p className="font-semibold text-xs text-muted-foreground mb-1 uppercase">Employee Notes</p>
              <p>{ci.employee_notes}</p>
            </div>
          )}
          
          <div className="space-y-2">
            <p className="font-semibold text-xs text-muted-foreground uppercase flex items-center gap-1">
              <MessageSquare className="h-3 w-3" /> Manager Feedback
            </p>
            <Textarea 
              value={feedback} 
              onChange={e => setFeedback(e.target.value)}
              placeholder="Add your feedback or notes for this check-in..."
              className="bg-background"
              rows={2}
            />
            <div className="flex justify-end">
              <Button size="sm" onClick={handleSave} disabled={isSaving || !feedback || feedback === ci.manager_notes}>
                {isSaving ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : null}
                Save Feedback
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmployeeRow({ emp }: { emp: any }) {
  const [expanded, setExpanded] = useState(false);
  const [checkins, setCheckins] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCheckins = async () => {
    setIsLoading(true);
    try {
      const res = await checkInsApi.getAll({ employeeId: emp.id, limit: "10" }) as any;
      setCheckins(res.data.rows || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpand = () => {
    if (!expanded && checkins.length === 0) {
      fetchCheckins();
    }
    setExpanded(!expanded);
  };

  return (
    <>
      <TableRow className="cursor-pointer group" onClick={handleExpand}>
        <TableCell>
          <div className="font-medium">{emp.name}</div>
          <div className="text-xs text-muted-foreground">{emp.department}</div>
        </TableCell>
        <TableCell className="text-right">{emp.total_goals}</TableCell>
        <TableCell className="text-right">{emp.goals_completed}</TableCell>
        <TableCell>
          <div className="flex items-center gap-2">
            <Progress value={emp.progress} className="h-2 flex-1" />
            <span className="text-xs font-semibold w-8">{Math.round(emp.progress)}%</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </TableCell>
      </TableRow>
      
      {expanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={5} className="p-0 border-b-0">
            <div className="p-4 pl-6 border-l-2 border-l-primary mx-2 my-2 bg-card rounded-r-lg shadow-sm">
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-muted-foreground" /> Recent Check-ins
              </h4>
              
              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : checkins.length > 0 ? (
                <div className="space-y-1">
                  {checkins.map(ci => (
                    <CheckInRow key={ci.id} ci={ci} onFeedbackSaved={fetchCheckins} />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic p-2">No recent check-ins found for {emp.name}.</p>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function TeamProgressPage() {
  const [data, setData] = useState<ApiManagerDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await reportsApi.managerDashboard();
      setData(res.data);
    } catch {
      setError("Failed to load team progress.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Loading
  if (isLoading && !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-8 w-48 bg-muted rounded animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-3">
            {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <SkeletonCard className="h-[400px]" />
        </div>
      </DashboardLayout>
    );
  }

  // Error
  if (error && !data) {
    return (
      <DashboardLayout>
        <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 flex flex-col items-center justify-center text-center">
          <AlertCircle className="h-8 w-8 text-destructive mb-3" />
          <p className="text-sm text-destructive">{error}</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={fetchData}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  const team = data.team || [];
  const avgTeamProgress = team.length ? team.reduce((acc, emp) => acc + Number(emp.progress), 0) / team.length : 0;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Team Progress & Check-ins</h1>
            <p className="text-muted-foreground">
              Monitor team goals, review check-ins, and provide feedback.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* KPI Row */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Users className="h-4 w-4" />
              <span className="text-sm font-medium">Team Members</span>
            </div>
            <p className="text-3xl font-bold">{team.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm font-medium">Avg Completion</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-3xl font-bold">{Math.round(avgTeamProgress)}%</p>
            </div>
            <Progress value={avgTeamProgress} className="h-2 mt-3" />
          </div>
          <div className="rounded-xl border bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Active Check-ins</span>
            </div>
            <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">Review</p>
            <p className="text-xs text-muted-foreground mt-1">Expand employees below</p>
          </div>
        </div>

        {/* Team Table */}
        <Card>
          <CardHeader>
            <CardTitle>Team Goal Status</CardTitle>
            <CardDescription>Click on an employee to review their latest goal check-ins</CardDescription>
          </CardHeader>
          <CardContent>
            {team.length > 0 ? (
              <div className="border rounded-md">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead className="text-right">Total Goals</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="w-[30%]">Avg Progress</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {team.map(emp => <EmployeeRow key={emp.id} emp={emp} />)}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-12 text-center text-muted-foreground border rounded-md border-dashed">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-20" />
                <p>No team members found.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
