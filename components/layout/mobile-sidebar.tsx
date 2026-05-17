"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Target,
  CalendarCheck,
  Users,
  FileCheck,
  TrendingUp,
  BarChart3,
  History,
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const employeeNav = [
  { name: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
  { name: "My Goals", href: "/employee/goals", icon: Target },
  { name: "Quarterly Check-ins", href: "/employee/checkins", icon: CalendarCheck },
];

const managerNav = [
  { name: "Dashboard", href: "/manager/dashboard", icon: LayoutDashboard },
  { name: "Goal Approvals", href: "/manager/approvals", icon: FileCheck },
  { name: "Team Progress", href: "/manager/team-progress", icon: TrendingUp },
];

const adminNav = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { name: "Users", href: "/admin/users", icon: Users },
  { name: "Reports", href: "/admin/reports", icon: BarChart3 },
  { name: "Audit Logs", href: "/admin/audit-logs", icon: History },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const { role, logout } = useAuth();

  const navItems =
    role === "admin"
      ? adminNav
      : role === "manager"
        ? managerNav
        : employeeNav;

  const roleLabel =
    role === "admin" ? "Admin" : role === "manager" ? "Manager" : "Employee";

  return (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="flex h-16 items-center border-b border-sidebar-border px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <Target className="h-5 w-5" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">GoalTracker</span>
            <span className="text-xs text-sidebar-foreground/60">
              {roleLabel} Portal
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="border-t border-sidebar-border p-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={logout}
          className="w-full justify-start gap-3 text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
        >
          <LogOut className="h-5 w-5" />
          <span>Logout</span>
        </Button>
      </div>
    </div>
  );
}
