/* Dispatcher screens */
/* global React, Recharts, API, BO */
const { useState, useEffect, useMemo } = React;
const { ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip: RTooltip, Legend, ReferenceLine, Cell } = Recharts;

const axisColor = '#6B7895';
const gridColor = '#1B2440';

// Normalize backend trip → UI format
// Backend fields: scheduled_departure, current_passengers, bus.capacity,
// route.origin_city, route.destination_city, route.distance_km, route.base_price
function normTrip(t) {
  if ('from' in t && 'to' in t && 'loadPct' in t) return t;
  const dep = t.scheduled_departure ? new Date(t.scheduled_departure) : null;
  let arr = t.actual_arrival ? new Date(t.actual_arrival) : null;
  if (!arr && dep && t.route?.estimated_duration_minutes) {
    arr = new Date(dep.getTime() + t.route.estimated_duration_minutes * 60000);
  }
  const fmt = (d) => d ? `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '—';
  const cap = t.bus?.capacity ?? 50;
  const pax = t.current_passengers ?? 0;
  const durationMs = (t.route?.estimated_duration_minutes ?? 0) * 60000;
  const now = Date.now();
  const progress = dep && durationMs > 0
    ? Math.min(1, Math.max(0, (now - dep.getTime()) / durationMs))
    : 0.5;
  return {
    id: `TR-${t.id}`,
    from: t.route?.origin_city ?? '—',
    to: t.route?.destination_city ?? '—',
    depart: fmt(dep),
    arrive: fmt(arr),
    passengers: pax,
    capacity: cap,
    loadPct: cap > 0 ? Math.round(pax / cap * 100) : 0,
    currentPrice: t.route?.base_price ?? 300,
    basePrice: t.route?.base_price ?? 300,
    status: (t.status === 'in_progress' || t.status === 'scheduled') ? 'on-time' : 'delayed',
    driver: t.driver_name ?? '—',
    bus: `B-${t.bus_id}`,
    progress,
    distance: t.route?.distance_km ?? 400,
    _departure: t.scheduled_departure ?? null,
  };
}

// Normalize backend RouteProfitability → UI format
// Backend fields: route_id, route_name, trips_count, total_passengers,
// avg_occupancy, revenue, costs, profit, profitability
function normProfit(r) {
  if ('margin' in r && 'from' in r) return r;
  const rev = r.revenue ?? 0;
  const cost = r.costs ?? 0;
  const profit = r.profit ?? (rev - cost);
  // route_name is like "Київ – Харків"
  const parts = (r.route_name ?? '').split(/\s*[–-]\s*/);
  return {
    route: r.route_id ? `R-${r.route_id}` : 'R-?',
    routeName: r.route_name ?? '—',
    from: parts[0] ?? '—',
    to: parts[1] ?? '—',
    trips: r.trips_count ?? 1,
    totalPax: r.total_passengers ?? 0,
    avgLoad: r.avg_occupancy != null ? Math.round(r.avg_occupancy * 100) : 0,
    revenue: rev,
    cost: cost,
    profit: profit,
    margin: r.profitability ?? (cost > 0 ? (profit / cost) * 100 : 0),
  };
}

function exportTrips(trips, lang) {
  const XLSX = window.XLSX;
  if (!XLSX) return;
  const rows = trips.map(t => ({
    [lang === 'en' ? 'Trip ID' : 'ID рейсу']: t.id,
    [lang === 'en' ? 'From' : 'Звідки']: t.from,
    [lang === 'en' ? 'To' : 'Куди']: t.to,
    [lang === 'en' ? 'Departure' : 'Відправлення']: t.depart,
    [lang === 'en' ? 'Arrival' : 'Прибуття']: t.arrive,
    [lang === 'en' ? 'Passengers' : 'Пасажирів']: t.passengers,
    [lang === 'en' ? 'Capacity' : 'Місткість']: t.capacity,
    [lang === 'en' ? 'Load %' : 'Завантаженість %']: t.loadPct,
    [lang === 'en' ? 'Price ₴' : 'Ціна ₴']: t.currentPrice,
    [lang === 'en' ? 'Base price ₴' : 'Базова ціна ₴']: t.basePrice,
    [lang === 'en' ? 'Progress %' : 'Прогрес %']: Math.round(t.progress * 100),
    [lang === 'en' ? 'Distance km' : 'Відстань км']: t.distance,
    [lang === 'en' ? 'Driver' : 'Водій']: t.driver,
    [lang === 'en' ? 'Bus' : 'Автобус']: t.bus,
    [lang === 'en' ? 'Status' : 'Статус']: t.status,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, lang === 'en' ? 'Active trips' : 'Активні рейси');
  XLSX.writeFile(wb, `BusOptima_live_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// --- Variation switch: MapFirst vs CardsFirst ---

function DispatcherLive({ lang, layout, onLayoutChange }) {
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrips = async () => {
    setLoading(true);
    setError('');
    try {
      const raw = await API.getTrips({ status: 'in_progress' });
      const list = unwrapApiList(raw);
      const normalized = list.map(normTrip);

      // Fetch dynamic prices in parallel
      const priceResults = await Promise.allSettled(
        normalized.map(t => API.calculatePrice({
          base_price: t.basePrice,
          current_passengers: t.passengers,
          capacity: t.capacity,
          departure_time: t._departure ?? new Date().toISOString(),
        }))
      );
      priceResults.forEach((res, i) => {
        if (res.status === 'fulfilled' && res.value?.recommended_price != null) {
          normalized[i].currentPrice = res.value.recommended_price;
        }
      });

      setTrips(normalized);
      setSelectedTripId(s => normalized.find(t => t.id === s) ? s : normalized[0]?.id);
    } catch (e) {
      setTrips([]);
      setSelectedTripId(null);
      setError(e?.message || (lang === 'en' ? 'Failed to load live trips' : 'Не вдалося завантажити активні рейси'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrips();
    API.getDashboard().then(d => setDashboard(d)).catch(() => setDashboard(null));
  }, []);

  const selected = trips.find(t => t.id === selectedTripId) ?? trips[0] ?? null;

  const summary = useMemo(() => {
    const total = trips.length;
    const totalPax = trips.reduce((s, t) => s + (t.passengers ?? 0), 0);
    const totalCap = trips.reduce((s, t) => s + (t.capacity ?? 50), 0);
    const avgLoad = totalCap > 0 ? Math.round((totalPax / totalCap) * 100) : 0;
    const overloaded = trips.filter(t => t.loadPct >= 85).length;
    const underloaded = trips.filter(t => t.loadPct < 30).length;
    return { total, totalPax, avgLoad, overloaded, underloaded };
  }, [trips]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Live monitoring' : 'Моніторинг у реальному часі'}</h1>
          <p className="page-subtitle">
            {lang === 'en'
              ? `${summary.total} active trips · ${summary.totalPax} passengers on board · avg load ${summary.avgLoad}%`
              : `${summary.total} активних рейсів · ${summary.totalPax} пасажирів на борту · середня завантаженість ${summary.avgLoad}%`}
          </p>
        </div>
        <div className="page-actions">
          <div className="layout-toggle">
            <button className={layout === 'map' ? 'active' : ''} onClick={() => onLayoutChange('map')}>
              <Icon name="map"/> {lang === 'en' ? 'Map' : 'Карта'}
            </button>
            <button className={layout === 'cards' ? 'active' : ''} onClick={() => onLayoutChange('cards')}>
              <Icon name="grid"/> {lang === 'en' ? 'Cards' : 'Картки'}
            </button>
          </div>
          <button className="btn" onClick={loadTrips}><Icon name="refresh"/> {lang === 'en' ? 'Refresh' : 'Оновити'}</button>
          <button className="btn-primary btn" onClick={() => exportTrips(trips, lang)}><Icon name="download"/> {BO.t('cta.export', lang)}</button>
        </div>
      </div>

      {error && <InlineError message={error}/>}
      {loading && <InlineEmpty message={lang === 'en' ? 'Loading live data…' : 'Завантаження даних…'}/>}
      {!loading && !error && trips.length === 0 && <InlineEmpty message={lang === 'en' ? 'No active trips returned by backend' : 'Бекенд не повернув активних рейсів'}/>}

      {!loading && !error && trips.length > 0 && <>
      <div className="kpi-grid">
        <Kpi label={lang === 'en' ? 'Active trips' : 'Активних рейсів'}
             value={dashboard?.active_trips ?? summary.total}
             delta={lang === 'en' ? '+2 vs yesterday' : '+2 проти вчора'} deltaDir="up"
             spark={BO.passengersByHour.slice(8, 20).map(x => x.pax)} sparkColor="var(--accent)"/>
        <Kpi label={lang === 'en' ? 'Passengers now' : 'Пасажирів зараз'}
             value={dashboard?.total_passengers ?? summary.totalPax}
             delta={lang === 'en' ? '+34 last hour' : '+34 за годину'} deltaDir="up"
             spark={BO.passengersByHour.slice(-12).map(x => x.pax)} sparkColor="var(--ok)"/>
        <Kpi label={lang === 'en' ? 'Avg load' : 'Середня завантаженість'}
             value={dashboard ? `${Math.round((dashboard.avg_occupancy ?? 0) * 100)}%` : `${summary.avgLoad}%`}
             delta={lang === 'en' ? '+6pp WoW' : '+6 пп до тижня'} deltaDir="up"
             spark={[42, 48, 51, 55, 58, 62, 64, 67, summary.avgLoad]} sparkColor="var(--violet)"/>
        <Kpi label={lang === 'en' ? 'Overload alerts' : 'Сповіщень про переповнення'}
             value={summary.overloaded}
             delta={lang === 'en' ? '2 active' : '2 активних'} deltaDir="down"
             spark={[1, 0, 2, 1, 3, 2, 4, 2, summary.overloaded]} sparkColor="var(--danger)"/>
      </div>

      {layout === 'map' ? (
        <MapFirstLayout trips={trips} selected={selected} selectedTripId={selectedTripId} setSelectedTripId={setSelectedTripId} lang={lang}/>
      ) : (
        <CardsFirstLayout trips={trips} selected={selected} selectedTripId={selectedTripId} setSelectedTripId={setSelectedTripId} lang={lang}/>
      )}
      </>}
    </div>
  );
}

function MapFirstLayout({ trips, selected, selectedTripId, setSelectedTripId, lang }) {
  const [period, setPeriod] = useState('today');
  const [profitWeek, setProfitWeek] = useState(null);
  const [profitMonth, setProfitMonth] = useState(null);

  useEffect(() => {
    const now = new Date();
    const fmt = d => d.toISOString().slice(0, 10);
    const d7 = new Date(now); d7.setDate(d7.getDate() - 7);
    const d30 = new Date(now); d30.setDate(d30.getDate() - 30);
    Promise.allSettled([
      API.getProfitability({ date_from: fmt(d7), date_to: fmt(now) }),
      API.getProfitability({ date_from: fmt(d30), date_to: fmt(now) }),
    ]).then(([r7, r30]) => {
      if (r7.status === 'fulfilled') {
        const routes = r7.value?.by_route ?? [];
        if (routes.length) setProfitWeek(routes.map(r => ({ h: (r.route_name ?? `R-${r.route_id}`).split(/\s*[–-]\s*/)[0].slice(0, 10), pax: r.total_passengers ?? 0, route: r.route_name ?? '' })));
      }
      if (r30.status === 'fulfilled') {
        const routes = r30.value?.by_route ?? [];
        if (routes.length) setProfitMonth(routes.map(r => ({ h: (r.route_name ?? `R-${r.route_id}`).split(/\s*[–-]\s*/)[0].slice(0, 10), pax: r.total_passengers ?? 0, route: r.route_name ?? '' })));
      }
    });
  }, []);

  const isToday = period === 'today';
  const chartData = isToday
    ? BO.passengersByHour
    : (period === 'week' ? profitWeek : profitMonth) ?? BO.passengersByHour;

  const chartDesc = isToday
    ? (lang === 'en' ? 'Hourly · today' : 'Погодинно · сьогодні')
    : (period === 'week'
        ? (lang === 'en' ? 'By route · last 7 days (live)' : 'По маршрутах · 7 днів (реальні дані)')
        : (lang === 'en' ? 'By route · last 30 days (live)' : 'По маршрутах · 30 днів (реальні дані)'));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px', gap: 16, alignItems: 'start' }}>
      <div>
        <LiveMap trips={trips} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} lang={lang} height={620}/>
        <div className="card" style={{ marginTop: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="card-title">{lang === 'en' ? 'Passengers' : 'Пасажиропотік'}</div>
              <div className="card-desc">{chartDesc}</div>
            </div>
            <div className="layout-toggle">
              {[['today', BO.t('today', lang)], ['week', BO.t('week', lang)], ['month', BO.t('month', lang)]].map(([v, l]) => (
                <button key={v} className={period === v ? 'active' : ''} onClick={() => setPeriod(v)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="chart-wrap sm">
            <ResponsiveContainer width="100%" height="100%">
              {isToday ? (
                <AreaChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pax" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4D8BFF" stopOpacity={0.5}/>
                      <stop offset="100%" stopColor="#4D8BFF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke={gridColor} strokeDasharray="0" vertical={false}/>
                  <XAxis dataKey="h" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <RTooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}/>
                  <Area type="monotone" dataKey="pax" stroke="#4D8BFF" strokeWidth={2} fill="url(#pax)"/>
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                  <CartesianGrid stroke={gridColor} vertical={false}/>
                  <XAxis dataKey="h" stroke={axisColor} tick={{ fontSize: 10 }} axisLine={false} tickLine={false}/>
                  <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                  <RTooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v, _, p) => [v, p.payload?.route || lang === 'en' ? 'Passengers' : 'Пасажирів']}/>
                  <Bar dataKey="pax" fill="#4D8BFF" radius={[4, 4, 0, 0]}/>
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="col" style={{ gap: 14 }}>
        <TripDetailCard trip={selected} lang={lang}/>
        <div>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
            <div className="caption">{lang === 'en' ? 'Active trips' : 'Активні рейси'}</div>
            <div className="caption">{trips.length}</div>
          </div>
          <div className="col" style={{ gap: 8, maxHeight: 520, overflowY: 'auto', paddingRight: 4 }}>
            {trips.map(t => (
              <TripCard key={t.id} trip={t} active={t.id === selectedTripId} onClick={() => setSelectedTripId(t.id)} lang={lang}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CardsFirstLayout({ trips, selected, selectedTripId, setSelectedTripId, lang }) {
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const visible = q
    ? trips.filter(t =>
        t.id?.toLowerCase().includes(q) ||
        t.from?.toLowerCase().includes(q) ||
        t.to?.toLowerCase().includes(q) ||
        t.driver?.toLowerCase().includes(q) ||
        t.bus?.toLowerCase().includes(q)
      )
    : trips;

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
        <div style={{ gridColumn: '1 / span 2' }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 className="card-title" style={{ margin: 0 }}>{lang === 'en' ? 'Active trips' : 'Активні рейси'}</h3>
            <div className="row" style={{ gap: 8 }}>
              <div className="search-wrap">
                <Icon name="search"/>
                <input className="input" value={query} onChange={e => setQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Search trip, route or driver…' : 'Пошук рейсу, маршруту, водія…'}/>
              </div>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {visible.map(t => (
              <TripCard key={t.id} trip={t} active={t.id === selectedTripId} onClick={() => setSelectedTripId(t.id)} lang={lang} large/>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 14 }}>
          <LiveMap trips={trips} selectedTripId={selectedTripId} onSelectTrip={setSelectedTripId} lang={lang} height={420}/>
          <TripDetailCard trip={selected} lang={lang} compact/>
        </div>
      </div>
    </>
  );
}

function TripCard({ trip, active, onClick, lang, large = false }) {
  const cls = `trip-card ${active ? 'active' : ''}`;
  return (
    <div className={cls} onClick={onClick}>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="trip-route">
            <span>{BO.cityName(trip.from, lang)}</span>
            <span className="arrow">→</span>
            <span>{BO.cityName(trip.to, lang)}</span>
          </div>
          <div className="trip-meta">
            <span><Icon name="clock"/> {trip.depart}–{trip.arrive}</span>
            <span><Icon name="bus"/> {BO.buses.find(b => b.id === trip.bus)?.plate || trip.bus}</span>
            {large && <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>{trip.id}</span>}
          </div>
        </div>
        <Pill kind={trip.status === 'delayed' ? 'warn' : 'ok'} dot>
          {trip.status === 'delayed' ? (lang === 'en' ? 'Delayed' : 'Затримка') : (lang === 'en' ? 'On time' : 'За розкладом')}
        </Pill>
      </div>

      <div className="trip-bottom">
        <div className="trip-load">
          <LoadBar pct={trip.loadPct}/>
          <div className="row" style={{ marginTop: 6, gap: 12, fontSize: 11.5, color: 'var(--text-muted)' }}>
            <span><b style={{ color: 'var(--text)' }}>{trip.passengers}</b>/{trip.capacity} {lang === 'en' ? 'pax' : 'пас.'}</span>
            <span>·</span>
            <span style={{ fontFamily: 'var(--font-mono)' }}>
              {trip.currentPrice} ₴
              {trip.currentPrice !== trip.basePrice && (
                <span style={{ color: trip.currentPrice > trip.basePrice ? 'var(--ok)' : 'var(--info)', marginLeft: 4 }}>
                  {trip.currentPrice > trip.basePrice ? '+' : ''}{Math.round((trip.currentPrice / trip.basePrice - 1) * 100)}%
                </span>
              )}
            </span>
          </div>
        </div>
      </div>

      {large && (
        <div style={{ marginTop: 10, paddingTop: 10, borderTop: '1px solid var(--divider)', fontSize: 11.5, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between' }}>
          <span><Icon name="route" size={12} style={{ verticalAlign: -2, marginRight: 4 }}/> {Math.round(trip.progress * 100)}% · {Math.round(trip.distance * (1 - trip.progress))} {lang === 'en' ? 'km left' : 'км залишилось'}</span>
          <span style={{ fontFamily: 'var(--font-mono)' }}>{trip.driver}</span>
        </div>
      )}
    </div>
  );
}

function TripDetailCard({ trip, lang, compact = false }) {
  if (!trip) return null;
  const bus = BO.buses.find(b => b.id === trip.bus);
  return (
    <div className="card">
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 4 }}>
        <div className="caption">{lang === 'en' ? 'Selected trip' : 'Обраний рейс'}</div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-dim)' }}>{trip.id}</span>
      </div>
      <div className="trip-route" style={{ fontSize: 18 }}>
        <span>{BO.cityName(trip.from, lang)}</span>
        <span className="arrow">→</span>
        <span>{BO.cityName(trip.to, lang)}</span>
      </div>
      <div className="trip-meta">
        <span><Icon name="clock"/> {trip.depart} – {trip.arrive}</span>
        <span><Icon name="route"/> {trip.distance} км</span>
      </div>

      <div style={{ margin: '14px 0 12px' }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <span className="caption">{lang === 'en' ? 'Route progress' : 'Прогрес маршруту'}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{Math.round(trip.progress * 100)}%</span>
        </div>
        <div className="load-bar"><div className="load-bar-fill" style={{ width: `${trip.progress * 100}%`, background: 'var(--accent)' }}/></div>
      </div>

      <div className="stat-list">
        <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Passengers' : 'Пасажирів'}</span><span className="val">{trip.passengers} / {trip.capacity}</span></div>
        <div className="stat-row">
          <span className="lbl">{BO.t('load', lang)}</span>
          <span className="val" style={{ color: BO.loadColorVar(trip.loadPct) }}>{trip.loadPct}%</span>
        </div>
        <div className="stat-row">
          <span className="lbl">{BO.t('fare.current', lang)}</span>
          <span className="val">
            {trip.currentPrice} ₴
            <span style={{
              marginLeft: 6,
              color: trip.currentPrice > trip.basePrice ? 'var(--ok)' : 'var(--info)',
              fontSize: 11,
            }}>
              {trip.currentPrice > trip.basePrice ? '+' : ''}{Math.round((trip.currentPrice / trip.basePrice - 1) * 100)}%
            </span>
          </span>
        </div>
        {!compact && <>
          <div className="stat-row"><span className="lbl">{BO.t('fare.base', lang)}</span><span className="val" style={{ color: 'var(--text-muted)' }}>{trip.basePrice} ₴</span></div>
          <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Bus' : 'Автобус'}</span><span className="val">{bus?.plate ?? trip.bus}</span></div>
          <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Driver' : 'Водій'}</span><span className="val">{trip.driver}</span></div>
          <div className="stat-row"><span className="lbl">{lang === 'en' ? 'IoT device' : 'IoT-пристрій'}</span><span className="val" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{bus?.iot ?? '—'}</span></div>
        </>}
      </div>

      <div className="row" style={{ marginTop: 14, gap: 8 }}>
        <button className="btn btn-sm grow"><Icon name="bell"/> {lang === 'en' ? 'Notify driver' : 'Повідомити водія'}</button>
        <button className="btn btn-sm grow"><Icon name="pin"/> {lang === 'en' ? 'Center map' : 'На карту'}</button>
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: 'rgba(10,15,28,0.95)',
  border: '1px solid var(--border)',
  borderRadius: 10,
  color: '#F1F5FB',
  fontSize: 12,
  fontFamily: 'var(--font-sans)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};
const tooltipItemStyle = { color: '#9AA8C2' };
const tooltipLabelStyle = { color: '#F1F5FB', fontWeight: 600, marginBottom: 2 };

// --- Forecast screen ---

function DispatcherForecast({ lang }) {
  const [routeFilter, setRouteFilter] = useState('R-104');
  const [forecast, setForecast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadForecast = () => {
    setLoading(true);
    setError('');
    API.getForecast(routeFilter)
      .then(raw => {
        const list = unwrapApiList(raw);
        setForecast(list);
      })
      .catch(e => {
        setForecast([]);
        setError(e?.message || (lang === 'en' ? 'Failed to load forecast' : 'Не вдалося завантажити прогноз'));
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadForecast();
  }, [routeFilter]);

  const trend = BO.trendByRoute[routeFilter] || BO.trendByRoute['R-104'];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Demand forecast' : 'Прогноз попиту'}</h1>
          <p className="page-subtitle">
            {lang === 'en'
              ? 'Statistical forecast over last 3 months of trips · confidence interval 90%'
              : 'Статистичний прогноз на основі історії 3 місяців · довірчий інтервал 90%'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={loadForecast}><Icon name="refresh"/> {lang === 'en' ? 'Recompute' : 'Перерахувати'}</button>
          <button className="btn btn-primary"><Icon name="download"/> {BO.t('cta.export', lang)}</button>
        </div>
      </div>

      {error && <InlineError message={error}/>}
      {loading && <InlineEmpty message={lang === 'en' ? 'Loading forecast…' : 'Завантаження прогнозу…'}/>}
      {!loading && !error && forecast.length === 0 && <InlineEmpty message={lang === 'en' ? 'Backend returned no forecast rows' : 'Бекенд не повернув рядків прогнозу'}/>}

      {!loading && !error && forecast.length > 0 && <>
      <div className="kpi-grid">
        <Kpi label={lang === 'en' ? 'Trips tomorrow' : 'Рейсів завтра'} value="68" delta="+4" deltaDir="up" spark={[58,62,60,64,66,68,68]}/>
        <Kpi label={lang === 'en' ? 'Forecasted load' : 'Прогноз. завантаженість'} value="64%" delta="+3pp" deltaDir="up" spark={[55,58,60,62,63,64,64]} sparkColor="var(--ok)"/>
        <Kpi label={lang === 'en' ? 'Add suggestions' : 'Додати рейси'} value="3" delta={lang === 'en' ? 'high demand' : 'високий попит'} deltaDir="up" spark={[1,2,1,3,2,3,3]} sparkColor="var(--ok)"/>
        <Kpi label={lang === 'en' ? 'Cancel suggestions' : 'Скасувати рейси'} value="2" delta={lang === 'en' ? 'low demand' : 'низький попит'} deltaDir="down" spark={[0,1,2,2,1,2,2]} sparkColor="var(--danger)"/>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <div className="card-title">{lang === 'en' ? 'Load trend' : 'Тренд завантаженості'}</div>
              <div className="card-desc">{lang === 'en' ? '12 weeks · selected route' : '12 тижнів · обраний маршрут'}</div>
            </div>
            <select className="select" style={{ width: 200 }} value={routeFilter} onChange={(e) => setRouteFilter(e.target.value)}>
              {Object.keys(BO.trendByRoute).map(r => (
                <option key={r} value={r}>{r} · {BO.routeLabel(r, lang)}</option>
              ))}
            </select>
          </div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false}/>
                <XAxis dataKey="week" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} domain={[20, 90]}/>
                <RTooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}/>
                <ReferenceLine y={85} stroke="#F87171" strokeDasharray="3 3" label={{ value: '85%', fill: '#F87171', fontSize: 10, position: 'right' }}/>
                <ReferenceLine y={30} stroke="#38BDF8" strokeDasharray="3 3" label={{ value: '30%', fill: '#38BDF8', fontSize: 10, position: 'right' }}/>
                <Line type="monotone" dataKey="load" stroke="#A78BFA" strokeWidth={2.4} dot={{ r: 3, fill: '#A78BFA' }} activeDot={{ r: 5 }}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">{lang === 'en' ? 'Demand by hour of day' : 'Попит за годинами'}</div>
          <div className="card-desc">{lang === 'en' ? 'Average passengers, weekday' : 'Середня к-сть пасажирів, будній день'}</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BO.passengersByHour} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false}/>
                <XAxis dataKey="h" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <RTooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle}/>
                <Bar dataKey="pax" radius={[4, 4, 0, 0]}>
                  {BO.passengersByHour.map((d, i) => (
                    <Cell key={i} fill={d.pax > 220 ? '#FBBF24' : d.pax > 100 ? '#4D8BFF' : '#38BDF8'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="card-title">{lang === 'en' ? 'Upcoming trips · 24h' : 'Наступні 24 години'}</div>
            <div className="card-desc">{lang === 'en' ? 'Recommendation generated by analytics engine' : 'Рекомендації сформовано аналітичним рушієм'}</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Trip' : 'Рейс'}</th>
                <th>{lang === 'en' ? 'Route' : 'Маршрут'}</th>
                <th>{lang === 'en' ? 'Departure' : 'Відправлення'}</th>
                <th>{lang === 'en' ? 'Forecast' : 'Прогноз'}</th>
                <th style={{ width: 220 }}>{lang === 'en' ? 'Confidence interval' : 'Довірчий інтервал'}</th>
                <th>{lang === 'en' ? 'Recommendation' : 'Рекомендація'}</th>
              </tr>
            </thead>
            <tbody>
              {forecast.map((f, i) => {
                const loadPct = Math.round((f.forecastPax ?? f.forecast_pax ?? 0) / (f.capacity ?? 50) * 100);
                const from = f.from ?? f.route?.from_city ?? 'Kyiv';
                const to = f.to ?? f.route?.to_city ?? 'Lviv';
                const tripId = f.trip ?? f.trip_id ?? `F-${i}`;
                const date = f.date ?? f.departure_time ?? '—';
                const rec = f.rec ?? f.recommendation ?? 'hold';
                const ciLow = f.ciLow ?? f.ci_low ?? 0;
                const ciHigh = f.ciHigh ?? f.ci_high ?? 0;
                const forecastPax = f.forecastPax ?? f.forecast_pax ?? 0;
                const cap = f.capacity ?? 50;
                return (
                  <tr key={tripId}>
                    <td className="num" style={{ color: 'var(--text-muted)' }}>{tripId}</td>
                    <td><b>{BO.cityName(from, lang)} → {BO.cityName(to, lang)}</b></td>
                    <td className="num">{date}</td>
                    <td>
                      <div className="row" style={{ gap: 10 }}>
                        <span className="num"><b>{forecastPax}</b> / {cap}</span>
                        <span style={{ color: BO.loadColorVar(loadPct), fontWeight: 600 }}>{loadPct}%</span>
                      </div>
                    </td>
                    <td>
                      <CIBar low={ciLow} high={ciHigh} mark={forecastPax} cap={cap}/>
                    </td>
                    <td>
                      {rec === 'add' && <span className="rec rec-add"><Icon name="plus" size={11}/> {lang === 'en' ? 'Add trip' : 'Додати рейс'}</span>}
                      {rec === 'cancel' && <span className="rec rec-cancel"><Icon name="minus" size={11}/> {lang === 'en' ? 'Cancel' : 'Скасувати'}</span>}
                      {rec === 'hold' && <span className="rec rec-hold"><Icon name="check" size={11}/> {lang === 'en' ? 'Hold' : 'Без змін'}</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  );
}

function CIBar({ low, high, mark, cap }) {
  const left = (low / cap) * 100;
  const right = (high / cap) * 100;
  const markPct = (mark / cap) * 100;
  return (
    <div className="ci-bar">
      <div className="ci-fill" style={{ left: `${left}%`, right: `${100 - right}%` }}/>
      <div className="ci-mark" style={{ left: `${markPct}%` }}/>
    </div>
  );
}

// --- Profitability ---

function DispatcherProfit({ lang }) {
  const [sortBy, setSortBy] = useState('margin');
  const [profitData, setProfitData] = useState([]);
  const [summary, setProfitSummary] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    API.getProfitability()
      .then(raw => {
        if (raw?.summary) setProfitSummary(raw.summary);
        const list = raw?.by_route ?? unwrapApiList(raw);
        setProfitData(list.map(normProfit));
      })
      .catch(e => {
        setProfitData([]);
        setProfitSummary(null);
        setError(e?.message || (lang === 'en' ? 'Failed to load profitability' : 'Не вдалося завантажити рентабельність'));
      })
      .finally(() => setLoading(false));
  }, []);

  const sorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? profitData.filter(r =>
          r.route?.toLowerCase().includes(q) ||
          r.routeName?.toLowerCase().includes(q) ||
          r.from?.toLowerCase().includes(q) ||
          r.to?.toLowerCase().includes(q)
        )
      : profitData;
    return [...filtered].sort((a, b) => b[sortBy] - a[sortBy]);
  }, [sortBy, profitData, query]);
  const totals = useMemo(() => {
    const t = profitData.reduce((acc, r) => ({
      revenue: acc.revenue + (r.revenue ?? 0),
      cost: acc.cost + (r.cost ?? 0),
      profit: acc.profit + (r.profit ?? 0),
      trips: acc.trips + (r.trips ?? 0),
    }), { revenue: 0, cost: 0, profit: 0, trips: 0 });
    t.margin = t.cost > 0 ? (t.profit / t.cost) * 100 : 0;
    return t;
  }, [profitData]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Route profitability' : 'Рентабельність маршрутів'}</h1>
          <p className="page-subtitle">
            {lang === 'en' ? 'Daily reconciliation · last 7 days' : 'Щоденне зведення · 7 днів'}
          </p>
        </div>
        <div className="page-actions">
          <select className="select" style={{ width: 160 }}><option>{BO.t('week', lang)}</option><option>{BO.t('month', lang)}</option></select>
          <button className="btn"><Icon name="filter"/> {lang === 'en' ? 'Filter' : 'Фільтр'}</button>
          <button className="btn btn-primary"><Icon name="download"/> {BO.t('cta.export', lang)}</button>
        </div>
      </div>

      {error && <InlineError message={error}/>}
      {loading && <InlineEmpty message={lang === 'en' ? 'Loading profitability…' : 'Завантаження рентабельності…'}/>}
      {!loading && !error && profitData.length === 0 && <InlineEmpty message={lang === 'en' ? 'Backend returned no profitability rows' : 'Бекенд не повернув даних рентабельності'}/>}

      {!loading && !error && profitData.length > 0 && <>
      <div className="kpi-grid">
        <Kpi label={lang === 'en' ? 'Total revenue · 30d' : 'Виручка · 30 днів'} value={fmtUAH(summary?.total_revenue ?? totals.revenue)} delta="+12.4%" deltaDir="up" spark={BO.revenueByDay.slice(-7).map(d => d.revenue)} sparkColor="var(--ok)"/>
        <Kpi label={lang === 'en' ? 'Total cost · 30d' : 'Витрати · 30 днів'} value={fmtUAH(summary?.total_costs ?? totals.cost)} delta="+5.8%" deltaDir="up" spark={BO.revenueByDay.slice(-7).map(d => d.cost)} sparkColor="var(--warn)"/>
        <Kpi label={lang === 'en' ? 'Net profit' : 'Чистий прибуток'} value={fmtUAH(summary?.total_profit ?? totals.profit)} delta="+18.2%" deltaDir="up" spark={BO.revenueByDay.slice(-7).map(d => d.revenue - d.cost)} sparkColor="var(--accent)"/>
        <Kpi label={lang === 'en' ? 'Avg margin' : 'Середня маржа'} value={fmtPct(summary?.average_profitability ?? totals.margin)} delta="+2.1pp" deltaDir="up" spark={[28, 30, 32, 33, 35, 36, 38]} sparkColor="var(--violet)"/>
      </div>

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">{lang === 'en' ? 'Revenue vs cost · 14 days' : 'Виручка vs витрати · 14 днів'}</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={BO.revenueByDay} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} vertical={false}/>
                <XAxis dataKey="day" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <RTooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v) => fmtUAH(v)}/>
                <Legend wrapperStyle={{ fontSize: 12, color: '#F1F5FB' }}/>
                <Bar dataKey="revenue" name={lang === 'en' ? 'Revenue' : 'Виручка'} fill="#4D8BFF" radius={[3,3,0,0]}/>
                <Bar dataKey="cost" name={lang === 'en' ? 'Cost' : 'Витрати'} fill="#FBBF24" radius={[3,3,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="card">
          <div className="card-title">{lang === 'en' ? 'Profit share by route' : 'Частка прибутку по маршрутах'}</div>
          <div className="chart-wrap">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sorted.slice(0, 8)} layout="vertical" margin={{ top: 8, right: 20, left: 70, bottom: 0 }}>
                <CartesianGrid stroke={gridColor} horizontal={false}/>
                <XAxis type="number" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <YAxis type="category" dataKey="route" stroke={axisColor} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={60}/>
                <RTooltip contentStyle={tooltipStyle} itemStyle={tooltipItemStyle} labelStyle={tooltipLabelStyle} formatter={(v) => fmtUAH(v)}/>
                <Bar dataKey="profit" radius={[0,4,4,0]}>
                  {sorted.slice(0, 8).map((r, i) => (
                    <Cell key={i} fill={r.profit < 0 ? '#F87171' : '#34D399'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div className="card-title">{lang === 'en' ? 'Per-route breakdown' : 'Деталізація по маршрутах'}</div>
            <div className="card-desc">{lang === 'en' ? 'Click a column header to sort' : 'Клацніть заголовок для сортування'}</div>
          </div>
          <div className="row" style={{ gap: 8 }}>
            <div className="search-wrap"><Icon name="search"/><input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder={lang === 'en' ? 'Search route…' : 'Пошук маршруту…'}/></div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>{lang === 'en' ? 'Route' : 'Маршрут'}</th>
                <th>{lang === 'en' ? 'Direction' : 'Напрямок'}</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setSortBy('trips')}>{lang === 'en' ? 'Trips' : 'Рейсів'}</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setSortBy('avgLoad')}>{BO.t('load', lang)}</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setSortBy('revenue')}>{lang === 'en' ? 'Revenue' : 'Виручка'}</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setSortBy('cost')}>{lang === 'en' ? 'Cost' : 'Витрати'}</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setSortBy('profit')}>{lang === 'en' ? 'Profit' : 'Прибуток'}</th>
                <th style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => setSortBy('margin')}>{lang === 'en' ? 'Margin' : 'Маржа'}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map(r => (
                <tr key={r.route}>
                  <td className="num" style={{ color: 'var(--text-muted)' }}>{r.route}</td>
                  <td><b>{r.routeName ?? `${r.from} → ${r.to}`}</b></td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.trips}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 110, justifyContent: 'flex-end' }}>
                      <div style={{ width: 60 }}><LoadBar pct={r.avgLoad} showLabel={false}/></div>
                      <span className="num" style={{ color: BO.loadColorVar(r.avgLoad), fontWeight: 600, minWidth: 32 }}>{r.avgLoad}%</span>
                    </div>
                  </td>
                  <td className="num" style={{ textAlign: 'right' }}>{fmtUAH(r.revenue)}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{fmtUAH(r.cost)}</td>
                  <td className="num" style={{ textAlign: 'right', color: r.profit < 0 ? 'var(--danger)' : 'var(--ok)', fontWeight: 600 }}>{r.profit < 0 ? '−' : ''}{fmtUAH(Math.abs(r.profit))}</td>
                  <td style={{ textAlign: 'right' }}>
                    <span className={r.margin < 0 ? 'pill pill-danger' : r.margin < 15 ? 'pill pill-warn' : 'pill pill-ok'}>{fmtPct(r.margin)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>}
    </div>
  );
}

// --- Reports ---

async function generateExport({ period, sections, format, lang }) {
  const now = new Date();
  const fmt = d => d.toISOString().slice(0, 10);
  const days = period === '24h' ? 1 : period === '7d' ? 7 : 30;
  const dateFrom = new Date(now); dateFrom.setDate(dateFrom.getDate() - days);

  const [tripsRaw, profRaw] = await Promise.allSettled([
    API.getTrips({ status: 'in_progress' }),
    API.getProfitability({ date_from: fmt(dateFrom), date_to: fmt(now) }),
  ]);

  const trips = tripsRaw.status === 'fulfilled' ? (tripsRaw.value?.data ?? tripsRaw.value?.trips ?? (Array.isArray(tripsRaw.value) ? tripsRaw.value : [])) : [];
  const profData = profRaw.status === 'fulfilled' ? profRaw.value : null;
  const byRoute = profData?.by_route ?? [];
  const summary = profData?.summary ?? {};

  const XLSX = window.XLSX;
  const wb = XLSX.utils.book_new();

  if (sections.load && trips.length) {
    const rows = trips.map(t => ({
      [lang === 'en' ? 'Trip ID' : 'ID рейсу']: t.id,
      [lang === 'en' ? 'Route' : 'Маршрут']: `${t.route?.origin_city ?? '—'} → ${t.route?.destination_city ?? '—'}`,
      [lang === 'en' ? 'Departure' : 'Відправлення']: t.scheduled_departure ?? '—',
      [lang === 'en' ? 'Passengers' : 'Пасажирів']: t.current_passengers ?? 0,
      [lang === 'en' ? 'Capacity' : 'Місткість']: t.bus?.capacity ?? 0,
      [lang === 'en' ? 'Load %' : 'Завантаженість %']: t.bus?.capacity ? Math.round((t.current_passengers ?? 0) / t.bus.capacity * 100) : 0,
      [lang === 'en' ? 'Status' : 'Статус']: t.status ?? '—',
      [lang === 'en' ? 'Driver' : 'Водій']: t.driver_name ?? '—',
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), lang === 'en' ? 'Trips' : 'Рейси');
  }

  if (sections.finance && byRoute.length) {
    const rows = byRoute.map(r => ({
      [lang === 'en' ? 'Route' : 'Маршрут']: r.route_name ?? `R-${r.route_id}`,
      [lang === 'en' ? 'Trips' : 'Рейсів']: r.trips_count ?? 0,
      [lang === 'en' ? 'Passengers' : 'Пасажирів']: r.total_passengers ?? 0,
      [lang === 'en' ? 'Avg load %' : 'Сер. завантаж. %']: r.avg_occupancy != null ? Math.round(r.avg_occupancy * 100) : 0,
      [lang === 'en' ? 'Revenue ₴' : 'Виручка ₴']: +(r.revenue ?? 0).toFixed(2),
      [lang === 'en' ? 'Costs ₴' : 'Витрати ₴']: +(r.costs ?? 0).toFixed(2),
      [lang === 'en' ? 'Profit ₴' : 'Прибуток ₴']: +(r.profit ?? 0).toFixed(2),
      [lang === 'en' ? 'Margin %' : 'Маржа %']: +(r.profitability ?? 0).toFixed(1),
      [lang === 'en' ? 'Category' : 'Категорія']: r.category ?? '—',
    }));
    // Summary row
    rows.push({});
    rows.push({
      [lang === 'en' ? 'Route' : 'Маршрут']: lang === 'en' ? 'TOTAL' : 'РАЗОМ',
      [lang === 'en' ? 'Trips' : 'Рейсів']: summary.total_trips ?? '',
      [lang === 'en' ? 'Passengers' : 'Пасажирів']: summary.total_passengers ?? '',
      [lang === 'en' ? 'Revenue ₴' : 'Виручка ₴']: +((summary.total_revenue ?? 0)).toFixed(2),
      [lang === 'en' ? 'Costs ₴' : 'Витрати ₴']: +((summary.total_costs ?? 0)).toFixed(2),
      [lang === 'en' ? 'Profit ₴' : 'Прибуток ₴']: +((summary.total_profit ?? 0)).toFixed(2),
      [lang === 'en' ? 'Margin %' : 'Маржа %']: +((summary.average_profitability ?? 0)).toFixed(1),
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), lang === 'en' ? 'Profitability' : 'Рентабельність');
  }

  // Summary sheet always included
  const summaryRows = [
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Period' : 'Період', [lang === 'en' ? 'Value' : 'Значення']: `${fmt(dateFrom)} – ${fmt(now)}` },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Active trips' : 'Активних рейсів', [lang === 'en' ? 'Value' : 'Значення']: trips.length },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Total trips (period)' : 'Рейсів за період', [lang === 'en' ? 'Value' : 'Значення']: summary.total_trips ?? '—' },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Total passengers' : 'Пасажирів', [lang === 'en' ? 'Value' : 'Значення']: summary.total_passengers ?? '—' },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Total revenue ₴' : 'Виручка ₴', [lang === 'en' ? 'Value' : 'Значення']: summary.total_revenue != null ? +summary.total_revenue.toFixed(2) : '—' },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Net profit ₴' : 'Прибуток ₴', [lang === 'en' ? 'Value' : 'Значення']: summary.total_profit != null ? +summary.total_profit.toFixed(2) : '—' },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Avg occupancy %' : 'Сер. завантаженість %', [lang === 'en' ? 'Value' : 'Значення']: summary.avg_occupancy != null ? Math.round(summary.avg_occupancy * 100) : '—' },
    { [lang === 'en' ? 'Metric' : 'Показник']: lang === 'en' ? 'Generated at' : 'Сформовано', [lang === 'en' ? 'Value' : 'Значення']: now.toISOString() },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), lang === 'en' ? 'Summary' : 'Зведення');

  const dateStr = fmt(now);
  const filename = `BusOptima_${period}_${dateStr}`;

  if (format === 'csv') {
    // Export first sheet as CSV
    const firstSheet = wb.Sheets[wb.SheetNames[0]];
    const csv = XLSX.utils.sheet_to_csv(firstSheet);
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click();
    URL.revokeObjectURL(url);
  } else {
    XLSX.writeFile(wb, filename + '.xlsx');
  }
}

function DispatcherReports({ lang }) {
  const [period, setPeriod] = useState('7d');
  const [includeRoutes, setIncludeRoutes] = useState({});
  const [sections, setSections] = useState({ load: true, finance: true, forecast: false, alerts: true });
  const [format, setFormat] = useState('xlsx');
  const [generating, setGenerating] = useState(false);
  const [exports, setExports] = useState([]);

  const toggle = (id) => setIncludeRoutes(s => ({ ...s, [id]: !s[id] }));
  const toggleSec = (k) => setSections(s => ({ ...s, [k]: !s[k] }));

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      await generateExport({ period, sections, format, lang });
      const now = new Date();
      const label = `BusOptima_${period}_${now.toISOString().slice(0, 10)}.${format === 'csv' ? 'csv' : 'xlsx'}`;
      setExports(prev => [{ name: label, when: now.toLocaleTimeString() }, ...prev].slice(0, 5));
    } catch (e) {
      console.error('Export failed', e);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Reports & export' : 'Звіти та експорт'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Build a report from operational, financial and forecast data' : 'Сформуйте звіт з операційних, фінансових та прогнозних даних'}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">{lang === 'en' ? 'Configure report' : 'Параметри звіту'}</div>

          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">{lang === 'en' ? 'Period' : 'Період'}</label>
            <div className="layout-toggle">
              {[['24h', BO.t('today', lang)], ['7d', BO.t('week', lang)], ['30d', BO.t('month', lang)], ['custom', lang === 'en' ? 'Custom' : 'Інший']].map(([v, l]) => (
                <button key={v} className={period === v ? 'active' : ''} onClick={() => setPeriod(v)}>{l}</button>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">{lang === 'en' ? 'Sections' : 'Розділи'}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
              {[
                ['load', lang === 'en' ? 'Load & passengers' : 'Завантаженість і пасажиропотік'],
                ['finance', lang === 'en' ? 'Revenue & profitability' : 'Виручка та рентабельність'],
                ['forecast', lang === 'en' ? 'Forecast next 7 days' : 'Прогноз на 7 днів'],
                ['alerts', lang === 'en' ? 'Critical alerts log' : 'Журнал критичних сповіщень'],
              ].map(([k, l]) => (
                <div key={k} className="row" style={{ gap: 10, padding: 10, border: '1px solid var(--border)', borderRadius: 10, cursor: 'pointer' }} onClick={() => toggleSec(k)}>
                  <span className={`checkbox ${sections[k] ? 'on' : ''}`}/>
                  <span style={{ fontSize: 13 }}>{l}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="field">
            <label className="label">{lang === 'en' ? 'Routes' : 'Маршрути'}</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              {BO.routes.slice(0, 8).map(r => (
                <div key={r.id} className="row" style={{ gap: 10, padding: 8, border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer' }} onClick={() => toggle(r.id)}>
                  <span className={`checkbox ${includeRoutes[r.id] ? 'on' : ''}`}/>
                  <span style={{ fontSize: 12.5 }}>{r.id} · {BO.cityName(r.from, lang)} → {BO.cityName(r.to, lang)}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-muted)' }}>
              {Object.values(includeRoutes).filter(Boolean).length === 0
                ? (lang === 'en' ? 'All routes selected by default' : 'За замовчуванням — усі маршрути')
                : (lang === 'en' ? `${Object.values(includeRoutes).filter(Boolean).length} routes selected` : `Обрано ${Object.values(includeRoutes).filter(Boolean).length} маршрутів`)}
            </div>
          </div>

          <div className="field">
            <label className="label">{lang === 'en' ? 'Format' : 'Формат'}</label>
            <div className="layout-toggle">
              {['xlsx', 'csv', 'pdf'].map(f => (
                <button key={f} className={format === f ? 'active' : ''} onClick={() => setFormat(f)}>{f.toUpperCase()}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="caption" style={{ marginBottom: 10 }}>{lang === 'en' ? 'Preview summary' : 'Попередній перегляд'}</div>
            <div className="stat-list">
              <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Period' : 'Період'}</span><span className="val">{period}</span></div>
              <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Sections' : 'Розділів'}</span><span className="val">{Object.values(sections).filter(Boolean).length}</span></div>
              <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Routes' : 'Маршрутів'}</span><span className="val">{Object.values(includeRoutes).filter(Boolean).length || BO.routes.length}</span></div>
              <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Format' : 'Формат'}</span><span className="val">{format.toUpperCase()}</span></div>
              <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Est. size' : 'Розмір'}</span><span className="val">~ 2.4 MB</span></div>
            </div>
            <button className="btn btn-primary" style={{ width: '100%', marginTop: 14, height: 42, justifyContent: 'center', opacity: generating ? 0.7 : 1 }}
              onClick={handleGenerate} disabled={generating}>
              <Icon name={generating ? 'loader' : 'download'}/>
              {generating ? (lang === 'en' ? 'Generating…' : 'Формування…') : (lang === 'en' ? 'Generate report' : 'Сформувати звіт')}
            </button>
          </div>

          <div className="card">
            <div className="card-title">{lang === 'en' ? 'Recent exports' : 'Останні експорти'}</div>
            <div className="stat-list">
              {exports.length === 0 && (
                <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '8px 0' }}>
                  {lang === 'en' ? 'No exports yet' : 'Експортів поки немає'}
                </div>
              )}
              {exports.map(f => (
                <div key={f.name + f.when} className="stat-row" style={{ alignItems: 'center' }}>
                  <span className="lbl" style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                    <Icon name="file" size={13} style={{ color: 'var(--accent)' }}/> {f.name}
                  </span>
                  <span className="val" style={{ fontSize: 11.5, color: 'var(--text-dim)' }}>{f.when}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { DispatcherLive, DispatcherForecast, DispatcherProfit, DispatcherReports });
