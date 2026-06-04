import { http } from "@/api/http";
import { sessionStorageApi } from "@/lib/storage";
import type { SessionUser, SettingsDto } from "@/types/domain";

export const apiClient = {
  getToken: sessionStorageApi.getToken,
  getUser: sessionStorageApi.getUser,
  getUserRole(): string | null {
    const user = sessionStorageApi.getUser();
    if (!user) return null;
    return typeof user.role === "object" ? user.role.name ?? null : user.role ?? null;
  },
  async login(email: string, password: string) {
    const data = await http<{ access_token: string; user: SessionUser }>(
      "/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email, password }),
      },
    );
    sessionStorageApi.setToken(data.access_token);
    sessionStorageApi.setUser(data.user);
    return data;
  },
  logout() {
    sessionStorageApi.removeToken();
    sessionStorageApi.removeUser();
  },
  getTrips: (filters: Record<string, string | number | boolean> = {}) =>
    http(`/trips?${new URLSearchParams(filters as Record<string, string>).toString()}`),
  getDashboard: () => http("/analytics/dashboard"),
  getProfitability: (params: Record<string, string> = {}) =>
    http(`/analytics/profitability?${new URLSearchParams(params).toString()}`),
  getForecast: (routeId: string, date?: string) =>
    http(
      `/analytics/forecast?${new URLSearchParams(
        date ? { route_id: routeId, date } : { route_id: routeId },
      ).toString()}`,
    ),
  calculatePrice: (body: Record<string, unknown>) =>
    http("/pricing/calculate", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getRoutes: () => http("/routes?active_only=false"),
  createRoute: (body: Record<string, unknown>) =>
    http("/routes", { method: "POST", body: JSON.stringify(body) }),
  updateRoute: (id: string | number, body: Record<string, unknown>) =>
    http(`/routes/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteRoute: (id: string | number) =>
    http(`/routes/${id}`, { method: "DELETE" }),
  getBuses: () => http("/buses?active_only=false"),
  createBus: (body: Record<string, unknown>) =>
    http("/buses", { method: "POST", body: JSON.stringify(body) }),
  updateBus: (id: string | number, body: Record<string, unknown>) =>
    http(`/buses/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteBus: (id: string | number) => http(`/buses/${id}`, { method: "DELETE" }),
  getUsers: () => http("/admin/users"),
  createUser: (body: Record<string, unknown>) =>
    http("/admin/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id: string | number, body: Record<string, unknown>) =>
    http(`/admin/users/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  updateUserRole: (id: string | number, roleId: number) =>
    http(`/admin/users/${id}/role`, {
      method: "PUT",
      body: JSON.stringify({ role_id: roleId }),
    }),
  getSettings: () => http<SettingsDto>("/admin/settings"),
  updateSettings: (body: SettingsDto) =>
    http("/admin/settings", { method: "PUT", body: JSON.stringify(body) }),
  exportSettings: () => http("/admin/settings/export"),
  importSettings: (body: Record<string, unknown>) =>
    http("/admin/settings/import", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getAuditLogs: (params: Record<string, string | number> = {}) =>
    http(`/admin/audit-logs?${new URLSearchParams(params as Record<string, string>).toString()}`),
  getHealth: async () => {
    const headers = new Headers();
    const token = sessionStorageApi.getToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
    const response = await fetch("http://localhost:8080/api/health", { headers });
    if (!response.ok) throw new Error("Health check failed");
    return response.json();
  },
};
