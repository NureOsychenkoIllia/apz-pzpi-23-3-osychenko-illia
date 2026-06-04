import { interpolateTripPosition } from "@/fixtures/appData";
import type {
  BusRow,
  ForecastRow,
  ProfitabilityRow,
  RoleId,
  RouteRow,
  TripViewModel,
  UserRow,
} from "@/types/domain";

export function mapBackendRole(roleName: string | null | undefined): RoleId {
  const role = (roleName ?? "").toLowerCase();
  if (role.includes("tech")) return "tech_admin";
  if (role.includes("business") || role.includes("admin")) return "business_admin";
  return "dispatcher";
}

export function unwrapApiList<T>(raw: unknown): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as T[];
  const value = raw as Record<string, unknown>;
  const directList =
    (value.data as T[]) ??
    (value.items as T[]) ??
    (value.rows as T[]) ??
    (value.results as T[]) ??
    (value.predictions as T[]) ??
    (value.forecast as T[]) ??
    (value.forecasts as T[]) ??
    (value.trips as T[]) ??
    (value.routes as T[]) ??
    (value.buses as T[]) ??
    (value.users as T[]);

  if (Array.isArray(directList)) return directList;

  const nestedArray = Object.values(value).find(Array.isArray);
  return Array.isArray(nestedArray) ? (nestedArray as T[]) : [];
}

