/* BusOptima mock data — Ukrainian intercity routes */
/* eslint-disable */

window.BO = window.BO || {};

// Color helper based on load %
window.BO.loadColor = (pct) => {
  if (pct < 30) return 'low';
  if (pct < 60) return 'ok';
  if (pct < 85) return 'busy';
  return 'over';
};
window.BO.loadColorVar = (pct) => {
  if (pct < 30) return 'var(--load-low)';
  if (pct < 60) return 'var(--load-ok)';
  if (pct < 85) return 'var(--load-busy)';
  return 'var(--load-over)';
};

window.BO.cities = {
  Kyiv:       { lat: 50.4501, lng: 30.5234, name_uk: 'Київ',      name_en: 'Kyiv' },
  Lviv:       { lat: 49.8397, lng: 24.0297, name_uk: 'Львів',     name_en: 'Lviv' },
  Odesa:      { lat: 46.4825, lng: 30.7233, name_uk: 'Одеса',     name_en: 'Odesa' },
  Kharkiv:    { lat: 49.9935, lng: 36.2304, name_uk: 'Харків',    name_en: 'Kharkiv' },
  Dnipro:     { lat: 48.4647, lng: 35.0462, name_uk: 'Дніпро',    name_en: 'Dnipro' },
  Vinnytsia:  { lat: 49.2331, lng: 28.4682, name_uk: 'Вінниця',   name_en: 'Vinnytsia' },
  Poltava:    { lat: 49.5883, lng: 34.5514, name_uk: 'Полтава',   name_en: 'Poltava' },
  Chernivtsi: { lat: 48.2921, lng: 25.9358, name_uk: 'Чернівці',  name_en: 'Chernivtsi' },
  Uzhhorod:   { lat: 48.6208, lng: 22.2879, name_uk: 'Ужгород',   name_en: 'Uzhhorod' },
  Zaporizhzhia: { lat: 47.8388, lng: 35.1396, name_uk: 'Запоріжжя', name_en: 'Zaporizhzhia' },
  Chernihiv:  { lat: 51.4982, lng: 31.2893, name_uk: 'Чернігів',  name_en: 'Chernihiv' },
  IvanoFrank: { lat: 48.9226, lng: 24.7111, name_uk: 'Івано-Франківськ', name_en: 'Ivano-Frankivsk' },
  Ternopil:   { lat: 49.5535, lng: 25.5948, name_uk: 'Тернопіль', name_en: 'Ternopil' },
  Cherkasy:   { lat: 49.4444, lng: 32.0598, name_uk: 'Черкаси',   name_en: 'Cherkasy' },
};

window.BO.routes = [
  { id: 'R-104', from: 'Kyiv', to: 'Lviv', distance: 540, basePrice: 750, status: 'active', dailyTrips: 8 },
  { id: 'R-207', from: 'Odesa', to: 'Kharkiv', distance: 730, basePrice: 920, status: 'active', dailyTrips: 6 },
  { id: 'R-318', from: 'Dnipro', to: 'Kyiv', distance: 485, basePrice: 680, status: 'active', dailyTrips: 7 },
  { id: 'R-422', from: 'Lviv', to: 'Chernivtsi', distance: 275, basePrice: 420, status: 'active', dailyTrips: 4 },
  { id: 'R-509', from: 'Kyiv', to: 'Poltava', distance: 340, basePrice: 480, status: 'active', dailyTrips: 5 },
  { id: 'R-611', from: 'Zaporizhzhia', to: 'Odesa', distance: 470, basePrice: 640, status: 'active', dailyTrips: 3 },
  { id: 'R-733', from: 'Vinnytsia', to: 'Kyiv', distance: 270, basePrice: 360, status: 'active', dailyTrips: 6 },
  { id: 'R-841', from: 'Uzhhorod', to: 'Lviv', distance: 270, basePrice: 380, status: 'active', dailyTrips: 4 },
  { id: 'R-952', from: 'Kyiv', to: 'Chernihiv', distance: 150, basePrice: 220, status: 'active', dailyTrips: 9 },
  { id: 'R-176', from: 'Lviv', to: 'IvanoFrank', distance: 135, basePrice: 200, status: 'paused', dailyTrips: 5 },
  { id: 'R-263', from: 'Ternopil', to: 'Lviv', distance: 130, basePrice: 200, status: 'active', dailyTrips: 5 },
  { id: 'R-385', from: 'Cherkasy', to: 'Kyiv', distance: 200, basePrice: 280, status: 'active', dailyTrips: 7 },
];

