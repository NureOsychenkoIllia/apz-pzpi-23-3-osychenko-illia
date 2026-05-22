/* BusOptima API service — connects to Go/Fiber backend */
/* Falls back to mock data (window.BO) when backend is unavailable */

window.API = (() => {
  const BASE = "http://localhost:8080/api";

  let _token = localStorage.getItem("bo_token") || null;
  let _user = JSON.parse(localStorage.getItem("bo_user") || "null");

  function getToken() {
    return _token;
  }
  function getUser() {
    return _user;
  }

  function setSession(access_token, user) {
    _token = access_token;
    _user = user;
    localStorage.setItem("bo_token", access_token);
    localStorage.setItem("bo_user", JSON.stringify(user));
  }

  function clearSession() {
    _token = null;
    _user = null;
    localStorage.removeItem("bo_token");
    localStorage.removeItem("bo_user");
  }

  function notifyUnauthorized() {
    window.dispatchEvent(new CustomEvent("bo:unauthorized"));
  }

  function withQuery(path, params = {}) {
    const qs = new URLSearchParams(params).toString();
    return qs ? `${path}?${qs}` : path;
  }

  function withId(path, id) {
    return `${path}/${id}`;
  }

  async function request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (_token) headers["Authorization"] = "Bearer " + _token;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(BASE + path, opts);
    if (res.status === 401) {
      clearSession();
      notifyUnauthorized();
      throw new Error("Unauthorized");
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Request failed");
    return data;
  }

  const get = (p) => request("GET", p);
  const post = (p, b) => request("POST", p, b);
  const put = (p, b) => request("PUT", p, b);
  const del = (p) => request("DELETE", p);

  // Auth
  async function login(email, password) {
    const data = await post("/auth/login", { email, password });
    setSession(data.access_token, data.user);
    return data;
  }

  function logout() {
    clearSession();
  }

  // Map backend role to frontend role id
  function mapRole(roleName) {
    const n = (roleName || "").toLowerCase();
    if (n.includes("tech") || n.includes("technical")) return "tech_admin";
    if (n.includes("business") || n.includes("admin")) return "business_admin";
    return "dispatcher";
  }

  // Get frontend role from stored user
  function getUserRole() {
    if (!_user) return null;
    const roleName = _user.role?.name || _user.role || "";
    return mapRole(roleName);
  }

  // Trips
  async function getTrips(filters = {}) {
    return get(withQuery("/trips", filters));
  }

  async function getTrip(id) {
    return get(withId("/trips", id));
  }

  async function createTrip(data) {
    return post("/trips", data);
  }

  async function updateTrip(id, data) {
    return put(withId("/trips", id), data);
  }

  async function getTripAnalytics(id) {
    return get(`${withId("/trips", id)}/analytics`);
  }

  // Routes
  async function getRoutes(activeOnly = false) {
    return get(withQuery("/routes", { active_only: activeOnly }));
  }

  async function createRoute(data) {
    return post("/routes", data);
  }

  async function updateRoute(id, data) {
    return put(withId("/routes", id), data);
  }

  async function deleteRoute(id) {
    return del(withId("/routes", id));
  }

  // Buses
  async function getBuses(activeOnly = false) {
    return get(withQuery("/buses", { active_only: activeOnly }));
  }

  async function createBus(data) {
    return post("/buses", data);
  }

  async function updateBus(id, data) {
    return put(withId("/buses", id), data);
  }

  async function deleteBus(id) {
    return del(withId("/buses", id));
  }

  // Analytics
  async function getDashboard() {
    return get("/analytics/dashboard");
  }

  async function getProfitability(params = {}) {
    return get(withQuery("/analytics/profitability", params));
  }

  async function getForecast(routeId, date) {
    return get(withQuery("/analytics/forecast", { route_id: routeId, ...(date ? { date } : {}) }));
  }

  // Pricing
  async function calculatePrice(data) {
    return post("/pricing/calculate", data);
  }

  // Admin
  async function getUsers() {
    return get("/admin/users");
  }

  async function createUser(data) {
    return post("/admin/users", data);
  }

  async function updateUser(id, data) {
    return put(withId("/admin/users", id), data);
  }

  async function updateUserRole(id, roleId) {
    return put(`${withId("/admin/users", id)}/role`, { role_id: roleId });
  }

  async function getSettings() {
    return get("/admin/settings");
  }

  async function updateSettings(data) {
    return put("/admin/settings", data);
  }

  async function exportSettings() {
    return get("/admin/settings/export");
  }

  async function importSettings(data) {
    return post("/admin/settings/import", data);
  }

  async function getAuditLogs(params = {}) {
    return get(withQuery("/admin/audit-logs", params));
  }

  return {
    login,
    logout,
    getToken,
    getUser,
    getUserRole,
    setSession,
    clearSession,
    getTrips,
    getTrip,
    createTrip,
    updateTrip,
    getTripAnalytics,
    getRoutes,
    createRoute,
    updateRoute,
    deleteRoute,
    getBuses,
    createBus,
    updateBus,
    deleteBus,
    getDashboard,
    getProfitability,
    getForecast,
    calculatePrice,
    getUsers,
    createUser,
    updateUser,
    updateUserRole,
    getSettings,
    updateSettings,
    exportSettings,
    importSettings,
    getAuditLogs,
  };
})();
