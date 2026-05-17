"use client";

import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { KPICard } from "@/components/dashboard/kpi-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { useAuth } from "@/lib/auth-context";
import { pendingApprovals, teamProgress } from "@/lib/mock-data";
import {
  Users, FileCheck, TrendingUp, AlertTriangle, Clock,
  ArrowRight, CheckCircle2, XCircle, ChevronRight,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
} from "recharts";
import Link from "next/link";

const CHART_COLORS = {
  pending: "#f59e0b",
  approved: "#10b981",
  rejected: "#ef4444",
  primary: "#6366f1",
  secondary: "#3b82f6",
};

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    "bg-blue-500", "bg-emerald-500", "bg-purple-500",
    "bg-amber-500", "bg-rose-500", "bg-cyan-500",
  ];
  return colors[name.charCodeAt(0) % colors.length];
}

export default function ManagerDashboard() {
  const { user } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? "Manager";

  const totalTeamMembers = teamProgress.length;
  const pendingCount = pendingApprovals.length;
  const avgTeamProgress = teamProgress.reduce((a, t) => a + t.progress, 0) / totalTeamMembers;
  const delayedCheckIns = teamProgress.filter(t => t.quarterlyStatus === "At Risk").length;
  const completedMembers = teamProgress.filter(t => t.quarterlyStatus === "Completed").length;

  const approvalStatusData = [
    { name: "Pending", value: pendingCount, color: CHART_COLORS.pending },
    { name: "Approved", value: 8, color: CHART_COLORS.approved },
    { name: "Rejected", value: 2, color: CHART_COLORS.rejected },
  ];

  const radarData = teamProgress.map(m => ({
    member: m.name.split(" ")[0],
    Progress: m.progress,
    "Goals": Math.round((m.goalsCompleted / m.totalGoals) * 100),
  }));

  return (
    <DashboardLayout>
      <div className="space-y-6">

        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-purple-700 to-indigo-800 p-6 text-white shadow-lg">
          <div className="relative z-10">
            <p className="text-purple-200 text-sm mb-1">Manager Portal</p>
            <h1 className="text-2xl font-bold mb-1">Welcome back, {firstName}!</h1>
            <p className="text-purple-200 text-sm mb-4">
              You have <span className="font-bold text-white">{pendingCount} goals</span> pending your approval.
            </p>
            <div className="flex gap-3">
              <Link href="/manager/approvals">
                <Button size="sm" className="bg-white text-purple-700 hover:bg-purple-50 font-semibold">
                  <FileCheck className="h-4 w-4 mr-1" /> Review Approvals
                </Button>
              </Link>
              <Link href="/manager/team-progress">
                <Button size="sm" variant="outline" className="border-white/30 text-white hover:bg-white/10">
                  <TrendingUp className="h-4 w-4 mr-1" /> Team Progress
                </Button>
              </Link>
            </div>
          </div>
          <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
          <div className="absolute right-20 -bottom-6 h-32 w-32 rounded-full bg-white/5" />
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Team Members" value={totalTeamMembers} subtitle="Direct reports" icon={Users} color="blue" />
          <KPICard title="Pending Approvals" value={pendingCount} subtitle="Goals awaiting review" icon={FileCheck} color="amber"
            trend={{ value: 2, isPositive: false }} />
          <KPICard title="Team Achievement" value={`${Math.round(avgTeamProgress)}%`} subtitle="Average completion" icon={TrendingUp} color="green"
            trend={{ value: 5, isPositive: true }} />
          <KPICard title="At Risk" value={delayedCheckIns} subtitle="Members needing help" icon={AlertTriangle} color="rose" />
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Team Performance Horizontal Bar */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Team Performance</CardTitle>
              <CardDescription>Goal completion % by team member</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={teamProgress} layout="vertical" margin={{ left: 10, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
                    <YAxis type="category" dataKey="name" width={90} tick={{ fontSize: 12 }} />
                    <Tooltip formatter={(v) => [`${v}%`, "Progress"]}
                      contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Bar dataKey="progress" radius={[0, 6, 6, 0]} name="Progress %">
                      {teamProgress.map((m, i) => (
                        <Cell key={i} fill={
                          m.progress >= 90 ? CHART_COLORS.approved :
                            m.progress >= 60 ? CHART_COLORS.secondary :
                              CHART_COLORS.pending
                        } />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Approval Status Donut */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Approval Status</CardTitle>
              <CardDescription>Distribution of goal approval states</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={approvalStatusData} cx="50%" cy="50%"
                      innerRadius={65} outerRadius={95} paddingAngle={3} dataKey="value">
                      {approvalStatusData.map((e, i) => (
                        <Cell key={i} fill={e.color} stroke="transparent" />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))" }} />
                    <Legend iconType="circle" iconSize={8} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals + Team Progress */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending Approvals */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Pending Approvals</CardTitle>
                <CardDescription>Goals awaiting your review</CardDescription>
              </div>
              <Link href="/manager/approvals">
                <Button variant="outline" size="sm">View All <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {pendingApprovals.slice(0, 3).map((approval) => (
                <div key={approval.id}
                  className="flex items-center justify-between rounded-xl border border-border p-3 hover:bg-muted/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback className={`${getAvatarColor(approval.employeeName)} text-white text-xs font-semibold`}>
                        {getInitials(approval.employeeName)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">{approval.employeeName}</p>
                      <p className="text-xs text-muted-foreground">
                        {approval.department} · {approval.goals.length} goals
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30">
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Team Progress */}
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold">Team Progress</CardTitle>
                <CardDescription>Individual member status overview</CardDescription>
              </div>
              <Link href="/manager/team-progress">
                <Button variant="outline" size="sm">View All <ChevronRight className="h-3.5 w-3.5 ml-1" /></Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {teamProgress.map((member) => (
                <div key={member.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className={`${getAvatarColor(member.name)} text-white text-xs font-semibold`}>
                          {getInitials(member.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{member.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {member.goalsCompleted}/{member.totalGoals} goals · {member.department}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{member.progress}%</span>
                      <StatusBadge status={member.quarterlyStatus.toLowerCase().replace(" ", "-")} />
                    </div>
                  </div>
                  <Progress
                    value={member.progress}
                    className="h-1.5"
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
