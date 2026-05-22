import { useEffect, useState } from "react";

import { apiClient } from "@/api/client";
import { Icon, InlineError, Pill } from "@/components/ui";
import { auditFixture } from "@/fixtures/appData";
import type { AuditLogRow, Language } from "@/types/domain";

export function TechAudit({ lang }: { lang: Language }) {
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");

  const loadLogs = async (nextAction = action) => {
    setLoading(true);
    setError("");
    try {
      const raw = (await apiClient.getAuditLogs({ page: 1, limit: 20, ...(nextAction ? { action: nextAction } : {}) })) as {
        logs?: AuditLogRow[];
      };
      setLogs(raw.logs ?? auditFixture);
    } catch (value) {
      setLogs([]);
      setError(value instanceof Error ? value.message : "Failed to load audit log");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Audit log" : "Журнал аудиту"}</h1>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => loadLogs()}>
            <Icon name="refresh" /> {lang === "en" ? "Refresh" : "Оновити"}
          </button>
        </div>
      </div>

      {error && <InlineError message={error} />}

      <div className="row" style={{ gap: 10, marginBottom: 14 }}>
        <div className="layout-toggle">
          {["", "CREATE", "UPDATE", "DELETE"].map((value) => (
            <button key={value || "all"} className={action === value ? "active" : ""} onClick={() => { setAction(value); void loadLogs(value); }}>
              {value || (lang === "en" ? "All" : "Усі")}
            </button>
          ))}
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty">{lang === "en" ? "Loading…" : "Завантаження…"}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === "en" ? "Action" : "Дія"}</th>
                <th>{lang === "en" ? "Entity" : "Об’єкт"}</th>
                <th>{lang === "en" ? "Entity ID" : "ID об’єкта"}</th>
                <th>{lang === "en" ? "User ID" : "Користувач"}</th>
                <th>IP</th>
                <th>{lang === "en" ? "Time" : "Час"}</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>{log.id}</td>
                  <td><Pill kind={log.action === "DELETE" ? "danger" : log.action === "CREATE" ? "ok" : "accent"}>{log.action}</Pill></td>
                  <td>{log.entity_type}</td>
                  <td>{log.entity_id}</td>
                  <td>{log.user_id}</td>
                  <td>{log.ip_address}</td>
                  <td>{new Date(log.created_at).toLocaleString(lang === "en" ? "en-GB" : "uk-UA")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
