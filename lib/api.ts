const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api/v1";

// ─── Token helpers ─────────────────────────────────────────────────────────────
export const getAccessToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

export const getRefreshToken = () =>
  typeof window !== "undefined" ? localStorage.getItem("refreshToken") : null;

export const saveTokens = (accessToken: string, refreshToken: string) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
};

export const clearTokens = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
};

// ─── Core fetch wrapper ────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const res  = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data;
}

// ─── Auth types ────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: "employee" | "manager" | "admin";
  employee_id: string;
  department_id: string | null;
  department_name?: string | null;
  manager_name?: string | null;
  status: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  data: {
    user: ApiUser;
    accessToken: string;
    refreshToken: string;
  };
}

// ─── Auth API ──────────────────────────────────────────────────────────────────
export const authApi = {
  signup: (data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    jobTitle?: string;
  }) => apiFetch<LoginResponse>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (email: string, password: string) =>
    apiFetch<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  logout: () => apiFetch("/auth/logout", { method: "POST" }),

  me: () =>
    apiFetch<{ success: boolean; data: ApiUser }>("/auth/me"),
};

// ─── Goals API ─────────────────────────────────────────────────────────────────
export const goalsApi = {
  /** List goals — respects role-based filtering server-side */
  getAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ success: boolean; data: ApiGoal[] }>(`/goals${qs}`);
  },

  getOne: (id: string) =>
    apiFetch<{ success: boolean; data: ApiGoal }>(`/goals/${id}`),

  /** Create a goal (status = draft by default) */
  create: (body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; data: ApiGoal }>("/goals", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  update: (id: string, body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; data: ApiGoal }>(`/goals/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (id: string) =>
    apiFetch<{ success: boolean }>(`/goals/${id}`, { method: "DELETE" }),

  /** Submit a draft/rejected goal for manager approval */
  submit: (id: string) =>
    apiFetch<{ success: boolean; data: ApiGoal }>(`/goals/${id}/submit`, {
      method: "POST",
    }),

  /** Approve a submitted goal [manager/admin] */
  approve: (id: string) =>
    apiFetch<{ success: boolean; data: ApiGoal }>(`/goals/${id}/approve`, {
      method: "POST",
    }),

  /** Reject a submitted goal [manager/admin] */
  reject: (id: string, reason: string) =>
    apiFetch<{ success: boolean; data: ApiGoal }>(`/goals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),

  /** Update current value / progress [employee] */
  updateProgress: (id: string, body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; data: ApiGoal }>(`/goals/${id}/progress`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  /** List goals pending manager/admin approval */
  getPendingApprovals: () =>
    apiFetch<{ success: boolean; data: ApiPendingGoal[] }>("/goals/pending-approvals"),

  /** Create shared goal (manager/admin) */
  createShared: (body: Record<string, unknown>) =>
    apiFetch<{ success: boolean; data: { parent: ApiGoal; children: ApiGoal[] } }>("/goals/shared", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  /** Get KPI stats for a goal cycle */
  getStats: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ success: boolean; data: ApiGoalStats }>(`/goals/stats${qs}`);
  },

  /** Get approved/in-progress goals with check-in history for the checkins page */
  getCheckinGoals: (cycleId?: string) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";
    return apiFetch<{ success: boolean; data: { goals: ApiCheckinGoal[]; activeCycle: ApiCycle | null } }>(
      `/goals/checkin-goals${qs}`
    );
  },
};

// ─── Goal types ────────────────────────────────────────────────────────────────
export interface ApiGoal {
  id: string;
  employee_id: string;
  cycle_id: string;
  title: string;
  description?: string;
  category: string;
  status: string;
  weightage: number;
  target_value: number;
  current_value: number;
  unit_of_measure?: string;
  due_date?: string;
  submitted_at?: string;
  employee_name?: string;
  emp_code?: string;
  cycle_name?: string;
  quarter?: number;
  year?: number;
  approved_by_name?: string;
  rejection_reason?: string;
  is_shared?: boolean;
  child_count?: string | number;
}