window.BO.buses = [
  { id: 'BUS-001', plate: 'АА 7741 КК', model: 'Setra S 415 HD', capacity: 49, year: 2021, iot: 'IOT-A1F3', status: 'on-trip', mileage: 284500 },
  { id: 'BUS-002', plate: 'АА 5208 КС', model: 'Mercedes Tourismo', capacity: 51, year: 2020, iot: 'IOT-B2C7', status: 'on-trip', mileage: 312800 },
  { id: 'BUS-003', plate: 'BC 9112 ОА', model: 'Neoplan Tourliner', capacity: 53, year: 2022, iot: 'IOT-D4E1', status: 'on-trip', mileage: 168200 },
  { id: 'BUS-004', plate: 'AX 3340 BH', model: 'MAN Lion\u2019s Coach', capacity: 49, year: 2019, iot: 'IOT-F5A2', status: 'on-trip', mileage: 398100 },
  { id: 'BUS-005', plate: 'AT 6608 EM', model: 'Setra S 416 HDH', capacity: 51, year: 2021, iot: 'IOT-G6H8', status: 'on-trip', mileage: 245700 },
  { id: 'BUS-006', plate: 'CA 1182 КM', model: 'Iveco Magelys', capacity: 49, year: 2018, iot: 'IOT-J7K3', status: 'on-trip', mileage: 421500 },
  { id: 'BUS-007', plate: 'AC 7714 IB', model: 'Mercedes Tourismo', capacity: 51, year: 2022, iot: 'IOT-L8M9', status: 'on-trip', mileage: 142300 },
  { id: 'BUS-008', plate: 'AE 9920 ME', model: 'Volvo 9700', capacity: 49, year: 2020, iot: 'IOT-N1P4', status: 'depot', mileage: 298400 },
  { id: 'BUS-009', plate: 'AH 4561 PH', model: 'Setra S 415 HD', capacity: 49, year: 2019, iot: 'IOT-Q5R2', status: 'maintenance', mileage: 367800 },
  { id: 'BUS-010', plate: 'BB 8835 СC', model: 'MAN Lion\u2019s Coach', capacity: 53, year: 2023, iot: '—', status: 'depot', mileage: 41200 },
];

// Linear interpolation along route for trip "live" position
function lerp(a, b, t) { return a + (b - a) * t; }
function posAlong(fromKey, toKey, t) {
  const A = window.BO.cities[fromKey], B = window.BO.cities[toKey];
  // jitter a bit so they don't sit perfectly on the line
  const dx = (Math.random() - 0.5) * 0.15;
  const dy = (Math.random() - 0.5) * 0.15;
  return { lat: lerp(A.lat, B.lat, t) + dy * 0.4, lng: lerp(A.lng, B.lng, t) + dx * 0.4 };
}

window.BO.trips = [
  { id: 'T-08412', route: 'R-104', bus: 'BUS-001', driver: 'Петренко О.', depart: '06:30', arrive: '15:10', progress: 0.62, passengers: 47, capacity: 49, currentPrice: 1085, basePrice: 750, status: 'on-time' },
  { id: 'T-08413', route: 'R-104', bus: 'BUS-005', driver: 'Шевчук Ю.', depart: '12:00', arrive: '20:40', progress: 0.18, passengers: 38, capacity: 51, currentPrice: 825, basePrice: 750, status: 'on-time' },
  { id: 'T-08501', route: 'R-207', bus: 'BUS-002', driver: 'Іваненко М.', depart: '07:15', arrive: '19:00', progress: 0.41, passengers: 22, capacity: 51, currentPrice: 690, basePrice: 920, status: 'on-time' },
  { id: 'T-08602', route: 'R-318', bus: 'BUS-003', driver: 'Коваль В.', depart: '08:00', arrive: '14:20', progress: 0.78, passengers: 32, capacity: 53, currentPrice: 720, basePrice: 680, status: 'on-time' },
  { id: 'T-08711', route: 'R-422', bus: 'BUS-004', driver: 'Бойко С.', depart: '09:30', arrive: '13:50', progress: 0.55, passengers: 12, capacity: 49, currentPrice: 315, basePrice: 420, status: 'delayed' },
  { id: 'T-08820', route: 'R-509', bus: 'BUS-006', driver: 'Мельник А.', depart: '10:00', arrive: '14:30', progress: 0.30, passengers: 44, capacity: 49, currentPrice: 720, basePrice: 480, status: 'on-time' },
  { id: 'T-08925', route: 'R-952', bus: 'BUS-007', driver: 'Гриценко О.', depart: '13:15', arrive: '15:30', progress: 0.45, passengers: 35, capacity: 51, currentPrice: 295, basePrice: 220, status: 'on-time' },
  { id: 'T-08930', route: 'R-733', bus: 'BUS-008', driver: 'Лисенко Д.', depart: '14:00', arrive: '17:30', progress: 0.08, passengers: 9, capacity: 49, currentPrice: 270, basePrice: 360, status: 'on-time' },
];

