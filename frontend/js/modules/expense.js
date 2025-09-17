// js/modules/expense.js
// import { getExpenses, saveExpenses } from "../data/storage.local.js";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} from "../data/storage.api.js";
import { formatCurrency } from "./income.js"; // dùng chung formatter

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function initExpense({ onChanged }) {
  const modal = document.getElementById("modal-expense");
  const openBtn = document.getElementById("btn-add-expense");
  const form = document.getElementById("expense-form");
  const title = document.getElementById("expense-modal-title");

  const idInput = document.getElementById("expense-id");
  const sourceInput = document.getElementById("expense-source");
  const amountInput = document.getElementById("expense-amount");
  const dateInput = document.getElementById("expense-date");
  const listEl = document.getElementById("expense-list");
  let currentExpenses = [];

  function open() {
    form?.reset();
    idInput.value = "";
    title.textContent = "Thêm chi tiêu";
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function openEdit(data) {
    open();
    if (!data) return;
    idInput.value = data._id;
    sourceInput.value = data.source || "";
    amountInput.value = data.amount ?? "";
    dateInput.value = (data.date || "").slice(0, 10);
    title.textContent = "Chỉnh sửa chi tiêu";
  }

  function close() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  openBtn?.addEventListener("click", open);
  modal
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) close();
  });

  // form?.addEventListener("submit", (e) => {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      // id: document.getElementById("expense-id").value || Date.now().toString(),
      // source: document.getElementById("expense-source").value.trim(),
      // amount: parseFloat(document.getElementById("expense-amount").value),
      // date: document.getElementById("expense-date").value,
      source: sourceInput.value.trim(),
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
    };

    // const list = getExpenses();
    // const ix = list.findIndex((i) => i.id === payload.id);
    // if (ix >= 0) list[ix] = payload;
    // else list.push(payload);
    // saveExpenses(list);

    // const id = document.getElementById("expense-id").value.trim();
    const id = idInput.value.trim();
    if (id) await updateExpense(id, payload);
    else await createExpense(payload);

    // renderExpenses();
    await renderExpenses();
    onChanged?.();
    close();
  });

  // function renderExpenses() {
  async function renderExpenses() {
    // const listEl = document.getElementById("expense-list");
    if (!listEl) return;
    // const expenses = getExpenses();
    const expenses = await getExpenses();
    currentExpenses = expenses;

    if (expenses.length === 0) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có khoản chi tiêu nào.</li>`;
      return;
    }

    listEl.innerHTML = expenses
      .map(
        (i) => `
        <li class="expense-item" data-id="${i._id}">
          <div class="expense-group-source-date">
            <span class="expense-source">${escapeHtml(i.source)}</span>
            <span class="expense-date muted">${(i.date || "").slice(
              0,
              10
            )}</span>
          </div>
          <div class="expense-group-action-amount">
            <div class="item-actions">
              <div class="item-action-buttons">
                <button class="btn ghost icon" type="button" data-action="edit" aria-label="Chỉnh sửa khoản chi">
                  ✏️
                </button>
                <button class="btn ghost icon" type="button" data-action="delete" aria-label="Xoá khoản chi">
                  🗑️
                </button>
              </div>
              <span class="expense-amount">-${formatCurrency(i.amount)}</span>
            </div>
          </div>
        </li>
        `
      )
      // <span class="expense-amount">-${formatCurrency(i.amount)}</span>
      .join("");
  }

  listEl?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest("li[data-id]");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === "edit") {
      const data = currentExpenses.find((i) => i._id === id);
      openEdit(data);
      return;
    }

    if (action === "delete") {
      const data = currentExpenses.find((i) => i._id === id);
      const name = data?.source ? `"${data.source}"` : "khoản chi";
      if (!confirm(`Xoá ${name}?`)) return;
      await deleteExpense(id);
      await renderExpenses();
      onChanged?.();
    }
  });

  return { renderExpenses };
}
