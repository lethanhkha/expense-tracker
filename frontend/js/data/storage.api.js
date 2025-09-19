// ===== Multi BASE + Fetch helper =====
const BASES = [
  "https://expense-tracker-production-7cff.up.railway.app/api",
  `${location.origin}/api`,
  "http://localhost:8000/api",
];

/**
 * Fetch JSON với timeout + thử lần lượt các BASE.
 * @param {string} path - bắt đầu bằng "/" ví dụ: "/incomes"
 * @param {RequestInit} options
 * @param {{timeout?:number, retries?:number}} cfg
 */
async function apiFetch(path, options = {}, cfg = {}) {
  const timeout = cfg.timeout ?? 8000;
  const retries = cfg.retries ?? 1; // mỗi BASE thử thêm n lần (tổng ~ BASES*(retries+1))
  const errors = [];

  for (const base of BASES) {
    const url = base.replace(/\/+$/, "") + path;
    for (let attempt = 0; attempt <= retries; attempt++) {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeout);
      try {
        const res = await fetch(url, { ...options, signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return await res.json();
      } catch (e) {
        clearTimeout(t);
        errors.push(`${url}: ${e.message}`);
        // backoff nhẹ
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }
  }
  throw new Error("API unavailable. " + errors.join(" | "));
}
// INCOMES
export const getIncomes = () => apiFetch("/incomes");
export const createIncome = (p) =>
  apiFetch("/incomes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const updateIncome = (id, p) =>
  apiFetch(`/incomes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const deleteIncome = (id) =>
  apiFetch(`/incomes/${id}`, { method: "DELETE" });

// EXPENSES
export const getExpenses = () => apiFetch("/expenses");
export const createExpense = (p) =>
  apiFetch("/expenses", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const updateExpense = (id, p) =>
  apiFetch(`/expenses/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const deleteExpense = (id) =>
  apiFetch(`/expenses/${id}`, { method: "DELETE" });

// TIPS
export const getTips = () => apiFetch("/tips");
export const createTip = (p) =>
  apiFetch("/tips", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const updateTip = (id, p) =>
  apiFetch(`/tips/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const deleteTip = (id) =>
  apiFetch(`/tips/${id}`, { method: "DELETE" });

// KPI
export const getKPI = () => apiFetch("/stats/kpi");

// PRESETS (danh mục)
export const getPresets = (type) =>
  apiFetch(`/presets${type ? `?type=${encodeURIComponent(type)}` : ""}`);
export const createPreset = (p) =>
  apiFetch("/presets", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
export const deletePreset = (id) =>
  apiFetch(`/presets/${id}`, { method: "DELETE" });
// (tuỳ chọn)
export const updatePreset = (id, p) =>
  apiFetch(`/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