export function normalizeTrip(raw: Record<string, unknown>): TripViewModel {
  if ("from" in raw && "to" in raw && "loadPct" in raw) {
    return raw as unknown as TripViewModel;
  }

  const departureRaw = raw.scheduled_departure as string | undefined;
  const departure = departureRaw ? new Date(departureRaw) : null;
  const route = (raw.route ?? {}) as Record<string, unknown>;
  const bus = (raw.bus ?? {}) as Record<string, unknown>;
  const capacity = Number(bus.capacity ?? raw.capacity ?? 50);
  const passengers = Number(raw.current_passengers ?? raw.passengers ?? 0);
  const durationMinutes = Number(route.estimated_duration_minutes ?? 0);
  const progress = departure && durationMinutes
    ? Math.min(
        1,
        Math.max(0, (Date.now() - departure.getTime()) / (durationMinutes * 60_000)),
      )
    : 0.5;

  const formatTime = (date: Date | null) =>
    date
      ? `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
      : "—";

  const arrival =
    departure && durationMinutes
      ? new Date(departure.getTime() + durationMinutes * 60_000)
      : null;
  const from = String(route.origin_city ?? "—");
  const to = String(route.destination_city ?? "—");
  const position = interpolateTripPosition(from, to, progress);

  return {
    id: `TR-${raw.id}`,
    from,
    to,
    depart: formatTime(departure),
    arrive: formatTime(arrival),
    passengers,
    capacity,
    loadPct: capacity > 0 ? Math.round((passengers / capacity) * 100) : 0,
    currentPrice: Number(route.base_price ?? 300),
    basePrice: Number(route.base_price ?? 300),
    status:
      raw.status === "in_progress" || raw.status === "scheduled"
        ? "on-time"
        : "delayed",
    driver: String(raw.driver_name ?? "—"),
    bus: `B-${raw.bus_id ?? raw.id}`,
    progress,
    distance: Number(route.distance_km ?? 400),
    lat: position?.lat,
    lng: position?.lng,
    _departure: departureRaw ?? null,
  };
}

export function normalizeForecast(
  raw: Record<string, unknown>,
  route?: Record<string, unknown> | null,
): ForecastRow {
  if ("forecastPax" in raw || "forecast_pax" in raw) {
    return raw as ForecastRow;
  }

  const recommendation = String(raw.recommendation ?? "");
  const mappedRecommendation =
    recommendation === "add_trip"
      ? "add"
      : recommendation === "cancel_trip"
        ? "cancel"
        : "hold";

  return {
    trip: String(raw.date ?? raw.day_of_week ?? "forecast"),
    from: String(route?.origin_city ?? ""),
    to: String(route?.destination_city ?? ""),
    date: String(raw.date ?? ""),
    day_of_week: String(raw.day_of_week ?? ""),
    forecastPax: Number(raw.predicted_passengers ?? raw.forecastPax ?? raw.forecast_pax ?? 0),
    capacity: 50,
    ciLow: Number(
      (raw.confidence_interval as Record<string, unknown> | undefined)?.lower
      ?? raw.ciLow
      ?? raw.ci_low
      ?? 0,
    ),
    ciHigh: Number(
      (raw.confidence_interval as Record<string, unknown> | undefined)?.upper
      ?? raw.ciHigh
      ?? raw.ci_high
      ?? 0,
    ),
    rec: mappedRecommendation,
    recommendation: mappedRecommendation,
    recommendation_detail: String(raw.recommendation_detail ?? ""),
  };
}

export function normalizeRoute(raw: Record<string, unknown>): RouteRow {
  if ("from" in raw && "dailyTrips" in raw) return raw as unknown as RouteRow;
  return {
    id: `R-${raw.id}`,
    _id: raw.id as string | number,
    from: String(raw.origin_city ?? raw.from ?? ""),
    to: String(raw.destination_city ?? raw.to ?? ""),
    distance: Number(raw.distance_km ?? raw.distance ?? 0),
    basePrice: Number(raw.base_price ?? raw.basePrice ?? 0),
    dailyTrips: Number(raw.daily_trips ?? raw.dailyTrips ?? 0),
    status: raw.is_active === false ? "paused" : "active",
  };
}

export function normalizeBus(raw: Record<string, unknown>): BusRow {
  if ("plate" in raw) return raw as unknown as BusRow;
  return {
    id: `B-${raw.id}`,
    _id: raw.id as string | number,
    plate: String(raw.registration_number ?? ""),
    model: String(raw.model ?? "—"),
    capacity: Number(raw.capacity ?? 50),
    fuel: raw.fuel_consumption_per_100km ? Number(raw.fuel_consumption_per_100km) : null,
    iot: String(raw.iot_device_id ?? "—"),
    status: raw.is_active === false ? "maintenance" : "depot",
  };
}

export function normalizeUser(raw: Record<string, unknown>): UserRow {
  if ("name" in raw && "lastLogin" in raw) return raw as unknown as UserRow;
  const role = raw.role as string | Record<string, unknown> | undefined;
  const roleName = typeof role === "object" ? String(role?.name ?? "") : String(role ?? "");
  const mappedRole = mapBackendRole(roleName);
  return {
    id: raw.id as string | number,
    _id: raw.id as string | number,
    _roleId: (raw.role_id as number | null | undefined) ?? (typeof role === "object" ? Number(role?.id ?? 1) : 1),
    name: String(raw.full_name ?? raw.email ?? "—"),
    email: String(raw.email ?? ""),
    role: mappedRole,
    lastLogin: raw.updated_at ? new Date(String(raw.updated_at)).toLocaleDateString("uk-UA") : "—",
    status: raw.is_active === false ? "inactive" : "active",
  };
}

export function normalizeProfitability(raw: Record<string, unknown>): ProfitabilityRow {
  if ("margin" in raw && "from" in raw) return raw as unknown as ProfitabilityRow;
  const routeName = String(raw.route_name ?? "—");
  const [from, to] = routeName.split(/\s*[–-]\s*/);
  const revenue = Number(raw.revenue ?? 0);
  const cost = Number(raw.costs ?? 0);
  const profit = Number(raw.profit ?? revenue - cost);
  return {
    route: raw.route_id ? `R-${raw.route_id}` : "R-?",
    routeName,
    from: from ?? "—",
    to: to ?? "—",
    trips: Number(raw.trips_count ?? 0),
    totalPax: Number(raw.total_passengers ?? 0),
    avgLoad: raw.avg_occupancy != null ? Math.round(Number(raw.avg_occupancy) * 100) : 0,
    revenue,
    cost,
    profit,
    margin: raw.profitability != null ? Number(raw.profitability) : cost > 0 ? (profit / cost) * 100 : 0,
  };
}
