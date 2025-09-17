// js/data/storage.local.js
export function getIncomes() {
  return JSON.parse(localStorage.getItem("incomes") || "[]");
}
export function saveIncomes(incomes) {
  localStorage.setItem("incomes", JSON.stringify(incomes));
}

export function getExpenses() {
  return JSON.parse(localStorage.getItem("expenses") || "[]");
}
export function saveExpenses(expenses) {
  localStorage.setItem("expenses", JSON.stringify(expenses));
}

export function getTips() {
  return JSON.parse(localStorage.getItem("tips") || "[]");
}

export function saveTips(tips) {
  localStorage.setItem("tips", JSON.stringify(tips));
}
