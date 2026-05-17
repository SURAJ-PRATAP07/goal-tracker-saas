"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { KPICard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import { useAuth } from "@/lib/auth-context";
import { reportsApi, type ApiEmployeeDashboard } from "@/lib/api";
import {
  Target, CheckCircle, Clock, TrendingUp, Calendar,
  Plus, ArrowRight, Zap, Award, Flame, AlertCircle,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  PieChart, Pie, Cell, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import Link from "next/link";

const CHART_COLORS = {
  completed:  "#10b981",
  on_track:   "#3b82f6",
  approved:   "#3b82f6",
  in_progress:"#6366f1",
  at_risk:    "#f59e0b",
  not_started:"#94a3b8",
  draft:      "#94a3b8",
  submitted:  "#f59e0b",
  planned:    "#94a3b8",
  actual:     "#6366f1",
};

function WelcomeBanner({ name }: { name: string }) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 p-6 text-white shadow-lg">
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-1">
          <Flame className="h-4 w-4 text-orange-300" />
          <span className="text-blue-200 text-sm">{today}</span>
        </div>
        <h1 className="text-2xl font-bold mb-1">{greeting}, {name}! 👋</h1>
        <p className="text-blue-200 text-sm mb-4">
          You&apos;re making great progress. Keep pushing towards your goals!
        </p>
        <div className="flex gap-3">
          <Link href="/employee/goals">
            <Button size="sm" className="bg-white text-blue-700 hover:bg-blue-50 font-semibold">
              <Plus className="h-4 w-4 mr-1" /> New Goal
            </Button>
          </Link>
          <Link href="/employee/checkins">
            <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Calendar className="h-4 w-4 mr-1" /> Check-in
            </Button>
          </Link>
        </div>
      </div>
      <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="absolute -right-4 top-12 h-24 w-24 rounded-full bg-white/5" />
      <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/5" />
    </div>
  );
}

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "there";

  const [data, setData]       = useState<ApiEmployeeDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    reportsApi
      .employeeDashboard()
      .then((res) => setData(res.data))
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setIsLoading(false));
  }, []);

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-44 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-64 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <WelcomeBanner name={firstName} />
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error ?? "No data available"}</p>
              <Button size="sm" variant="outline" className="ml-auto"
                onClick={() => { setIsLoading(true); setError(null);
                  reportsApi.employeeDashboard()
                    .then(r => setData(r.data))
                    .catch(() => setError("Failed to load dashboard data"))
                    .finally(() => setIsLoading(false));
                }}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived values from real API data ────────────────────────────────────────
  const stats        = data.stats;
  const goals        = data.goals;
  const totalGoals   = Number(stats.total_goals)      || 0;
  const completedGoals= Number(stats.completed_goals) || 0;
  const notStarted   = Number(stats.not_started)      || 0;
  const avgProgress  = Number(stats.avg_progress)     || 0;

  // Pie chart — goal status distribution
  const statusBreakdown = [
    { name: "Completed",   value: completedGoals,               color: CHART_COLORS.completed  },
    { name: "In Progress", value: Number(stats.in_progress)||0, color: CHART_COLORS.in_progress},
    { name: "Not Started", value: notStarted,                   color: CHART_COLORS.not_started},
  ].filter(d => d.value > 0);

  // Line chart — quarterly progress (planned vs actual)
  const quarterlyProgress = data.quarterlyTrend.length > 0
    ? data.quarterlyTrend
    : [
        { quarter: "Q1", q_num: 1, planned: 100, actual: 0 },
        { quarter: "Q2", q_num: 2, planned: 100, actual: 0 },
        { quarter: "Q3", q_num: 3, planned: 100, actual: 0 },
        { quarter: "Q4", q_num: 4, planned: 100, actual: 0 },
      ];

  // Bar chart — achievement vs target
  const achievementData = goals.map(g => ({
    name:   g.title.length > 18 ? g.title.slice(0, 18) + "…" : g.title,
    Target: Number(g.target_value)  || 0,
    Actual: Number(g.current_value) || 0,
  }));

  // Completion % for the quick-stat card
  const completionRate = totalGoals ? Math.round((completedGoals / totalGoals) * 100) : 0;

  const upcomingCheckIns = [
    { quarter: "Q2 2026", dueDate: "Jun 30, 2026", status: "upcoming" },
    { quarter: "Q3 2026", dueDate: "Sep 30, 2026", status: "future"   },
    { quarter: "Q4 2026", dueDate: "Dec 31, 2026", status: "future"   },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Welcome Banner */}
        <WelcomeBanner name={firstName} />

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard
            title="Total Goals"
            value={totalGoals}
            subtitle="Active this quarter"
            icon={Target}
            color="blue"
          />
          <KPICard
            title="Completed"
            value={completedGoals}
            subtitle={`${completionRate}% completion rate`}
            icon={CheckCircle}
            trend={{ value: 15, isPositive: true }}
            color="green"
          />
          <KPICard
            title="Not Started"
            value={notStarted}
            subtitle="Goals pending start"
            icon={Clock}
            color="amber"
          />
          <KPICard
            title="Avg Progress"
            value={`${Math.round(avgProgress)}%`}
            subtitle="Across all goals"
            icon={TrendingUp}
            trend={{ value: 8, isPositive: true }}
            color="purple"
          />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Goal Status Donut */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Goal Status Distribution</CardTitle>
              <CardDescription>Breakdown of your {totalGoals} goals by status</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                {statusBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={statusBreakdown}
                        cx="50%" cy="50%"
                        innerRadius={65} outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, value }) => `${name}: ${value}`}
                        labelLine={false}
                      >
                        {statusBreakdown.map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v, n) => [v, n]} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    No goals yet — create your first goal!
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Quarterly Progress Line */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quarterly Progress</CardTitle>
              <CardDescription>Planned vs actual achievement by quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={quarterlyProgress}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} domain={[0, 100]} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Legend iconType="circle" iconSize={8} />
                    <Line type="monotone" dataKey="planned" stroke={CHART_COLORS.planned}
                      strokeWidth={2} dot={{ fill: CHART_COLORS.planned, r: 4 }}
                      name="Planned" strokeDasharray="5 5" />
                    <Line type="monotone" dataKey="actual" stroke={CHART_COLORS.actual}
                      strokeWidth={2.5} dot={{ fill: CHART_COLORS.actual, r: 4 }}
                      name="Actual" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Achievement vs Target Bar */}
        {achievementData.length > 0 && (
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Achievement vs Target</CardTitle>
              <CardDescription>How your actual performance compares to targets</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={achievementData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Legend iconType="circle" iconSize={8} />
                    <Bar dataKey="Target" fill={CHART_COLORS.not_started} radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual"  fill={CHART_COLORS.in_progress} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Bottom: Goal list + Check-ins */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Goal Progress List */}
          <div className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">
                My Goals {data.activeCycle ? `— ${data.activeCycle.name}` : ""}
              </h2>
              <Link href="/employee/goals">
                <Button variant="ghost" size="sm" className="text-primary gap-1">
                  View all <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>

            {goals.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-10 text-center">
                  <Target className="h-8 w-8 text-muted-foreground mb-3" />
                  <p className="text-sm text-muted-foreground">No goals yet.</p>
                  <Link href="/employee/goals">
                    <Button size="sm" className="mt-3">
                      <Plus className="h-4 w-4 mr-1" /> Create Goals
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {goals.map((goal) => {
                  const pct = goal.target_value > 0
                    ? Math.min(Math.round((goal.current_value / goal.target_value) * 100), 100)
                    : 0;
                  return (
                    <div key={goal.id}
                      className="group rounded-xl border border-border bg-card p-4 hover:shadow-md hover:border-primary/30 transition-all duration-200">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{goal.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {goal.category} · {goal.weightage}% weight
                          </p>
                        </div>
                        <StatusBadge status={goal.status} className="ml-3 shrink-0" />
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            {goal.current_value} / {goal.target_value}
                            {goal.unit_of_measure ? ` ${goal.unit_of_measure}` : ""}
                          </span>
                          <span className="font-semibold text-foreground">{pct}%</span>
                        </div>
                        <Progress value={pct} className="h-1.5" />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Upcoming Check-ins */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold">Upcoming Check-ins</h2>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-border">
                  {upcomingCheckIns.map((ci, i) => (
                    <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <Calendar className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{ci.quarter}</p>
                          <p className="text-xs text-muted-foreground">Due: {ci.dueDate}</p>
                        </div>
                      </div>
                      <StatusBadge status={ci.status === "upcoming" ? "on-track" : "not-started"} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Stat */}
            <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-200 dark:border-emerald-800">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/20 p-2.5">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">
                    {completedGoals} of {totalGoals} goals done
                  </p>
                  <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">
                    Keep up the great work!
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
