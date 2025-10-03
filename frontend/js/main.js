// js/main.js
import { initIncome } from "../js/modules/income.js";
import { initExpense } from "../js/modules/expense.js";
import { initTip } from "../js/modules/tip.js";
import { getKPI } from "./data/storage.api.js";
import { initCategories } from "../js/modules/categories.js";
import { initDebtsPage } from "../js/modules/debt.js";
import { initGoals } from "../js/modules/goal.js";

let _tabBtns = [];
let _pages = [];
function showTab(tabName) {
  if (!tabName) return;
  const pageEl = document.getElementById(tabName);
  if (!pageEl) return;
  _pages.forEach((p) => p?.classList?.add?.("hidden"));
  _tabBtns.forEach((b) => b?.classList?.remove?.("active"));
  pageEl.classList.remove("hidden");
  const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
  activeBtn?.classList?.add?.("active");
  if (tabName === "dashboard") updateKPIs();
}

// KPI
function formatCurrency(amount) {
  return amount.toLocaleString("vi-VN") + "đ";
}

async function updateKPIs() {
  const { totalIncome, totalExpense, totalTip, totalBalance } = await getKPI();
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
    totalBalance || 0
  );
}

document.addEventListener("DOMContentLoaded", () => {
  // Re-query sau khi DOM đã render
  _tabBtns = Array.from(document.querySelectorAll(".tab-btn[data-tab]"));
  _pages = Array.from(document.querySelectorAll(".tab-page[id]"));

  // Gắn sự kiện click an toàn
  _tabBtns.forEach((btn) =>
    btn.addEventListener("click", () => showTab(btn.dataset.tab))
  );

  // Khởi tạo các module
  const income = initIncome({ onChanged: updateKPIs });
  const expense = initExpense({ onChanged: updateKPIs });
  const tip = initTip({ onChanged: updateKPIs });
  initCategories();
  initDebtsPage();
  initGoals();

  // Render lần đầu
  income.renderIncomes?.();
  expense.renderExpenses?.();
  tip.renderTips?.();
  updateKPIs();

  // Mở tab Dashboard mặc định (nếu có)
  const defaultTab = _tabBtns[0]?.dataset?.tab || "dashboard";
  showTab(defaultTab);
});

window.addEventListener("kpi:refresh", updateKPIs);
