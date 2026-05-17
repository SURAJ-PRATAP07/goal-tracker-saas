"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Target } from "lucide-react";

export default function HomePage() {
  const { isAuthenticated, role, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return; // wait until token check finishes
    if (isAuthenticated && role) {
      if (role === "admin") router.push("/admin/dashboard");
      else if (role === "manager") router.push("/manager/dashboard");
      else router.push("/employee/dashboard");
    } else {
      router.push("/login");
    }
  }, [isAuthenticated, role, isLoading, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground animate-pulse">
          <Target className="h-9 w-9" />
        </div>
        <p className="text-muted-foreground">Loading…</p>
      </div>
    </div>
  );
}
