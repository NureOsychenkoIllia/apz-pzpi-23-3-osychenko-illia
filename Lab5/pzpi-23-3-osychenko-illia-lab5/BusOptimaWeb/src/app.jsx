/* BusOptima app shell — sidebar, topbar, role switch, routing, tweaks */
/* global React, ReactDOM, useTweaks, TweaksPanel, TweakRadio, TweakColor, TweakSelect, TweakToggle, TweakSection, API */
const { useState: uS, useEffect: uE, useRef: uR, useMemo: uM } = React;

const TWEAK_DEFAULTS = {
  "role": "dispatcher",
  "lang": "uk",
  "density": "comfortable",
  "liveLayout": "map",
  "accent": "#4D8BFF"
};

const NAV = {
  dispatcher: [
    { id: 'live',      label: 'nav.live',      icon: 'map',      badge: 2 },
    { id: 'forecast',  label: 'nav.forecast',  icon: 'trend' },
    { id: 'profit',    label: 'nav.profit',    icon: 'coins' },
    { id: 'reports',   label: 'nav.reports',   icon: 'file' },
  ],
  business_admin: [
    { id: 'routes',    label: 'nav.routes',    icon: 'route' },
    { id: 'fleet',     label: 'nav.fleet',     icon: 'truck' },
    { id: 'users',     label: 'nav.users',     icon: 'users' },
    { id: 'settings',  label: 'nav.settings',  icon: 'settings' },
  ],
  tech_admin: [
    { id: 'backups',   label: 'nav.backups',   icon: 'database' },
    { id: 'logs',      label: 'nav.logs',      icon: 'terminal' },
    { id: 'health',    label: 'nav.health',    icon: 'heart-pulse' },
    { id: 'audit',     label: 'nav.audit',     icon: 'activity' },
  ],
};

const DEFAULT_PAGE = {
  dispatcher: 'live',
  business_admin: 'routes',
  tech_admin: 'backups',
};

const ROLE_OPTIONS = [
  { id: 'dispatcher',     icon: 'activity' },
  { id: 'business_admin', icon: 'shield' },
  { id: 'tech_admin',     icon: 'terminal' },
];

const ROLE_META = {
  dispatcher: {
    sectionTitle: 'sec.operations',
    pages: {
      live: (lang, tweaks, setTweak) => <DispatcherLive lang={lang} layout={tweaks.liveLayout || 'map'} onLayoutChange={(v) => setTweak('liveLayout', v)}/>,
      forecast: (lang) => <DispatcherForecast lang={lang}/>,
      profit: (lang) => <DispatcherProfit lang={lang}/>,
      reports: (lang) => <DispatcherReports lang={lang}/>,
    },
  },
  business_admin: {
    sectionTitle: 'sec.admin',
    pages: {
      routes: (lang) => <AdminRoutes lang={lang}/>,
      fleet: (lang) => <AdminFleet lang={lang}/>,
      users: (lang) => <AdminUsers lang={lang}/>,
      settings: (lang) => <AdminSettings lang={lang}/>,
    },
  },
  tech_admin: {
    sectionTitle: 'sec.tech',
    pages: {
      backups: (lang) => <TechBackups lang={lang}/>,
      logs: (lang) => <TechLogs lang={lang}/>,
      health: (lang) => <TechHealth lang={lang}/>,
      audit: (lang) => <TechAudit lang={lang}/>,
    },
  },
};

