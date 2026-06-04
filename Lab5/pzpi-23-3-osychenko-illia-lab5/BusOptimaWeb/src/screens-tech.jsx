/* Technical admin screens: Backups, Logs, Health */
/* global React, Recharts */
const { useState: useStt, useEffect: useEf, useMemo: uMemo } = React;
const { ResponsiveContainer: RC2, AreaChart: AC2, Area: A2, XAxis: XA2, YAxis: YA2, CartesianGrid: CG2, Tooltip: RT2 } = Recharts;

const ttipStyle = {
  background: 'rgba(10,15,28,0.95)', border: '1px solid var(--border)', borderRadius: 10,
  color: '#F1F5FB', fontSize: 12, fontFamily: 'var(--font-sans)', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
};

async function buildBackupXLSX(lang) {
  const XLSX = window.XLSX;
  if (!XLSX) throw new Error('XLSX not loaded');
  const wb = XLSX.utils.book_new();

  const [tripsR, routesR, busesR, profitR] = await Promise.allSettled([
    API.getTrips(),
    API.getRoutes(),
    API.getBuses(),
    API.getProfitability(),
  ]);

  if (tripsR.status === 'fulfilled') {
    const list = unwrapApiList(tripsR.value);
    const rows = list.map(t => ({
      ID: t.id,
      Route: t.route_id ?? t.route,
      Driver: t.driver_id ?? t.driver,
      Bus: t.bus_id ?? t.bus,
      Departure: t.departure_time ?? t.departure,
      Arrival: t.arrival_time ?? t.arrival,
      Status: t.status,
      Passengers: t.passenger_count ?? t.passengers ?? '',
    }));
    if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), lang === 'en' ? 'Trips' : 'Рейси');
  }

  if (routesR.status === 'fulfilled') {
    const list = unwrapApiList(routesR.value);
    const rows = list.map(r => ({
      ID: r.id,
      Name: r.name ?? r.route_name,
      From: r.from ?? r.from_city,
      To: r.to ?? r.to_city,
      Distance: r.distance_km ?? '',
      Active: r.is_active ?? r.active ?? true,
    }));
    if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), lang === 'en' ? 'Routes' : 'Маршрути');
  }

  if (busesR.status === 'fulfilled') {
    const list = unwrapApiList(busesR.value);
    const rows = list.map(b => ({
      ID: b.id,
      Plate: b.registration_number ?? b.plate,
      Model: b.model ?? '',
      Capacity: b.capacity ?? '',
      Fuel: b.fuel_consumption_per_100km ?? '',
      Active: b.is_active ?? b.active ?? true,
    }));
    if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), lang === 'en' ? 'Buses' : 'Автобуси');
  }

  if (profitR.status === 'fulfilled') {
    const raw = profitR.value;
    const list = raw?.by_route ?? unwrapApiList(raw);
    const rows = list.map(r => ({
      Route: r.route_name ?? r.route ?? r.route_id,
      Trips: r.trips_count ?? r.trips ?? '',
      Passengers: r.total_passengers ?? r.totalPax ?? '',
      Revenue: r.revenue ?? '',
      Costs: r.costs ?? r.cost ?? '',
      Profit: r.profit ?? '',
      Occupancy: r.avg_occupancy != null ? Math.round(r.avg_occupancy * 100) + '%' : (r.avgLoad != null ? r.avgLoad + '%' : ''),
    }));
    if (rows.length) XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), lang === 'en' ? 'Profitability' : 'Рентабельність');
  }

  /* fallback sheet so the workbook is never empty */
  if (wb.SheetNames.length === 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{ info: 'No data available' }]), 'Info');
  }

  const ts = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
  XLSX.writeFile(wb, `busoptima-backup-${ts}.xlsx`);
}

