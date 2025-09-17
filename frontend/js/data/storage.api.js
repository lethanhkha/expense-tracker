// const BASE = "https://expense-tracker-backend-03sy.onrender.com";
const BASE = "https://expense-tracker-backend-03sy.onrender.com/api";

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
