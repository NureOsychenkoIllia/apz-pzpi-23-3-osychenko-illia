/* AdminSettings and TechAudit screens */
/* global React, Recharts, API */
const { useState: useSX, useEffect: useEX } = React;

// ─── AdminSettings ────────────────────────────────────────────────────────────
function AdminSettings({ lang }) {
  const [settings, setSettings] = useSX(null);
  const [loading, setLoading] = useSX(true);
  const [saving, setSaving] = useSX(false);
  const [saved, setSaved] = useSX(false);
  const [error, setError] = useSX('');
  const [form, setForm] = useSX({
    fuel_price_per_liter: 50,
    peak_hours_coefficient: 1.2,
    weekend_coefficient: 1.15,
    high_demand_threshold: 85,
    low_demand_threshold: 30,
    price_min_coefficient: 0.7,
    price_max_coefficient: 1.5,
    seasonal_coefficients: { spring: 1.0, summer: 1.2, autumn: 1.1, winter: 0.9 },
  });

  useEX(() => {
    API.getSettings()
      .then(data => {
        setSettings(data);
        setForm({
          fuel_price_per_liter: data.fuel_price_per_liter,
          peak_hours_coefficient: data.peak_hours_coefficient,
          weekend_coefficient: data.weekend_coefficient,
          high_demand_threshold: data.high_demand_threshold,
          low_demand_threshold: data.low_demand_threshold,
          price_min_coefficient: data.price_min_coefficient,
          price_max_coefficient: data.price_max_coefficient,
          seasonal_coefficients: data.seasonal_coefficients || { spring: 1.0, summer: 1.2, autumn: 1.1, winter: 0.9 },
        });
      })
      .catch((e) => setError(e?.message || (lang === 'en' ? 'Failed to load settings' : 'Не вдалося завантажити налаштування')))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true); setError(''); setSaved(false);
    try {
      await API.updateSettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await API.exportSettings();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = 'busoptima_settings.json'; a.click();
      URL.revokeObjectURL(url);
    } catch (e) { setError(e.message); }
  };

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result);
        await API.importSettings(data);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } catch (err) { setError(err.message); }
    };
    reader.readAsText(file);
  };

  const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setSeason = (k, v) => setForm(f => ({ ...f, seasonal_coefficients: { ...f.seasonal_coefficients, [k]: parseFloat(v) } }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'System settings' : 'Системні налаштування'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Dynamic pricing parameters and coefficients' : 'Параметри динамічного ціноутворення та коефіцієнти'}</p>
        </div>
        <div className="page-actions">
          <label className="btn" style={{ cursor: 'pointer' }}>
            <Icon name="upload"/> {lang === 'en' ? 'Import' : 'Імпорт'}
            <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile}/>
          </label>
          <button className="btn" onClick={handleExport}><Icon name="download"/> {lang === 'en' ? 'Export' : 'Експорт'}</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            <Icon name="check"/> {saving ? (lang === 'en' ? 'Saving…' : 'Збереження…') : (lang === 'en' ? 'Save' : 'Зберегти')}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger severity" style={{ marginBottom: 16 }}>
          <div className="alert-icon"><Icon name="alert"/></div>
          <div className="alert-body"><div className="alert-title">{error}</div></div>
        </div>
      )}

      {saved && (
        <div className="alert alert-ok severity" style={{ marginBottom: 16 }}>
          <div className="alert-icon"><Icon name="check-c"/></div>
          <div className="alert-body"><div className="alert-title">{lang === 'en' ? 'Settings saved successfully' : 'Налаштування збережено'}</div></div>
        </div>
      )}

      <div className="grid-2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="card-title">{lang === 'en' ? 'Pricing parameters' : 'Параметри ціноутворення'}</div>
          <div className="card-desc">{lang === 'en' ? 'Core values for dynamic fare calculation' : 'Основні значення для розрахунку динамічної ціни'}</div>

          <div className="grid-2" style={{ marginTop: 14 }}>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Fuel price (₴/l)' : 'Ціна пального (₴/л)'}</label>
              <input className="input" type="number" step="0.5" value={form.fuel_price_per_liter}
                onChange={e => setF('fuel_price_per_liter', parseFloat(e.target.value))}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Peak hours coefficient' : 'Коеф. піку'}</label>
              <input className="input" type="number" step="0.01" value={form.peak_hours_coefficient}
                onChange={e => setF('peak_hours_coefficient', parseFloat(e.target.value))}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Weekend coefficient' : 'Коеф. вихідного'}</label>
              <input className="input" type="number" step="0.01" value={form.weekend_coefficient}
                onChange={e => setF('weekend_coefficient', parseFloat(e.target.value))}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'High demand threshold (%)' : 'Поріг високого попиту (%)'}</label>
              <input className="input" type="number" step="1" min="0" max="100" value={form.high_demand_threshold}
                onChange={e => setF('high_demand_threshold', parseInt(e.target.value))}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Low demand threshold (%)' : 'Поріг низького попиту (%)'}</label>
              <input className="input" type="number" step="1" min="0" max="100" value={form.low_demand_threshold}
                onChange={e => setF('low_demand_threshold', parseInt(e.target.value))}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Min price coefficient' : 'Мін. коеф. ціни'}</label>
              <input className="input" type="number" step="0.01" value={form.price_min_coefficient}
                onChange={e => setF('price_min_coefficient', parseFloat(e.target.value))}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Max price coefficient' : 'Макс. коеф. ціни'}</label>
              <input className="input" type="number" step="0.01" value={form.price_max_coefficient}
                onChange={e => setF('price_max_coefficient', parseFloat(e.target.value))}/>
            </div>
          </div>
        </div>

        <div className="col" style={{ gap: 14 }}>
          <div className="card">
            <div className="card-title">{lang === 'en' ? 'Seasonal coefficients' : 'Сезонні коефіцієнти'}</div>
            <div className="card-desc">{lang === 'en' ? 'Applied on top of base price per season' : 'Застосовуються поверх базової ціни залежно від сезону'}</div>
            <div className="grid-2" style={{ marginTop: 14 }}>
              {Object.entries(form.seasonal_coefficients).map(([season, val]) => (
                <div className="field" key={season}>
                  <label className="label">{
                    lang === 'en'
                      ? season.charAt(0).toUpperCase() + season.slice(1)
                      : { spring: 'Весна', summer: 'Літо', autumn: 'Осінь', winter: 'Зима' }[season]
                  }</label>
                  <input className="input" type="number" step="0.01" value={val}
                    onChange={e => setSeason(season, e.target.value)}/>
                </div>
              ))}
            </div>
          </div>

          <div className="card">
            <div className="card-title">{lang === 'en' ? 'Backup & restore settings' : 'Резервне копіювання налаштувань'}</div>
            <div className="card-desc">{lang === 'en' ? 'Export current settings as JSON or import from a backup file' : 'Збережіть поточні налаштування у JSON або відновіть з файлу'}</div>
            <div className="col" style={{ gap: 10, marginTop: 14 }}>
              <button className="btn" style={{ justifyContent: 'center' }} onClick={handleExport}>
                <Icon name="download"/> {lang === 'en' ? 'Export settings to JSON' : 'Експортувати налаштування у JSON'}
              </button>
              <label className="btn" style={{ justifyContent: 'center', cursor: 'pointer' }}>
                <Icon name="upload"/> {lang === 'en' ? 'Import settings from JSON' : 'Імпортувати налаштування з JSON'}
                <input type="file" accept=".json" style={{ display: 'none' }} onChange={handleImportFile}/>
              </label>
            </div>
          </div>

          {settings && settings.updated_by_user && (
            <div className="card">
              <div className="card-title">{lang === 'en' ? 'Last modified' : 'Остання зміна'}</div>
              <div className="stat-list">
                <div className="stat-row">
                  <span className="lbl">{lang === 'en' ? 'By' : 'Ким'}</span>
                  <span className="val">{settings.updated_by_user.full_name}</span>
                </div>
                <div className="stat-row">
                  <span className="lbl">{lang === 'en' ? 'When' : 'Коли'}</span>
                  <span className="val">{new Date(settings.updated_at).toLocaleString(lang === 'en' ? 'en-GB' : 'uk-UA')}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TechAudit ────────────────────────────────────────────────────────────────
function TechAudit({ lang }) {
  const [logs, setLogs] = useSX([]);
  const [loading, setLoading] = useSX(true);
  const [page, setPage] = useSX(1);
  const [total, setTotal] = useSX(0);
  const [action, setAction] = useSX('');
  const [error, setError] = useSX('');

  const LIMIT = 20;

  const loadLogs = async (p = page, act = action) => {
    setLoading(true);
    setError('');
    try {
      const params = { page: p, limit: LIMIT };
      if (act) params.action = act;
      const data = await API.getAuditLogs(params);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e) {
      setLogs([]);
      setTotal(0);
      setError(e?.message || (lang === 'en' ? 'Failed to load audit log' : 'Не вдалося завантажити журнал аудиту'));
    } finally {
      setLoading(false);
    }
  };

  useEX(() => { loadLogs(); }, []);

  const actionColor = (a) => {
    if (a === 'DELETE') return 'danger';
    if (a === 'CREATE') return 'ok';
    return 'accent';
  };

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Audit log' : 'Журнал аудиту'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'All data-modifying operations with timestamps and IPs' : 'Усі операції зміни даних з мітками часу та IP-адресами'}</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => loadLogs(1)}><Icon name="refresh"/> {lang === 'en' ? 'Refresh' : 'Оновити'}</button>
        </div>
      </div>

      {error && <InlineError message={error}/>}

      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <div className="layout-toggle">
          {[['', lang === 'en' ? 'All' : 'Усі'], ['CREATE', 'CREATE'], ['UPDATE', 'UPDATE'], ['DELETE', 'DELETE']].map(([v, l]) => (
            <button key={v} className={action === v ? 'active' : ''} onClick={() => { setAction(v); loadLogs(1, v); }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty">{lang === 'en' ? 'Loading…' : 'Завантаження…'}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === 'en' ? 'Action' : 'Дія'}</th>
                <th>{lang === 'en' ? 'Entity' : 'Об’єкт'}</th>
                <th>{lang === 'en' ? 'Entity ID' : 'ID об’єкта'}</th>
                <th>{lang === 'en' ? 'User ID' : 'Користувач'}</th>
                <th>{lang === 'en' ? 'IP' : 'IP'}</th>
                <th>{lang === 'en' ? 'Time' : 'Час'}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td className="num" style={{ color: 'var(--text-muted)' }}>{l.id}</td>
                  <td><Pill kind={actionColor(l.action)}>{l.action}</Pill></td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{l.entity_type}</td>
                  <td className="num" style={{ color: 'var(--text-muted)' }}>{l.entity_id}</td>
                  <td className="num">{l.user_id}</td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11.5, color: 'var(--text-muted)' }}>{l.ip_address}</td>
                  <td className="num" style={{ color: 'var(--text-muted)', fontSize: 11.5 }}>
                    {new Date(l.created_at).toLocaleString(lang === 'en' ? 'en-GB' : 'uk-UA')}
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr><td colSpan={7} className="empty">{lang === 'en' ? 'No records' : 'Записів немає'}</td></tr>
              )}
            </tbody>
          </table>
        )}
        {total > LIMIT && (
          <div className="row" style={{ justifyContent: 'space-between', padding: '12px 16px', borderTop: '1px solid var(--divider)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              {lang === 'en' ? `${total} total · page ${page} of ${totalPages}` : `Всього ${total} · сторінка ${page} з ${totalPages}`}
            </div>
            <div className="row" style={{ gap: 8 }}>
              <button className="btn btn-sm" disabled={page <= 1} onClick={() => { const p = page - 1; setPage(p); loadLogs(p); }}>
                <Icon name="chevron-left" size={13}/>
              </button>
              <button className="btn btn-sm" disabled={page >= totalPages} onClick={() => { const p = page + 1; setPage(p); loadLogs(p); }}>
                <Icon name="chevron-right" size={13}/>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

Object.assign(window, { AdminSettings, TechAudit });
