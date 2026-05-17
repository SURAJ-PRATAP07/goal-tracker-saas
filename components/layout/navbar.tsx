"use client";

import { useAuth } from "@/lib/auth-context";
import { Bell, Search, Menu, LogOut, User, Settings, CheckCircle, Clock, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { MobileSidebar } from "./mobile-sidebar";
import { cn } from "@/lib/utils";

const notifications = [
  { id: 1, icon: CheckCircle, iconColor: "text-emerald-500", bg: "bg-emerald-500/10",
    title: "Goal Approved",        desc: '"Increase Code Coverage" was approved', time: "2m ago",  unread: true },
  { id: 2, icon: Clock,          iconColor: "text-amber-500",  bg: "bg-amber-500/10",
    title: "Check-in Reminder",   desc: "Q2 check-in is due in 3 days",           time: "1h ago",  unread: true },
  { id: 3, icon: MessageSquare,  iconColor: "text-blue-500",   bg: "bg-blue-500/10",
    title: "New Comment",         desc: "Sarah commented on your goal progress",   time: "3h ago",  unread: true },
];

const roleColors: Record<string, string> = {
  admin:    "bg-purple-500/15 text-purple-700 dark:text-purple-300",
  manager:  "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  employee: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
};

export function Navbar() {
  const { user, role, logout } = useAuth();
  const initials = user?.name
    ? user.name.split(" ").map(n => n[0]).join("").toUpperCase()
    : "U";

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border bg-card/95 backdrop-blur px-4 lg:px-6">
      {/* Mobile Menu */}
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Toggle menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          <MobileSidebar />
        </SheetContent>
      </Sheet>

      {/* Search */}
      <div className="flex-1 max-w-sm">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search goals, users…"
            className="w-full bg-muted/50 pl-8 border-transparent focus:border-border focus:bg-background transition-colors"
          />
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg">
              <Bell className="h-4.5 w-4.5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <p className="text-sm font-semibold">Notifications</p>
              <Badge variant="secondary" className="text-xs">{unreadCount} new</Badge>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {notifications.map(n => {
                const Icon = n.icon;
                return (
                  <div key={n.id}
                    className={cn(
                      "flex items-start gap-3 border-b border-border/50 last:border-0 p-4 hover:bg-muted/40 transition-colors cursor-pointer",
                      n.unread && "bg-primary/3"
                    )}>
                    <div className={cn("mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", n.bg)}>
                      <Icon className={cn("h-4 w-4", n.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{n.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{n.desc}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">{n.time}</p>
                    </div>
                    {n.unread && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </div>
                );
              })}
            </div>
            <div className="border-t border-border p-2">
              <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground">
                Mark all as read
              </Button>
            </div>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Divider */}
        <div className="h-6 w-px bg-border" />

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2.5 px-2 py-1.5 h-auto rounded-lg hover:bg-muted">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="hidden flex-col items-start md:flex">
                <span className="text-sm font-medium leading-tight">{user?.name ?? "User"}</span>
                <span className={cn("text-[10px] font-semibold rounded-full px-1.5 py-0 mt-0.5 capitalize", roleColors[role ?? "employee"])}>
                  {role}
                </span>
              </div>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="pb-2">
              <div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem className="gap-2">
              <Settings className="h-4 w-4 text-muted-foreground" /> Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="gap-2 text-rose-600 dark:text-rose-400 focus:text-rose-600">
              <LogOut className="h-4 w-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
