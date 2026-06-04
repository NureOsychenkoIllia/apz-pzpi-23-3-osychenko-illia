import type {
  AppAlert,
  AuditLogRow,
  BusRow,
  Language,
  ProfitabilityRow,
  RoleId,
  RouteRow,
  TripViewModel,
} from "@/types/domain";

type CityCoords = {
  lat: number;
  lng: number;
  uk: string;
  en: string;
};

export const roleLabels: Record<RoleId, { uk: string; en: string; color: string }> = {
  dispatcher: { uk: "Диспетчер", en: "Dispatcher", color: "var(--accent)" },
  business_admin: { uk: "Бізнес-адмін", en: "Business admin", color: "var(--violet)" },
  tech_admin: { uk: "Тех-адмін", en: "Tech admin", color: "var(--info)" },
};

export const cities = {
  Kyiv: { lat: 50.4501, lng: 30.5234, uk: "Київ", en: "Kyiv" },
  Lviv: { lat: 49.8397, lng: 24.0297, uk: "Львів", en: "Lviv" },
  Odesa: { lat: 46.4825, lng: 30.7233, uk: "Одеса", en: "Odesa" },
  Kharkiv: { lat: 49.9935, lng: 36.2304, uk: "Харків", en: "Kharkiv" },
  Dnipro: { lat: 48.4647, lng: 35.0462, uk: "Дніпро", en: "Dnipro" },
  Vinnytsia: { lat: 49.2331, lng: 28.4682, uk: "Вінниця", en: "Vinnytsia" },
  Chernivtsi: { lat: 48.2921, lng: 25.9358, uk: "Чернівці", en: "Chernivtsi" },
  Uzhhorod: { lat: 48.6208, lng: 22.2879, uk: "Ужгород", en: "Uzhhorod" },
  Zaporizhzhia: { lat: 47.8388, lng: 35.1396, uk: "Запоріжжя", en: "Zaporizhzhia" },
  IvanoFrank: { lat: 48.9226, lng: 24.7111, uk: "Івано-Франківськ", en: "Ivano-Frankivsk" },
  Ternopil: { lat: 49.5535, lng: 25.5948, uk: "Тернопіль", en: "Ternopil" },
  Cherkasy: { lat: 49.4444, lng: 32.0598, uk: "Черкаси", en: "Cherkasy" },
  Poltava: { lat: 49.5883, lng: 34.5514, uk: "Полтава", en: "Poltava" },
  Chernihiv: { lat: 51.4982, lng: 31.2893, uk: "Чернігів", en: "Chernihiv" },
};

