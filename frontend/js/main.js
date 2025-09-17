// js/main.js
import { initIncome } from "../js/modules/income.js";
import { initExpense } from "../js/modules/expense.js";
// import { getIncomes, getExpenses } from "../js/data/storage.local.js";
// import { initTip, getClaimableTipsTotal } from "../js/modules/tip.js";
import { initTip } from "../js/modules/tip.js";
import { getKPI } from "./data/storage.api.js";

// Tabs
const navButtons = document.querySelectorAll(".tab-btn");
const pages = document.querySelectorAll(".tab-page");

function showTab(tabName) {
  pages.forEach((p) => p.classList.add("hidden"));
  navButtons.forEach((b) => b.classList.remove("active"));
  document.getElementById(tabName).classList.remove("hidden");
  document
    .querySelector(`.tab-btn[data-tab="${tabName}"]`)
    ?.classList.add("active");
}
navButtons.forEach((btn) =>
  btn.addEventListener("click", () => showTab(btn.dataset.tab))
);

// KPI
function formatCurrency(amount) {
  return amount.toLocaleString("vi-VN") + "đ";
}

// function updateKPIs() {
//   const incomes = getIncomes();
//   const expenses = getExpenses();
//   const totalIncome = incomes.reduce((s, i) => s + i.amount, 0);
//   const totalExpense = expenses.reduce((s, i) => s + i.amount, 0);
//   document.getElementById("kpi-income").textContent =
//     formatCurrency(totalIncome);
//   document.getElementById("kpi-expense").textContent =
//     formatCurrency(totalExpense);
//   document.getElementById("kpi-balance").textContent = formatCurrency(
//     totalIncome - totalExpense
//   );

async function updateKPIs() {
  const { totalIncome, totalExpense, totalTip, balance } = await getKPI();
  document.getElementById("kpi-income").textContent = formatCurrency(
    totalIncome || 0
  );
  document.getElementById("kpi-expense").textContent = formatCurrency(
    totalExpense || 0
  );
  document.getElementById("kpi-tip").textContent = formatCurrency(
    totalTip || 0
  );
  document.getElementById("kpi-balance").textContent = formatCurrency(
    balance || 0
  );
}

// const totalTip = getClaimableTipsTotal();

// document.getElementById("kpi-tip").textContent = formatCurrency(totalTip);

// balance = income - expense + tip (có thể thay đổi tuỳ ý)
// document.getElementById("kpi-balance").textContent = formatCurrency(
//   totalIncome - totalExpense + totalTip
// );

document.addEventListener("DOMContentLoaded", () => {
  const income = initIncome({ onChanged: updateKPIs });
  const expense = initExpense({ onChanged: updateKPIs });
  const tip = initTip({ onChanged: updateKPIs });

  // income.renderIncomes();
  // expense.renderExpenses();
  // tip.renderTips();

  income.renderIncomes?.(); // hàm async – không cần await
  expense.renderExpenses?.();
  tip.renderTips?.();

  updateKPIs();
  showTab("dashboard"); // mở tab Dashboard mặc định
});
