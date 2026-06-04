import { useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/api/client";
import { navByRole, defaultPageByRole, roleSectionTitle } from "@/config/appConfig";
import { Modal } from "@/components/Modal";
import { Icon, UserRoleBadge } from "@/components/ui";
import { alerts, roleLabels, translate } from "@/fixtures/appData";
import { useTweakState } from "@/hooks/useTweakState";
import { mapBackendRole } from "@/lib/mappers";
import type { AppPageId, Language, SessionUser } from "@/types/domain";
import { DispatcherForecast, DispatcherLive, DispatcherProfit, DispatcherReports } from "@/features/dispatcher/screens";
import { AdminFleet, AdminRoutes, AdminUsers } from "@/features/admin/screens";
import { TechBackups, TechHealth, TechLogs } from "@/features/tech/screens";
import { AdminSettings } from "@/features/settings/AdminSettings";
import { TechAudit } from "@/features/audit/TechAudit";

function LoginScreen({
  lang,
  onLogin,
}: {
  lang: Language;
  onLogin: (user: SessionUser) => void;
}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await apiClient.login(email, password);
      onLogin(data.user);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div className="brand-mark" style={{ width: 56, height: 56, display: "inline-grid", placeItems: "center", marginBottom: 16 }}>
            <Icon name="bus" size={28} />
          </div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 700 }}>BusOptima</div>
          <div style={{ color: "var(--text-muted)", marginTop: 6 }}>{lang === "en" ? "Operations Console" : "Операційна консоль"}</div>
        </div>

        <form onSubmit={submit}>
          <div className="card">
            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, marginBottom: 20 }}>
              {lang === "en" ? "Sign in to your account" : "Увійдіть до облікового запису"}
            </div>

            {error && (
              <div className="alert alert-danger severity">
                <div className="alert-icon"><Icon name="alert" /></div>
                <div className="alert-body"><div className="alert-title">{error}</div></div>
              </div>
            )}

            <div className="field">
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="dispatcher@busoptima.ua" required />
            </div>
            <div className="field">
              <label className="label">{lang === "en" ? "Password" : "Пароль"}</label>
              <input className="input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="password123" required />
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} disabled={loading}>
              {loading ? (lang === "en" ? "Signing in…" : "Вхід…") : (lang === "en" ? "Sign in" : "Увійти")}
            </button>

            <div style={{ marginTop: 16, padding: 12, background: "var(--surface-2)", borderRadius: 8, fontSize: 12, color: "var(--text-muted)" }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{lang === "en" ? "Demo accounts" : "Тестові акаунти"}</div>
              <div>dispatcher@busoptima.ua / password123</div>
              <div>admin@busoptima.ua / password123</div>
              <div>tech@busoptima.ua / password123</div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

function TweaksModal({
  open,
  onClose,
  lang,
  state,
  setTweak,
}: {
  open: boolean;
  onClose: () => void;
  lang: Language;
  state: ReturnType<typeof useTweakState>["tweaks"];
  setTweak: ReturnType<typeof useTweakState>["setTweak"];
}) {
  if (!open) return null;
  return (
    <Modal title="Tweaks" onClose={onClose}>
      <div className="col" style={{ gap: 14 }}>
        <div className="field">
          <label className="label">{lang === "en" ? "Language" : "Мова"}</label>
          <select className="select" value={state.lang} onChange={(event) => setTweak("lang", event.target.value as Language)}>
            <option value="uk">Українська</option>
            <option value="en">English</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{lang === "en" ? "Density" : "Щільність"}</label>
          <select className="select" value={state.density} onChange={(event) => setTweak("density", event.target.value as "comfortable" | "compact")}>
            <option value="comfortable">{lang === "en" ? "Comfortable" : "Просторо"}</option>
            <option value="compact">{lang === "en" ? "Compact" : "Щільно"}</option>
          </select>
        </div>
        <div className="field">
          <label className="label">{lang === "en" ? "Accent" : "Акцент"}</label>
          <input className="input" type="color" value={state.accent} onChange={(event) => setTweak("accent", event.target.value)} />
        </div>
        <div className="field">
          <label className="label">{lang === "en" ? "Dispatcher layout" : "Розкладка диспетчера"}</label>
          <select className="select" value={state.liveLayout} onChange={(event) => setTweak("liveLayout", event.target.value as "map" | "cards")}>
            <option value="map">Map</option>
            <option value="cards">Cards</option>
          </select>
        </div>
      </div>
    </Modal>
  );
}

export function App() {
  const { tweaks, setTweak } = useTweakState();
  const [page, setPage] = useState<AppPageId>(defaultPageByRole[tweaks.role]);
  const [authUser, setAuthUser] = useState<SessionUser | null>(() => apiClient.getUser());
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [tweakOpen, setTweakOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const rawRole = apiClient.getUserRole();
    if (rawRole) {
      const mappedRole = mapBackendRole(rawRole);
      if (mappedRole !== tweaks.role) setTweak("role", mappedRole);
    }
  }, [setTweak, tweaks.role]);

  useEffect(() => {
    setPage(defaultPageByRole[tweaks.role]);
  }, [tweaks.role]);

  useEffect(() => {
    const onUnauthorized = () => setAuthUser(null);
    window.addEventListener("bo:unauthorized", onUnauthorized);
    return () => window.removeEventListener("bo:unauthorized", onUnauthorized);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (event.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const lang = tweaks.lang;
  const nav = navByRole[tweaks.role];
  const searchResults = useMemo(() => {
    const value = searchQuery.trim().toLowerCase();
    return !value
      ? nav
      : nav.filter((item) => translate(item.label, lang).toLowerCase().includes(value) || item.id.includes(value));
  }, [lang, nav, searchQuery]);

  if (!authUser) {
    return (
      <LoginScreen
        lang={lang}
        onLogin={(user) => {
          setAuthUser(user);
          const rawRole = typeof user.role === "object" ? user.role?.name : user.role;
          if (rawRole) setTweak("role", mapBackendRole(rawRole));
        }}
      />
    );
  }

  const displayName = authUser.full_name || authUser.email;
  const initials = displayName.split(" ").map((part) => part[0]).slice(0, 2).join("");

  const renderPage = () => {
    switch (page) {
      case "live":
        return <DispatcherLive lang={lang} layout={tweaks.liveLayout} onLayoutChange={(value) => setTweak("liveLayout", value)} />;
      case "forecast":
        return <DispatcherForecast lang={lang} />;
      case "profit":
        return <DispatcherProfit lang={lang} />;
      case "reports":
        return <DispatcherReports lang={lang} />;
      case "routes":
        return <AdminRoutes lang={lang} />;
      case "fleet":
        return <AdminFleet lang={lang} />;
      case "users":
        return <AdminUsers lang={lang} />;
      case "settings":
        return <AdminSettings lang={lang} />;
      case "backups":
        return <TechBackups lang={lang} />;
      case "logs":
        return <TechLogs lang={lang} />;
      case "health":
        return <TechHealth lang={lang} />;
      case "audit":
        return <TechAudit lang={lang} />;
      default:
        return null;
    }
  };

  return (
    <>
      <div className="app">
        <div className="topbar">
          <div className="brand">
            <div className="brand-mark"><Icon name="bus" size={18} /></div>
            <span>BusOptima</span>
            <span style={{ fontSize: 11, color: "var(--text-dim)", fontWeight: 500, marginLeft: 6, padding: "2px 7px", border: "1px solid var(--border)", borderRadius: 999, fontFamily: "var(--font-mono)" }}>v2.0.0</span>
          </div>

          <div className="topbar-spacer" />
          <UserRoleBadge role={tweaks.role} lang={lang} />
          <div className="topbar-actions">
            <button className="icon-btn" onClick={() => setTweak("lang", lang === "uk" ? "en" : "uk")}>
              <Icon name="globe" />
            </button>
            <button className="icon-btn" onClick={() => setNotifOpen((value) => !value)}>
              <Icon name="bell" />
              <span className="dot" />
            </button>
            <button className="icon-btn" onClick={() => setTweakOpen(true)}>
              <Icon name="settings" />
            </button>
            <button className="user-chip" onClick={() => { apiClient.logout(); setAuthUser(null); }}>
              <div className="avatar">{initials}</div>
              <div>
                <div className="name">{displayName}</div>
                <div className="role">{roleLabels[tweaks.role][lang]}</div>
              </div>
              <Icon name="logout" size={13} style={{ color: "var(--text-dim)", marginLeft: 4 }} />
            </button>
          </div>
        </div>

        <div className="sidebar">
          <div className="nav-section">
            <div className="nav-section-title">{translate(roleSectionTitle[tweaks.role], lang)}</div>
            {nav.map((item) => (
              <div key={item.id} className={`nav-item ${page === item.id ? "active" : ""}`} onClick={() => setPage(item.id)}>
                <Icon name={item.icon} />
                <span>{translate(item.label, lang)}</span>
                {item.badge && <span className="badge-num">{item.badge}</span>}
              </div>
            ))}
          </div>

          <div className="nav-section">
            <div className="nav-section-title">{lang === "en" ? "Quick" : "Швидко"}</div>
            <div className="nav-item" onClick={() => setSearchOpen(true)}><Icon name="search" /><span>{lang === "en" ? "Search" : "Пошук"}</span></div>
          </div>

          <div className="sidebar-footer">
            <div className="ver"><span>vite · react · ts</span><span style={{ color: "var(--ok)" }}>● live</span></div>
            <div style={{ marginTop: 6 }}>© 2026 BusOptima</div>
          </div>
        </div>

        <div className="main">{renderPage()}</div>

        {notifOpen && (
          <>
            <div style={{ position: "fixed", inset: 0, zIndex: 49 }} onClick={() => setNotifOpen(false)} />
            <div className="notif-panel">
              <div className="notif-header">
                <h4>{lang === "en" ? "Notifications" : "Сповіщення"}</h4>
              </div>
              <div className="notif-list">
                {alerts.map((alert) => (
                  <div key={alert.id} className="notif-item">
                    <span className="dot" style={{ background: alert.level === "danger" ? "var(--danger)" : "var(--warn)" }} />
                    <div>
                      <div style={{ fontWeight: 600 }}>{lang === "en" ? alert.titleEn : alert.titleUk}</div>
                      <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{lang === "en" ? alert.bodyEn : alert.bodyUk}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>

      {searchOpen && (
        <>
          <div className="search-overlay" onClick={() => setSearchOpen(false)} />
          <div className="search-modal">
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderBottom: "1px solid var(--border)" }}>
              <Icon name="search" size={16} style={{ color: "var(--text-dim)" }} />
              <input ref={searchRef} value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder={lang === "en" ? "Search pages…" : "Пошук сторінок…"} style={{ flex: 1, background: "none", border: "none", outline: "none", color: "var(--text)" }} />
            </div>
            <div style={{ maxHeight: 320, overflowY: "auto", padding: "6px 0" }}>
              {searchResults.map((item) => (
                <div key={item.id} className="search-result" onClick={() => { setPage(item.id); setSearchOpen(false); }}>
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: "var(--surface-3)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Icon name={item.icon} size={14} />
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{translate(item.label, lang)}</div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      <TweaksModal open={tweakOpen} onClose={() => setTweakOpen(false)} lang={lang} state={tweaks} setTweak={setTweak} />
    </>
  );
}