// Pre-compute positions for buses currently in-trip
window.BO.trips.forEach(t => {
  const r = window.BO.routes.find(r => r.id === t.route);
  if (r) {
    const seedPos = posAlong(r.from, r.to, t.progress);
    t.lat = seedPos.lat; t.lng = seedPos.lng;
    t.from = r.from; t.to = r.to; t.distance = r.distance;
  }
  t.loadPct = Math.round((t.passengers / t.capacity) * 100);
});

window.BO.alerts = [
  { id: 1, level: 'danger', titleUk: 'Переповнення', titleEn: 'Overload',
    bodyUk: 'T-08412 Київ → Львів: 47/49 (96%), рекомендована ціна +44%',
    bodyEn: 'T-08412 Kyiv → Lviv: 47/49 (96%), suggested fare +44%',
    time: '14:32', trip: 'T-08412' },
  { id: 2, level: 'warn', titleUk: 'Завантаженість нижче прогнозу', titleEn: 'Underperforming forecast',
    bodyUk: 'T-08711 Львів → Чернівці: 24% завантаженість, прогноз був 58%',
    bodyEn: 'T-08711 Lviv → Chernivtsi: 24% load, forecast was 58%',
    time: '14:18', trip: 'T-08711' },
  { id: 3, level: 'warn', titleUk: 'Затримка рейсу', titleEn: 'Trip delayed',
    bodyUk: 'T-08711 Львів → Чернівці затримка на 18 хвилин',
    bodyEn: 'T-08711 Lviv → Chernivtsi delayed by 18 minutes',
    time: '14:11', trip: 'T-08711' },
  { id: 4, level: 'info', titleUk: 'Динамічна ціна оновлена', titleEn: 'Dynamic price updated',
    bodyUk: 'T-08820 Київ → Полтава: ціна підвищена з 480 до 720 ₴',
    bodyEn: 'T-08820 Kyiv → Poltava: fare raised 480 → 720 UAH',
    time: '13:45', trip: 'T-08820' },
  { id: 5, level: 'ok', titleUk: 'Синхронізація IoT', titleEn: 'IoT sync ok',
    bodyUk: 'Усі 7 пристроїв синхронізовано',
    bodyEn: 'All 7 devices synced',
    time: '13:30' },
];

window.BO.users = [
  { id: 1, name: 'Олена Кравець', email: 'o.kravets@busoptima.ua', role: 'dispatcher', status: 'active', lastLogin: '2 хв тому' },
  { id: 2, name: 'Андрій Кушнір', email: 'a.kushnir@busoptima.ua', role: 'business_admin', status: 'active', lastLogin: '15 хв тому' },
  { id: 3, name: 'Богдан Левченко', email: 'b.levchenko@busoptima.ua', role: 'tech_admin', status: 'active', lastLogin: '1 год тому' },
  { id: 4, name: 'Марія Сидоренко', email: 'm.sydorenko@busoptima.ua', role: 'dispatcher', status: 'active', lastLogin: '3 год тому' },
  { id: 5, name: 'Ігор Романюк', email: 'i.romaniuk@busoptima.ua', role: 'dispatcher', status: 'inactive', lastLogin: '2 дні тому' },
  { id: 6, name: 'Наталія Гончар', email: 'n.honchar@busoptima.ua', role: 'business_admin', status: 'active', lastLogin: '6 год тому' },
  { id: 7, name: 'Юрій Поліщук', email: 'y.polishchuk@busoptima.ua', role: 'dispatcher', status: 'active', lastLogin: 'щойно' },
];