// ─── Login screen ────────────────────────────────────────────────────────────
function LoginScreen({ lang, onLogin }) {
  const [email, setEmail] = uS('');
  const [password, setPassword] = uS('');
  const [error, setError] = uS('');
  const [loading, setLoading] = uS(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await API.login(email, password);
      onLogin(data.user);
    } catch (err) {
      setError(err.message || (lang === 'en' ? 'Login failed' : 'Помилка входу'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)',
      backgroundImage: 'radial-gradient(1200px 600px at 80% -10%, rgba(77,139,255,0.07), transparent 60%), radial-gradient(900px 500px at -10% 100%, rgba(167,139,250,0.05), transparent 60%)',
    }}>
      <div style={{ width: 400 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'linear-gradient(135deg, var(--accent), var(--violet))',
            display: 'inline-grid', placeItems: 'center',
            boxShadow: '0 8px 28px rgba(77,139,255,0.4)',
            marginBottom: 16,
          }}>
            <Icon name="bus" size={28}/>
          </div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>BusOptima</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 13.5, marginTop: 6 }}>
            {lang === 'en' ? 'Operations Console' : 'Операційна консоль'}
          </div>
        </div>

        <form onSubmit={submit}>
          <div className="card">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
              {lang === 'en' ? 'Sign in to your account' : 'Увійдіть до облікового запису'}
            </div>

            {error && (
              <div className="alert alert-danger severity" style={{ marginBottom: 14 }}>
                <div className="alert-icon"><Icon name="alert"/></div>
                <div className="alert-body"><div className="alert-title">{error}</div></div>
              </div>
            )}

            <div className="field">
              <label className="label">{lang === 'en' ? 'Email' : 'Електронна пошта'}</label>
              <input className="input" type="email" placeholder="user@busoptima.ua" value={email} onChange={e => setEmail(e.target.value)} required/>
            </div>
            <div className="field">
              <label className="label">{lang === 'en' ? 'Password' : 'Пароль'}</label>
              <input className="input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required/>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%', height: 42, justifyContent: 'center', marginTop: 4 }} disabled={loading}>
              {loading ? (lang === 'en' ? 'Signing in…' : 'Вхід…') : (lang === 'en' ? 'Sign in' : 'Увійти')}
            </button>

            <div style={{ marginTop: 16, padding: 12, background: 'var(--surface-2)', borderRadius: 8, fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              <div style={{ marginBottom: 4, fontWeight: 600 }}>{lang === 'en' ? 'Demo accounts:' : 'Тестові облікові записи:'}</div>
              <div>dispatcher@busoptima.ua / password</div>
              <div>admin@busoptima.ua / password</div>
              <div>tech@busoptima.ua / password</div>
            </div>
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: 20, fontSize: 12, color: 'var(--text-dim)' }}>
          © 2026 BusOptima · v1.4.2
        </div>
      </div>
    </div>
  );
}

