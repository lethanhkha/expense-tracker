// ===== Multi BASE + Fetch helper =====
const BASES = [
  "https://expense-tracker-production-7cff.up.railway.app/api",
  `${location.origin}/api`,
  "http://localhost:8000/api",
];

// const BASE = "https://expense-tracker-backend-03sy.onrender.com/api";
// const BASE = "https://expense-tracker-production-7cff.up.railway.app/api";
const BASE = "http://localhost:8000/api";

export async function getIncomes() {
  return (await fetch(`${BASE}/incomes`)).json();
}
export async function createIncome(p) {
  return (
    await fetch(`${BASE}/incomes`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
  ).json();
}
export async function updateIncome(id, p) {
  return (
    await fetch(`${BASE}/incomes/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
  ).json();
}
export async function deleteIncome(id) {
  await fetch(`${BASE}/incomes/${id}`, { method: "DELETE" });
}

export async function getExpenses() {
  return (await fetch(`${BASE}/expenses`)).json();
}
export async function createExpense(p) {
  return (
    await fetch(`${BASE}/expenses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
  ).json();
}
export async function updateExpense(id, p) {
  return (
    await fetch(`${BASE}/expenses/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
  ).json();
}
export async function deleteExpense(id) {
  await fetch(`${BASE}/expenses/${id}`, { method: "DELETE" });
}

export async function getTips() {
  return (await fetch(`${BASE}/tips`)).json();
}
export async function createTip(p) {
  return (
    await fetch(`${BASE}/tips`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
  ).json();
}
export async function updateTip(id, p) {
  return (
    await fetch(`${BASE}/tips/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(p),
    })
  ).json();
}
export async function deleteTip(id) {
  await fetch(`${BASE}/tips/${id}`, { method: "DELETE" });
}

export async function getKPI() {
  return (await fetch(`${BASE}/stats/kpi`)).json();
}

// ===== Presets (danh mục) =====
export async function getPresets(type) {
  const url = `${BASE}/presets${
    type ? `?type=${encodeURIComponent(type)}` : ""
  }`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch presets");
  return res.json();
}

export async function createPreset(p) {
  const res = await fetch(`${BASE}/presets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(p),
  });
  if (!res.ok) throw new Error("Failed to create preset");
  return res.json();
}

export async function deletePreset(id) {
  const res = await fetch(`${BASE}/presets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete preset");
  return res.json();
}

export async function getWallets() {
  const res = await fetch(`${BASE}/wallets`);
  if (!res.ok) throw new Error("Failed to load wallets");
  return res.json();
}

export async function createWallet(payload) {
  const res = await fetch(`${BASE}/wallets`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to create wallet");
  return res.json();
}

// Danh mục (presets)
export async function updatePreset(id, payload) {
  const res = await fetch(`${BASE}/presets/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update preset");
  return res.json();
}

// Ví (wallets)
// after
export async function updateWallet(id, payload) {
  const res = await fetch(`${BASE}/wallets/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to update wallet");
  return res.json();
}

export async function deleteWallet(id) {
  const res = await fetch(`${BASE}/wallets/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete wallet");
  return res.json();
}