// Forecast rows (next 7 days, sample)
window.BO.forecast = [
  { trip: 'T-09102', route: 'R-104', from: 'Kyiv', to: 'Lviv', date: 'Завтра, 06:30', forecastPax: 47, capacity: 49, ciLow: 44, ciHigh: 49, rec: 'add' },
  { trip: 'T-09103', route: 'R-104', from: 'Kyiv', to: 'Lviv', date: 'Завтра, 12:00', forecastPax: 41, capacity: 51, ciLow: 36, ciHigh: 46, rec: 'hold' },
  { trip: 'T-09201', route: 'R-207', from: 'Odesa', to: 'Kharkiv', date: 'Завтра, 07:15', forecastPax: 18, capacity: 51, ciLow: 12, ciHigh: 24, rec: 'cancel' },
  { trip: 'T-09302', route: 'R-318', from: 'Dnipro', to: 'Kyiv', date: 'Завтра, 08:00', forecastPax: 44, capacity: 53, ciLow: 38, ciHigh: 50, rec: 'hold' },
  { trip: 'T-09422', route: 'R-509', from: 'Kyiv', to: 'Poltava', date: 'Завтра, 10:00', forecastPax: 48, capacity: 49, ciLow: 45, ciHigh: 49, rec: 'add' },
  { trip: 'T-09525', route: 'R-952', from: 'Kyiv', to: 'Chernihiv', date: 'Завтра, 13:15', forecastPax: 27, capacity: 51, ciLow: 22, ciHigh: 32, rec: 'hold' },
  { trip: 'T-09611', route: 'R-422', from: 'Lviv', to: 'Chernivtsi', date: 'Завтра, 09:30', forecastPax: 8, capacity: 49, ciLow: 4, ciHigh: 14, rec: 'cancel' },
  { trip: 'T-09730', route: 'R-733', from: 'Vinnytsia', to: 'Kyiv', date: 'Завтра, 14:00', forecastPax: 39, capacity: 49, ciLow: 33, ciHigh: 45, rec: 'hold' },
];

// Profitability per route last 7 days
window.BO.profitability = [
  { route: 'R-104', from: 'Kyiv', to: 'Lviv', trips: 56, revenue: 318420, cost: 184600, profit: 133820, margin: 42.0, avgLoad: 78 },
  { route: 'R-207', from: 'Odesa', to: 'Kharkiv', trips: 42, revenue: 251600, cost: 168900, profit: 82700, margin: 32.9, avgLoad: 51 },
  { route: 'R-318', from: 'Dnipro', to: 'Kyiv', trips: 49, revenue: 218750, cost: 142300, profit: 76450, margin: 34.9, avgLoad: 64 },
  { route: 'R-422', from: 'Lviv', to: 'Chernivtsi', trips: 28, revenue: 82400, cost: 84200, profit: -1800, margin: -2.1, avgLoad: 31 },
  { route: 'R-509', from: 'Kyiv', to: 'Poltava', trips: 35, revenue: 168500, cost: 98200, profit: 70300, margin: 41.7, avgLoad: 72 },
  { route: 'R-611', from: 'Zaporizhzhia', to: 'Odesa', trips: 21, revenue: 96200, cost: 78400, profit: 17800, margin: 18.5, avgLoad: 44 },
  { route: 'R-733', from: 'Vinnytsia', to: 'Kyiv', trips: 42, revenue: 121400, cost: 76800, profit: 44600, margin: 36.7, avgLoad: 68 },
  { route: 'R-841', from: 'Uzhhorod', to: 'Lviv', trips: 28, revenue: 71200, cost: 62400, profit: 8800, margin: 12.4, avgLoad: 42 },
  { route: 'R-952', from: 'Kyiv', to: 'Chernihiv', trips: 63, revenue: 142800, cost: 81600, profit: 61200, margin: 42.8, avgLoad: 75 },
  { route: 'R-263', from: 'Ternopil', to: 'Lviv', trips: 35, revenue: 68400, cost: 51200, profit: 17200, margin: 25.1, avgLoad: 52 },
  { route: 'R-385', from: 'Cherkasy', to: 'Kyiv', trips: 49, revenue: 124600, cost: 78900, profit: 45700, margin: 36.7, avgLoad: 69 },
];

// Time series - last 24h passengers totals
window.BO.passengersByHour = [
  { h: '00', pax: 12 }, { h: '01', pax: 8 }, { h: '02', pax: 5 }, { h: '03', pax: 4 },
  { h: '04', pax: 11 }, { h: '05', pax: 38 }, { h: '06', pax: 124 }, { h: '07', pax: 218 },
  { h: '08', pax: 264 }, { h: '09', pax: 198 }, { h: '10', pax: 172 }, { h: '11', pax: 165 },
  { h: '12', pax: 180 }, { h: '13', pax: 192 }, { h: '14', pax: 210 }, { h: '15', pax: 224 },
  { h: '16', pax: 245 }, { h: '17', pax: 268 }, { h: '18', pax: 232 }, { h: '19', pax: 180 },
  { h: '20', pax: 122 }, { h: '21', pax: 84 }, { h: '22', pax: 45 }, { h: '23', pax: 22 },
];

