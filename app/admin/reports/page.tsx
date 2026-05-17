"use client";

import { useEffect, useState, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import { reportsApi, exportsApi, type ApiAdminDashboard } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, Legend, PieChart, Pie, Cell,
} from "recharts";
import {
  RefreshCw, AlertCircle, Download, FileSpreadsheet, Target, CheckCircle, TrendingUp
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const COLORS = {
  primary: "#6366f1",
  secondary: "#10b981",
  accent: "#f59e0b",
  muted: "#94a3b8",
};

export default function AdminReportsPage() {
  const [data, setData] = useState<ApiAdminDashboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  const fetchData = useCallback(async (cycleId?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await reportsApi.adminDashboard(cycleId ? { cycleId } : undefined);
      setData(res.data);
      if (!cycleId && res.data.activeCycle) {
        setSelectedCycle(res.data.activeCycle.id);
      }
    } catch {
      setError("Failed to load reports data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCycleChange = (val: string) => {
    setSelectedCycle(val);
    fetchData(val);
  };

  const handleExport = async (format: "csv" | "excel") => {
    setIsExporting(true);
    try {
      await exportsApi.triggerDownload("goals", format, selectedCycle ? { cycleId: selectedCycle } : undefined);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  // Loading
  if (isLoading && !data) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-8 w-48 bg-muted rounded animate-pulse" />
            <div className="h-8 w-32 bg-muted rounded animate-pulse" />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <SkeletonCard className="h-[350px]" />
            <SkeletonCard className="h-[350px]" />
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
          <Button size="sm" variant="outline" className="mt-4" onClick={() => fetchData(selectedCycle)}>Retry</Button>
        </div>
      </DashboardLayout>
    );
  }

  if (!data) return null;

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-10">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Organization Analytics</h1>
            <p className="text-muted-foreground">
              Deep dive into organizational performance, department metrics, and goal trends.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedCycle} onValueChange={handleCycleChange} disabled={isLoading}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Select Cycle" />
              </SelectTrigger>
              <SelectContent>
                {data.cycles?.map(cycle => (
                  <SelectItem key={cycle.id} value={cycle.id}>
                    {cycle.name} {cycle.is_active ? "(Active)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="icon" onClick={() => fetchData(selectedCycle)} disabled={isLoading}>
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button disabled={isExporting}>
                  {isExporting ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
                  Export Data
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
          </div>
        </div>

        {/* Charts Row 1 */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Quarterly Trend (Planned vs Actual approximation) */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quarterly Completion Trend</CardTitle>
              <CardDescription>Average completion rate by quarter</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data.quarterlyTrend && data.quarterlyTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.quarterlyTrend}>
                      <defs>
                        <linearGradient id="colorCompletion" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.8}/>
                          <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-muted/30" />
                      <XAxis dataKey="quarter" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis tickFormatter={(val) => `${val}%`} className="text-xs" tickLine={false} axisLine={false} />
                      <RechartsTooltip formatter={(value) => [`${value}%`, "Avg Completion"]} />
                      <Area type="monotone" dataKey="completion" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorCompletion)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No trend data available</div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Goal Categories Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Goals by Category</CardTitle>
              <CardDescription>Distribution of active goals across strategic areas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data.distribution?.byCategory && data.distribution.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.distribution.byCategory} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-muted/30" />
                      <XAxis type="number" className="text-xs" tickLine={false} axisLine={false} />
                      <YAxis dataKey="category" type="category" className="text-xs capitalize" tickLine={false} axisLine={false} width={100} />
                      <RechartsTooltip />
                      <Bar dataKey="count" name="Total Goals" fill={COLORS.secondary} radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground text-sm">No category data available</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Department Performance Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Department Performance</CardTitle>
                <CardDescription>Detailed breakdown of goal achievement by department</CardDescription>
              </div>
              <Target className="h-5 w-5 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            {data.departments && data.departments.length > 0 ? (
              <div className="rounded-xl border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="font-semibold">Department</TableHead>
                      <TableHead className="text-right">Active Goals</TableHead>
                      <TableHead className="text-right">Completed</TableHead>
                      <TableHead className="text-right">Avg Progress</TableHead>
                      <TableHead className="w-[200px]">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.departments.map((dept) => {
                      const pct = Math.round(dept.avg_progress || 0);
                      return (
                        <TableRow key={dept.department}>
                          <TableCell className="font-medium">{dept.department}</TableCell>
                          <TableCell className="text-right">{dept.total_goals}</TableCell>
                          <TableCell className="text-right">{dept.completed_goals}</TableCell>
                          <TableCell className="text-right font-semibold">{pct}%</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={pct} className="h-2 flex-1" />
                              {pct >= 80 ? (
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                              ) : pct >= 50 ? (
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                              ) : (
                                <AlertCircle className="h-4 w-4 text-amber-500" />
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="py-8 text-center text-muted-foreground text-sm">
                No department data available for the selected cycle.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
