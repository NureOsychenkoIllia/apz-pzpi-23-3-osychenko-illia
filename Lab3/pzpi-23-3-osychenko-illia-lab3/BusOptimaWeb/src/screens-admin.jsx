/* Business admin screens: Routes, Fleet, Users */
/* global React, API, BO */
const { useState: useS, useEffect: useE, useRef: useR, useMemo } = React;

const ROLE_ID = { dispatcher: 1, business_admin: 3, tech_admin: 4 };

// Backend Route: id, origin_city, destination_city, distance_km, base_price, is_active
function normRoute(r) {
  if ('from' in r && 'dailyTrips' in r) return r;
  return {
    id: `R-${r.id}`,
    _id: r.id,
    from: r.origin_city ?? r.from ?? '',
    to: r.destination_city ?? r.to ?? '',
    distance: r.distance_km ?? r.distance ?? 0,
    basePrice: r.base_price ?? r.basePrice ?? 0,
    dailyTrips: r.daily_trips ?? r.dailyTrips ?? 0,
    status: r.is_active === false ? 'paused' : (r.status ?? 'active'),
  };
}

// Backend Bus: id, registration_number, capacity, model, is_active
// (no year, mileage, or iot_device_id in Bus struct — those are in Device)
function normBus(b) {
  if ('plate' in b) return b;
  return {
    id: `B-${b.id}`,
    _id: b.id,
    plate: b.registration_number ?? '',
    model: b.model ?? '—',
    capacity: b.capacity ?? 50,
    fuel: b.fuel_consumption_per_100km ?? null,
    iot: b.iot_device_id ?? '—',
    status: b.is_active === false ? 'maintenance' : 'depot',
  };
}

// Backend User: id, email, full_name, role (object with name), is_active
function normUser(u) {
  if ('name' in u && 'lastLogin' in u) return u;
  const roleName = (typeof u.role === 'object' ? u.role?.name : u.role) ?? '';
  const n = roleName.toLowerCase();
  const mappedRole = n.includes('tech') ? 'tech_admin'
    : (n.includes('business') || n.includes('admin')) ? 'business_admin'
    : 'dispatcher';
  return {
    id: u.id,
    _id: u.id,
    _roleId: u.role_id ?? (typeof u.role === 'object' ? u.role?.id : null) ?? ROLE_ID[mappedRole] ?? 1,
    name: u.full_name ?? u.email ?? '—',
    email: u.email ?? '',
    role: mappedRole,
    lastLogin: u.updated_at ? new Date(u.updated_at).toLocaleDateString('uk-UA') : '—',
    status: u.is_active === false ? 'inactive' : 'active',
  };
}