// Revenue by day last 14d
window.BO.revenueByDay = (() => {
  const arr = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const base = 180000 + Math.sin(i / 2) * 24000 + (Math.random() * 18000);
    arr.push({
      day: `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}`,
      revenue: Math.round(base),
      cost: Math.round(base * (0.55 + Math.random() * 0.08)),
    });
  }
  return arr;
})();

// 3-month trend per route id
window.BO.trendByRoute = (() => {
  const out = {};
  ['R-104','R-207','R-318','R-509','R-952'].forEach((r, i) => {
    const data = [];
    for (let w = 0; w < 12; w++) {
      data.push({
        week: `W${w+1}`,
        load: Math.round(45 + Math.sin((w + i*2) / 2.5) * 14 + Math.random() * 8),
      });
    }
    out[r] = data;
  });
  return out;
})();

// Backups
window.BO.backups = [
  { id: 'bkp-2026-05-20-0300', size: '4.82 GB', created: '2026-05-20 03:00', status: 'ok', type: 'scheduled', durationSec: 87 },
  { id: 'bkp-2026-05-19-0300', size: '4.79 GB', created: '2026-05-19 03:00', status: 'ok', type: 'scheduled', durationSec: 84 },
  { id: 'bkp-2026-05-18-0300', size: '4.76 GB', created: '2026-05-18 03:00', status: 'ok', type: 'scheduled', durationSec: 81 },
  { id: 'bkp-2026-05-17-1422', size: '4.74 GB', created: '2026-05-17 14:22', status: 'ok', type: 'manual', durationSec: 79 },
  { id: 'bkp-2026-05-17-0300', size: '4.73 GB', created: '2026-05-17 03:00', status: 'ok', type: 'scheduled', durationSec: 80 },
  { id: 'bkp-2026-05-16-0300', size: '4.71 GB', created: '2026-05-16 03:00', status: 'ok', type: 'scheduled', durationSec: 78 },
  { id: 'bkp-2026-05-15-0300', size: '4.70 GB', created: '2026-05-15 03:00', status: 'failed', type: 'scheduled', durationSec: 14, error: 'connection timeout' },
  { id: 'bkp-2026-05-14-0300', size: '4.68 GB', created: '2026-05-14 03:00', status: 'ok', type: 'scheduled', durationSec: 77 },
];

// Migrations
window.BO.migrations = [
  { v: '20260518_120000', name: 'add_iot_device_jwt_revocation', applied: '2026-05-18 12:04', dirty: false },
  { v: '20260512_090000', name: 'fare_calc_audit_table', applied: '2026-05-12 09:11', dirty: false },
  { v: '20260430_140000', name: 'route_seasonality_coeff', applied: '2026-04-30 14:18', dirty: false },
  { v: '20260415_103000', name: 'index_events_trip_time', applied: '2026-04-15 10:34', dirty: false },
  { v: '20260401_080000', name: 'partition_passenger_events_2026', applied: '2026-04-01 08:01', dirty: false },
];

// Logs (sample lines)
window.BO.logs = [
  { t: '14:32:18', lvl: 'warn', svc: 'analytics', msg: 'trip T-08412 occupancy 96% exceeds threshold 85%' },
  { t: '14:32:18', lvl: 'info', svc: 'fare_engine', msg: 'pricing recommendation trip=T-08412 base=750 new=1085 factor=1.448' },
  { t: '14:31:55', lvl: 'info', svc: 'iot_gateway', msg: 'device IOT-A1F3 sync 32 events accepted' },
  { t: '14:31:42', lvl: 'debug', svc: 'http', msg: 'GET /api/trips/active 200 12ms' },
  { t: '14:30:11', lvl: 'info', svc: 'forecast', msg: 'recompute job complete routes=12 elapsed=4.2s' },
  { t: '14:28:03', lvl: 'warn', svc: 'iot_gateway', msg: 'device IOT-Q5R2 last_seen 24m ago, marking degraded' },
  { t: '14:25:50', lvl: 'error', svc: 'fare_engine', msg: 'trip T-08711 fare clamp triggered, raw=0.62 clamped=0.70' },
  { t: '14:22:14', lvl: 'info', svc: 'auth', msg: 'JWT issued for user=a.kushnir@busoptima.ua role=business_admin' },
  { t: '14:20:01', lvl: 'info', svc: 'profitability', msg: 'daily run complete trips=312 elapsed=11.7s' },
  { t: '14:18:33', lvl: 'warn', svc: 'analytics', msg: 'trip T-08711 actual=24% forecast=58% deviation=-34pp' },
  { t: '14:15:08', lvl: 'debug', svc: 'http', msg: 'POST /api/events 201 4ms' },
  { t: '14:12:22', lvl: 'info', svc: 'iot_gateway', msg: 'device IOT-B2C7 sync 18 events accepted' },
  { t: '14:08:41', lvl: 'info', svc: 'backup', msg: 'pg_dump scheduled for 03:00 (next in 12h 51m)' },
  { t: '14:05:19', lvl: 'error', svc: 'http', msg: 'GET /api/admin/users 500 - db pool exhausted' },
  { t: '14:01:00', lvl: 'info', svc: 'system', msg: 'health check ok db_latency=2.1ms cache_latency=0.3ms' },
];