function normalizeCityToken(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[`'’"]/g, "")
    .replace(/[\s-]+/g, "");
}

const cityAliasMap = new Map<string, CityCoords>();
Object.entries(cities).forEach(([key, coords]) => {
  cityAliasMap.set(normalizeCityToken(key), coords);
  cityAliasMap.set(normalizeCityToken(coords.uk), coords);
  cityAliasMap.set(normalizeCityToken(coords.en), coords);
});
cityAliasMap.set(normalizeCityToken("Ivano-Frankivsk"), cities.IvanoFrank);
cityAliasMap.set(normalizeCityToken("Ivano Frankivsk"), cities.IvanoFrank);

export function findCityCoords(nameOrKey: string | null | undefined): CityCoords | null {
  if (!nameOrKey) return null;
  return cityAliasMap.get(normalizeCityToken(nameOrKey)) ?? null;
}

export function interpolateTripPosition(
  from: string | null | undefined,
  to: string | null | undefined,
  progress: number | null | undefined,
) {
  const origin = findCityCoords(from);
  const destination = findCityCoords(to);
  if (!origin || !destination) return null;

  const safeProgress = Math.min(1, Math.max(0, progress ?? 0.5));
  return {
    lat: origin.lat + (destination.lat - origin.lat) * safeProgress,
    lng: origin.lng + (destination.lng - origin.lng) * safeProgress,
  };
}

export const i18n: Record<Language, Record<string, string>> = {
  uk: {
    "nav.live": "Моніторинг",
    "nav.forecast": "Прогноз попиту",
    "nav.profit": "Рентабельність",
    "nav.reports": "Звіти",
    "nav.routes": "Маршрути",
    "nav.fleet": "Автопарк",
    "nav.users": "Користувачі",
    "nav.settings": "Налаштування",
    "nav.backups": "Резервні копії",
    "nav.logs": "Журнали",
    "nav.health": "Стан системи",
    "nav.audit": "Журнал аудиту",
    "sec.operations": "Операції",
    "sec.admin": "Адміністрування",
    "sec.tech": "Технічний контур",
    "cta.new": "Створити",
    "cta.export": "Експорт",
    "today": "Сьогодні",
    "week": "Тиждень",
    "month": "Місяць",
    "capacity": "Місткість",
    "load": "Завантаженість",
  },
  en: {
    "nav.live": "Live monitoring",
    "nav.forecast": "Demand forecast",
    "nav.profit": "Profitability",
    "nav.reports": "Reports",
    "nav.routes": "Routes",
    "nav.fleet": "Fleet",
    "nav.users": "Users",
    "nav.settings": "Settings",
    "nav.backups": "Backups",
    "nav.logs": "Logs",
    "nav.health": "Health",
    "nav.audit": "Audit log",
    "sec.operations": "Operations",
    "sec.admin": "Administration",
    "sec.tech": "Technical",
    "cta.new": "Create",
    "cta.export": "Export",
    "today": "Today",
    "week": "Week",
    "month": "Month",
    "capacity": "Capacity",
    "load": "Load",
  },
};

export const alerts: AppAlert[] = [
  {
    id: 1,
    level: "danger",
    titleUk: "Переповнення",
    titleEn: "Overload",
    bodyUk: "Київ → Львів: 96% завантаження, ціна +44%",
    bodyEn: "Kyiv → Lviv: 96% occupancy, fare +44%",
    time: "14:32",
  },
  {
    id: 2,
    level: "warn",
    titleUk: "Попит нижче прогнозу",
    titleEn: "Forecast miss",
    bodyUk: "Львів → Чернівці: факт 24%, прогноз 58%",
    bodyEn: "Lviv → Chernivtsi: actual 24%, forecast 58%",
    time: "14:18",
  },
];

export const passengersByHour = [
  { h: "06", pax: 124 },
  { h: "07", pax: 218 },
  { h: "08", pax: 264 },
  { h: "09", pax: 198 },
  { h: "10", pax: 172 },
  { h: "11", pax: 165 },
  { h: "12", pax: 180 },
  { h: "13", pax: 192 },
  { h: "14", pax: 210 },
  { h: "15", pax: 224 },
  { h: "16", pax: 245 },
  { h: "17", pax: 268 },
];

export const revenueByDay = Array.from({ length: 14 }, (_, index) => ({
  day: `D${index + 1}`,
  revenue: 180000 + index * 6500,
  cost: 112000 + index * 4700,
}));

export const trendByRoute: Record<string, { week: string; load: number }[]> = {
  "R-104": [48, 52, 57, 61, 66, 64, 68, 71, 73, 75, 79, 81].map((load, index) => ({
    week: `W${index + 1}`,
    load,
  })),
  "R-207": [51, 48, 47, 49, 53, 55, 58, 57, 56, 59, 62, 61].map((load, index) => ({
    week: `W${index + 1}`,
    load,
  })),
};

export const fixtureRoutes: RouteRow[] = [
  { id: "R-104", from: "Kyiv", to: "Lviv", distance: 540, basePrice: 750, dailyTrips: 8, status: "active" },
  { id: "R-207", from: "Odesa", to: "Kharkiv", distance: 730, basePrice: 920, dailyTrips: 6, status: "active" },
];

export const fixtureBuses: BusRow[] = [
  { id: "BUS-001", plate: "AA 7741 KK", model: "Setra S 415 HD", capacity: 49, fuel: 24.5, iot: "IOT-A1F3", status: "on-trip" },
  { id: "BUS-002", plate: "AA 5208 KC", model: "Mercedes Tourismo", capacity: 51, fuel: 26.1, iot: "IOT-B2C7", status: "depot" },
];

export const fixtureTrips: TripViewModel[] = [
  {
    id: "T-08412",
    from: "Kyiv",
    to: "Lviv",
    depart: "06:30",
    arrive: "15:10",
    passengers: 47,
    capacity: 49,
    loadPct: 96,
    currentPrice: 1085,
    basePrice: 750,
    status: "on-time",
    driver: "Петренко О.",
    bus: "BUS-001",
    progress: 0.62,
    distance: 540,
    lat: 49.95,
    lng: 27.3,
  },
];

export const fixtureProfitability: ProfitabilityRow[] = [
  {
    route: "R-104",
    routeName: "Kyiv – Lviv",
    from: "Kyiv",
    to: "Lviv",
    trips: 56,
    totalPax: 2140,
    avgLoad: 78,
    revenue: 318420,
    cost: 184600,
    profit: 133820,
    margin: 42,
  },
];

export const backupHistory = [
  { id: "bkp-2026-05-20-0300", size: "4.82 GB", created: "2026-05-20 03:00", status: "ok", type: "scheduled", durationSec: 87 },
  { id: "bkp-2026-05-19-0300", size: "4.79 GB", created: "2026-05-19 03:00", status: "ok", type: "scheduled", durationSec: 84 },
];

export const migrationHistory = [
  { v: "20260518_120000", name: "add_iot_device_jwt_revocation", applied: "2026-05-18 12:04", dirty: false },
  { v: "20260512_090000", name: "fare_calc_audit_table", applied: "2026-05-12 09:11", dirty: false },
];

export const logFixture = [
  { t: "14:32:18", lvl: "warn", svc: "analytics", msg: "trip occupancy 96% exceeds threshold" },
  { t: "14:31:55", lvl: "info", svc: "iot_gateway", msg: "device sync 32 events accepted" },
  { t: "14:30:11", lvl: "info", svc: "forecast", msg: "recompute job complete routes=12" },
];

export const auditFixture: AuditLogRow[] = [
  { id: 1, user_id: 2, action: "UPDATE", entity_type: "trips", entity_id: "8412", created_at: new Date().toISOString(), ip_address: "192.168.1.10" },
];

export const translate = (key: string, lang: Language) => i18n[lang][key] ?? key;

export const cityName = (city: string, lang: Language) => {
  const match = findCityCoords(city);
  return match ? match[lang] : city;
};

export const routeLabel = (routeId: string, lang: Language) => {
  const route = fixtureRoutes.find((item) => item.id === routeId);
  return route ? `${cityName(route.from, lang)} → ${cityName(route.to, lang)}` : routeId;
};
