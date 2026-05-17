"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { usersApi, goalsApi, type ApiUser } from "@/lib/api";
import { AlertCircle, CheckCircle, Loader2, Users } from "lucide-react";
import { uomOptions, thrustAreaOptions } from "@/lib/mock-data";

type ToastType = "success" | "error";
interface Toast { message: string; type: ToastType }

function ToastBanner({ toast, onClose }: { toast: Toast; onClose: () => void }) {
  return (
    <div className={`fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg text-sm font-medium ${
      toast.type === "success"
        ? "bg-emerald-50 border-emerald-200 text-emerald-800"
        : "bg-destructive/10 border-destructive/20 text-destructive"
    }`}>
      {toast.type === "success" ? <CheckCircle className="h-4 w-4 shrink-0" /> : <AlertCircle className="h-4 w-4 shrink-0" />}
      {toast.message}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">✕</button>
    </div>
  );
}

const CATEGORY_OPTIONS = [
  { value: "performance",  label: "Performance"  },
  { value: "development",  label: "Development"  },
  { value: "learning",     label: "Learning"     },
  { value: "innovation",   label: "Innovation"   },
  { value: "leadership",   label: "Leadership"   },
  { value: "operational",  label: "Operational"  },
];

export default function AssignSharedGoalPage() {
  const router = useRouter();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    uomType: "Numeric",
    target: "",
    weightage: "10",
    deadline: "",
  });

  const showToast = (message: string, type: ToastType) => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    async function loadUsers() {
      try {
        const res = await usersApi.getAll({ role: "employee" });
        // Since we are manager/admin, getAll will only return the relevant team
        setUsers(Array.isArray(res.data) ? res.data : (res.data as any).rows ?? []);
      } catch (err) {
        showToast("Failed to load team members", "error");
      } finally {
        setIsLoadingUsers(false);
      }
    }
    loadUsers();
  }, []);

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    );
  };

  const selectAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedUsers.length === 0) {
      return showToast("Please select at least one employee", "error");
    }

    setIsSubmitting(true);
    try {
      await goalsApi.createShared({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        category: form.category,
        weightage: Number(form.weightage),
        targetValue: Number(form.target),
        unitOfMeasure: form.uomType,
        dueDate: form.deadline || undefined,
        employeeIds: selectedUsers,
      });

      showToast(`Shared goal assigned to ${selectedUsers.length} employees`, "success");
      setTimeout(() => {
        router.push("/manager/dashboard");
      }, 1500);
    } catch (err: any) {
      showToast(err.message || "Failed to create shared goal", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Assign Shared Goal</h1>
          <p className="text-muted-foreground">Create a single KPI and assign it to multiple team members.</p>
        </div>

        <div className="grid md:grid-cols-[1fr_300px] gap-6 items-start">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Goal Details</CardTitle>
                <CardDescription>This goal template will be copied to all selected employees.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Goal Title <span className="text-destructive">*</span></Label>
                  <Input id="title" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="category">Category <span className="text-destructive">*</span></Label>
                  <Select required value={form.category} onValueChange={v => setForm({ ...form, category: v })}>
                    <SelectTrigger id="category"><SelectValue placeholder="Select category" /></SelectTrigger>
                    <SelectContent>
                      {CATEGORY_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea id="description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="target">Target Value <span className="text-destructive">*</span></Label>
                    <Input id="target" type="number" required min={0} value={form.target} onChange={e => setForm({ ...form, target: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uom">Unit of Measure</Label>
                    <Select value={form.uomType} onValueChange={v => setForm({ ...form, uomType: v })}>
                      <SelectTrigger id="uom"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {uomOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="weightage">Default Weightage (%) <span className="text-destructive">*</span></Label>
                    <Input id="weightage" type="number" required min={10} max={100} value={form.weightage} onChange={e => setForm({ ...form, weightage: e.target.value })} />
                    <p className="text-xs text-muted-foreground">Employees can adjust their own weightage later.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deadline">Deadline</Label>
                    <Input id="deadline" type="date" value={form.deadline} onChange={e => setForm({ ...form, deadline: e.target.value })} />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Button type="submit" className="w-full" disabled={isSubmitting || selectedUsers.length === 0}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Assign Goal to {selectedUsers.length} Employee{selectedUsers.length !== 1 ? 's' : ''}
            </Button>
          </form>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Select Team
              </CardTitle>
              <CardDescription>Choose who receives this goal</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingUsers ? (
                <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
              ) : users.length === 0 ? (
                <p className="text-sm text-muted-foreground">No team members found.</p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2 pb-4 border-b border-border">
                    <Checkbox id="select-all" 
                      checked={selectedUsers.length === users.length && users.length > 0} 
                      onCheckedChange={selectAll} />
                    <Label htmlFor="select-all" className="font-semibold cursor-pointer">Select All ({users.length})</Label>
                  </div>
                  <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2">
                    {users.map(u => (
                      <div key={u.id} className="flex items-center space-x-3">
                        <Checkbox id={`user-${u.id}`} 
                          checked={selectedUsers.includes(u.id)}
                          onCheckedChange={() => toggleUser(u.id)} />
                        <Label htmlFor={`user-${u.id}`} className="cursor-pointer flex-1">
                          <div className="font-medium text-sm">{u.first_name} {u.last_name}</div>
                          <div className="text-xs text-muted-foreground">{u.job_title || 'Employee'}</div>
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
      {toast && <ToastBanner toast={toast} onClose={() => setToast(null)} />}
    </DashboardLayout>
  );
}
