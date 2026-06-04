import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import * as XLSX from "xlsx";

import { apiClient } from "@/api/client";
import { LiveMap } from "@/components/LiveMap";
import { Icon, Kpi, LabeledRoute, LoadBar, PageState, Pill } from "@/components/ui";
import {
  alerts,
  fixtureRoutes,
  fixtureTrips,
  passengersByHour,
  revenueByDay,
  routeLabel,
  trendByRoute,
  translate,
} from "@/fixtures/appData";
import { fmtPct, fmtUAH } from "@/lib/format";
import { normalizeForecast, normalizeProfitability, normalizeRoute, normalizeTrip, unwrapApiList } from "@/lib/mappers";
import type { DashboardSummary, ForecastRow, Language, ProfitabilityRow, RouteRow } from "@/types/domain";

const axisColor = "#6B7895";
const gridColor = "#1B2440";
const tooltipStyle = {
  background: "rgba(10,15,28,0.95)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  color: "#F1F5FB",
};
const tooltipLabelStyle = {
  color: "#F8FAFC",
  fontWeight: 600,
};
const tooltipItemStyle = {
  color: "#CBD5E1",
};

export function DispatcherLive({
  lang,
  layout,
  onLayoutChange,
}: {
  lang: Language;
  layout: "map" | "cards";
  onLayoutChange: (value: "map" | "cards") => void;
}) {
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  const tripsQuery = useQuery({
    queryKey: ["dispatcher", "live", "trips"],
    queryFn: async () => {
      const raw = await apiClient.getTrips({ status: "in_progress" });
      const trips = unwrapApiList<Record<string, unknown>>(raw).map(normalizeTrip);
      const priceResults = await Promise.allSettled(
        trips.map((trip) =>
          apiClient.calculatePrice({
            base_price: trip.basePrice,
            current_passengers: trip.passengers,
            capacity: trip.capacity,
            departure_time: trip._departure ?? new Date().toISOString(),
          }),
        ),
      );

      return trips.map((trip, index) => ({
        ...trip,
        currentPrice:
          priceResults[index].status === "fulfilled" &&
          typeof priceResults[index].value === "object" &&
          priceResults[index].value &&
          "recommended_price" in priceResults[index].value
            ? Number((priceResults[index].value as { recommended_price?: number }).recommended_price ?? trip.currentPrice)
            : trip.currentPrice,
      }));
    },
    placeholderData: fixtureTrips,
  });

  const dashboardQuery = useQuery<DashboardSummary>({
    queryKey: ["dispatcher", "dashboard"],
    queryFn: () => apiClient.getDashboard(),
  });

  const trips = tripsQuery.data ?? [];
  const selected = trips.find((trip) => trip.id === selectedTripId) ?? trips[0] ?? null;

  const summary = useMemo(() => {
    const total = trips.length;
    const totalPax = trips.reduce((sum, trip) => sum + trip.passengers, 0);
    const totalCap = trips.reduce((sum, trip) => sum + trip.capacity, 0);
    const avgLoad = totalCap > 0 ? Math.round((totalPax / totalCap) * 100) : 0;
    return {
      total,
      totalPax,
      avgLoad,
      overloaded: trips.filter((trip) => trip.loadPct >= 85).length,
    };
  }, [trips]);

  const exportTrips = () => {
    const rows = trips.map((trip) => ({
      Trip: trip.id,
      Route: `${trip.from} → ${trip.to}`,
      Departure: trip.depart,
      Passengers: trip.passengers,
      Capacity: trip.capacity,
      Load: trip.loadPct,
      Price: trip.currentPrice,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Trips");
    XLSX.writeFile(wb, `BusOptima_live_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const liveContent = layout === "map" ? (
    <LiveMap trips={trips} selectedTripId={selected?.id ?? null} onSelectTrip={setSelectedTripId} lang={lang} />
  ) : (
    <div className="col" style={{ gap: 12 }}>
      {trips.map((trip) => (
        <div
          key={trip.id}
          className={`trip-card ${selected?.id === trip.id ? "active" : ""}`}
          onClick={() => setSelectedTripId(trip.id)}
        >
          <div className="trip-route">
            <span>{trip.from}</span>
            <span className="arrow">→</span>
            <span>{trip.to}</span>
          </div>
          <div className="trip-meta">
            <span><Icon name="route" /> {trip.id}</span>
            <span><Icon name="bus" /> {trip.bus}</span>
            <span><Icon name="users" /> {trip.passengers}/{trip.capacity}</span>
            <span><Icon name="coins" /> {fmtUAH(trip.currentPrice)}</span>
          </div>
          <div className="trip-bottom">
            <div className="trip-load">
              <LoadBar pct={trip.loadPct} />
            </div>
            <Pill kind={trip.status === "delayed" ? "warn" : "ok"}>
              {trip.status === "delayed" ? (lang === "en" ? "Delayed" : "Затримка") : (lang === "en" ? "On time" : "Вчасно")}
            </Pill>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Live monitoring" : "Моніторинг у реальному часі"}</h1>
          <p className="page-subtitle">
            {lang === "en"
              ? `${summary.total} active trips · ${summary.totalPax} passengers on board · avg load ${summary.avgLoad}%`
              : `${summary.total} активних рейсів · ${summary.totalPax} пасажирів на борту · середня завантаженість ${summary.avgLoad}%`}
          </p>
        </div>
        <div className="page-actions">
          <div className="layout-toggle">
            <button className={layout === "map" ? "active" : ""} onClick={() => onLayoutChange("map")}>
              <Icon name="map" /> {lang === "en" ? "Map" : "Карта"}
            </button>
            <button className={layout === "cards" ? "active" : ""} onClick={() => onLayoutChange("cards")}>
              <Icon name="grid" /> {lang === "en" ? "Cards" : "Картки"}
            </button>
          </div>
          <button className="btn" onClick={() => tripsQuery.refetch()}>
            <Icon name="refresh" /> {lang === "en" ? "Refresh" : "Оновити"}
          </button>
          <button className="btn btn-primary" onClick={exportTrips}>
            <Icon name="download" /> {translate("cta.export", lang)}
          </button>
        </div>
      </div>

      <PageState
        loading={tripsQuery.isLoading}
        error={tripsQuery.error instanceof Error ? tripsQuery.error.message : undefined}
        empty={!tripsQuery.isLoading && trips.length === 0}
        emptyText={lang === "en" ? "Backend returned no active trips" : "Бекенд не повернув активних рейсів"}
        loadingText={lang === "en" ? "Loading live data…" : "Завантаження даних…"}
      />

      {trips.length > 0 && (
        <>
          <div className="kpi-grid">
            <Kpi label={lang === "en" ? "Active trips" : "Активних рейсів"} value={dashboardQuery.data?.active_trips ?? summary.total} delta="+2 vs yesterday" />
            <Kpi label={lang === "en" ? "Passengers now" : "Пасажирів зараз"} value={dashboardQuery.data?.total_passengers ?? summary.totalPax} delta="+34 last hour" />
            <Kpi label={lang === "en" ? "Avg load" : "Середня завантаженість"} value={`${Math.round((dashboardQuery.data?.avg_occupancy ?? summary.avgLoad / 100) * 100)}%`} delta="+6pp" />
            <Kpi label={lang === "en" ? "Overload alerts" : "Сповіщень про переповнення"} value={summary.overloaded} delta="2 active" />
          </div>

          <div className="split-grid">
            <div>
              {liveContent}
              <div className="card" style={{ marginTop: 16 }}>
                <div className="card-title">{lang === "en" ? "Passengers by hour" : "Пасажиропотік по годинах"}</div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={passengersByHour} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid stroke={gridColor} vertical={false} />
                      <XAxis dataKey="h" stroke={axisColor} axisLine={false} tickLine={false} />
                      <YAxis stroke={axisColor} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                      <Area type="monotone" dataKey="pax" stroke="#4D8BFF" fill="rgba(77,139,255,0.2)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="col" style={{ gap: 16 }}>
              <div className="card">
                <div className="card-title">{lang === "en" ? "Selected trip" : "Обраний рейс"}</div>
                {selected && (
                  <div className="stat-list" style={{ marginTop: 12 }}>
                    <div className="stat-row"><span className="lbl">ID</span><span className="val">{selected.id}</span></div>
                    <div className="stat-row"><span className="lbl">{lang === "en" ? "Route" : "Маршрут"}</span><span className="val"><LabeledRoute from={selected.from} to={selected.to} lang={lang} /></span></div>
                    <div className="stat-row"><span className="lbl">{lang === "en" ? "Schedule" : "Розклад"}</span><span className="val">{selected.depart} → {selected.arrive}</span></div>
                    <div className="stat-row"><span className="lbl">{lang === "en" ? "Driver" : "Водій"}</span><span className="val">{selected.driver}</span></div>
                    <div className="stat-row"><span className="lbl">{lang === "en" ? "Bus" : "Автобус"}</span><span className="val">{selected.bus}</span></div>
                    <div className="stat-row"><span className="lbl">{lang === "en" ? "Load" : "Завантаження"}</span><span className="val"><LoadBar pct={selected.loadPct} /></span></div>
                    <div className="stat-row"><span className="lbl">{lang === "en" ? "Dynamic fare" : "Динамічна ціна"}</span><span className="val">{fmtUAH(selected.currentPrice)}</span></div>
                  </div>
                )}
              </div>

              <div className="card">
                <div className="card-title">{lang === "en" ? "Alerts" : "Сповіщення"}</div>
                <div className="notif-list" style={{ marginTop: 12 }}>
                  {alerts.map((alert) => (
                    <div key={alert.id} className="notif-item">
                      <span className="dot" style={{ background: alert.level === "danger" ? "var(--danger)" : "var(--warn)" }} />
                      <div>
                        <div style={{ fontWeight: 600 }}>{lang === "en" ? alert.titleEn : alert.titleUk}</div>
                        <div style={{ fontSize: 12, color: "var(--text-muted)" }}>{lang === "en" ? alert.bodyEn : alert.bodyUk}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DispatcherForecast({ lang }: { lang: Language }) {
  const [routeFilter, setRouteFilter] = useState<string>("");
  const routesQuery = useQuery({
    queryKey: ["dispatcher", "forecast", "routes"],
    queryFn: async () => {
      const raw = await apiClient.getRoutes();
      return unwrapApiList<Record<string, unknown>>(raw).map(normalizeRoute);
    },
  });

  const routeOptions = routesQuery.data ?? [];
  const fallbackRouteOptions = routeOptions.length > 0 ? routeOptions : fixtureRoutes;

  useEffect(() => {
    if (routeFilter) return;
    const firstRoute = routesQuery.data?.[0];
    const firstRouteId = firstRoute?._id ?? firstRoute?.id;
    if (firstRouteId != null) setRouteFilter(String(firstRouteId));
  }, [routeFilter, routesQuery.data]);

  const selectedRoute =
    fallbackRouteOptions.find((route) => String(route._id ?? route.id) === routeFilter)
    ?? fallbackRouteOptions[0]
    ?? null;
  const forecastQuery = useQuery({
    queryKey: ["dispatcher", "forecast", routeFilter],
    queryFn: async () => {
      const raw = await apiClient.getForecast(routeFilter);
      const value = raw as Record<string, unknown>;
      const route = (value.route as Record<string, unknown> | undefined) ?? null;
      return unwrapApiList<Record<string, unknown>>(raw).map((item) => normalizeForecast(item, route));
    },
    enabled: routeOptions.length > 0 && Boolean(routeFilter),
  });

  const rows = forecastQuery.data ?? [];
  const trendRouteKey = selectedRoute?.id ?? fixtureRoutes[0]?.id ?? "R-104";
  const trend = trendByRoute[trendRouteKey] ?? trendByRoute["R-104"];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Demand forecast" : "Прогноз попиту"}</h1>
          <p className="page-subtitle">{lang === "en" ? "Forecast for next 24h with confidence interval" : "Прогноз на 24 години з довірчим інтервалом"}</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => forecastQuery.refetch()}>
            <Icon name="refresh" /> {lang === "en" ? "Recompute" : "Перерахувати"}
          </button>
        </div>
      </div>

      <PageState
        loading={forecastQuery.isLoading}
        error={forecastQuery.error instanceof Error ? forecastQuery.error.message : undefined}
        empty={!forecastQuery.isLoading && rows.length === 0}
        emptyText={lang === "en" ? "Backend returned no forecast rows" : "Бекенд не повернув рядків прогнозу"}
        loadingText={lang === "en" ? "Loading forecast…" : "Завантаження прогнозу…"}
      />

      {rows.length > 0 && (
        <>
          <div className="kpi-grid">
            <Kpi label={lang === "en" ? "Trips tomorrow" : "Рейсів завтра"} value={rows.length} delta="+4" />
            <Kpi label={lang === "en" ? "Forecast load" : "Прогноз. завантаженість"} value={`${Math.round(rows.reduce((sum, row) => sum + ((row.forecastPax ?? row.forecast_pax ?? 0) / (row.capacity ?? 50)) * 100, 0) / rows.length)}%`} delta="+3pp" />
            <Kpi label={lang === "en" ? "Add suggestions" : "Додати рейси"} value={rows.filter((row) => (row.rec ?? row.recommendation) === "add").length} />
            <Kpi label={lang === "en" ? "Cancel suggestions" : "Скасувати рейси"} value={rows.filter((row) => (row.rec ?? row.recommendation) === "cancel").length} />
          </div>

          <div className="grid-2" style={{ alignItems: "start" }}>
            <div className="card">
              <div className="row" style={{ justifyContent: "space-between", marginBottom: 12 }}>
                <div>
                  <div className="card-title">{lang === "en" ? "Load trend" : "Тренд завантаженості"}</div>
                </div>
                <select className="select" value={routeFilter} onChange={(event) => setRouteFilter(event.target.value)}>
                  {fallbackRouteOptions.map((route) => {
                    const routeValue = String(route._id ?? route.id);
                    return (
                      <option key={routeValue} value={routeValue}>
                        {route.id} · {route.from} → {route.to}
                      </option>
                    );
                  })}
                </select>
              </div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="week" stroke={axisColor} axisLine={false} tickLine={false} />
                    <YAxis stroke={axisColor} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={false} />
                    <Line type="monotone" dataKey="load" stroke="#A78BFA" strokeWidth={2.4} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title">{lang === "en" ? "Demand by hour" : "Попит по годинах"}</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={passengersByHour} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="h" stroke={axisColor} axisLine={false} tickLine={false} />
                    <YAxis stroke={axisColor} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={false} />
                    <Bar dataKey="pax" radius={[4, 4, 0, 0]}>
                      {passengersByHour.map((point) => (
                        <Cell key={point.h} fill={point.pax > 220 ? "#FBBF24" : point.pax > 100 ? "#4D8BFF" : "#38BDF8"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">{lang === "en" ? "Upcoming trips" : "Наступні рейси"}</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === "en" ? "Trip" : "Рейс"}</th>
                    <th>{lang === "en" ? "Route" : "Маршрут"}</th>
                    <th>{lang === "en" ? "Forecast" : "Прогноз"}</th>
                    <th>{lang === "en" ? "Recommendation" : "Рекомендація"}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => {
                    const forecast = row.forecastPax ?? row.forecast_pax ?? 0;
                    const recommendation = row.rec ?? row.recommendation ?? "hold";
                    return (
                      <tr key={`${row.trip_id ?? row.trip ?? index}`}>
                        <td>{row.date ?? row.trip ?? row.trip_id ?? `F-${index}`}</td>
                        <td><LabeledRoute from={row.from ?? row.route?.from_city ?? "Kyiv"} to={row.to ?? row.route?.to_city ?? "Lviv"} lang={lang} /></td>
                        <td>{forecast} / {row.capacity ?? 50}</td>
                        <td>
                          <Pill kind={recommendation === "add" ? "ok" : recommendation === "cancel" ? "warn" : "accent"}>
                            {recommendation === "add"
                              ? (lang === "en" ? "Add trip" : "Додати рейс")
                              : recommendation === "cancel"
                                ? (lang === "en" ? "Cancel trip" : "Скасувати рейс")
                                : (lang === "en" ? "Keep current plan" : "Залишити без змін")}
                          </Pill>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function DispatcherProfit({ lang }: { lang: Language }) {
  const [sortBy, setSortBy] = useState<keyof ProfitabilityRow>("margin");
  const profitQuery = useQuery({
    queryKey: ["dispatcher", "profitability"],
    queryFn: async () => {
      const raw = await apiClient.getProfitability();
      const rows = ("by_route" in (raw as object) ? (raw as { by_route?: Record<string, unknown>[] }).by_route : unwrapApiList<Record<string, unknown>>(raw)) ?? [];
      return rows.map(normalizeProfitability);
    },
  });

  const rows = profitQuery.data ?? [];
  const sorted = [...rows].sort((left, right) => Number(right[sortBy]) - Number(left[sortBy]));
  const totals = rows.reduce(
    (acc, row) => ({
      revenue: acc.revenue + row.revenue,
      cost: acc.cost + row.cost,
      profit: acc.profit + row.profit,
    }),
    { revenue: 0, cost: 0, profit: 0 },
  );
  const margin = totals.cost > 0 ? (totals.profit / totals.cost) * 100 : 0;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Route profitability" : "Рентабельність маршрутів"}</h1>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => profitQuery.refetch()}>
            <Icon name="refresh" /> {lang === "en" ? "Refresh" : "Оновити"}
          </button>
        </div>
      </div>

      <PageState
        loading={profitQuery.isLoading}
        error={profitQuery.error instanceof Error ? profitQuery.error.message : undefined}
        empty={!profitQuery.isLoading && rows.length === 0}
        emptyText={lang === "en" ? "Backend returned no profitability rows" : "Бекенд не повернув даних рентабельності"}
        loadingText={lang === "en" ? "Loading profitability…" : "Завантаження рентабельності…"}
      />

      {rows.length > 0 && (
        <>
          <div className="kpi-grid">
            <Kpi label={lang === "en" ? "Revenue" : "Виручка"} value={fmtUAH(totals.revenue)} delta="+12.4%" />
            <Kpi label={lang === "en" ? "Costs" : "Витрати"} value={fmtUAH(totals.cost)} delta="+5.8%" />
            <Kpi label={lang === "en" ? "Net profit" : "Чистий прибуток"} value={fmtUAH(totals.profit)} delta="+18.2%" />
            <Kpi label={lang === "en" ? "Avg margin" : "Середня маржа"} value={fmtPct(margin)} delta="+2.1pp" />
          </div>

          <div className="grid-2" style={{ alignItems: "start" }}>
            <div className="card">
              <div className="card-title">{lang === "en" ? "Revenue vs cost · 14 days" : "Виручка vs витрати · 14 днів"}</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueByDay}>
                    <CartesianGrid stroke={gridColor} vertical={false} />
                    <XAxis dataKey="day" stroke={axisColor} axisLine={false} tickLine={false} />
                    <YAxis stroke={axisColor} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} cursor={false} />
                    <Bar dataKey="revenue" fill="#4D8BFF" />
                    <Bar dataKey="cost" fill="#FBBF24" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="card">
              <div className="card-title">{lang === "en" ? "Top profit routes" : "Маршрути за прибутком"}</div>
              <div className="chart-wrap">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sorted.slice(0, 6)} layout="vertical" margin={{ top: 8, right: 20, left: 40, bottom: 0 }}>
                    <CartesianGrid stroke={gridColor} horizontal={false} />
                    <XAxis type="number" stroke={axisColor} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="route" stroke={axisColor} axisLine={false} tickLine={false} width={60} />
                    <Tooltip contentStyle={tooltipStyle} labelStyle={tooltipLabelStyle} itemStyle={tooltipItemStyle} />
                    <Bar dataKey="profit" fill="#34D399" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-title">{lang === "en" ? "Per-route breakdown" : "Деталізація по маршрутах"}</div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>{lang === "en" ? "Route" : "Маршрут"}</th>
                    <th>{lang === "en" ? "Direction" : "Напрямок"}</th>
                    <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => setSortBy("trips")}>{lang === "en" ? "Trips" : "Рейсів"}</th>
                    <th style={{ textAlign: "right", cursor: "pointer" }} onClick={() => setSortBy("avgLoad")}>{translate("load", lang)}</th>
                    <th style={{ textAlign: "right" }}>{lang === "en" ? "Revenue" : "Виручка"}</th>
                    <th style={{ textAlign: "right" }}>{lang === "en" ? "Profit" : "Прибуток"}</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((row) => (
                    <tr key={row.route}>
                      <td>{row.route}</td>
                      <td>{row.routeName ?? `${row.from} → ${row.to}`}</td>
                      <td className="num" style={{ textAlign: "right" }}>{row.trips}</td>
                      <td style={{ textAlign: "right" }}><LoadBar pct={row.avgLoad} /></td>
                      <td className="num" style={{ textAlign: "right" }}>{fmtUAH(row.revenue)}</td>
                      <td className="num" style={{ textAlign: "right" }}>{fmtUAH(row.profit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

type ReportPeriod = "24h" | "7d" | "30d";
type ReportFormat = "xlsx" | "csv";
type ReportSections = {
  load: boolean;
  finance: boolean;
  forecast: boolean;
  alerts: boolean;
};

function formatIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getReportDateRange(period: ReportPeriod) {
  const now = new Date();
  const from = new Date(now);
  const days = period === "24h" ? 1 : period === "7d" ? 7 : 30;
  from.setDate(from.getDate() - days);
  return { now, from };
}

async function generateReportExport({
  lang,
  period,
  format,
  sections,
  selectedRoutes,
}: {
  lang: Language;
  period: ReportPeriod;
  format: ReportFormat;
  sections: ReportSections;
  selectedRoutes: RouteRow[];
}) {
  const { now, from } = getReportDateRange(period);
  const dateFrom = formatIsoDate(from);
  const dateTo = formatIsoDate(now);
  const selectedRouteIds = new Set(selectedRoutes.map((route) => String(route._id ?? route.id)));

  const [tripsRaw, profitabilityRaw] = await Promise.allSettled([
    apiClient.getTrips({ status: "in_progress" }),
    apiClient.getProfitability({ date_from: dateFrom, date_to: dateTo }),
  ]);

  const rawTrips =
    tripsRaw.status === "fulfilled"
      ? unwrapApiList<Record<string, unknown>>(tripsRaw.value)
      : [];
  const filteredTrips = selectedRouteIds.size > 0
    ? rawTrips.filter((trip) => selectedRouteIds.has(String(trip.route_id ?? "")))
    : rawTrips;

  const profitabilityPayload =
    profitabilityRaw.status === "fulfilled"
      ? (profitabilityRaw.value as Record<string, unknown>)
      : null;
  const profitabilityRows = profitabilityPayload?.by_route as Record<string, unknown>[] | undefined;
  const filteredProfitability = (profitabilityRows ?? []).filter((row) =>
    selectedRouteIds.size === 0 || selectedRouteIds.has(String(row.route_id ?? "")),
  );
  const profitabilitySummary = (profitabilityPayload?.summary as Record<string, unknown> | undefined) ?? {};

  const workbook = XLSX.utils.book_new();

  if (sections.load && filteredTrips.length > 0) {
    const rows = filteredTrips.map((trip) => ({
      [lang === "en" ? "Trip ID" : "ID рейсу"]: trip.id,
      [lang === "en" ? "Route" : "Маршрут"]: `${(trip.route as Record<string, unknown> | undefined)?.origin_city ?? "—"} → ${(trip.route as Record<string, unknown> | undefined)?.destination_city ?? "—"}`,
      [lang === "en" ? "Departure" : "Відправлення"]: trip.scheduled_departure ?? "—",
      [lang === "en" ? "Passengers" : "Пасажирів"]: trip.current_passengers ?? 0,
      [lang === "en" ? "Capacity" : "Місткість"]: (trip.bus as Record<string, unknown> | undefined)?.capacity ?? 0,
      [lang === "en" ? "Load %" : "Завантаженість %"]:
        (trip.bus as Record<string, unknown> | undefined)?.capacity
          ? Math.round(Number(trip.current_passengers ?? 0) / Number((trip.bus as Record<string, unknown>).capacity) * 100)
          : 0,
      [lang === "en" ? "Status" : "Статус"]: trip.status ?? "—",
      [lang === "en" ? "Driver" : "Водій"]: trip.driver_name ?? "—",
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), lang === "en" ? "Trips" : "Рейси");
  }

  if (sections.finance && filteredProfitability.length > 0) {
    const rows = filteredProfitability.map((row) => ({
      [lang === "en" ? "Route" : "Маршрут"]: row.route_name ?? `R-${row.route_id ?? "?"}`,
      [lang === "en" ? "Trips" : "Рейсів"]: row.trips_count ?? 0,
      [lang === "en" ? "Passengers" : "Пасажирів"]: row.total_passengers ?? 0,
      [lang === "en" ? "Avg load %" : "Сер. завантаж. %"]: row.avg_occupancy != null ? Math.round(Number(row.avg_occupancy) * 100) : 0,
      [lang === "en" ? "Revenue ₴" : "Виручка ₴"]: +Number(row.revenue ?? 0).toFixed(2),
      [lang === "en" ? "Costs ₴" : "Витрати ₴"]: +Number(row.costs ?? 0).toFixed(2),
      [lang === "en" ? "Profit ₴" : "Прибуток ₴"]: +Number(row.profit ?? 0).toFixed(2),
      [lang === "en" ? "Margin %" : "Маржа %"]: +Number(row.profitability ?? 0).toFixed(1),
      [lang === "en" ? "Category" : "Категорія"]: row.category ?? "—",
    }));
    rows.push({});
    rows.push({
      [lang === "en" ? "Route" : "Маршрут"]: lang === "en" ? "TOTAL" : "РАЗОМ",
      [lang === "en" ? "Trips" : "Рейсів"]: profitabilitySummary.total_trips ?? "",
      [lang === "en" ? "Passengers" : "Пасажирів"]: profitabilitySummary.total_passengers ?? "",
      [lang === "en" ? "Revenue ₴" : "Виручка ₴"]: +Number(profitabilitySummary.total_revenue ?? 0).toFixed(2),
      [lang === "en" ? "Costs ₴" : "Витрати ₴"]: +Number(profitabilitySummary.total_costs ?? 0).toFixed(2),
      [lang === "en" ? "Profit ₴" : "Прибуток ₴"]: +Number(profitabilitySummary.total_profit ?? 0).toFixed(2),
      [lang === "en" ? "Margin %" : "Маржа %"]: +Number(profitabilitySummary.average_profitability ?? 0).toFixed(1),
    });
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), lang === "en" ? "Profitability" : "Рентабельність");
  }

  if (sections.forecast && selectedRoutes.length > 0) {
    const forecastResponses = await Promise.allSettled(
      selectedRoutes.map((route) => apiClient.getForecast(String(route._id ?? route.id))),
    );

    const forecastRows = forecastResponses.flatMap((response, index) => {
      if (response.status !== "fulfilled") return [];
      const payload = response.value as Record<string, unknown>;
      const route = (payload.route as Record<string, unknown> | undefined) ?? {
        origin_city: selectedRoutes[index]?.from,
        destination_city: selectedRoutes[index]?.to,
      };
      return unwrapApiList<Record<string, unknown>>(payload).map((item) => normalizeForecast(item, route));
    });

    if (forecastRows.length > 0) {
      const rows = forecastRows.map((row) => ({
        [lang === "en" ? "Date" : "Дата"]: row.date ?? "—",
        [lang === "en" ? "Day" : "День"]: row.day_of_week ?? "—",
        [lang === "en" ? "Route" : "Маршрут"]: `${row.from ?? "—"} → ${row.to ?? "—"}`,
        [lang === "en" ? "Predicted passengers" : "Прогноз пасажирів"]: row.forecastPax ?? 0,
        [lang === "en" ? "Capacity" : "Місткість"]: row.capacity ?? 50,
        [lang === "en" ? "Confidence low" : "Нижня межа"]: row.ciLow ?? 0,
        [lang === "en" ? "Confidence high" : "Верхня межа"]: row.ciHigh ?? 0,
        [lang === "en" ? "Recommendation" : "Рекомендація"]: row.recommendation ?? "hold",
        [lang === "en" ? "Detail" : "Деталі"]: row.recommendation_detail ?? "—",
      }));
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), lang === "en" ? "Forecast" : "Прогноз");
    }
  }

  if (sections.alerts && alerts.length > 0) {
    const rows = alerts.map((alert) => ({
      [lang === "en" ? "Time" : "Час"]: alert.time,
      [lang === "en" ? "Level" : "Рівень"]: alert.level,
      [lang === "en" ? "Title" : "Заголовок"]: lang === "en" ? alert.titleEn : alert.titleUk,
      [lang === "en" ? "Message" : "Повідомлення"]: lang === "en" ? alert.bodyEn : alert.bodyUk,
    }));
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), lang === "en" ? "Alerts" : "Сповіщення");
  }

  const summaryRows = [
    { [lang === "en" ? "Metric" : "Показник"]: lang === "en" ? "Period" : "Період", [lang === "en" ? "Value" : "Значення"]: `${dateFrom} – ${dateTo}` },
    { [lang === "en" ? "Metric" : "Показник"]: lang === "en" ? "Routes selected" : "Маршрутів обрано", [lang === "en" ? "Value" : "Значення"]: selectedRoutes.length },
    { [lang === "en" ? "Metric" : "Показник"]: lang === "en" ? "Active trips" : "Активних рейсів", [lang === "en" ? "Value" : "Значення"]: filteredTrips.length },
    { [lang === "en" ? "Metric" : "Показник"]: lang === "en" ? "Sections" : "Розділи", [lang === "en" ? "Value" : "Значення"]: Object.values(sections).filter(Boolean).length },
    { [lang === "en" ? "Metric" : "Показник"]: lang === "en" ? "Generated at" : "Сформовано", [lang === "en" ? "Value" : "Значення"]: now.toISOString() },
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), lang === "en" ? "Summary" : "Зведення");

  const filename = `BusOptima_${period}_${formatIsoDate(now)}`;
  if (format === "csv") {
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filename}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    return `${filename}.csv`;
  }

  XLSX.writeFile(workbook, `${filename}.xlsx`);
  return `${filename}.xlsx`;
}

export function DispatcherReports({ lang }: { lang: Language }) {
  const [period, setPeriod] = useState<ReportPeriod>("7d");
  const [includeRoutes, setIncludeRoutes] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<ReportSections>({ load: true, finance: true, forecast: false, alerts: true });
  const [format, setFormat] = useState<ReportFormat>("xlsx");
  const [generating, setGenerating] = useState(false);
  const [exports, setExports] = useState<Array<{ name: string; when: string }>>([]);

  const routesQuery = useQuery({
    queryKey: ["dispatcher", "reports", "routes"],
    queryFn: async () => unwrapApiList<Record<string, unknown>>(await apiClient.getRoutes()).map(normalizeRoute),
  });
  const tripsQuery = useQuery({
    queryKey: ["dispatcher", "reports", "trips"],
    queryFn: async () => unwrapApiList<Record<string, unknown>>(await apiClient.getTrips({ status: "in_progress" })).map(normalizeTrip),
  });

  const routeOptions = routesQuery.data?.length ? routesQuery.data : fixtureRoutes;
  const selectedRoutes = useMemo(() => {
    const selected = routeOptions.filter((route) => includeRoutes[String(route._id ?? route.id)]);
    return selected.length > 0 ? selected : routeOptions;
  }, [includeRoutes, routeOptions]);
  const previewTrips = useMemo(() => {
    const routeIds = new Set(selectedRoutes.map((route) => route.id));
    return (tripsQuery.data ?? []).filter((trip) => routeIds.has(`R-${String((trip.id.match(/\d+/)?.[0] ?? ""))}`) || selectedRoutes.some((route) => route.from === trip.from && route.to === trip.to));
  }, [selectedRoutes, tripsQuery.data]);

  const toggleRoute = (routeKey: string) => {
    setIncludeRoutes((current) => ({ ...current, [routeKey]: !current[routeKey] }));
  };
  const toggleSection = (section: keyof ReportSections) => {
    setSections((current) => ({ ...current, [section]: !current[section] }));
  };

  const estimatedSize = `${(1.1 + selectedRoutes.length * 0.18 + Object.values(sections).filter(Boolean).length * 0.22).toFixed(1)} MB`;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const filename = await generateReportExport({
        lang,
        period,
        format,
        sections,
        selectedRoutes,
      });
      const now = new Date();
      setExports((current) => [{ name: filename, when: now.toLocaleTimeString(lang === "en" ? "en-GB" : "uk-UA") }, ...current].slice(0, 5));
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Reports & export" : "Звіти та експорт"}</h1>
          <p className="page-subtitle">{lang === "en" ? "Build a report from operational, financial and forecast data" : "Сформуйте звіт з операційних, фінансових та прогнозних даних"}</p>
        </div>
      </div>

      <PageState
        loading={routesQuery.isLoading || tripsQuery.isLoading}
        error={
          routesQuery.error instanceof Error
            ? routesQuery.error.message
            : tripsQuery.error instanceof Error
              ? tripsQuery.error.message
              : undefined
        }
        empty={!routesQuery.isLoading && !tripsQuery.isLoading && routeOptions.length === 0}
        emptyText={lang === "en" ? "No route data for report builder" : "Немає даних маршрутів для конструктора звіту"}
        loadingText={lang === "en" ? "Loading report builder…" : "Завантаження конструктора звіту…"}
      />

      {routeOptions.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 16, alignItems: "start" }}>
          <div className="card">
            <div className="card-title">{lang === "en" ? "Configure report" : "Параметри звіту"}</div>

            <div className="field" style={{ marginTop: 14 }}>
              <label className="label">{lang === "en" ? "Period" : "Період"}</label>
              <div className="layout-toggle">
                {[
                  ["24h", translate("today", lang)],
                  ["7d", translate("week", lang)],
                  ["30d", translate("month", lang)],
                ].map(([value, label]) => (
                  <button key={value} className={period === value ? "active" : ""} onClick={() => setPeriod(value as ReportPeriod)}>
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="label">{lang === "en" ? "Sections" : "Розділи"}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                {[
                  ["load", lang === "en" ? "Load & passengers" : "Завантаженість і пасажиропотік"],
                  ["finance", lang === "en" ? "Revenue & profitability" : "Виручка та рентабельність"],
                  ["forecast", lang === "en" ? "Forecast next day" : "Прогноз на день"],
                  ["alerts", lang === "en" ? "Critical alerts log" : "Журнал критичних сповіщень"],
                ].map(([key, label]) => (
                  <div
                    key={key}
                    className="row"
                    style={{ gap: 10, padding: 10, border: "1px solid var(--border)", borderRadius: 10, cursor: "pointer" }}
                    onClick={() => toggleSection(key as keyof ReportSections)}
                  >
                    <span className={`checkbox ${sections[key as keyof ReportSections] ? "on" : ""}`} />
                    <span style={{ fontSize: 13 }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="label">{lang === "en" ? "Routes" : "Маршрути"}</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
                {routeOptions.map((route) => {
                  const routeKey = String(route._id ?? route.id);
                  return (
                    <div
                      key={routeKey}
                      className="row"
                      style={{ gap: 10, padding: 8, border: "1px solid var(--border)", borderRadius: 8, cursor: "pointer" }}
                      onClick={() => toggleRoute(routeKey)}
                    >
                      <span className={`checkbox ${includeRoutes[routeKey] ? "on" : ""}`} />
                      <span style={{ fontSize: 12.5 }}>{route.id} · {route.from} → {route.to}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                {Object.values(includeRoutes).filter(Boolean).length === 0
                  ? (lang === "en" ? "All routes selected by default" : "За замовчуванням — усі маршрути")
                  : (lang === "en" ? `${selectedRoutes.length} routes selected` : `Обрано ${selectedRoutes.length} маршрутів`)}
              </div>
            </div>

            <div className="field">
              <label className="label">{lang === "en" ? "Format" : "Формат"}</label>
              <div className="layout-toggle">
                {["xlsx", "csv"].map((value) => (
                  <button key={value} className={format === value ? "active" : ""} onClick={() => setFormat(value as ReportFormat)}>
                    {value.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="col" style={{ gap: 14 }}>
            <div className="card">
              <div className="caption" style={{ marginBottom: 10 }}>{lang === "en" ? "Preview summary" : "Попередній перегляд"}</div>
              <div className="stat-list">
                <div className="stat-row"><span className="lbl">{lang === "en" ? "Period" : "Період"}</span><span className="val">{period}</span></div>
                <div className="stat-row"><span className="lbl">{lang === "en" ? "Sections" : "Розділів"}</span><span className="val">{Object.values(sections).filter(Boolean).length}</span></div>
                <div className="stat-row"><span className="lbl">{lang === "en" ? "Routes" : "Маршрутів"}</span><span className="val">{selectedRoutes.length}</span></div>
                <div className="stat-row"><span className="lbl">{lang === "en" ? "Active trips" : "Активних рейсів"}</span><span className="val">{previewTrips.length}</span></div>
                <div className="stat-row"><span className="lbl">{lang === "en" ? "Format" : "Формат"}</span><span className="val">{format.toUpperCase()}</span></div>
                <div className="stat-row"><span className="lbl">{lang === "en" ? "Est. size" : "Розмір"}</span><span className="val">~ {estimatedSize}</span></div>
              </div>
              <button className="btn btn-primary" style={{ width: "100%", marginTop: 14, height: 42, justifyContent: "center", opacity: generating ? 0.7 : 1 }} onClick={handleGenerate} disabled={generating}>
                <Icon name={generating ? "refresh" : "download"} /> {generating ? (lang === "en" ? "Generating…" : "Формування…") : (lang === "en" ? "Generate report" : "Сформувати звіт")}
              </button>
            </div>

            <div className="card">
              <div className="card-title">{lang === "en" ? "Recent exports" : "Останні експорти"}</div>
              <div className="stat-list">
                {exports.length === 0 && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", padding: "8px 0" }}>
                    {lang === "en" ? "No exports yet" : "Експортів поки немає"}
                  </div>
                )}
                {exports.map((item) => (
                  <div key={item.name + item.when} className="stat-row" style={{ alignItems: "center" }}>
                    <span className="lbl" style={{ display: "flex", alignItems: "center", gap: 8, fontFamily: "var(--font-mono)", fontSize: 11.5 }}>
                      <Icon name="file" size={13} style={{ color: "var(--accent)" }} /> {item.name}
                    </span>
                    <span className="val" style={{ fontSize: 11.5, color: "var(--text-dim)" }}>{item.when}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <div className="card-title">{lang === "en" ? "Preview trips" : "Попередній перегляд рейсів"}</div>
              <div className="col" style={{ gap: 12, marginTop: 12 }}>
                {(previewTrips.length > 0 ? previewTrips : tripsQuery.data ?? []).slice(0, 4).map((trip) => (
                  <div key={trip.id} className="trip-card">
                    <div className="trip-route">
                      <span>{trip.id}</span>
                    </div>
                    <div className="card-desc"><LabeledRoute from={trip.from} to={trip.to} lang={lang} /></div>
                    <LoadBar pct={trip.loadPct} />
                    <div style={{ marginTop: 12, color: "var(--text-muted)" }}>{fmtUAH(trip.currentPrice)}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
