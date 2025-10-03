// js/main.js
import { initIncome } from "../js/modules/income.js";
import { initExpense } from "../js/modules/expense.js";
import { initTip } from "../js/modules/tip.js";
import { getKPI, getWallets } from "./data/storage.api.js";
import { initCategories } from "../js/modules/categories.js";
import { initDebtsPage } from "../js/modules/debt.js";
import { initGoals } from "../js/modules/goal.js";

let _tabBtns = [];
let _pages = [];
let _wallets = [];

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

function monthRange(val) {
  if (!val) return {};
  const [y, m] = String(val)
    .split("-")
    .map((s) => parseInt(s, 10));
  if (!y || !m) return {};
  const from = new Date(y, m - 1, 1);
  const to = new Date(y, m, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return {
    from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(
      from.getDate()
    )}`,
    to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
  };
}

function readFilterParams() {
  const monthEl = document.getElementById("dash-month");
  const fromEl = document.getElementById("dash-from");
  const toEl = document.getElementById("dash-to");
  const walletEl = document.getElementById("dash-wallet");
  const q = {};
  // ưu tiên from/to nếu có
  if (fromEl?.value) q.from = fromEl.value;
  if (toEl?.value) q.to = toEl.value;
  if (!q.from && !q.to && monthEl?.value) {
    Object.assign(q, monthRange(monthEl.value));
  }
  if (walletEl?.value) q.walletId = walletEl.value;
  return q;
}

async function updateKPIs() {
  const params = readFilterParams();
  const { totalIncome, totalExpense, totalTip, totalBalance } = await getKPI(
    params
  );
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

// ===== Thanh số dư từng ví =====
async function renderWalletStrip() {
  const host = document.getElementById("wallet-strip");
  if (!host) return;
  _wallets = await getWallets();
  if (!_wallets?.length) {
    host.innerHTML = `<span class="muted">Chưa có ví nào</span>`;
    return;
  }
  host.innerHTML = _wallets
    .map(
      (w) => `
      <div class="wallet-pill" data-id="${w._id}">
        <span class="name">${w.name}</span>
        <span class="amt">${formatCurrency(Number(w.balance || 0))} ${
        w.currency || "VND"
      }</span>
      </div>`
    )
    .join("");
  // đồng bộ select filter ví ở dashboard
  const sel = document.getElementById("dash-wallet");
  if (sel && !sel.dataset.populated) {
    sel.insertAdjacentHTML(
      "beforeend",
      _wallets
        .map((w) => `<option value="${w._id}">${w.name}</option>`)
        .join("")
    );
    sel.dataset.populated = "1";
  }
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

  // filter events
  ["dash-month", "dash-from", "dash-to", "dash-wallet"].forEach((id) => {
    const el = document.getElementById(id);
    el?.addEventListener("change", () => {
      // nếu chọn month -> clear from/to
      if (id === "dash-month") {
        const f = document.getElementById("dash-from");
        const t = document.getElementById("dash-to");
        if (el.value) {
          f.value = "";
          t.value = "";
        }
      }
      if (id === "dash-from" || id === "dash-to") {
        const m = document.getElementById("dash-month");
        if (m?.value) m.value = "";
      }
      updateKPIs();
    });
  });

  renderWalletStrip();
  updateKPIs();

  // Mở tab Dashboard mặc định (nếu có)
  const defaultTab = _tabBtns[0]?.dataset?.tab || "dashboard";
  showTab(defaultTab);
});

window.addEventListener("kpi:refresh", updateKPIs);
window.addEventListener("wallets:refresh", renderWalletStrip);
