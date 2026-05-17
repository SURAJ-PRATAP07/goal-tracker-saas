"use client";

import { useState, useEffect, useCallback } from "react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { auditApi, exportsApi } from "@/lib/api";
import { Input } from "@/components/ui/input";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Filter, Calendar, RefreshCw, Download, FileSpreadsheet, Loader2, AlertCircle, ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { KPICardSkeleton as SkeletonCard } from "@/components/dashboard/skeleton-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function ExpandableLogRow({ log }: { log: any }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow className="cursor-pointer group hover:bg-muted/30" onClick={() => setExpanded(!expanded)}>
        <TableCell className="w-10">
          <Button variant="ghost" size="icon" className="h-6 w-6">
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        </TableCell>
        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
          <div className="flex items-center gap-2">
            <Calendar className="h-3 w-3" />
            {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
          </div>
        </TableCell>
        <TableCell>
          <div className="font-medium text-sm">{log.user_name || "System"}</div>
          <div className="text-xs text-muted-foreground">{log.user_email || ""}</div>
        </TableCell>
        <TableCell>
          <span className={`px-2 py-1 rounded text-xs font-medium uppercase
            ${log.action === 'CREATE' ? 'bg-emerald-100 text-emerald-700' : ''}
            ${log.action === 'UPDATE' ? 'bg-blue-100 text-blue-700' : ''}
            ${log.action === 'DELETE' ? 'bg-red-100 text-red-700' : ''}
            ${!['CREATE','UPDATE','DELETE'].includes(log.action) ? 'bg-gray-100 text-gray-700' : ''}
          `}>
            {log.action}
          </span>
        </TableCell>
        <TableCell>
          <div className="text-sm capitalize">{log.entity_type?.replace('_', ' ') || '-'}</div>
          <div className="text-xs text-muted-foreground truncate max-w-[150px]">{log.entity_id || ''}</div>
        </TableCell>
        <TableCell className="text-sm text-muted-foreground">
          {log.ip_address || '-'}
        </TableCell>
      </TableRow>

      {expanded && (
        <TableRow className="bg-muted/10 hover:bg-muted/10">
          <TableCell colSpan={6} className="p-0 border-b-0">
            <div className="p-4 pl-12 border-l-2 border-l-primary mx-2 my-2 bg-card rounded-r-lg shadow-inner">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Old Values</h4>
                  {log.old_values ? (
                    <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto text-destructive">
                      {JSON.stringify(log.old_values, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  )}
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">New Values</h4>
                  {log.new_values ? (
                    <pre className="text-xs bg-muted/30 p-3 rounded-md overflow-x-auto text-emerald-600 dark:text-emerald-400">
                      {JSON.stringify(log.new_values, null, 2)}
                    </pre>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">None</p>
                  )}
                </div>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [search, setSearch] = useState("");
  const [actionFilter, setActionFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);

  // Common actions based on backend implementation
  const actionTypes = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT"];

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (actionFilter !== "all") params.action = actionFilter;
      // Note: Backend doesn't support generic 'search' out of the box for audit logs, 
      // but we can filter it locally from the 100 recent logs or implement backend search later.
      
      const res = await auditApi.getLogs(params) as any;
      const fetchedLogs = Array.isArray(res.data) ? res.data : res.data.rows || [];
      setLogs(fetchedLogs);
      setTotal(res.data.total || fetchedLogs.length);
    } catch {
      setError("Failed to load audit logs");
    } finally {
      setIsLoading(false);
    }
  }, [actionFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const handleExport = async (format: "csv" | "excel") => {
    setIsExporting(true);
    try {
      await exportsApi.triggerDownload("audit-logs", format, actionFilter !== "all" ? { action: actionFilter } : undefined);
    } catch (err) {
      console.error("Export failed:", err);
      alert("Failed to export data. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      (log.user_name || "").toLowerCase().includes(s) ||
      (log.user_email || "").toLowerCase().includes(s) ||
      (log.action || "").toLowerCase().includes(s) ||
      (log.entity_type || "").toLowerCase().includes(s)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground">
              Track all system activities and changes
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={fetchLogs} disabled={isLoading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" disabled={isExporting}>
                  {isExporting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Download className="h-4 w-4 mr-1" />}
                  Export Logs
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

        {/* Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-sm text-muted-foreground">Total Logged Events</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">
                  {logs.filter((l) => l.action === "CREATE" || l.action === "UPDATE").length}
                </p>
                <p className="text-sm text-muted-foreground">Mutations (Recent)</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">
                  {logs.filter((l) => l.action === "DELETE").length}
                </p>
                <p className="text-sm text-muted-foreground">Deletions (Recent)</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="relative flex-1 sm:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search user, action, entity..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="mr-2 h-4 w-4" />
                  <SelectValue placeholder="Action type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  {actionTypes.map((action) => (
                    <SelectItem key={action} value={action}>
                      {action}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && logs.length === 0 && (
          <div className="space-y-4">
            <SkeletonCard className="h-16" />
            <SkeletonCard className="h-16" />
            <SkeletonCard className="h-16" />
          </div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-8 w-8 text-destructive mb-3" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {/* Audit Logs Table */}
        {!isLoading && !error && (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="w-10"></TableHead>
                      <TableHead className="w-[180px]">Timestamp</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>IP Address</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <ExpandableLogRow key={log.id} log={log} />
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredLogs.length === 0 && (
                <div className="py-12 text-center border-t border-dashed">
                  <p className="text-muted-foreground">No audit logs found matching criteria.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
