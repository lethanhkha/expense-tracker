// js/main.js
import { initIncome } from "../js/modules/income.js";
import { initExpense } from "../js/modules/expense.js";
import { initTip } from "../js/modules/tip.js";
import { getKPI } from "./data/storage.api.js";
import { initCategories } from "../js/modules/categories.js";

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

document.addEventListener("DOMContentLoaded", () => {
  const income = initIncome({ onChanged: updateKPIs });
  const expense = initExpense({ onChanged: updateKPIs });
  const tip = initTip({ onChanged: updateKPIs });
  const cats = initCategories();

  income.renderIncomes?.(); // hàm async – không cần await
  expense.renderExpenses?.();
  tip.renderTips?.();

  updateKPIs();
  showTab("dashboard"); // mở tab Dashboard mặc định
});
