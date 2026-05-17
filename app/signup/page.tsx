"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authApi, saveTokens } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Target,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";

// ── Password strength checker ─────────────────────────────────────────────────
const rules = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter",  test: (p: string) => /[A-Z]/.test(p) },
  { label: "One lowercase letter",  test: (p: string) => /[a-z]/.test(p) },
  { label: "One number",            test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character (!@#$%^&*)", test: (p: string) => /[!@#$%^&*]/.test(p) },
];

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const passed = rules.filter((r) => r.test(password)).length;
  const color =
    passed <= 2 ? "bg-red-500" : passed <= 4 ? "bg-amber-400" : "bg-emerald-500";
  const label =
    passed <= 2 ? "Weak" : passed <= 4 ? "Fair" : "Strong";

  return (
    <div className="space-y-2 mt-1">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${color}`}
            style={{ width: `${(passed / rules.length) * 100}%` }}
          />
        </div>
        <span className="text-xs text-muted-foreground w-10">{label}</span>
      </div>
      <ul className="space-y-1">
        {rules.map((r) => (
          <li key={r.label} className="flex items-center gap-1.5 text-xs">
            {r.test(password) ? (
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
            ) : (
              <XCircle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className={r.test(password) ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}>
              {r.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SignUpPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    jobTitle: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm]   = useState(false);
  const [error, setError]               = useState("");
  const [loading, setLoading]           = useState(false);

  const set = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Client-side validation
    if (!form.firstName.trim() || !form.lastName.trim()) {
      return setError("First and last name are required.");
    }
    if (!form.email) return setError("Email is required.");
    if (form.password !== form.confirmPassword) {
      return setError("Passwords do not match.");
    }
    if (!rules.every((r) => r.test(form.password))) {
      return setError("Password does not meet all requirements.");
    }

    setLoading(true);
    try {
      const res = await authApi.signup({
        firstName: form.firstName.trim(),
        lastName:  form.lastName.trim(),
        email:     form.email,
        password:  form.password,
        jobTitle:  form.jobTitle.trim() || undefined,
      });

      if (res.success) {
        saveTokens(res.data.accessToken, res.data.refreshToken);
        // All self-registered users are employees
        router.push("/employee/dashboard");
      } else {
        setError("Sign-up failed. Please try again.");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg || "Could not connect to server. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const allRulesPassed = rules.every((r) => r.test(form.password));
  const passwordMatch  = form.confirmPassword && form.password === form.confirmPassword;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">

        {/* Logo */}
        <div className="flex flex-col items-center space-y-2">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Target className="h-8 w-8" />
          </div>
          <h1 className="text-2xl font-bold">GoalTracker</h1>
          <p className="text-muted-foreground text-center text-sm">
            Create your employee account
          </p>
        </div>

        {/* Card */}
        <Card className="border-border">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">Create account</CardTitle>
            <CardDescription>
              Fill in your details to get started. You'll be added as an employee.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">

              {error && (
                <div className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive border border-destructive/20">
                  {error}
                </div>
              )}

              {/* Name row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="firstName">First name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={form.firstName}
                    onChange={set("firstName")}
                    disabled={loading}
                    autoComplete="given-name"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastName">Last name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={form.lastName}
                    onChange={set("lastName")}
                    disabled={loading}
                    autoComplete="family-name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email">Work email *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@company.com"
                  value={form.email}
                  onChange={set("email")}
                  disabled={loading}
                  autoComplete="email"
                />
              </div>

              {/* Job title (optional) */}
              <div className="space-y-1.5">
                <Label htmlFor="jobTitle">
                  Job title{" "}
                  <span className="text-muted-foreground text-xs">(optional)</span>
                </Label>
                <Input
                  id="jobTitle"
                  placeholder="e.g. Software Engineer"
                  value={form.jobTitle}
                  onChange={set("jobTitle")}
                  disabled={loading}
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <Label htmlFor="password">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a strong password"
                    value={form.password}
                    onChange={set("password")}
                    disabled={loading}
                    autoComplete="new-password"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                <PasswordStrength password={form.password} />
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirm ? "text" : "password"}
                    placeholder="Repeat your password"
                    value={form.confirmPassword}
                    onChange={set("confirmPassword")}
                    disabled={loading}
                    autoComplete="new-password"
                    className={
                      form.confirmPassword
                        ? passwordMatch
                          ? "border-emerald-500 focus-visible:ring-emerald-500"
                          : "border-red-400 focus-visible:ring-red-400"
                        : ""
                    }
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowConfirm(!showConfirm)}
                  >
                    {showConfirm ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
                {form.confirmPassword && !passwordMatch && (
                  <p className="text-xs text-red-500">Passwords do not match</p>
                )}
                {form.confirmPassword && passwordMatch && (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Passwords match
                  </p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !allRulesPassed || !passwordMatch}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account…
                  </>
                ) : (
                  "Create account"
                )}
              </Button>

              {/* Link to login */}
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link
                  href="/login"
                  className="font-medium text-primary underline-offset-4 hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">
          &copy; 2024 GoalTracker. All rights reserved.
        </p>
      </div>
    </div>
  );
}