// ─── Main app ─────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [page, setPage] = uS(DEFAULT_PAGE[t.role] || 'live');
  const [notifOpen, setNotifOpen] = uS(false);
  const [authUser, setAuthUser] = uS(API.getUser());
  const [searchOpen, setSearchOpen] = uS(false);
  const [searchQuery, setSearchQuery] = uS('');
  const searchRef = uR(null);

  // On mount: if already logged in, sync role from stored JWT user
  uE(() => {
    const roleFromToken = API.getUserRole();
    if (roleFromToken) setTweak('role', roleFromToken);
  }, []);

  uE(() => {
    const onUnauthorized = () => setAuthUser(null);
    window.addEventListener('bo:unauthorized', onUnauthorized);
    return () => window.removeEventListener('bo:unauthorized', onUnauthorized);
  }, []);

  // When role changes, jump to that role's default page
  uE(() => { setPage(DEFAULT_PAGE[t.role] || 'live'); }, [t.role]);

  // Persist accent override via CSS variable
  uE(() => {
    if (t.accent) document.documentElement.style.setProperty('--accent', t.accent);
  }, [t.accent]);

  uE(() => {
    document.documentElement.setAttribute('data-density', t.density || 'comfortable');
  }, [t.density]);

  const lang = t.lang || 'uk';
  const role = t.role || 'dispatcher';
  const currentRoleMeta = ROLE_META[role] || ROLE_META.dispatcher;

  const openSearch = () => { setSearchQuery(''); setSearchOpen(true); setTimeout(() => searchRef.current?.focus(), 50); };
  const closeSearch = () => setSearchOpen(false);

  uE(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') { e.preventDefault(); openSearch(); }
      if (e.key === 'Escape') closeSearch();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const searchResults = uM(() => {
    const items = NAV[role] || [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return items;
    return items.filter(item =>
      BO.t(item.label, lang).toLowerCase().includes(q) ||
      item.id.includes(q)
    );
  }, [searchQuery, role, lang]);

  // Show login if not authenticated — early return AFTER all hooks
  if (!authUser) {
    return <LoginScreen lang={lang} onLogin={(user) => {
      setAuthUser(user);
      const mappedRole = API.getUserRole() || 'dispatcher';
      setTweak('role', mappedRole);
    }}/>;
  }

  const nav = NAV[role] || [];
  const pageEl = currentRoleMeta.pages[page]?.(lang, t, setTweak) || null;

  const displayUser = authUser || BO.users.find(u => u.role === role) || BO.users[0];
  const displayName = authUser ? (authUser.full_name || authUser.email) : displayUser.name;
  const initials = displayName.split(' ').map(s => s[0]).slice(0, 2).join('');

  const handleLogout = () => {
    API.logout();
    setAuthUser(null);
  };

  return (
    <>
      <div className="app">
        {/* Topbar */}
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark">
              <Icon name="bus" size={18}/>
            </div>
            <span>BusOptima</span>
            <span style={{ fontSize: 11, color: 'var(--text-dim)', fontWeight: 500, marginLeft: 6, padding: '2px 7px', border: '1px solid var(--border)', borderRadius: 999, fontFamily: 'var(--font-mono)' }}>v1.4.2</span>
          </div>

          <div className="topbar-spacer"/>

          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 14px', borderRadius: 999,
            background: 'var(--surface-2)', border: '1px solid var(--border)',
            fontSize: 13, fontWeight: 600, color: 'var(--text)',
          }}>
            <Icon name={ROLE_OPTIONS.find(r => r.id === role)?.icon || 'activity'} size={14}/>
            <span>{BO.roles[role]?.[lang] ?? role}</span>
          </div>

          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setTweak('lang', lang === 'uk' ? 'en' : 'uk')} title={lang === 'uk' ? 'Switch to English' : 'Перейти на українську'}>
              <Icon name="globe"/>
              <span style={{
                position: 'absolute', bottom: 1, right: 2,
                fontSize: 8, fontFamily: 'var(--font-mono)',
                color: 'var(--text)', background: 'var(--surface-3)',
                padding: '1px 3px', borderRadius: 3, lineHeight: 1, fontWeight: 700,
              }}>{lang.toUpperCase()}</span>
            </button>
            <button className="icon-btn" onClick={() => setNotifOpen(o => !o)}>
              <Icon name="bell"/>
              <span className="dot"/>
            </button>
            <button className="user-chip" onClick={handleLogout} title={lang === 'en' ? 'Sign out' : 'Вийти'}>
              <div className="avatar">{initials}</div>
              <div>
                <div className="name">{displayName}</div>
                <div className="role">{BO.roles[role][lang]}</div>
              </div>
              <Icon name="logout" size={13} style={{ color: 'var(--text-dim)', marginLeft: 4 }}/>
            </button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="sidebar">
          <div className="nav-section">
            <div className="nav-section-title">{BO.t(currentRoleMeta.sectionTitle, lang)}</div>
            {nav.map(item => (
              <div key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} onClick={() => setPage(item.id)}>
                <Icon name={item.icon}/>
                <span>{BO.t(item.label, lang)}</span>
                {item.badge && <span className="badge-num">{item.badge}</span>}
              </div>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">{lang === 'en' ? 'Quick' : 'Швидко'}</div>
            <div className="nav-item" onClick={openSearch}><Icon name="search"/><span>{lang === 'en' ? 'Search' : 'Пошук'}</span><span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}>⌘K</span></div>
            <div className="nav-item" onClick={handleLogout}><Icon name="logout"/><span>{lang === 'en' ? 'Sign out' : 'Вихід'}</span></div>
          </div>

          <div className="sidebar-footer">
            <div className="ver">
              <span>v1.4.2 · main</span>
              <span style={{ color: 'var(--ok)' }}>● live</span>
            </div>
            <div style={{ marginTop: 6 }}>© 2026 BusOptima</div>
          </div>
        </div>

        {/* Main */}
        <div className="main">
          {pageEl}
        </div>

        {/* Command palette */}
        {searchOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 199, background: 'rgba(5,8,18,0.72)', backdropFilter: 'blur(4px)' }} onClick={closeSearch}/>
            <div style={{
              position: 'fixed', top: '18vh', left: '50%', transform: 'translateX(-50%)',
              width: 520, zIndex: 200,
              background: 'var(--surface-1)', border: '1px solid var(--border-strong)',
              borderRadius: 14, boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
              overflow: 'hidden',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
                <Icon name="search" size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }}/>
                <input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder={lang === 'en' ? 'Search pages…' : 'Пошук сторінок…'}
                  style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 15, fontFamily: 'var(--font-sans)' }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-dim)', padding: '2px 6px', border: '1px solid var(--border)', borderRadius: 4 }}>ESC</span>
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto', padding: '6px 0' }}>
                {searchResults.length === 0 && (
                  <div style={{ padding: '16px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                    {lang === 'en' ? 'No results' : 'Нічого не знайдено'}
                  </div>
                )}
                {searchResults.map(item => (
                  <div key={item.id}
                    onClick={() => { setPage(item.id); closeSearch(); }}
                    style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', cursor: 'pointer', borderRadius: 8, margin: '0 6px' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface-2)'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <Icon name={item.icon} size={14}/>
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600 }}>{BO.t(item.label, lang)}</div>
                    </div>
                    {item.id === page && <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--accent)' }}>{lang === 'en' ? 'current' : 'поточна'}</span>}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Notifications panel */}
        {notifOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 49 }} onClick={() => setNotifOpen(false)}/>
            <div className="notif-panel">
              <div className="notif-header">
                <h4>{lang === 'en' ? 'Notifications' : 'Сповіщення'}</h4>
                <button className="btn-ghost btn btn-sm" onClick={() => setNotifOpen(false)}>{lang === 'en' ? 'Mark all read' : 'Прочитати всі'}</button>
              </div>
              <div className="notif-list">
                {BO.alerts.map(a => (
                  <div key={a.id} className="notif-item">
                    <span className="dot" style={{
                      background: a.level === 'danger' ? 'var(--danger)' : a.level === 'warn' ? 'var(--warn)' : a.level === 'info' ? 'var(--info)' : 'var(--ok)'
                    }}/>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600 }}>{lang === 'en' ? a.titleEn : a.titleUk}</div>
                      <div style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 2 }}>{lang === 'en' ? a.bodyEn : a.bodyUk}</div>
                      <div style={{ color: 'var(--text-dim)', fontSize: 11, marginTop: 4, fontFamily: 'var(--font-mono)' }}>{a.time}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Tweaks panel */}
      <TweaksPanel title="Tweaks">
        <TweakSection label={lang === 'en' ? 'Language' : 'Мова'}>
          <TweakRadio
            label={lang === 'en' ? 'Language' : 'Інтерфейс'}
            value={t.lang}
            onChange={(v) => setTweak('lang', v)}
            options={[
              { value: 'uk', label: 'Українська' },
              { value: 'en', label: 'English' },
            ]}
          />
        </TweakSection>

        <TweakSection label={lang === 'en' ? 'Appearance' : 'Вигляд'}>
          <TweakColor
            label={lang === 'en' ? 'Accent color' : 'Акцентний колір'}
            value={t.accent}
            onChange={(v) => setTweak('accent', v)}
            options={['#4D8BFF', '#A78BFA', '#34D399', '#FBBF24', '#F472B6']}
          />
          <TweakRadio
            label={lang === 'en' ? 'Density' : 'Щільність'}
            value={t.density}
            onChange={(v) => setTweak('density', v)}
            options={[
              { value: 'comfortable', label: lang === 'en' ? 'Comfortable' : 'Просторо' },
              { value: 'compact', label: lang === 'en' ? 'Compact' : 'Щільно' },
            ]}
          />
        </TweakSection>

        {role === 'dispatcher' && page === 'live' && (
          <TweakSection label={lang === 'en' ? 'Live monitoring layout' : 'Розкладка моніторингу'}>
            <TweakRadio
              label={lang === 'en' ? 'Variation' : 'Варіант'}
              value={t.liveLayout}
              onChange={(v) => setTweak('liveLayout', v)}
              options={[
                { value: 'map', label: lang === 'en' ? 'Map-first' : 'Карта' },
                { value: 'cards', label: lang === 'en' ? 'Cards-first' : 'Картки' },
              ]}
            />
          </TweakSection>
        )}
      </TweaksPanel>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App/>);
