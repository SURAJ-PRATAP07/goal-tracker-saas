"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";
import { authApi, saveTokens, clearTokens, getAccessToken } from "./api";

export type UserRole = "employee" | "manager" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  employee_id?: string;
  department?: string | null;
  status?: string;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [isLoading, setIsLoading] = useState(true); // true while checking token on mount

  // ── On mount: restore session from localStorage token ──────────────────────
  useEffect(() => {
    const token = getAccessToken();
    if (!token) {
      setIsLoading(false);
      return;
    }
    authApi
      .me()
      .then((res) => {
        const u = res.data;
        setUser({
          id: u.id,
          name: `${u.first_name} ${u.last_name}`,
          email: u.email,
          role: u.role,
          employee_id: u.employee_id,
          status: u.status,
        });
        setRole(u.role);
      })
      .catch(() => {
        clearTokens(); // token expired / invalid
      })
      .finally(() => setIsLoading(false));
  }, []);

  // ── Login ──────────────────────────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        const res = await authApi.login(email, password);
        if (!res.success) return false;

        const { user: apiUser, accessToken, refreshToken } = res.data;
        saveTokens(accessToken, refreshToken);

        const mapped: User = {
          id: apiUser.id,
          name: `${apiUser.first_name} ${apiUser.last_name}`,
          email: apiUser.email,
          role: apiUser.role,
          employee_id: apiUser.employee_id,
          status: apiUser.status,
        };
        setUser(mapped);
        setRole(apiUser.role);
        return true;
      } catch {
        return false;
      }
    },
    []
  );

  // ── Logout ─────────────────────────────────────────────────────────────────
  const logout = useCallback(() => {
    authApi.logout().catch(() => {}); // best-effort
    clearTokens();
    setUser(null);
    setRole(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, role, isAuthenticated: !!user, isLoading, login, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
