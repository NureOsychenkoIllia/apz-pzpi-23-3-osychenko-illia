import type { AppPageId, AppTweakState, NavItem, RoleId } from "@/types/domain";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api";

export const defaultTweaks: AppTweakState = {
  role: "dispatcher",
  lang: "uk",
  density: "comfortable",
  liveLayout: "map",
  accent: "#4D8BFF",
};

export const navByRole: Record<RoleId, NavItem[]> = {
  dispatcher: [
    { id: "live", label: "nav.live", icon: "map", badge: 2 },
    { id: "forecast", label: "nav.forecast", icon: "trend" },
    { id: "profit", label: "nav.profit", icon: "coins" },
    { id: "reports", label: "nav.reports", icon: "file" },
  ],
  business_admin: [
    { id: "routes", label: "nav.routes", icon: "route" },
    { id: "fleet", label: "nav.fleet", icon: "truck" },
    { id: "users", label: "nav.users", icon: "users" },
    { id: "settings", label: "nav.settings", icon: "settings" },
  ],
  tech_admin: [
    { id: "backups", label: "nav.backups", icon: "database" },
    { id: "logs", label: "nav.logs", icon: "terminal" },
    { id: "health", label: "nav.health", icon: "heart-pulse" },
    { id: "audit", label: "nav.audit", icon: "activity" },
  ],
};

export const defaultPageByRole: Record<RoleId, AppPageId> = {
  dispatcher: "live",
  business_admin: "routes",
  tech_admin: "backups",
};

export const roleSectionTitle: Record<RoleId, string> = {
  dispatcher: "sec.operations",
  business_admin: "sec.admin",
  tech_admin: "sec.tech",
};