// Roles meta
window.BO.roles = {
  dispatcher:    { uk: 'Диспетчер',     en: 'Dispatcher',     color: 'var(--accent)' },
  business_admin:{ uk: 'Бізнес-адмін',   en: 'Business admin', color: 'var(--violet)' },
  tech_admin:    { uk: 'Тех-адмін',      en: 'Tech admin',     color: 'var(--info)' },
};

// i18n
window.BO.i18n = {
  uk: {
    'nav.live': 'Моніторинг',
    'nav.forecast': 'Прогноз попиту',
    'nav.profit': 'Рентабельність',
    'nav.reports': 'Звіти',
    'nav.routes': 'Маршрути',
    'nav.fleet': 'Автопарк',
    'nav.users': 'Користувачі',
    'nav.backups': 'Резервні копії',
    'nav.logs': 'Журнали',
    'nav.health': 'Стан системи',
    'nav.settings': 'Налаштування',
    'nav.audit': 'Журнал аудиту',
    'sec.operations': 'Операції',
    'sec.admin': 'Адміністрування',
    'sec.tech': 'Технічне',
    'cta.export': 'Експорт',
    'cta.new': 'Створити',
    'cta.save': 'Зберегти',
    'cta.cancel': 'Скасувати',
    'cta.delete': 'Видалити',
    'cta.edit': 'Редагувати',
    'cta.run': 'Запустити',
    'cta.restore': 'Відновити',
    'load': 'Завантаженість',
    'price': 'Ціна',
    'capacity': 'Місткість',
    'progress': 'Прогрес',
    'today': 'Сьогодні',
    'week': '7 днів',
    'month': '30 днів',
    'fare.current': 'Поточна',
    'fare.base': 'Базова',
  },
  en: {
    'nav.live': 'Live monitoring',
    'nav.forecast': 'Demand forecast',
    'nav.profit': 'Profitability',
    'nav.reports': 'Reports',
    'nav.routes': 'Routes',
    'nav.fleet': 'Fleet',
    'nav.users': 'Users',
    'nav.backups': 'Backups',
    'nav.logs': 'Logs',
    'nav.health': 'System health',
    'nav.settings': 'Settings',
    'nav.audit': 'Audit log',
    'sec.operations': 'Operations',
    'sec.admin': 'Administration',
    'sec.tech': 'Technical',
    'cta.export': 'Export',
    'cta.new': 'New',
    'cta.save': 'Save',
    'cta.cancel': 'Cancel',
    'cta.delete': 'Delete',
    'cta.edit': 'Edit',
    'cta.run': 'Run',
    'cta.restore': 'Restore',
    'load': 'Load',
    'price': 'Price',
    'capacity': 'Capacity',
    'progress': 'Progress',
    'today': 'Today',
    'week': '7 days',
    'month': '30 days',
    'fare.current': 'Current',
    'fare.base': 'Base',
  },
};

window.BO.t = (key, lang) => (window.BO.i18n[lang] && window.BO.i18n[lang][key]) || key;
window.BO.cityName = (key, lang) => {
  const c = window.BO.cities[key];
  if (!c) return key;
  return lang === 'en' ? c.name_en : c.name_uk;
};
window.BO.routeLabel = (rid, lang) => {
  const r = window.BO.routes.find(x => x.id === rid);
  if (!r) return rid;
  return `${window.BO.cityName(r.from, lang)} → ${window.BO.cityName(r.to, lang)}`;
};