export interface ApiPendingGoal extends ApiGoal {
  employee_name: string;
  emp_code: string;
  cycle_name: string;
}

export interface ApiGoalStats {
  total_goals: string;
  draft: string;
  submitted: string;
  approved: string;
  in_progress: string;
  completed: string;
  total_weightage: string;
  avg_progress: string;
}

export interface ApiCheckIn {
  id: string;
  check_in_date: string;
  progress_value: number | null;
  progress_percent: number;
  status: "on_track" | "at_risk" | "behind" | "completed";
  employee_notes: string | null;
  manager_notes: string | null;
  reviewed_at: string | null;
}

export interface ApiCheckinGoal {
  id: string;
  title: string;
  category: string;
  weightage: number;
  target_value: number;
  current_value: number;
  unit_of_measure?: string;
  status: string;
  due_date?: string;
  cycle_id: string;
  cycle_name?: string;
  is_shared?: boolean;
  parent_goal_id?: string | null;
  child_count?: string | number;
  check_ins: ApiCheckIn[] | null;
}

// ─── Users API ─────────────────────────────────────────────────────────────────
export const usersApi = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ success: boolean; data: ApiUser[] | { rows: ApiUser[]; total: number } }>(`/users${qs}`);
  },
  getOne:        (id: string) => apiFetch<{ success: boolean; data: ApiUser }>(`/users/${id}`),
  getTeamMembers: ()          => apiFetch<{ success: boolean; data: ApiUser[] }>("/users/team"),
  update:        (id: string, updates: Partial<ApiUser>) =>
    apiFetch(`/users/${id}`, { method: "PATCH", body: JSON.stringify(updates) }),
  updateStatus:  (id: string, status: string) => 
    apiFetch(`/users/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }),
  updateRole:    (id: string, role: string) =>
    apiFetch(`/users/${id}/role`, { method: "PATCH", body: JSON.stringify({ role }) }),
};

// ─── Check-ins API ─────────────────────────────────────────────────────────────
export const checkInsApi = {
  getAll: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch(`/check-ins${qs}`);
  },

  create: (body: Record<string, unknown>) =>
    apiFetch("/check-ins", { method: "POST", body: JSON.stringify(body) }),

  addFeedback: (id: string, managerNotes: string) =>
    apiFetch(`/check-ins/${id}/feedback`, {
      method: "PATCH",
      body: JSON.stringify({ managerNotes }),
    }),

  getGoalProgress: (goalId: string) =>
    apiFetch(`/check-ins/goals/${goalId}/progress`),
};

// ─── Reports API ───────────────────────────────────────────────────────────────
export const reportsApi = {
  /** Admin dashboard — all KPIs, charts, departments, leaderboard in one call */
  adminDashboard: (cycleId?: string) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";
    return apiFetch<{ success: boolean; data: ApiAdminDashboard }>(`/reports/dashboard${qs}`);
  },

  /** Manager dashboard — team, approvals, pending goals */
  managerDashboard: (cycleId?: string) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";
    return apiFetch<{ success: boolean; data: ApiManagerDashboard }>(`/reports/manager-dashboard${qs}`);
  },

  /** Employee dashboard — stats, goals, quarterly trend */
  employeeDashboard: (cycleId?: string) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";
    return apiFetch<{ success: boolean; data: ApiEmployeeDashboard }>(`/reports/employee-dashboard${qs}`);
  },

  departmentSummary: (cycleId?: string) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";
    return apiFetch(`/reports/department${qs}`);
  },

  team: (cycleId?: string) => {
    const qs = cycleId ? `?cycleId=${cycleId}` : "";
    return apiFetch(`/reports/team${qs}`);
  },

  cycles: () => apiFetch("/reports/cycles"),
};

// ─── Report types ──────────────────────────────────────────────────────────────
export interface ApiDepartment {
  department_id: string;
  department: string;
  total_employees: number;
  total_goals: number;
  completed_goals: number;
  active_goals: number;
  pending_approval: number;
  avg_progress: number;
}

export interface ApiLeader {
  name: string;
  goals: number;
  score: number;
}

export interface ApiAdminDashboard {
  dashboard: {
    active_users: string;
    total_employees: string;
    pending_approvals: string;
    total_goals: string;
    completed_goals: string;
    avg_progress: string;
  };
  distribution: {
    byStatus: { status: string; count: string }[];
    byCategory: { category: string; count: string; avg_weightage: string }[];
  };
  departments: {
    department_id: string;
    department: string;
    total_employees: string;
    total_goals: string;
    completed_goals: string;
    active_goals: string;
    pending_approval: string;
    avg_progress: string;
  }[];
  leaderboard: {
    name: string;
    goals: string;
    score: string;
  }[];
  monthlyTrend: { month: string; created: string; completed: string }[];
  quarterlyTrend: { quarter: string; completion: string }[];
  cycles: ApiCycle[];
  activeCycle: ApiCycle | null;
  recentActivity?: {
    id: string;
    action: string;
    entity_type: string;
    new_values: any;
    created_at: string;
    user_name: string;
    role: string;
  }[];
}

export interface ApiTeamMember {
  id: string;
  name: string;
  department: string;
  total_goals: number;
  goals_completed: number;
  pending_approval: number;
  progress: number;
  quarterly_status: string;
}

export interface ApiManagerDashboard {
  team:          ApiTeamMember[];
  approvalStats: { pending: number; approved: number; rejected: number };
  pendingGoals:  ApiPendingGoal[];
  activeCycle:   ApiCycle | null;
}

export interface ApiEmployeeDashboard {
  stats: {
    total_goals:     number;
    completed_goals: number;
    not_started:     number;
    in_progress:     number;
    avg_progress:    number;
  };
  goals: {
    id: string;
    title: string;
    category: string;
    weightage: number;
    target_value: number;
    current_value: number;
    unit_of_measure?: string;
    status: string;
    due_date?: string;
  }[];
  quarterlyTrend: { quarter: string; q_num: number; planned: number; actual: number }[];
  activeCycle: ApiCycle | null;
}

export interface ApiCycle {
  id: string;
  name: string;
  year: number;
  quarter: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

// ─── Audit API ─────────────────────────────────────────────────────────────────
export const auditApi = {
  getLogs: (params?: Record<string, string>) => {
    const qs = params ? "?" + new URLSearchParams(params).toString() : "";
    return apiFetch<{ success: boolean; data: { rows: any[]; total: number } }>(`/audit-logs${qs}`);
  },
  getEntityTrail: (type: string, id: string) =>
    apiFetch(`/audit-logs/entity/${type}/${id}`),
};

// ─── Exports API ───────────────────────────────────────────────────────────────
export const exportsApi = {
  downloadUrl: (type: 'goals' | 'users' | 'audit-logs', format: 'csv' | 'excel', params?: Record<string, string>) => {
    const qs = new URLSearchParams({ format, ...params }).toString();
    const base = process.env.NEXT_PUBLIC_API_URL?.startsWith('http') 
      ? process.env.NEXT_PUBLIC_API_URL 
      : `${window.location.origin}${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}`;
    return `${base}/exports/${type}?${qs}`;
  },
  triggerDownload: async (type: 'goals' | 'users' | 'audit-logs', format: 'csv' | 'excel', params?: Record<string, string>) => {
    const url = exportsApi.downloadUrl(type, format, params);
    const token = localStorage.getItem("token");
    
    const response = await fetch(url, {
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error("Export failed");
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = downloadUrl;
    
    const disposition = response.headers.get('Content-Disposition');
    let filename = `${type}-export.${format === 'excel' ? 'xlsx' : 'csv'}`;
    if (disposition && disposition.indexOf('filename=') !== -1) {
      const matches = /filename="([^"]*)"/.exec(disposition);
      if (matches != null && matches[1]) filename = matches[1];
    }
    
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.URL.revokeObjectURL(downloadUrl);
  }
};
