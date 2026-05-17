"use client";

import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { KPICard } from "@/components/dashboard/kpi-card";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import { useAuth } from "@/lib/auth-context";
import { reportsApi, exportsApi, type ApiAdminDashboard } from "@/lib/api";
import {
  Users, Target, CheckCircle, BarChart3, TrendingUp, Clock,
  Download, RefreshCw, Shield, AlertCircle, FileSpreadsheet, Loader2
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, AreaChart, Area, LineChart, Line,
} from "recharts";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = {
  completed:   "#10b981",
  approved:    "#10b981",
  in_progress: "#3b82f6",
  submitted:   "#f59e0b",
  at_risk:     "#f59e0b",
  rejected:    "#ef4444",
  cancelled:   "#94a3b8",
  draft:       "#94a3b8",
  not_started: "#94a3b8",
  primary:     "#6366f1",
};

const STATUS_LABEL: Record<string, string> = {
  completed:   "Completed",
  in_progress: "In Progress",
  approved:    "Approved",
  submitted:   "Submitted",
  draft:       "Draft",
  rejected:    "Rejected",
  cancelled:   "Cancelled",
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Admin";

  const [data, setData]         = useState<ApiAdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "csv" | "excel") => {
    setIsExporting(true);
    try {
      await exportsApi.triggerDownload("goals", format);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const fetchData = () => {
    setIsLoading(true);
    setError(null);
    reportsApi
      .adminDashboard()
      .then(res => setData(res.data))
      .catch(() => setError("Failed to load dashboard data"))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="h-44 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 animate-pulse" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-72 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-white shadow-xl border border-slate-700">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span className="text-slate-400 text-sm font-medium">Admin Portal</span>
            </div>
            <h1 className="text-2xl font-bold">Welcome back, {firstName}</h1>
          </div>
          <Card className="border-destructive/40 bg-destructive/5">
            <CardContent className="flex items-center gap-3 pt-6">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">{error ?? "No data available"}</p>
              <Button size="sm" variant="outline" className="ml-auto" onClick={fetchData}>
                Retry
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────
  const db   = data.dashboard;
  const deps = data.departments;

  const totalUsers       = Number(db.active_users)       || 0;
  const totalEmployees   = Number(db.total_employees)    || 0;
  const pendingApprovals = Number(db.pending_approvals)  || 0;
  const totalGoals       = Number(db.total_goals)        || 0;
  const completedGoals   = Number(db.completed_goals)    || 0;
  const avgProgress      = Math.round(Number(db.avg_progress) || 0);

  // Dept bar chart (maps API shape to chart shape)
  const departmentChartData = deps.map(d => ({
    department: d.department,
    completion: Math.round(Number(d.avg_progress) || 0),
    employees:  Number(d.total_employees),
  }));

  // Goal distribution donut
  const goalDistribution = data.distribution.byStatus.map(s => ({
    name:  STATUS_LABEL[s.status] ?? s.status,
    value: Number(s.count),
    color: COLORS[s.status as keyof typeof COLORS] ?? "#94a3b8",
  })).filter(d => d.value > 0);

  // Monthly trend (Area chart) — fallback to zeros if no check-ins yet
  const trendData = data.monthlyTrend.length > 0
    ? data.monthlyTrend.map(t => ({
        month:      t.month,
        completion: Number(t.completion),
        employees:  Number(t.employees),
      }))
    : [
        { month: "Jan", completion: 0, employees: 0 },
        { month: "Feb", completion: 0, employees: 0 },
        { month: "Mar", completion: 0, employees: 0 },
        { month: "Apr", completion: 0, employees: 0 },
        { month: "May", completion: 0, employees: 0 },
        { month: "Jun", completion: 0, employees: 0 },
      ];

  // Quarter-on-quarter line chart
  const quarterlyCompletion = data.quarterlyTrend.map(q => ({
    quarter:    q.quarter,
    completion: Number(q.completion),
  }));

  const avgOrgCompletion = deps.length
    ? Math.round(deps.reduce((a, d) => a + Number(d.avg_progress || 0), 0) / deps.length)
    : avgProgress;

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Executive Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 text-white shadow-xl border border-slate-700">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-4 w-4 text-indigo-400" />
              <span className="text-slate-400 text-sm font-medium">
                Admin Portal · Organization Overview
              </span>
            </div>
            <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName}</h1>
            <p className="text-slate-400 text-sm mb-4">
              Organization is at{" "}
              <span className="text-emerald-400 font-bold">{avgOrgCompletion}% completion</span>{" "}
              this quarter across {deps.length} department{deps.length !== 1 ? "s" : ""}.
            </p>
            <div className="flex gap-3">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" disabled={isExporting} className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                    {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                    Export Report
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleExport("excel")}>
                    <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" /> Excel (.xlsx)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleExport("csv")}>
                    <Download className="h-4 w-4 mr-2" /> CSV (.csv)
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="sm" variant="outline"
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-1" /> Refresh Data
              </Button>
            </div>
          </div>
          {/* Decorations */}
          <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-indigo-500/5" />
          <div className="absolute right-24 -bottom-8 h-36 w-36 rounded-full bg-purple-500/5" />
          {/* Stat pills */}
          <div className="absolute top-6 right-6 hidden lg:flex gap-2">
            {[
              { label: "Active Users",  value: totalUsers,       bg: "bg-emerald-500/20 text-emerald-300" },
              { label: "Total Goals",   value: totalGoals,       bg: "bg-blue-500/20 text-blue-300"       },
              { label: "Pending",       value: pendingApprovals, bg: "bg-amber-500/20 text-amber-300"    },
            ].map(s => (
              <div key={s.label} className={`rounded-xl px-3 py-2 text-center ${s.bg}`}>
                <p className="text-lg font-bold">{s.value}</p>
                <p className="text-xs opacity-80">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KPICard title="Total Users"          value={totalUsers}       subtitle={`${totalEmployees} employees`}        icon={Users}     color="blue"   trend={{ value: 8,  isPositive: true }} />
          <KPICard title="Org Completion"       value={`${avgOrgCompletion}%`} subtitle="Avg across departments"         icon={Target}    color="green"  trend={{ value: 5,  isPositive: true }} />
          <KPICard title="Pending Approvals"    value={pendingApprovals} subtitle="Awaiting manager review"              icon={Clock}     color="amber" />
          <KPICard title="Goals Completed"      value={completedGoals}   subtitle={`of ${totalGoals} total goals`}       icon={CheckCircle} color="green" trend={{ value: 12, isPositive: true }} />
          <KPICard title="Avg Goal Progress"    value={`${avgProgress}%`} subtitle="Across all active goals"            icon={BarChart3} color="purple" trend={{ value: 2,  isPositive: true }} />
          <KPICard title="Active Departments"   value={deps.length}      subtitle="All reporting on track"               icon={TrendingUp} color="cyan" />
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Department Performance Bar */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Department Performance</CardTitle>
              <CardDescription>Goal completion rate by department</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {departmentChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={departmentChartData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis dataKey="department" tick={{ fontSize: 11 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        formatter={(v) => [`${v}%`, "Completion"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                      />
                      <Bar dataKey="completion" radius={[6, 6, 0, 0]} name="Completion %">
                        {departmentChartData.map((d, i) => (
                          <Cell key={i} fill={
                            d.completion >= 88 ? COLORS.completed :
                            d.completion >= 75 ? COLORS.in_progress : COLORS.at_risk
                          } />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    No department data yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Goal Distribution Donut */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Goal Distribution</CardTitle>
              <CardDescription>Organization-wide goal status breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {goalDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={goalDistribution} cx="50%" cy="50%"
                        innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value">
                        {goalDistribution.map((e, i) => (
                          <Cell key={i} fill={e.color} stroke="transparent" />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Legend iconType="circle" iconSize={8} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    No goals created yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Monthly Completion Trend Area */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Completion Trend</CardTitle>
              <CardDescription>Monthly check-in progress rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                    <defs>
                      <linearGradient id="completionGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={COLORS.primary} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}   />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <Tooltip formatter={(v) => [`${v}%`, "Completion"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Area type="monotone" dataKey="completion" stroke={COLORS.primary} strokeWidth={2.5}
                      fill="url(#completionGrad)" name="Completion %" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Quarter-on-Quarter Line */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Quarter-on-Quarter Trend</CardTitle>
              <CardDescription>Historical completion across quarters</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {quarterlyCompletion.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={quarterlyCompletion} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="quarter" tick={{ fontSize: 10 }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                      <Tooltip formatter={(v) => [`${v}%`, "Completion"]}
                        contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                      <Line type="monotone" dataKey="completion" stroke={COLORS.completed} strokeWidth={2.5}
                        dot={{ fill: COLORS.completed, r: 4 }} name="Completion %" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm">
                    No historical data yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Summary Table */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-base font-semibold">Department Summary</CardTitle>
              <CardDescription>Performance overview across all departments</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    {["Department", "Employees", "Completion", "Status"].map(h => (
                      <th key={h} className="py-3 px-4 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deps.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        No department data available.
                      </td>
                    </tr>
                  ) : (
                    deps.map(dept => {
                      const pct = Math.round(Number(dept.avg_progress) || 0);
                      return (
                        <tr key={dept.department_id}
                          className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors">
                          <td className="py-3 px-4 font-medium text-sm">{dept.department}</td>
                          <td className="py-3 px-4 text-sm text-muted-foreground">{dept.total_employees}</td>
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Progress value={pct} className="h-1.5 w-24" />
                              <span className="text-sm font-semibold w-10">{pct}%</span>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
                              pct >= 88
                                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-400"
                                : pct >= 75
                                ? "bg-blue-500/10 text-blue-700 border-blue-500/20 dark:text-blue-400"
                                : "bg-amber-500/10 text-amber-700 border-amber-500/20 dark:text-amber-400"
                            }`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${
                                pct >= 88 ? "bg-emerald-500" : pct >= 75 ? "bg-blue-500" : "bg-amber-500"
                              }`} />
                              {pct >= 88 ? "Excellent" : pct >= 75 ? "Good" : "Needs Attention"}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Top Performers</CardTitle>
            <CardDescription>Highest achieving employees this quarter</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.leaderboard.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No performance data yet — goals need to be approved and tracked.
              </p>
            ) : (
              data.leaderboard.map((emp, i) => (
                <div key={emp.name} className="flex items-center gap-4">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    i === 0 ? "bg-amber-400 text-amber-900" :
                    i === 1 ? "bg-slate-300 text-slate-700" :
                    i === 2 ? "bg-orange-400 text-orange-900" :
                              "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">{emp.name}</span>
                      <span className="text-sm font-bold">{Math.round(Number(emp.score))}%</span>
                    </div>
                    <Progress value={Number(emp.score)} className="h-1.5" />
                  </div>
                  <span className="text-xs text-muted-foreground w-14 text-right">
                    {emp.goals} goals
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Recent Activity Feed */}
        <Card className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Recent Activity</CardTitle>
            <CardDescription>Latest actions from the audit log</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-2">
            {!data.recentActivity || data.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity recorded.
              </p>
            ) : (
              <div className="relative space-y-4 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                {data.recentActivity.slice(0, 5).map((log, i) => (
                  <div key={log.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    {/* Icon */}
                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-100 text-slate-500 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                      <Clock className="w-4 h-4" />
                    </div>
                    {/* Card */}
                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-3 rounded-lg border border-slate-200 bg-white shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-slate-900 text-xs uppercase">{log.action} {log.entity_type}</span>
                        <span className="text-xs text-slate-500 font-medium">
                          {new Date(log.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-slate-600">
                        <span className="font-medium text-slate-800">{log.user_name}</span> performed an action.
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
