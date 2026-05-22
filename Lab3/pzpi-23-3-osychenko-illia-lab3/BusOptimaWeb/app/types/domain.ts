export type RoleId = "dispatcher" | "business_admin" | "tech_admin";
export type AppPageId =
  | "live"
  | "forecast"
  | "profit"
  | "reports"
  | "routes"
  | "fleet"
  | "users"
  | "settings"
  | "backups"
  | "logs"
  | "health"
  | "audit";

export type Language = "uk" | "en";
export type Density = "comfortable" | "compact";
export type LiveLayout = "map" | "cards";

export interface SessionUser {
  id?: number | string;
  email: string;
  full_name?: string;
  role?: string | { id?: number; name?: string };
}

export interface NavItem {
  id: AppPageId;
  label: string;
  icon: IconName;
  badge?: number;
}

export interface AppTweakState {
  role: RoleId;
  lang: Language;
  density: Density;
  liveLayout: LiveLayout;
  accent: string;
}

export type AlertLevel = "danger" | "warn" | "info" | "ok";

export interface AppAlert {
  id: number;
  level: AlertLevel;
  titleUk: string;
  titleEn: string;
  bodyUk: string;
  bodyEn: string;
  time: string;
}

export interface TripViewModel {
  id: string;
  from: string;
  to: string;
  depart: string;
  arrive: string;
  passengers: number;
  capacity: number;
  loadPct: number;
  currentPrice: number;
  basePrice: number;
  status: "on-time" | "delayed";
  driver: string;
  bus: string;
  progress: number;
  distance: number;
  lat?: number;
  lng?: number;
  _departure?: string | null;
}

export interface DashboardSummary {
  active_trips?: number;
  total_passengers?: number;
  avg_occupancy?: number;
}

export interface ForecastRow {
  trip?: string;
  trip_id?: string | number;
  from?: string;
  to?: string;
  route?: { from_city?: string; to_city?: string };
  date?: string;
  day_of_week?: string;
  departure_time?: string;
  forecastPax?: number;
  forecast_pax?: number;
  capacity?: number;
  ciLow?: number;
  ciHigh?: number;
  ci_low?: number;
  ci_high?: number;
  rec?: "add" | "cancel" | "hold";
  recommendation?: "add" | "cancel" | "hold";
  recommendation_detail?: string;
}

export interface ProfitabilityRow {
  route: string;
  routeName?: string;
  from: string;
  to: string;
  trips: number;
  totalPax?: number;
  avgLoad: number;
  revenue: number;
  cost: number;
  profit: number;
  margin: number;
}

export interface RouteRow {
  id: string;
  _id?: number | string;
  from: string;
  to: string;
  distance: number;
  basePrice: number;
  dailyTrips: number;
  status: "active" | "paused";
}

export interface BusRow {
  id: string;
  _id?: number | string;
  plate: string;
  model: string;
  capacity: number;
  fuel: number | null;
  iot: string;
  status: "on-trip" | "depot" | "maintenance" | "inactive";
}

export interface UserRow {
  id: number | string;
  _id?: number | string;
  _roleId?: number | null;
  name: string;
  email: string;
  role: RoleId;
  lastLogin: string;
  status: "active" | "inactive";
}

export interface SettingsDto {
  fuel_price_per_liter: number;
  peak_hours_coefficient: number;
  weekend_coefficient: number;
  high_demand_threshold: number;
  low_demand_threshold: number;
  price_min_coefficient: number;
  price_max_coefficient: number;
  seasonal_coefficients: Record<string, number>;
  updated_at?: string;
  updated_by_user?: {
    full_name: string;
  };
}

export interface AuditLogRow {
  id: number | string;
  user_id: number | string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  ip_address: string;
}

export type IconName =
  | "activity"
  | "alert"
  | "bus"
  | "bell"
  | "check"
  | "check-c"
  | "chevron-down"
  | "chevron-left"
  | "coins"
  | "database"
  | "download"
  | "edit"
  | "file"
  | "filter"
  | "globe"
  | "grid"
  | "heart-pulse"
  | "info-c"
  | "key"
  | "layers"
  | "list"
  | "logout"
  | "map"
  | "minus"
  | "pin"
  | "play"
  | "plus"
  | "refresh"
  | "route"
  | "search"
  | "settings"
  | "shield"
  | "terminal"
  | "trash"
  | "trend"
  | "truck"
  | "upload"
  | "users"
  | "x";
