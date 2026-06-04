import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/api/client";
import { Modal } from "@/components/Modal";
import { Icon, Kpi, PageState, Pill } from "@/components/ui";
import { cityName, fixtureBuses, roleLabels, translate } from "@/fixtures/appData";
import { fmtUAH } from "@/lib/format";
import { normalizeBus, normalizeRoute, normalizeUser, unwrapApiList } from "@/lib/mappers";
import type { BusRow, Language, RoleId, RouteRow, UserRow } from "@/types/domain";

const ROLE_ID: Record<RoleId, number> = {
  dispatcher: 1,
  business_admin: 3,
  tech_admin: 4,
};

export function AdminRoutes({ lang }: { lang: Language }) {
  const [editing, setEditing] = useState<RouteRow | null>(null);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  const routesQuery = useQuery({
    queryKey: ["admin", "routes"],
    queryFn: async () =>
      unwrapApiList<Record<string, unknown>>(await apiClient.getRoutes()).map(normalizeRoute),
  });

  const routes = routesQuery.data ?? [];
  const filtered = routes.filter((route) => {
    const value = query.trim().toLowerCase();
    return !value || route.from.toLowerCase().includes(value) || route.to.toLowerCase().includes(value) || route.id.toLowerCase().includes(value);
  });

  const handleSave = async () => {
    if (!formRef.current) return;
    const from = (formRef.current.querySelector("[name=from]") as HTMLSelectElement | null)?.value ?? "";
    const to = (formRef.current.querySelector("[name=to]") as HTMLSelectElement | null)?.value ?? "";
    const distance = Number((formRef.current.querySelector("[name=distance]") as HTMLInputElement | null)?.value ?? 0);
    const basePrice = Number((formRef.current.querySelector("[name=basePrice]") as HTMLInputElement | null)?.value ?? 0);
    const status = ((formRef.current.querySelector("[name=status]") as HTMLSelectElement | null)?.value ?? "active") === "active";

    if (editing?._id) {
      await apiClient.updateRoute(editing._id, {
        origin_city: from,
        destination_city: to,
        distance_km: distance,
        base_price: basePrice,
        is_active: status,
      });
    } else {
      await apiClient.createRoute({
        origin_city: from,
        destination_city: to,
        distance_km: distance,
        base_price: basePrice,
        is_active: status,
      });
    }

    setEditing(null);
    await routesQuery.refetch();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Routes" : "Маршрути"}</h1>
          <p className="page-subtitle">{lang === "en" ? "Manage routes, base prices and distances" : "Керуйте маршрутами, базовою ціною та відстанями"}</p>
        </div>
        <div className="page-actions">
          <div className="search-wrap"><Icon name="search" /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "en" ? "Search route..." : "Пошук маршруту..."} /></div>
          <button className="btn btn-primary" onClick={() => setEditing({ id: "", from: "", to: "", distance: 0, basePrice: 0, dailyTrips: 0, status: "active" })}>
            <Icon name="plus" /> {translate("cta.new", lang)}
          </button>
        </div>
      </div>

      <PageState
        loading={routesQuery.isLoading}
        error={routesQuery.error instanceof Error ? routesQuery.error.message : undefined}
        empty={!routesQuery.isLoading && routes.length === 0}
        emptyText={lang === "en" ? "Backend returned no routes" : "Бекенд не повернув маршрути"}
        loadingText={lang === "en" ? "Loading routes…" : "Завантаження маршрутів…"}
      />

      {routes.length > 0 && (
        <>
          <div className="kpi-grid">
            <Kpi label={lang === "en" ? "Total routes" : "Маршрутів"} value={routes.length} />
            <Kpi label={lang === "en" ? "Daily trips" : "Рейсів/день"} value={routes.reduce((sum, route) => sum + route.dailyTrips, 0)} />
            <Kpi label={lang === "en" ? "Total distance" : "Сумарна відстань"} value={`${routes.reduce((sum, route) => sum + route.distance, 0)} км`} />
            <Kpi label={lang === "en" ? "Avg base price" : "Середня базова ціна"} value={fmtUAH(routes.reduce((sum, route) => sum + route.basePrice, 0) / routes.length)} />
          </div>

          <div className="card">
            <div className="table-wrap" style={{ border: "none" }}>
              <table className="table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>{lang === "en" ? "From" : "Звідки"}</th>
                    <th>{lang === "en" ? "To" : "Куди"}</th>
                    <th>{lang === "en" ? "Distance" : "Відстань"}</th>
                    <th>{lang === "en" ? "Base price" : "Базова ціна"}</th>
                    <th>{lang === "en" ? "Status" : "Статус"}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((route) => (
                    <tr key={route.id} onClick={() => setEditing(route)}>
                      <td>{route.id}</td>
                      <td>{cityName(route.from, lang)}</td>
                      <td>{cityName(route.to, lang)}</td>
                      <td>{route.distance} км</td>
                      <td>{route.basePrice} ₴</td>
                      <td><Pill kind={route.status === "active" ? "ok" : "warn"} dot>{route.status}</Pill></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.id}` : "New route"} onClose={() => setEditing(null)} onSave={handleSave}>
          <div className="grid-2" ref={formRef}>
            <div className="field">
              <label className="label">{lang === "en" ? "From" : "Звідки"}</label>
              <input name="from" className="input" defaultValue={editing.from} />
            </div>
            <div className="field">
              <label className="label">{lang === "en" ? "To" : "Куди"}</label>
              <input name="to" className="input" defaultValue={editing.to} />
            </div>
            <div className="field">
              <label className="label">{lang === "en" ? "Distance" : "Відстань"}</label>
              <input name="distance" className="input" defaultValue={editing.distance} />
            </div>
            <div className="field">
              <label className="label">{lang === "en" ? "Base price" : "Базова ціна"}</label>
              <input name="basePrice" className="input" defaultValue={editing.basePrice} />
            </div>
            <div className="field">
              <label className="label">{lang === "en" ? "Status" : "Статус"}</label>
              <select name="status" className="select" defaultValue={editing.status}>
                <option value="active">active</option>
                <option value="paused">paused</option>
              </select>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

export function AdminFleet({ lang }: { lang: Language }) {
  const [editing, setEditing] = useState<BusRow | null>(null);
  const formRef = useRef<HTMLDivElement | null>(null);

  const busesQuery = useQuery({
    queryKey: ["admin", "buses"],
    queryFn: async () => unwrapApiList<Record<string, unknown>>(await apiClient.getBuses()).map(normalizeBus),
    placeholderData: fixtureBuses,
  });

  const buses = busesQuery.data ?? [];

  const handleSave = async () => {
    if (!formRef.current) return;
    const body = {
      registration_number: (formRef.current.querySelector("[name=plate]") as HTMLInputElement | null)?.value ?? "",
      model: (formRef.current.querySelector("[name=model]") as HTMLInputElement | null)?.value ?? "",
      capacity: Number((formRef.current.querySelector("[name=capacity]") as HTMLInputElement | null)?.value ?? 0),
      fuel_consumption_per_100km: Number((formRef.current.querySelector("[name=fuel]") as HTMLInputElement | null)?.value ?? 0),
      is_active: ((formRef.current.querySelector("[name=status]") as HTMLSelectElement | null)?.value ?? "active") !== "maintenance",
    };
    if (editing?._id) await apiClient.updateBus(editing._id, body);
    else await apiClient.createBus(body);
    setEditing(null);
    await busesQuery.refetch();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Fleet & IoT devices" : "Автопарк та IoT-пристрої"}</h1>
        </div>
        <div className="page-actions">
          <button className="btn btn-primary" onClick={() => setEditing({ id: "", plate: "", model: "", capacity: 50, fuel: 0, iot: "—", status: "depot" })}>
            <Icon name="plus" /> {lang === "en" ? "Add bus" : "Додати автобус"}
          </button>
        </div>
      </div>

      <PageState
        loading={busesQuery.isLoading}
        error={busesQuery.error instanceof Error ? busesQuery.error.message : undefined}
        empty={!busesQuery.isLoading && buses.length === 0}
        emptyText={lang === "en" ? "Backend returned no buses" : "Бекенд не повернув автобуси"}
        loadingText={lang === "en" ? "Loading fleet…" : "Завантаження флоту…"}
      />

      {buses.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>{lang === "en" ? "Plate" : "Номер"}</th>
                <th>{lang === "en" ? "Model" : "Модель"}</th>
                <th>{translate("capacity", lang)}</th>
                <th>IoT</th>
                <th>{lang === "en" ? "Status" : "Статус"}</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => (
                <tr key={bus.id} onClick={() => setEditing(bus)}>
                  <td>{bus.id}</td>
                  <td>{bus.plate}</td>
                  <td>{bus.model}</td>
                  <td>{bus.capacity}</td>
                  <td>{bus.iot}</td>
                  <td><Pill kind={bus.status === "maintenance" ? "warn" : "ok"} dot>{bus.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <Modal title={editing._id ? `Edit ${editing.plate}` : "Add bus"} onClose={() => setEditing(null)} onSave={handleSave}>
          <div className="grid-2" ref={formRef}>
            <div className="field"><label className="label">Plate</label><input name="plate" className="input" defaultValue={editing.plate} /></div>
            <div className="field"><label className="label">Model</label><input name="model" className="input" defaultValue={editing.model} /></div>
            <div className="field"><label className="label">Capacity</label><input name="capacity" className="input" defaultValue={editing.capacity} /></div>
            <div className="field"><label className="label">Fuel</label><input name="fuel" className="input" defaultValue={editing.fuel ?? 0} /></div>
            <div className="field"><label className="label">Status</label><select name="status" className="select" defaultValue={editing.status}><option value="active">active</option><option value="maintenance">maintenance</option></select></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function randomPassword() {
  return Math.random().toString(36).slice(2, 12);
}

export function AdminUsers({ lang }: { lang: Language }) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [editRole, setEditRole] = useState<RoleId>("dispatcher");
  const [pwdModal, setPwdModal] = useState<{ email: string; generated: string } | null>(null);
  const [query, setQuery] = useState("");
  const formRef = useRef<HTMLDivElement | null>(null);

  const usersQuery = useQuery({
    queryKey: ["admin", "users"],
    queryFn: async () => unwrapApiList<Record<string, unknown>>(await apiClient.getUsers()).map(normalizeUser),
  });

  const users = usersQuery.data ?? [];
  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();
    return !value ? users : users.filter((user) => user.name.toLowerCase().includes(value) || user.email.toLowerCase().includes(value));
  }, [query, users]);

  const handleSave = async () => {
    if (!formRef.current) return;
    const fullName = (formRef.current.querySelector("[name=name]") as HTMLInputElement | null)?.value ?? "";
    const email = (formRef.current.querySelector("[name=email]") as HTMLInputElement | null)?.value ?? "";
    const roleId = ROLE_ID[editRole];

    if (editing?._id) {
      await apiClient.updateUser(editing._id, { full_name: fullName, email, role_id: roleId });
      await apiClient.updateUserRole(editing._id, roleId);
    } else {
      const password = randomPassword();
      await apiClient.createUser({ full_name: fullName, email, password, role_id: roleId });
      setPwdModal({ email, generated: password });
    }

    setEditing(null);
    await usersQuery.refetch();
  };

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1 className="page-title">{lang === "en" ? "Users" : "Користувачі"}</h1>
        </div>
        <div className="page-actions">
          <div className="search-wrap"><Icon name="search" /><input className="input" value={query} onChange={(event) => setQuery(event.target.value)} placeholder={lang === "en" ? "Search user..." : "Пошук користувача..."} /></div>
          <button className="btn btn-primary" onClick={() => { setEditing({ id: 0, name: "", email: "", role: "dispatcher", lastLogin: "—", status: "active" }); setEditRole("dispatcher"); }}>
            <Icon name="plus" /> {lang === "en" ? "Create user" : "Створити"}
          </button>
        </div>
      </div>

      <PageState
        loading={usersQuery.isLoading}
        error={usersQuery.error instanceof Error ? usersQuery.error.message : undefined}
        empty={!usersQuery.isLoading && users.length === 0}
        emptyText={lang === "en" ? "Backend returned no users" : "Бекенд не повернув користувачів"}
        loadingText={lang === "en" ? "Loading users…" : "Завантаження користувачів…"}
      />

      {users.length > 0 && (
        <>
          <div className="kpi-grid">
            <Kpi label={lang === "en" ? "Total users" : "Користувачів"} value={users.length} />
            <Kpi label={lang === "en" ? "Active" : "Активних"} value={users.filter((user) => user.status === "active").length} />
            <Kpi label={lang === "en" ? "Dispatchers" : "Диспетчерів"} value={users.filter((user) => user.role === "dispatcher").length} />
            <Kpi label={lang === "en" ? "Admins" : "Адмінів"} value={users.filter((user) => user.role !== "dispatcher").length} />
          </div>

          <div className="card" style={{ padding: 0 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>{lang === "en" ? "User" : "Користувач"}</th>
                  <th>Email</th>
                  <th>{lang === "en" ? "Role" : "Роль"}</th>
                  <th>{lang === "en" ? "Last login" : "Останній вхід"}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr key={user.id} onClick={() => { setEditing(user); setEditRole(user.role); }}>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td><Pill kind={user.role === "dispatcher" ? "accent" : user.role === "business_admin" ? "violet" : "info"}>{roleLabels[user.role][lang]}</Pill></td>
                    <td>{user.lastLogin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {editing && (
        <Modal title={editing._id ? "Edit user" : "Create user"} onClose={() => setEditing(null)} onSave={handleSave}>
          <div className="grid-2" ref={formRef}>
            <div className="field"><label className="label">{lang === "en" ? "Full name" : "Повне ім'я"}</label><input name="name" className="input" defaultValue={editing.name} /></div>
            <div className="field"><label className="label">Email</label><input name="email" className="input" defaultValue={editing.email} /></div>
            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <label className="label">{lang === "en" ? "Role" : "Роль"}</label>
              <div className="layout-toggle">
                {(["dispatcher", "business_admin", "tech_admin"] as RoleId[]).map((role) => (
                  <button key={role} className={editRole === role ? "active" : ""} onClick={() => setEditRole(role)}>
                    {roleLabels[role][lang]}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {pwdModal && (
        <Modal title={lang === "en" ? "Password generated" : "Пароль згенеровано"} onClose={() => setPwdModal(null)}>
          <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 12 }}>{pwdModal.email}</p>
          <code style={{ display: "block", padding: "10px 14px", background: "var(--surface-3)", borderRadius: 8 }}>{pwdModal.generated}</code>
        </Modal>
      )}
    </div>
  );
}
