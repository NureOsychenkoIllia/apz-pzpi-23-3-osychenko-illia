import React from "react";

import { cityName, roleLabels } from "@/fixtures/appData";
import { fmtNum } from "@/lib/format";
import type { IconName, Language, RoleId } from "@/types/domain";

type IconProps = {
  name: IconName;
  size?: number;
  style?: React.CSSProperties;
};

export function Icon({ name, size = 16, style }: IconProps) {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    style,
  };

  const svg = (children: React.ReactNode) => <svg {...props}>{children}</svg>;

  switch (name) {
    case "bus":
      return svg(<><path d="M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v9a2 2 0 0 1-2 2h-1v1a1 1 0 0 1-2 0v-1H9v1a1 1 0 0 1-2 0v-1H6a2 2 0 0 1-2-2V7z"/><path d="M4 11h16"/><circle cx="8" cy="15" r="1"/><circle cx="16" cy="15" r="1"/></>);
    case "map": return svg(<><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2z"/><path d="M9 4v14M15 6v14"/></>);
    case "activity": return svg(<path d="M3 12h4l3-8 4 16 3-8h4"/>);
    case "trend": return svg(<><path d="M3 17l6-6 4 4 8-8"/><path d="M14 7h7v7"/></>);
    case "coins": return svg(<><ellipse cx="9" cy="9" rx="6" ry="3"/><path d="M3 9v4c0 1.66 2.69 3 6 3"/><path d="M3 13v4c0 1.66 2.69 3 6 3"/><ellipse cx="15" cy="15" rx="6" ry="3"/><path d="M21 15v4c0 1.66-2.69 3-6 3"/></>);
    case "file": return svg(<><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/></>);
    case "route": return svg(<><circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h6a4 4 0 0 0 0-8h-4a4 4 0 0 1 0-8h6"/></>);
    case "truck": return svg(<><path d="M3 6h11v9H3z"/><path d="M14 9h4l3 3v3h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/></>);
    case "users": return svg(<><circle cx="9" cy="8" r="3"/><path d="M3 20a6 6 0 0 1 12 0"/><circle cx="17" cy="9" r="2.5"/><path d="M15 15a4 4 0 0 1 6 3.5"/></>);
    case "database": return svg(<><ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.66 3.58 3 8 3s8-1.34 8-3V5"/><path d="M4 11v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6"/></>);
    case "terminal": return svg(<><path d="M4 4h16v16H4z"/><path d="M7 8l3 3-3 3M12 14h5"/></>);
    case "heart-pulse": return svg(<><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/><path d="M3.5 12h3l1.5-3 3 6 1.5-3h6"/></>);
    case "bell": return svg(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10 21a2 2 0 0 0 4 0"/></>);
    case "search": return svg(<><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></>);
    case "chevron-down": return svg(<path d="M6 9l6 6 6-6"/>);
    case "chevron-left": return svg(<path d="M15 6l-6 6 6 6"/>);
    case "plus": return svg(<path d="M12 5v14M5 12h14"/>);
    case "minus": return svg(<path d="M5 12h14"/>);
    case "x": return svg(<path d="M6 6l12 12M6 18L18 6"/>);
    case "check": return svg(<path d="M5 12l5 5 9-12"/>);
    case "edit": return svg(<><path d="M11 4H4v16h16v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></>);
    case "trash": return svg(<><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></>);
    case "download": return svg(<><path d="M12 3v12"/><path d="M7 10l5 5 5-5"/><path d="M5 21h14"/></>);
    case "upload": return svg(<><path d="M12 21V9"/><path d="M7 14l5-5 5 5"/><path d="M5 3h14"/></>);
    case "filter": return svg(<path d="M4 4h16l-6 8v6l-4 2v-8L4 4z"/>);
    case "settings": return svg(<><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82"/></>);
    case "globe": return svg(<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/></>);
    case "shield": return svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></>);
    case "logout": return svg(<><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5M21 12H9"/></>);
    case "alert": return svg(<><path d="M12 2 1 22h22z"/><path d="M12 9v5M12 18v.5"/></>);
    case "info-c": return svg(<><circle cx="12" cy="12" r="9"/><path d="M12 8v.5M11 12h1v5h1"/></>);
    case "check-c": return svg(<><circle cx="12" cy="12" r="9"/><path d="M8 12l3 3 5-6"/></>);
    case "grid": return svg(<><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></>);
    case "list": return svg(<><path d="M8 6h13M8 12h13M8 18h13"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/></>);
    case "layers": return svg(<><path d="M12 3 2 8l10 5 10-5-10-5z"/><path d="M2 13l10 5 10-5M2 18l10 5 10-5"/></>);
    case "refresh": return svg(<><path d="M3 12a9 9 0 0 1 15.5-6.3L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.3L3 16"/><path d="M3 21v-5h5"/></>);
    case "key": return svg(<><circle cx="8" cy="15" r="4"/><path d="M11 13l9-9M16 7l3 3"/></>);
    case "pin": return svg(<><path d="M12 21s-7-7.5-7-12a7 7 0 0 1 14 0c0 4.5-7 12-7 12z"/><circle cx="12" cy="9" r="2.5"/></>);
    case "play": return svg(<polygon points="6 4 20 12 6 20" />);
    default: return svg(<circle cx="12" cy="12" r="9" />);
  }
}

export function InlineError({ message }: { message: string }) {
  return (
    <div className="alert alert-danger severity">
      <div className="alert-icon"><Icon name="alert" /></div>
      <div className="alert-body"><div className="alert-title">{message}</div></div>
    </div>
  );
}

export function InlineEmpty({ message }: { message: string }) {
  return <div className="empty card">{message}</div>;
}

export function Pill({
  children,
  kind = "",
  dot = false,
}: {
  children: React.ReactNode;
  kind?: string;
  dot?: boolean;
}) {
  return <span className={`pill ${kind ? `pill-${kind}` : ""} ${dot ? "dot" : ""}`}>{children}</span>;
}

export function LoadBar({ pct, showLabel = true }: { pct: number; showLabel?: boolean }) {
  const color = pct < 30 ? "var(--load-low)" : pct < 60 ? "var(--load-ok)" : pct < 85 ? "var(--load-busy)" : "var(--load-over)";
  return (
    <div className="load-label">
      <div className="load-bar" style={{ flex: 1 }}>
        <div className="load-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: color }} />
      </div>
      {showLabel && <span style={{ minWidth: 40, textAlign: "right", color }}>{pct}%</span>}
    </div>
  );
}

export function Kpi({
  label,
  value,
  delta,
}: {
  label: string;
  value: string | number;
  delta?: string;
}) {
  return (
    <div className="kpi">
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {delta && <span className="kpi-delta up">{delta}</span>}
    </div>
  );
}

export function PageState({
  loading,
  error,
  empty,
  emptyText,
  loadingText,
}: {
  loading: boolean;
  error?: string;
  empty: boolean;
  emptyText: string;
  loadingText: string;
}) {
  if (error) return <InlineError message={error} />;
  if (loading) return <InlineEmpty message={loadingText} />;
  if (empty) return <InlineEmpty message={emptyText} />;
  return null;
}

export function UserRoleBadge({ role, lang }: { role: RoleId; lang: Language }) {
  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: "5px 14px",
      borderRadius: 999,
      background: "var(--surface-2)",
      border: "1px solid var(--border)",
      fontSize: 13,
      fontWeight: 600,
    }}>
      <Icon name={role === "dispatcher" ? "activity" : role === "business_admin" ? "shield" : "terminal"} size={14} />
      <span>{roleLabels[role][lang]}</span>
    </div>
  );
}

export function StatRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="stat-row">
      <span className="lbl">{label}</span>
      <span className="val">{value}</span>
    </div>
  );
}

export function LabeledRoute({
  from,
  to,
  lang,
}: {
  from: string;
  to: string;
  lang: Language;
}) {
  return <>{cityName(from, lang)} → {cityName(to, lang)}</>;
}

export function SmallValue({ value }: { value: number }) {
  return <span className="num">{fmtNum(value)}</span>;
}