function AdminRoutes({ lang }) {
  const [routes, setRoutes] = useS([]);
  const [editing, setEditing] = useS(null);
  const [query, setQuery] = useS('');
  const [loading, setLoading] = useS(true);
  const [error, setError] = useS('');
  const formRef = useR(null);

  const reload = () => {
    setLoading(true);
    setError('');
    return API.getRoutes()
      .then(raw => {
        const list = unwrapApiList(raw);
        setRoutes(list.map(normRoute));
      })
      .catch(e => {
        setRoutes([]);
        setError(e?.message || (lang === 'en' ? 'Failed to load routes' : 'Не вдалося завантажити маршрути'));
      })
      .finally(() => setLoading(false));
  };

  useE(() => { reload(); }, []);

  const handleSave = async () => {
    const f = formRef.current;
    if (!f) { setEditing(null); return; }
    const body = {
      origin_city: f.querySelector('[name=from]')?.value ?? '',
      destination_city: f.querySelector('[name=to]')?.value ?? '',
      distance_km: Number(f.querySelector('[name=distance]')?.value) || 0,
      base_price: Number(f.querySelector('[name=basePrice]')?.value) || 0,
      is_active: (f.querySelector('[name=status]')?.value ?? 'active') === 'active',
    };
    try {
      if (editing._id) await API.updateRoute(editing._id, body);
      else await API.createRoute(body);
      await reload();
    } catch (e) { console.error('Save route:', e); }
    setEditing(null);
  };

  const handleDelete = async (r) => {
    if (!r._id) return;
    try { await API.deleteRoute(r._id); setRoutes(p => p.filter(x => x.id !== r.id)); }
    catch (e) { console.error('Delete route:', e); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Routes' : 'Маршрути'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Manage routes, base prices and distances' : 'Керуйте маршрутами, базовою ціною та відстанями'}</p>
        </div>
        <div className="page-actions">
          <div className="search-wrap"><Icon name="search"/><input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder={lang === 'en' ? 'Search route...' : 'Пошук маршруту...'}/></div>
          <button className="btn btn-primary" onClick={() => setEditing({})}><Icon name="plus"/> {BO.t('cta.new', lang)}</button>
        </div>
      </div>

      {error && <InlineError message={error}/>}
      {loading && <InlineEmpty message={lang === 'en' ? 'Loading routes…' : 'Завантаження маршрутів…'}/>}
      {!loading && !error && routes.length === 0 && <InlineEmpty message={lang === 'en' ? 'Backend returned no routes' : 'Бекенд не повернув маршрути'}/>}

      {!loading && !error && <>
      <div className="kpi-grid">
        <Kpi label={lang === 'en' ? 'Total routes' : 'Маршрутів'} value={routes.length} delta={`${routes.filter(r => r.status === 'active').length} ${lang === 'en' ? 'active' : 'активних'}`} deltaDir="up"/>
        <Kpi label={lang === 'en' ? 'Daily trips' : 'Рейсів на день'} value={routes.reduce((s, r) => s + (r.dailyTrips || 0), 0)} delta="+3 WoW" deltaDir="up"/>
        <Kpi label={lang === 'en' ? 'Total distance' : 'Сумарна відстань'} value={`${routes.reduce((s, r) => s + (r.distance || 0), 0).toFixed(0)} км`}/>
        <Kpi label={lang === 'en' ? 'Avg base price' : 'Середня базова ціна'} value={routes.length ? fmtUAH(routes.reduce((s, r) => s + (r.basePrice || 0), 0) / routes.length) : '—'}/>
      </div>

      <div className="card">
        <div className="table-wrap" style={{ border: 'none' }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === 'en' ? 'From' : 'Звідки'}</th>
                <th>{lang === 'en' ? 'To' : 'Куди'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Distance' : 'Відстань'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Base price' : 'Базова ціна'}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Daily trips' : 'Рейсів/день'}</th>
                <th>{lang === 'en' ? 'Status' : 'Статус'}</th>
                <th style={{ width: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {routes.filter(r => {
                const q = query.trim().toLowerCase();
                return !q || r.from?.toLowerCase().includes(q) || r.to?.toLowerCase().includes(q) || String(r.id).includes(q);
              }).map(r => (
                <tr key={r.id}>
                  <td className="num" style={{ color: 'var(--text-muted)' }}>{r.id}</td>
                  <td><b>{BO.cityName(r.from, lang)}</b></td>
                  <td><b>{BO.cityName(r.to, lang)}</b></td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.distance} км</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.basePrice} ₴</td>
                  <td className="num" style={{ textAlign: 'right' }}>{r.dailyTrips || '—'}</td>
                  <td>
                    <Pill kind={r.status === 'active' ? 'ok' : 'warn'} dot>
                      {r.status === 'active' ? (lang === 'en' ? 'Active' : 'Активний') : (lang === 'en' ? 'Paused' : 'Призупинено')}
                    </Pill>
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => setEditing(r)}><Icon name="edit" size={13}/></button>
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => handleDelete(r)}><Icon name="trash" size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {editing !== null && (
        <Modal title={editing._id ? (lang === 'en' ? `Edit ${editing.id}` : `Редагувати ${editing.id}`) : (lang === 'en' ? 'New route' : 'Новий маршрут')} onClose={() => setEditing(null)} onSave={handleSave}>
          <div className="grid-2" ref={formRef}>
            <div className="field">
              <label className="label">{lang === 'en' ? 'From' : 'Звідки'}</label>
              <select name="from" className="select" defaultValue={editing.from || ''}>
                <option value="">{lang === 'en' ? '— select —' : '— оберіть —'}</option>
                {Object.entries(BO.cities).map(([k, c]) => <option key={k} value={lang === 'uk' ? c.name_uk : c.name_en}>{lang === 'uk' ? c.name_uk : c.name_en}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'To' : 'Куди'}</label>
              <select name="to" className="select" defaultValue={editing.to || ''}>
                <option value="">{lang === 'en' ? '— select —' : '— оберіть —'}</option>
                {Object.entries(BO.cities).map(([k, c]) => <option key={k} value={lang === 'uk' ? c.name_uk : c.name_en}>{lang === 'uk' ? c.name_uk : c.name_en}</option>)}
              </select>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Distance (km)' : 'Відстань (км)'}</label>
              <input name="distance" className="input" defaultValue={editing.distance || ''} placeholder="540"/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Base price (UAH)' : 'Базова ціна (₴)'}</label>
              <input name="basePrice" className="input" defaultValue={editing.basePrice || ''} placeholder="750"/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Status' : 'Статус'}</label>
              <select name="status" className="select" defaultValue={editing.status || 'active'}>
                <option value="active">{lang === 'en' ? 'Active' : 'Активний'}</option>
                <option value="paused">{lang === 'en' ? 'Paused' : 'Призупинено'}</option>
              </select>
            </div>
          </div>
          <div style={{ background: 'var(--info-soft)', color: 'var(--info)', padding: 10, borderRadius: 8, fontSize: 12, display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 12 }}>
            <Icon name="info-c"/>
            <span>{lang === 'en' ? 'Dynamic pricing factors apply on top of base price (range -30% to +50%).' : 'Динамічні коефіцієнти застосовуються до базової ціни (діапазон -30% до +50%).'}</span>
          </div>
        </Modal>
      )}
      </>}
    </div>
  );
}

function AdminFleet({ lang }) {
  const [tab, setTab] = useS('buses');
  const [buses, setBuses] = useS([]);
  const [editing, setEditing] = useS(null);
  const [saving, setSaving] = useS(false);
  const [err, setErr] = useS('');
  const [loading, setLoading] = useS(true);
  const formRef = useR(null);

  const reload = () => {
    setLoading(true);
    if (editing === null) setErr('');
    return API.getBuses().then(raw => {
      const list = unwrapApiList(raw);
      setBuses(list.map(normBus));
    }).catch(e => {
      setBuses([]);
      setErr(e?.message || (lang === 'en' ? 'Failed to load buses' : 'Не вдалося завантажити автобуси'));
    }).finally(() => setLoading(false));
  };

  useE(() => { reload(); }, []);

  const activeBuses = useMemo(() => buses.filter(b => b.status !== 'inactive'), [buses]);

  const handleSave = async () => {
    const f = formRef.current; if (!f) return;
    const plate    = f.querySelector('[name=plate]')?.value?.trim() ?? '';
    const model    = f.querySelector('[name=model]')?.value?.trim() ?? '';
    const capacity = Number(f.querySelector('[name=capacity]')?.value) || 0;
    const fuel     = Number(f.querySelector('[name=fuel]')?.value) || 0;
    const isActive = f.querySelector('[name=status]')?.value !== 'maintenance';
    if (!plate || !capacity) { setErr(lang === 'en' ? 'Plate and capacity are required' : 'Введіть номер та місткість'); return; }
    setSaving(true); setErr('');
    try {
      const body = { registration_number: plate, model, capacity, fuel_consumption_per_100km: fuel, is_active: isActive };
      if (editing._id) await API.updateBus(editing._id, body);
      else await API.createBus(body);
      await reload();
      setEditing(null);
    } catch (e) {
      setErr(e?.message || (lang === 'en' ? 'Server error' : 'Помилка сервера'));
    } finally { setSaving(false); }
  };

  const handleDelete = async (b) => {
    if (!confirm(lang === 'en' ? `Delete bus ${b.plate}?` : `Видалити автобус ${b.plate}?`)) return;
    try { await API.deleteBus(b._id); await reload(); } catch (e) { console.error(e); }
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Fleet & IoT devices' : 'Автопарк та IoT-пристрої'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Register buses and bind IoT counters' : 'Реєструйте автобуси та прив`язуйте IoT-лічильники'}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => { setEditing({}); setErr(''); }}>
            <Icon name="plus"/> {lang === 'en' ? 'Add bus' : 'Додати автобус'}
          </button>
        </div>
      </div>

      {err && editing === null && <InlineError message={err}/>}
      {loading && <InlineEmpty message={lang === 'en' ? 'Loading buses…' : 'Завантаження автобусів…'}/>}

      {!loading && <>
      <div className="tabs">
        <button className={tab === 'buses' ? 'active' : ''} onClick={() => setTab('buses')}>{lang === 'en' ? 'Buses' : 'Автобуси'} <span style={{ color: 'var(--text-dim)' }}>· {activeBuses.length}</span></button>
        <button className={tab === 'iot' ? 'active' : ''} onClick={() => setTab('iot')}>{lang === 'en' ? 'IoT devices' : 'IoT-пристрої'} <span style={{ color: 'var(--text-dim)' }}>· {activeBuses.filter(b => b.iot && b.iot !== '—').length}</span></button>
      </div>

      {tab === 'buses' && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === 'en' ? 'Plate / Reg.' : 'Номер'}</th>
                <th>{lang === 'en' ? 'Model' : 'Модель'}</th>
                <th style={{ textAlign: 'right' }}>{BO.t('capacity', lang)}</th>
                <th style={{ textAlign: 'right' }}>{lang === 'en' ? 'Fuel L/100km' : 'Паливо л/100'}</th>
                <th>{lang === 'en' ? 'Status' : 'Статус'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {activeBuses.map(b => (
                <tr key={b.id}>
                  <td className="num" style={{ color: 'var(--text-muted)' }}>{b.id}</td>
                  <td><b style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.04em' }}>{b.plate}</b></td>
                  <td>{b.model}</td>
                  <td className="num" style={{ textAlign: 'right' }}>{b.capacity}</td>
                  <td className="num" style={{ textAlign: 'right', color: 'var(--text-muted)' }}>{b.fuel ?? '—'}</td>
                  <td>
                    {b.status === 'on-trip'     && <Pill kind="ok"   dot>{lang === 'en' ? 'On trip'    : 'У рейсі'}</Pill>}
                    {b.status === 'depot'       && <Pill kind="info" dot>{lang === 'en' ? 'In depot'   : 'На стоянці'}</Pill>}
                    {b.status === 'maintenance' && <Pill kind="warn" dot>{lang === 'en' ? 'Maintenance' : 'ТО'}</Pill>}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="icon-btn" style={{ width: 28, height: 28 }} onClick={() => { setEditing(b); setErr(''); }}><Icon name="edit" size={13}/></button>
                      <button className="icon-btn" style={{ width: 28, height: 28, color: 'var(--danger)' }} onClick={() => handleDelete(b)}><Icon name="trash" size={13}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {tab === 'iot' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {activeBuses.filter(b => b.iot && b.iot !== '—').map(b => (
            <div key={b.id} className="card" style={{ padding: 16 }}>
              <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600, color: 'var(--accent)' }}>{b.iot}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{lang === 'en' ? 'bound to' : 'прив`язано до'} <b style={{ color: 'var(--text)' }}>{b.plate}</b></div>
                </div>
                <Pill kind="info" dot>IDLE</Pill>
              </div>
              <div className="row" style={{ marginTop: 10, gap: 6 }}>
                <button className="btn btn-sm grow"><Icon name="key" size={12}/> {lang === 'en' ? 'Rotate JWT' : 'Оновити JWT'}</button>
                <button className="btn btn-sm grow"><Icon name="refresh" size={12}/> {lang === 'en' ? 'Sync now' : 'Синхронізувати'}</button>
              </div>
            </div>
          ))}
          {activeBuses.filter(b => b.iot && b.iot !== '—').length === 0 && (
            <div style={{ color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
              {lang === 'en' ? 'No IoT devices bound yet.' : 'IoT-пристрої не прив`язані.'}
            </div>
          )}
        </div>
      )}

      {editing !== null && (
        <Modal
          title={editing._id ? (lang === 'en' ? `Edit ${editing.plate}` : `Редагувати ${editing.plate}`) : (lang === 'en' ? 'Add bus' : 'Додати автобус')}
          onClose={() => setEditing(null)} onSave={handleSave} saving={saving}
        >
          <div className="grid-2" ref={formRef}>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Plate / Reg. number' : 'Держ. номер'}</label>
              <input name="plate" className="input" defaultValue={editing.plate || ''} placeholder="AA1234BB" style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.06em' }}/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Model' : 'Модель'}</label>
              <input name="model" className="input" defaultValue={editing.model || ''} placeholder="Mercedes Sprinter"/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Capacity (seats)' : 'Місткість (місць)'}</label>
              <input name="capacity" type="number" min="1" max="200" className="input" defaultValue={editing.capacity || ''}  placeholder="50"/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Fuel consumption L/100km' : 'Паливо л/100км'}</label>
              <input name="fuel" type="number" step="0.1" className="input" defaultValue={editing.fuel || ''} placeholder="12.5"/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Status' : 'Статус'}</label>
              <select name="status" className="select" defaultValue={editing.status === 'maintenance' ? 'maintenance' : 'active'}>
                <option value="active">{lang === 'en' ? 'Active (depot)' : 'Активний (стоянка)'}</option>
                <option value="maintenance">{lang === 'en' ? 'Maintenance' : 'Технічне обслуговування'}</option>
              </select>
            </div>
            {err && <div style={{ gridColumn: '1/-1', color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
          </div>
        </Modal>
      )}
      </>}
    </div>
  );
}

function genPassword() {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function AdminUsers({ lang }) {
  const [users, setUsers] = useS([]);
  const [editing, setEditing] = useS(null);        // null=closed, {}=create, user=edit
  const [editRole, setEditRole] = useS('dispatcher');
  const [pwdModal, setPwdModal] = useS(null);       // { userId, generated }
  const [filter, setFilter] = useS('all');
  const [query, setQuery] = useS('');
  const [saving, setSaving] = useS(false);
  const [err, setErr] = useS('');
  const [loading, setLoading] = useS(true);
  const formRef = useR(null);

  const reload = () => {
    setLoading(true);
    if (editing === null) setErr('');
    return API.getUsers().then(raw => {
      const list = unwrapApiList(raw);
      setUsers(list.map(normUser));
    }).catch(e => {
      setUsers([]);
      setErr(e?.message || (lang === 'en' ? 'Failed to load users' : 'Не вдалося завантажити користувачів'));
    }).finally(() => setLoading(false));
  };

  useE(() => { reload(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const active = users.filter(u => u.status !== 'inactive');
    const byRole = filter === 'all' ? active : active.filter(u => u.role === filter);
    return q ? byRole.filter(u => u.name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q)) : byRole;
  }, [users, filter, query]);

  const openCreate = () => { setEditing({}); setEditRole('dispatcher'); setErr(''); };
  const openEdit   = (u) => { setEditing(u); setEditRole(u.role || 'dispatcher'); setErr(''); };

  const handleSave = async () => {
    const f = formRef.current; if (!f) return;
    const fullName = f.querySelector('[name=name]')?.value?.trim() ?? '';
    const email    = f.querySelector('[name=email]')?.value?.trim() ?? '';
    if (!fullName || !email) { setErr(lang === 'en' ? 'Name and email are required' : "Введіть ім'я та email"); return; }
    setSaving(true); setErr('');
    try {
      if (editing._id) {
        const roleId = ROLE_ID[editRole] ?? editing._roleId ?? 1;
        await API.updateUser(editing._id, { full_name: fullName, email, role_id: roleId });
        if (editRole !== editing.role) {
          await API.updateUserRole(editing._id, roleId);
        }
      } else {
        const pwd = genPassword();
        await API.createUser({ full_name: fullName, email, password: pwd, role_id: ROLE_ID[editRole] ?? 1 });
        setEditing(null);
        setPwdModal({ email, generated: pwd });
        await reload();
        return;
      }
      await reload();
      setEditing(null);
    } catch (e) {
      setErr(e?.message || (lang === 'en' ? 'Server error' : 'Помилка сервера'));
    } finally { setSaving(false); }
  };

  const handleDeactivate = async (u) => {
    if (!confirm(lang === 'en' ? `Deactivate ${u.name}?` : `Деактивувати ${u.name}?`)) return;
    try {
      await API.updateUser(u._id, { full_name: u.name, email: u.email, role_id: u._roleId ?? 1, is_active: false });
      await reload();
    } catch (e) { console.error(e); }
  };

  const handleResetPwd = (u) => {
    const pwd = genPassword();
    if (!confirm(lang === 'en' ? `Reset password for ${u.name}? New password will be shown once.` : `Скинути пароль для ${u.name}? Новий пароль буде показано один раз.`)) return;
    API.updateUser(u._id, { full_name: u.name, email: u.email, role_id: u._roleId ?? 1, password: pwd })
      .then(() => setPwdModal({ email: u.email, generated: pwd }))
      .catch(e => console.error(e));
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === 'en' ? 'Users' : 'Користувачі'}</h1>
          <p className="page-subtitle">{lang === 'en' ? 'Manage accounts, assign roles, reset passwords' : 'Облікові записи, ролі та скидання паролів'}</p>
        </div>
        <div className="page-actions">
          <div className="search-wrap"><Icon name="search"/><input className="input" value={query} onChange={e => setQuery(e.target.value)} placeholder={lang === 'en' ? 'Search by name or email...' : 'Пошук за іменем або поштою...'}/></div>
          <button className="btn btn-primary" onClick={openCreate}><Icon name="plus"/> {lang === 'en' ? 'Create user' : 'Створити'}</button>
        </div>
      </div>

      {err && editing === null && <InlineError message={err}/>}
      {loading && <InlineEmpty message={lang === 'en' ? 'Loading users…' : 'Завантаження користувачів…'}/>}

      {!loading && <>
      <div className="kpi-grid">
        <Kpi label={lang === 'en' ? 'Total users' : 'Користувачів'} value={users.length}/>
        <Kpi label={lang === 'en' ? 'Active' : 'Активних'} value={users.filter(u => u.status === 'active').length} spark={[4,5,5,6,6,6]} sparkColor="var(--ok)"/>
        <Kpi label={lang === 'en' ? 'Dispatchers' : 'Диспетчерів'} value={users.filter(u => u.role === 'dispatcher').length}/>
        <Kpi label={lang === 'en' ? 'Admins' : 'Адмінів'} value={users.filter(u => u.role !== 'dispatcher').length}/>
      </div>

      <div className="row" style={{ gap: 8, marginBottom: 12 }}>
        <div className="layout-toggle">
          {[['all', lang === 'en' ? 'All' : 'Усі'], ['dispatcher', BO.roles.dispatcher[lang]], ['business_admin', BO.roles.business_admin[lang]], ['tech_admin', BO.roles.tech_admin[lang]]].map(([v, l]) => (
            <button key={v} className={filter === v ? 'active' : ''} onClick={() => setFilter(v)}>{l}</button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>{lang === 'en' ? 'User' : 'Користувач'}</th>
              <th>{lang === 'en' ? 'Email' : 'Пошта'}</th>
              <th>{lang === 'en' ? 'Role' : 'Роль'}</th>
              <th>{lang === 'en' ? 'Last login' : 'Останній вхід'}</th>
              <th>{lang === 'en' ? 'Status' : 'Статус'}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => (
              <tr key={u.id}>
                <td>
                  <div className="row" style={{ gap: 10 }}>
                    <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>
                      {(u.name || '?').split(' ').map(s => s[0]).slice(0, 2).join('')}
                    </div>
                    <b>{u.name}</b>
                  </div>
                </td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                <td>
                  <Pill kind={u.role === 'dispatcher' ? 'accent' : u.role === 'business_admin' ? 'violet' : 'info'}>
                    {BO.roles[u.role]?.[lang] ?? u.role}
                  </Pill>
                </td>
                <td style={{ color: 'var(--text-muted)' }}>{u.lastLogin}</td>
                <td>
                  <Pill kind={u.status === 'active' ? 'ok' : 'warn'} dot>
                    {u.status === 'active' ? (lang === 'en' ? 'Active' : 'Активний') : (lang === 'en' ? 'Inactive' : 'Неактивний')}
                  </Pill>
                </td>
                <td>
                  <div className="row-actions">
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title={lang === 'en' ? 'Edit' : 'Редагувати'} onClick={() => openEdit(u)}><Icon name="edit" size={13}/></button>
                    <button className="icon-btn" style={{ width: 28, height: 28 }} title={lang === 'en' ? 'Reset password' : 'Скинути пароль'} onClick={() => handleResetPwd(u)}><Icon name="key" size={13}/></button>
                    <button className="icon-btn" style={{ width: 28, height: 28, color: u.status === 'active' ? 'var(--danger)' : 'var(--text-dim)' }} title={lang === 'en' ? 'Deactivate' : 'Деактивувати'} onClick={() => handleDeactivate(u)}><Icon name="trash" size={13}/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>}

      {/* Create / Edit modal */}
      {editing !== null && (
        <Modal
          title={editing._id ? (lang === 'en' ? 'Edit user' : 'Редагування') : (lang === 'en' ? 'Create user' : 'Створити користувача')}
          onClose={() => setEditing(null)}
          onSave={handleSave}
          saving={saving}
        >
          <div className="grid-2" ref={formRef}>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Full name' : "Повне ім'я"}</label>
              <input name="name" className="input" defaultValue={editing.name || ''} placeholder="Олена Кравець"/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Email' : 'Електронна пошта'}</label>
              <input name="email" className="input" defaultValue={editing.email || ''} placeholder="user@busoptima.ua"/>
            </div>
            <div className="field" style={{ gridColumn: '1 / -1' }}>
              <label className="label">{lang === 'en' ? 'Role' : 'Роль'}</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                {Object.entries(BO.roles).map(([k, r]) => (
                  <div key={k} onClick={() => setEditRole(k)} style={{
                    border: '1px solid', borderRadius: 10, padding: 12, cursor: 'pointer',
                    background: editRole === k ? 'var(--accent-soft)' : 'var(--surface-2)',
                    borderColor: editRole === k ? 'var(--accent)' : 'var(--border)',
                  }}>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>{r[lang]}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {k === 'dispatcher' && (lang === 'en' ? 'Monitoring & reports' : 'Моніторинг та звіти')}
                      {k === 'business_admin' && (lang === 'en' ? 'Full settings access' : 'Повний доступ')}
                      {k === 'tech_admin' && (lang === 'en' ? 'DB backups, no PII' : 'Бекапи, без PII')}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {err && <div style={{ gridColumn: '1/-1', color: 'var(--danger)', fontSize: 13 }}>{err}</div>}
          </div>
        </Modal>
      )}

      {/* Generated password display */}
      {pwdModal && (
        <Modal title={lang === 'en' ? 'Password generated' : 'Пароль згенеровано'} onClose={() => setPwdModal(null)} onSave={() => setPwdModal(null)}>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 12 }}>
            {lang === 'en' ? `Account created for ${pwdModal.email}. Copy the password — it won't be shown again.` : `Акаунт створено для ${pwdModal.email}. Скопіюйте пароль — він більше не відображатиметься.`}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{
              flex: 1, padding: '10px 14px', background: 'var(--surface-3)',
              borderRadius: 8, fontFamily: 'var(--font-mono)', fontSize: 16,
              letterSpacing: 2, color: 'var(--accent)', border: '1px solid var(--border)',
            }}>{pwdModal.generated}</code>
            <button className="btn" onClick={() => navigator.clipboard?.writeText(pwdModal.generated)}>
              <Icon name="copy" size={14}/>
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Generic modal — onSave overrides Save button behaviour
function Modal({ title, onClose, onSave, saving, children }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="icon-btn" onClick={onClose}><Icon name="x"/></button>
        </div>
        <div className="modal-body">{children}</div>
        <div className="modal-footer">
          <button className="btn" onClick={onClose}>Cancel / Скасувати</button>
          <button className="btn btn-primary" onClick={onSave ?? onClose} disabled={saving} style={{ opacity: saving ? 0.7 : 1 }}>
            <Icon name={saving ? 'loader' : 'check'}/> {saving ? '…' : 'Save / Зберегти'}
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, { AdminRoutes, AdminFleet, AdminUsers, Modal });
