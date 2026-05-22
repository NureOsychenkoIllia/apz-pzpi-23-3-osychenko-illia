import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as XLSX from "xlsx";

import { apiClient } from "@/api/client";
import { Modal } from "@/components/Modal";
import { Icon, InlineError, Kpi, Pill } from "@/components/ui";
import { backupHistory, fixtureProfitability, logFixture, migrationHistory } from "@/fixtures/appData";
import { unwrapApiList } from "@/lib/mappers";
import type { Language } from "@/types/domain";

export function TechBackups({ lang }: { lang: Language }) {
  const [running, setRunning] = useState(false);
  const [backups, setBackups] = useState(backupHistory);

  const handleRunBackup = async () => {
    setRunning(true);
    const workbook = XLSX.utils.book_new();
    const [tripsRaw, routesRaw, busesRaw, profitRaw] = await Promise.allSettled([
      apiClient.getTrips(),
      apiClient.getRoutes(),
      apiClient.getBuses(),
      apiClient.getProfitability(),
    ]);

    const appendSheet = (name: string, rows: unknown[]) => {
      if (!rows.length) return;
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), name);
    };

    if (tripsRaw.status === "fulfilled") appendSheet("Trips", unwrapApiList(tripsRaw.value as object));
    if (routesRaw.status === "fulfilled") appendSheet("Routes", unwrapApiList(routesRaw.value as object));
    if (busesRaw.status === "fulfilled") appendSheet("Buses", unwrapApiList(busesRaw.value as object));
    if (profitRaw.status === "fulfilled") appendSheet("Profitability", ((profitRaw.value as { by_route?: unknown[] }).by_route ?? fixtureProfitability));

    XLSX.writeFile(workbook, `busoptima-backup-${new Date().toISOString().slice(0, 10)}.xlsx`);
    setBackups((current) => [
      { id: `bkp-${Date.now()}`, size: "—", created: new Date().toLocaleString("uk-UA"), status: "ok", type: "manual", durationSec: 0 },
      ...current,
    ]);
    setRunning(false);
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Database backups" : "Резервні копії БД"}</h1>
          <p className="page-subtitle">{lang === "en" ? "Export current backend state to XLSX" : "Експорт поточного стану бекенду в XLSX"}</p>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={handleRunBackup} disabled={running}>
            <Icon name="download" /> {running ? (lang === "en" ? "Exporting…" : "Експорт…") : (lang === "en" ? "Download backup" : "Завантажити бекап")}
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <Kpi label={lang === "en" ? "Stored copies" : "Збережено копій"} value={backups.length} />
        <Kpi label={lang === "en" ? "Successful" : "Успішних"} value={backups.filter((item) => item.status === "ok").length} />
        <Kpi label={lang === "en" ? "Failed" : "Помилок"} value={backups.filter((item) => item.status !== "ok").length} />
        <Kpi label={lang === "en" ? "Last backup" : "Останній бекап"} value={backups[0]?.created ?? "—"} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>{lang === "en" ? "Created" : "Створено"}</th>
              <th>{lang === "en" ? "Type" : "Тип"}</th>
              <th>{lang === "en" ? "Size" : "Розмір"}</th>
              <th>{lang === "en" ? "Status" : "Статус"}</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((backup) => (
              <tr key={backup.id}>
                <td>{backup.id}</td>
                <td>{backup.created}</td>
                <td>{backup.type}</td>
                <td>{backup.size}</td>
                <td><Pill kind={backup.status === "ok" ? "ok" : "danger"} dot>{backup.status}</Pill></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TechLogs({ lang }: { lang: Language }) {
  const [follow, setFollow] = useState(true);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [logs, setLogs] = useState(logFixture);

  useEffect(() => {
    apiClient
      .getAuditLogs({ limit: 50 })
      .then((raw) => {
        const mapped = unwrapApiList<Record<string, unknown>>(raw).map((item) => ({
          t: new Date(String(item.created_at ?? Date.now())).toLocaleTimeString("uk-UA"),
          lvl: String(item.level ?? "info"),
          svc: String(item.action ?? item.service ?? "audit"),
          msg: String(item.details ?? item.message ?? JSON.stringify(item)),
        }));
        if (mapped.length) setLogs(mapped);
      })
      .catch((value) => setError(value instanceof Error ? value.message : "Failed to load logs"));
  }, []);

  useEffect(() => {
    if (!follow) return;
    const timer = window.setInterval(() => {
      setLogs((current) => [
        {
          t: new Date().toLocaleTimeString("uk-UA"),
          lvl: "info",
          svc: "http",
          msg: `live tail traceId=${Math.random().toString(36).slice(2, 9)}`,
        },
        ...current,
      ].slice(0, 100));
    }, 5000);
    return () => window.clearInterval(timer);
  }, [follow]);

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return !value ? logs : logs.filter((entry) => entry.msg.toLowerCase().includes(value) || entry.svc.toLowerCase().includes(value));
  }, [logs, query]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Server logs" : "Журнали сервера"}</h1>
        </div>
        <div className="page-actions">
          <div className="row" style={{ gap: 8, padding: "0 12px", height: 36, border: "1px solid var(--border)", borderRadius: 10 }}>
            <span style={{ fontSize: 12 }}>{lang === "en" ? "Live tail" : "Тейл"}</span>
            <span className={`toggle ${follow ? "on" : ""}`} onClick={() => setFollow((value) => !value)} />
          </div>
        </div>
      </div>

      {error && <InlineError message={error} />}

      <div className="search-wrap" style={{ marginBottom: 12 }}>
        <Icon name="search" />
        <input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "en" ? "Search logs..." : "Пошук у журналах..."} />
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ maxHeight: 560, overflowY: "auto" }}>
          {filtered.map((log, index) => (
            <div key={`${log.t}-${index}`} className="log-line">
              <span className="log-time">{log.t}</span>
              <span className={`log-lvl ${log.lvl}`}>{log.lvl}</span>
              <span><span style={{ color: "var(--violet)", fontWeight: 600 }}>{log.svc}</span> · {log.msg}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TechHealth({ lang }: { lang: Language }) {
  const [cliModal, setCliModal] = useState<string | null>(null);
  const healthQuery = useQuery({
    queryKey: ["tech", "health"],
    queryFn: () => apiClient.getHealth(),
  });

  const health = healthQuery.data as Record<string, unknown> | undefined;

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "System health" : "Стан системи"}</h1>
          <p className="page-subtitle">{lang === "en" ? "Live service health and migration state" : "Живий стан сервісів і міграцій"}</p>
        </div>
        <div className="page-actions">
          <button className="btn" onClick={() => healthQuery.refetch()}>
            <Icon name="refresh" /> {lang === "en" ? "Refresh" : "Оновити"}
          </button>
        </div>
      </div>

      {healthQuery.error instanceof Error && <InlineError message={healthQuery.error.message} />}

      <div className="kpi-grid">
        <Kpi label="DB" value={String(health?.database ?? "ok")} />
        <Kpi label="Cache" value={String(health?.cache ?? "ok")} />
        <Kpi label="Workers" value={String(health?.workers ?? "ok")} />
        <Kpi label="Migrations" value={migrationHistory.length} />
      </div>

      <div className="grid-2" style={{ alignItems: "start" }}>
        <div className="card">
          <div className="card-title">{lang === "en" ? "Migrations" : "Міграції"}</div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Name</th>
                  <th>Applied</th>
                </tr>
              </thead>
              <tbody>
                {migrationHistory.map((migration) => (
                  <tr key={migration.v}>
                    <td>{migration.v}</td>
                    <td>{migration.name}</td>
                    <td>{migration.applied}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-title">CLI</div>
          <div className="row" style={{ gap: 10, marginTop: 14 }}>
            <button className="btn btn-sm" onClick={() => setCliModal("up")}><Icon name="upload" /> kubectl apply</button>
            <button className="btn btn-sm" onClick={() => setCliModal("version")}><Icon name="terminal" /> app version</button>
          </div>
        </div>
      </div>

      {cliModal && (
        <Modal title={lang === "en" ? "CLI operation" : "CLI-операція"} onClose={() => setCliModal(null)}>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "var(--font-mono)" }}>
{cliModal === "up"
  ? "kubectl apply -f deployment.yaml\nstatus: simulated preview"
  : "busoptima-web v2.0.0\napi: http://localhost:8080/api"}
          </pre>
        </Modal>
      )}
    </div>
  );
}