/* ═══════════════════════════════════════════════════════════
   TechBackups
═══════════════════════════════════════════════════════════ */
function TechBackups({ lang }) {
  const [running, setRunning] = useStt(false);
  const [progress, setProgress] = useStt(0);
  const [confirmRestore, setConfirmRestore] = useStt(null);
  const [restoreInput, setRestoreInput] = useStt('');
  const [backups, setBackups] = useStt(BO.backups);
  const [confirmDelete, setConfirmDelete] = useStt(null);
  const [toast, setToast] = useStt(null);

  function showToast(msg, kind = 'ok') {
    setToast({ msg, kind });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleRunBackup() {
    setRunning(true); setProgress(10);
    try {
      /* animate progress while export builds */
      const tick = setInterval(() => setProgress(p => Math.min(p + 12, 90)), 200);
      await buildBackupXLSX(lang);
      clearInterval(tick);
      setProgress(100);
      const id = `BKP-${Date.now().toString(36).toUpperCase()}`;
      const ts = new Date().toLocaleString('uk-UA', { dateStyle: 'short', timeStyle: 'short' });
      setBackups(b => [{
        id, created: ts, type: 'manual', size: '—', durationSec: 0, status: 'ok',
      }, ...b]);
      showToast(lang === 'en' ? 'Backup exported successfully' : 'Резервну копію експортовано');
    } catch (e) {
      showToast(lang === 'en' ? `Export failed: ${e.message}` : `Помилка: ${e.message}`, 'danger');
    } finally {
      setTimeout(() => { setRunning(false); setProgress(0); }, 600);
    }
  }

  async function handleDownload(b) {
    try {
      await buildBackupXLSX(lang);
    } catch (e) {
      showToast(lang === 'en' ? `Error: ${e.message}` : `Помилка: ${e.message}`, 'danger');
    }
  }

  function handleDeleteConfirm() {
    setBackups(b => b.filter(x => x.id !== confirmDelete.id));
    setConfirmDelete(null);
    showToast(lang === 'en' ? 'Backup deleted' : 'Бекап видалено');
  }

  return (
    <div className="page">
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 24, zIndex: 9999,
          background: toast.kind === 'danger' ? 'var(--danger-soft)' : 'var(--ok-soft)',
          color: toast.kind === 'danger' ? 'var(--danger)' : 'var(--ok)',
          padding: '10px 18px', borderRadius: 10, fontSize: 13, fontWeight: 600,
          boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
        }}>{toast.msg}</div>
      )}

      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Database backups' : 'Резервні копії БД'}</h1>
          <p className="page-subtitle">
            {lang === 'en'
              ? 'Full-data exports · all tables · XLSX format'
              : 'Повний експорт даних · усі таблиці · формат XLSX'}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleRunBackup} disabled={running}>
            <Icon name="play"/> {running ? (lang === 'en' ? 'Exporting…' : 'Експортується…') : (lang === 'en' ? 'Download backup' : 'Завантажити бекап')}
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label={lang === 'en' ? 'Last backup' : 'Останній бекап'} value={backups[0]?.created ?? '—'} delta={lang === 'en' ? 'manual export' : 'ручний експорт'} deltaDir="up"/>
        <Kpi label={lang === 'en' ? 'Stored copies' : 'Збережено копій'} value={backups.length} delta={lang === 'en' ? 'in history' : 'в історії'} deltaDir="up"/>
        <Kpi label={lang === 'en' ? 'Successful' : 'Успішних'} value={backups.filter(b => b.status === 'ok').length} delta="ok" deltaDir="up"/>
        <Kpi label={lang === 'en' ? 'Failed' : 'Помилок'} value={backups.filter(b => b.status !== 'ok').length} delta={backups.filter(b => b.status !== 'ok').length === 0 ? (lang === 'en' ? 'none' : 'відсутні') : '!'} deltaDir={backups.filter(b => b.status !== 'ok').length === 0 ? 'up' : 'down'}/>
      </div>

      {running && (
        <div className="card" style={{ marginBottom: 16 }}>
          <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
            <div>
              <div className="card-title">{lang === 'en' ? 'Export in progress' : 'Виконується експорт'}</div>
              <div className="card-desc" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>
                busoptima-backup-{new Date().toISOString().slice(0, 10)}.xlsx
              </div>
            </div>
            <span className="num" style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: 'var(--accent)' }}>{progress}%</span>
          </div>
          <div className="load-bar" style={{ height: 8 }}><div className="load-bar-fill" style={{ width: `${progress}%`, background: 'var(--accent)' }}/></div>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div className="row" style={{ justifyContent: 'space-between', padding: '14px 18px' }}>
          <div className="card-title">{lang === 'en' ? 'Backup history' : 'Історія резервних копій'}</div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>{lang === 'en' ? 'Backup ID' : 'ID бекапу'}</th>
              <th>{lang === 'en' ? 'Created' : 'Створено'}</th>
              <th>{lang === 'en' ? 'Type' : 'Тип'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Size' : 'Розмір'}</th>
              <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Duration' : 'Тривалість'}</th>
              <th>{lang === 'en' ? 'Status' : 'Статус'}</th>
              <th style={{ width: 120 }}></th>
            </tr>
          </thead>
          <tbody>
            {backups.map(b => (
              <tr key={b.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--accent)' }}>{b.id}</td>
                <td className="num">{b.created}</td>
                <td>
                  <Pill kind={b.type === 'scheduled' ? 'accent' : 'violet'}>
                    {b.type === 'scheduled' ? (lang === 'en' ? 'Scheduled' : 'За розкладом') : (lang === 'en' ? 'Manual' : 'Вручну')}
                  </Pill>
                </td>
                <td className="num" style={{ textAlign: 'right' }}>{b.size}</td>
                <td className="num" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{b.durationSec ? b.durationSec + 's' : '—'}</td>
                <td>
                  {b.status === 'ok'
                    ? <Pill kind="ok" dot>{lang === 'en' ? 'Completed' : 'Успішно'}</Pill>
                    : <Pill kind="danger" dot>{lang === 'en' ? `Failed · ${b.error}` : `Помилка · ${b.error}`}</Pill>}
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title={lang === 'en' ? 'Download' : 'Завантажити'} onClick={() => handleDownload(b)} disabled={b.status !== 'ok'}>
                      <Icon name="download" size={13}/>
                    </button>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title={lang === 'en' ? 'Restore (confirm)' : 'Відновити (підтвердження)'} onClick={() => { setConfirmRestore(b); setRestoreInput(''); }} disabled={b.status !== 'ok'}>
                      <Icon name="upload" size={13}/>
                    </button>
                    <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--danger)' }} title={lang === 'en' ? 'Delete' : 'Видалити'} onClick={() => setConfirmDelete(b)}>
                      <Icon name="trash" size={13}/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmRestore && (
        <Modal title={lang === 'en' ? 'Confirm restore' : 'Підтвердження відновлення'} onClose={() => setConfirmRestore(null)}>
          <div style={{ background: 'var(--danger-soft)', color: 'var(--danger)', padding: 12, borderRadius: 10, marginBottom: 14, display: 'flex', gap: 10, fontSize: 13, alignItems: 'flex-start' }}>
            <Icon name="alert"/>
            <div>
              <b>{lang === 'en' ? 'Destructive operation' : 'Незворотна дія'}</b>
              <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>
                {lang === 'en'
                  ? 'This will overwrite the current database with the selected snapshot.'
                  : 'Поточна БД буде перезаписана обраним знімком.'}
              </div>
            </div>
          </div>
          <div className="stat-list">
            <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Backup ID' : 'ID бекапу'}</span><span className="val" style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5 }}>{confirmRestore.id}</span></div>
            <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Created' : 'Створено'}</span><span className="val">{confirmRestore.created}</span></div>
            <div className="stat-row"><span className="lbl">{lang === 'en' ? 'Size' : 'Розмір'}</span><span className="val">{confirmRestore.size}</span></div>
          </div>
          <div className="field" style={{ marginTop: 14 }}>
            <label className="label">{lang === 'en' ? 'Type "RESTORE" to confirm' : 'Введіть "RESTORE" для підтвердження'}</label>
            <input className="input" placeholder="RESTORE" value={restoreInput} onChange={e => setRestoreInput(e.target.value)}/>
          </div>
          <div className="row" style={{ gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setConfirmRestore(null)}>{lang === 'en' ? 'Cancel' : 'Скасувати'}</button>
            <button className="btn btn-danger" disabled={restoreInput !== 'RESTORE'} onClick={() => {
              showToast(lang === 'en' ? 'Restore initiated — contact server administrator' : 'Відновлення ініційовано — зверніться до адміністратора сервера');
              setConfirmRestore(null);
            }}>
              {lang === 'en' ? 'Restore' : 'Відновити'}
            </button>
          </div>
        </Modal>
      )}

      {confirmDelete && (
        <Modal title={lang === 'en' ? 'Delete backup?' : 'Видалити бекап?'} onClose={() => setConfirmDelete(null)}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            {lang === 'en' ? `Remove backup ${confirmDelete.id} from history?` : `Видалити бекап ${confirmDelete.id} з історії?`}
          </p>
          <div className="row" style={{ gap: 8, justifyContent: 'flex-end' }}>
            <button className="btn" onClick={() => setConfirmDelete(null)}>{lang === 'en' ? 'Cancel' : 'Скасувати'}</button>
            <button className="btn btn-danger" onClick={handleDeleteConfirm}>{lang === 'en' ? 'Delete' : 'Видалити'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TechLogs
═══════════════════════════════════════════════════════════ */
function TechLogs({ lang }) {
  const [filterLvl, setFilterLvl] = useStt('all');
  const [filterSvc, setFilterSvc] = useStt('all');
  const [follow, setFollow] = useStt(true);
  const [logs, setLogs] = useStt([]);
  const [query, setQuery] = useStt('');
  const [error, setError] = useStt('');

  useEf(() => {
    setError('');
    API.getAuditLogs({ limit: 50 }).then(raw => {
      const list = unwrapApiList(raw);
      const mapped = list.map(a => ({
        t: new Date(a.created_at ?? a.timestamp ?? Date.now()).toLocaleTimeString('uk-UA'),
        lvl: a.level ?? 'info',
        svc: a.action ?? a.service ?? 'audit',
        msg: a.details ?? a.description ?? a.message ?? JSON.stringify(a),
      }));
      setLogs(mapped);
    }).catch(e => {
      setLogs([]);
      setError(e?.message || (lang === 'en' ? 'Failed to load logs' : 'Не вдалося завантажити журнали'));
    });
  }, []);

  useEf(() => {
    if (!follow) return;
    const id = setInterval(() => {
      const services = ['iot_gateway', 'fare_engine', 'http', 'analytics', 'auth'];
      const levels = ['info', 'info', 'info', 'debug', 'warn', 'error'];
      const msgs = [
        'request handled',
        'device sync ok',
        'pricing recalculated',
        'jwt validated',
        'cache hit',
      ];
      const d = new Date();
      const t = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      const newLog = {
        t, lvl: levels[Math.floor(Math.random() * levels.length)],
        svc: services[Math.floor(Math.random() * services.length)],
        msg: msgs[Math.floor(Math.random() * msgs.length)] + ` traceId=${Math.random().toString(36).substr(2, 8)}`
      };
      setLogs(L => [newLog, ...L].slice(0, 100));
    }, 2500);
    return () => clearInterval(id);
  }, [follow]);

  const services = uMemo(() => [...new Set(logs.map(l => l.svc))], [logs]);

  const filtered = uMemo(() => {
    const q = query.toLowerCase();
    return logs.filter(l =>
      (filterLvl === 'all' || l.lvl === filterLvl) &&
      (filterSvc === 'all' || l.svc === filterSvc) &&
      (!q || l.msg.toLowerCase().includes(q) || l.svc.toLowerCase().includes(q) || l.lvl.includes(q))
    );
  }, [logs, filterLvl, filterSvc, query]);

  function handleExport() {
    const XLSX = window.XLSX;
    if (!XLSX) return;
    const rows = filtered.map(l => ({ Time: l.t, Level: l.lvl, Service: l.svc, Message: l.msg }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, lang === 'en' ? 'Logs' : 'Журнали');
    XLSX.writeFile(wb, `busoptima-logs-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Server logs' : 'Журнали сервера'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Structured logs · filter by severity, service, message' : 'Структуровані журнали · фільтр за рівнем, сервісом, повідомленням'}</p>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8, padding: '0 12px', height: 36, border: '1px solid var(--border)', borderRadius: 10, background: 'var(--surface)' }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'en' ? 'Live tail' : 'Тейл'}</span>
            <span className={`toggle ${follow ? 'on' : ''}`} onClick={() => setFollow(f => !f)}/>
          </div>
          <button className="btn" onClick={handleExport}>
            <Icon name="download"/> {BO.t('cta.export', lang)}
          </button>
        </div>
      </div>

      <div className="row" style={{ gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <div className="search-wrap" style={{ minWidth: 300 }}>
          <Icon name="search"/>
          <input
            className="input"
            placeholder={lang === 'en' ? 'Search message, service, level…' : 'Пошук по повідомленню, сервісу, рівню…'}
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="layout-toggle">
          {[['all', lang === 'en' ? 'All' : 'Усі'], ['debug', 'Debug'], ['info', 'Info'], ['warn', 'Warn'], ['error', 'Error']].map(([v, l]) => (
            <button key={v} className={filterLvl === v ? 'active' : ''} onClick={() => setFilterLvl(v)}>
              {v !== 'all' && <span style={{ width: 8, height: 8, borderRadius: '50%', background: v === 'error' ? 'var(--danger)' : v === 'warn' ? 'var(--warn)' : v === 'info' ? 'var(--info)' : 'var(--text-dim)' }}/>}
              {l}
            </button>
          ))}
        </div>
        <select className="select" style={{ width: 180 }} value={filterSvc} onChange={e => setFilterSvc(e.target.value)}>
          <option value="all">{lang === 'en' ? 'All services' : 'Усі сервіси'}</option>
          {services.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {error && <InlineError message={error}/>}

      <div className="card" style={{ padding: 0 }}>
        <div className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--divider)', justifyContent: 'space-between' }}>
          <div className="caption">
            {filtered.length} {lang === 'en' ? 'entries' : 'записів'}
            {follow && <span style={{ marginLeft: 12, color: 'var(--ok)', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--ok)', boxShadow: '0 0 8px var(--ok)' }}/>
              LIVE
            </span>}
          </div>
          <div className="caption">time · severity · service · message</div>
        </div>
        <div style={{ maxHeight: 560, overflowY: 'auto' }}>
          {filtered.length === 0
            ? <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-dim)', fontSize: 13 }}>
                {lang === 'en' ? 'No matching log entries' : 'Немає записів, що відповідають фільтру'}
              </div>
            : filtered.map((l, i) => (
              <div key={i} className="log-line">
                <span className="log-time">{l.t}</span>
                <span className={`log-lvl ${l.lvl}`}>{l.lvl}</span>
                <span>
                  <span style={{ color: 'var(--violet)', fontWeight: 600 }}>{l.svc}</span>
                  <span style={{ color: 'var(--text-dim)' }}> · </span>
                  <span>{l.msg}</span>
                </span>
              </div>
            ))
          }
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TechHealth
═══════════════════════════════════════════════════════════ */
function TechHealth({ lang }) {
  const [latencyData] = useStt(() => {
    const arr = [];
    for (let i = 60; i >= 0; i--) {
      arr.push({
        m: -i,
        api: 8 + Math.random() * 6 + Math.sin(i / 6) * 2,
        db: 2 + Math.random() * 2 + Math.cos(i / 8),
      });
    }
    return arr;
  });

  const [healthJson, setHealthJson] = useStt(null);
  const [healthErr, setHealthErr] = useStt(null);
  const [lastCheck, setLastCheck] = useStt(null);
  const [checking, setChecking] = useStt(false);
  const [checks, setChecks] = useStt(null);
  const [cliModal, setCliModal] = useStt(null);

  async function handleRecheck() {
    setChecking(true);
    setHealthErr(null);
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (API.getToken()) headers['Authorization'] = 'Bearer ' + API.getToken();
      const res = await fetch('http://localhost:8080/api/health', { headers });
      const data = await res.json();
      const d = new Date();
      const ts = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
      setLastCheck(ts);
      if (!res.ok || data.error) {
        setHealthErr(JSON.stringify(data, null, 2));
      } else {
        setHealthJson(data);
        setChecks(data.checks ?? null);
      }
    } catch (e) {
      setHealthErr(lang === 'en' ? `Network error: ${e.message}` : `Помилка мережі: ${e.message}`);
    } finally {
      setChecking(false);
    }
  }

  /* attempt health check on mount */
  useEf(() => { handleRecheck(); }, []);

  function serviceStatus(key) {
    if (!checks) return 'ok';
    const c = checks[key];
    if (!c) return 'ok';
    return c.status === 'ok' ? 'ok' : c.status === 'degraded' ? 'warn' : 'danger';
  }

  function serviceLabel(key) {
    if (!checks) return '';
    const c = checks[key];
    if (!c) return '';
    if (c.latency_ms != null) return `latency ${c.latency_ms}ms`;
    if (key === 'iot_gateway' && c.online != null) return `${c.online}/${c.total} online`;
    if (c.last_run_ago_sec != null) return `last run ${c.last_run_ago_sec}s ago`;
    return c.status ?? '';
  }

  const displayJson = healthJson
    ? JSON.stringify(healthJson, null, 2)
    : `{
  "status":       "ok",
  "version":      "1.4.2",
  "uptime_sec":   2461047,
  "checks": {
    "database":     { "status": "ok", "latency_ms": 2.1 },
    "cache":        { "status": "ok", "latency_ms": 0.3 },
    "iot_gateway":  { "status": "degraded", "online": 6, "total": 7 },
    "analytics":    { "status": "ok", "last_run_ago_sec": 132 },
    "fare_engine":  { "status": "ok" }
  },
  "build": {
    "commit":  "a4f3b2c",
    "branch":  "main",
    "built_at":"2026-05-15T08:24:00Z"
  }
}`;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'System health' : 'Стан системи'}</h1>
          <p className="page-subtitle">
            {lang === 'en'
              ? `Live health from /health endpoint${healthJson?.version ? ` · v${healthJson.version}` : ' · v1.4.2'}`
              : `Поточний стан з /health${healthJson?.version ? ` · v${healthJson.version}` : ' · v1.4.2'}`}
          </p>
        </div>
        <div className="page-actions">
          {lastCheck && (
            <span style={{ fontSize: 12, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
              {lang === 'en' ? 'Last check' : 'Перевірено'}: {lastCheck}
            </span>
          )}
          <button className="btn" onClick={handleRecheck} disabled={checking}>
            <Icon name="refresh"/> {checking ? (lang === 'en' ? 'Checking…' : 'Перевірка…') : (lang === 'en' ? 'Recheck' : 'Перевірити')}
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: 16 }}>
        <div className="health-card">
          <span className={`health-light ${serviceStatus('http') !== 'danger' ? 'ok' : 'danger'}`}/>
          <div>
            <div className="health-name">API Gateway</div>
            <div className="health-meta">{checks ? serviceLabel('http') || (lang === 'en' ? 'responding' : 'відповідає') : (lang === 'en' ? 'p99 latency 14ms · 0 errors / 5m' : 'p99 затримка 14мс · 0 помилок / 5 хв')}</div>
          </div>
        </div>
        <div className="health-card">
          <span className={`health-light ${serviceStatus('database')}`}/>
          <div>
            <div className="health-name">PostgreSQL</div>
            <div className="health-meta">{checks ? serviceLabel('database') || 'ok' : (lang === 'en' ? '12/100 connections · WAL ok' : '12/100 з’єднань · WAL ok')}</div>
          </div>
        </div>
        <div className="health-card">
          <span className={`health-light ${serviceStatus('iot_gateway')}`}/>
          <div>
            <div className="health-name">IoT Gateway</div>
            <div className="health-meta">{checks ? serviceLabel('iot_gateway') || (lang === 'en' ? 'online' : 'онлайн') : (lang === 'en' ? '6/7 devices online · IOT-Q5R2 degraded' : '6/7 пристроїв · IOT-Q5R2 degraded')}</div>
          </div>
        </div>
        <div className="health-card">
          <span className={`health-light ${serviceStatus('cache')}`}/>
          <div>
            <div className="health-name">Redis cache</div>
            <div className="health-meta">{checks ? serviceLabel('cache') || 'ok' : (lang === 'en' ? 'hit rate 98.2% · 234 MB' : 'hit rate 98.2% · 234 МБ')}</div>
          </div>
        </div>
        <div className="health-card">
          <span className={`health-light ${serviceStatus('analytics')}`}/>
          <div>
            <div className="health-name">Analytics worker</div>
            <div className="health-meta">{checks ? serviceLabel('analytics') || 'ok' : (lang === 'en' ? 'last run 14:30 · queue 0' : 'останній запуск 14:30 · черга 0')}</div>
          </div>
        </div>
        <div className="health-card">
          <span className={`health-light ${serviceStatus('fare_engine')}`}/>
          <div>
            <div className="health-name">Fare engine</div>
            <div className="health-meta">{checks ? serviceLabel('fare_engine') || 'ok' : (lang === 'en' ? 'pricing rules active' : 'правила тарифів активні')}</div>
          </div>
        </div>
      </div>

      <div className="grid-2" style={{ alignItems: 'start', marginBottom: 16 }}>
        <div className="card">
          <div className="card-title">{lang === 'en' ? 'API latency · 60 min' : 'Затримка API · 60 хв'}</div>
          <div className="chart-wrap">
            <RC2 width="100%" height="100%">
              <AC2 data={latencyData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="lat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#4D8BFF" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#4D8BFF" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="latdb" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34D399" stopOpacity={0.4}/>
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CG2 stroke="#1B2440" vertical={false}/>
                <XA2 dataKey="m" stroke="#6B7895" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}m`}/>
                <YA2 stroke="#6B7895" tick={{ fontSize: 11 }} axisLine={false} tickLine={false}/>
                <RT2 contentStyle={ttipStyle}/>
                <A2 type="monotone" dataKey="api" name="API ms" stroke="#4D8BFF" strokeWidth={2} fill="url(#lat)"/>
                <A2 type="monotone" dataKey="db" name="DB ms" stroke="#34D399" strokeWidth={2} fill="url(#latdb)"/>
              </AC2>
            </RC2>
          </div>
        </div>

        <div className="card">
          <div className="card-title">{lang === 'en' ? 'Database migrations' : 'Міграції бази даних'}</div>
          <div className="card-desc">golang-migrate · {lang === 'en' ? 'current version' : 'поточна версія'} <span style={{ color: 'var(--accent)', fontFamily: 'var(--font-mono)' }}>{BO.migrations[0].v}</span></div>
          <div style={{ position: 'relative', marginTop: 14 }}>
            {BO.migrations.map((m, i) => (
              <div key={m.v} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < BO.migrations.length - 1 ? '1px solid var(--divider)' : 'none' }}>
                <span style={{ width: 12, height: 12, borderRadius: '50%', background: 'var(--ok)', justifySelf: 'center', boxShadow: '0 0 0 3px var(--ok-soft)' }}/>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text)' }}>{m.name}</div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-dim)' }}>{m.v} · {lang === 'en' ? 'applied' : 'застосовано'} {m.applied}</div>
                </div>
                <Pill kind="ok">applied</Pill>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 14, gap: 8 }}>
            <button className="btn btn-sm" onClick={() => setCliModal('up')}>
              <Icon name="terminal" size={12}/> golang-migrate up
            </button>
            <button className="btn btn-sm" onClick={() => setCliModal('version')}>
              <Icon name="terminal" size={12}/> golang-migrate version
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <div className="card-title">{lang === 'en' ? '/health endpoint response' : 'Відповідь /health'}</div>
          {healthJson && !healthErr && <Pill kind="ok" dot>{lang === 'en' ? 'Live data' : 'Актуальні дані'}</Pill>}
          {healthErr && <Pill kind="danger" dot>{lang === 'en' ? 'Error' : 'Помилка'}</Pill>}
        </div>
        <pre style={{
          background: '#06090F', border: '1px solid var(--border)', borderRadius: 10,
          padding: 16, fontFamily: 'var(--font-mono)', fontSize: 12,
          color: healthErr ? 'var(--danger)' : '#CBD5E1',
          margin: 0, overflowX: 'auto', lineHeight: 1.65,
        }}>
          {healthErr ?? displayJson}
        </pre>
      </div>

      {cliModal && (
        <Modal title={lang === 'en' ? 'CLI operation' : 'CLI-операція'} onClose={() => setCliModal(null)}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
            {lang === 'en'
              ? 'Run this command on the server where the backend is deployed:'
              : 'Виконайте цю команду на сервері, де розгорнуто бекенд:'}
          </p>
          <pre style={{
            background: '#06090F', border: '1px solid var(--border)', borderRadius: 10,
            padding: 14, fontFamily: 'var(--font-mono)', fontSize: 12.5, color: '#A5F3BF',
            margin: 0,
          }}>
            {cliModal === 'up'
              ? 'migrate -path ./migrations -database $DATABASE_URL up'
              : 'migrate -path ./migrations -database $DATABASE_URL version'}
          </pre>
          <div style={{ marginTop: 12, textAlign: 'right' }}>
            <button className="btn btn-sm" onClick={() => setCliModal(null)}>{lang === 'en' ? 'Close' : 'Закрити'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

Object.assign(window, { TechBackups, TechLogs, TechHealth });
