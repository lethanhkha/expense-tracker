// js/modules/expense.js
// import { getExpenses, saveExpenses } from "../data/storage.local.js";
import {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
  getPresets,
  getWallets,
} from "../data/storage.api.js";

import {
  formatCurrency,
  formatDateDisplay,
  todayISO,
  setupQuickAmountButtons,
  ensureDefaultDate,
  escapeHtml,
} from "../modules/formatAndQuickbuttons.js";

export function initExpense({ onChanged }) {
  let submitting = false;

  const modal = document.getElementById("modal-expense");
  const openBtn = document.getElementById("btn-add-expense");
  const form = document.getElementById("expense-form");
  const title = document.getElementById("expense-modal-title");

  const idInput = document.getElementById("expense-id");
  const sourceInput = document.getElementById("expense-source");
  const amountInput = document.getElementById("expense-amount");
  const dateInput = document.getElementById("expense-date");
  const noteInput = document.getElementById("expense-note");
  const presetSelect = document.getElementById("expense-preset");
  const walletSelect = document.getElementById("expense-wallet");

  const listEl = document.getElementById("expense-list");
  let currentExpenses = [];

  async function loadExpensePresets() {
    if (!presetSelect) return;
    presetSelect.innerHTML = `<option value="">-- Chọn mẫu --</option>`;
    const presets = await getPresets("expense");
    presetSelect.insertAdjacentHTML(
      "beforeend",
      (presets || [])
        .map(
          (p) => `
        <option
          value="${p._id}"
          data-source="${escapeHtml(p.source)}"
          data-amount="${p.amount ?? ""}"
          data-note="${escapeHtml(p.note || "")}">
          ${escapeHtml(p.source)}${
            typeof p.amount === "number" ? ` (${formatCurrency(p.amount)})` : ""
          }
        </option>`
        )
        .join("")
    );
  }

  async function loadWallets() {
    if (!walletSelect) return;
    walletSelect.innerHTML = `<option value="">-- Chọn ví --</option>`;
    const wallets = await getWallets();
    wallets.forEach((w) => {
      walletSelect.insertAdjacentHTML(
        "beforeend",
        `<option value="${w._id}">${w.name} (${w.balance} ${
          w.currency || "VND"
        })</option>`
      );
    });
  }

  presetSelect?.addEventListener("change", () => {
    const opt = presetSelect.selectedOptions[0];

    // Nếu chọn lại option "Chọn mẫu" -> reset form theo mode
    if (!opt || !opt.value) {
      sourceInput.value = "";
      amountInput.value = "";
      noteInput.value = "";

      if (!idInput.value) {
        ensureDefaultDate(dateInput, todayISO());
        amountInput.value = amountInput.value || 0;
      }
      return;
    }

    // Chọn preset -> autofill
    sourceInput.value = opt.dataset.source || "";
    amountInput.value = opt.dataset.amount || 0;
    noteInput.value = opt.dataset.note || "";
  });

  function open() {
    form?.reset();
    idInput.value = "";
    title.textContent = "Thêm chi tiêu";

    // mặc định hôm nay khi thêm mới
    ensureDefaultDate(dateInput, todayISO());
    amountInput.value = amountInput.value || 0;

    setupQuickAmountButtons(modal, amountInput);

    loadExpensePresets();
    presetSelect && (presetSelect.value = "");

    loadWallets();

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
    noteInput.value = data.note || "";
    loadWallets();
    if (data.walletId && walletSelect) walletSelect.value = data.walletId;
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

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (submitting) return;
    submitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const cancelBtn = form.querySelector("[data-close]");
    submitBtn?.setAttribute("disabled", "true");
    cancelBtn?.setAttribute("disabled", "true");
    form.setAttribute("aria-busy", "true");

    const payload = {
      source: sourceInput.value.trim(),
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
      note: noteInput?.value.trim() || "",
      walletId: walletSelect?.value || null,
    };

    const id = idInput.value.trim();

    try {
      if (id) await updateExpense(id, payload);
      else await createExpense(payload);
      const renderPromise = renderExpenses();
      onChanged?.();
      close();
      await renderPromise;
    } finally {
      submitBtn?.removeAttribute("disabled");
      cancelBtn?.removeAttribute("disabled");
      form.removeAttribute("aria-busy");
      submitting = false;
    }
  });

  async function renderExpenses() {
    if (!listEl) return;
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
            <span class="expense-group-date-note">
              <span class="expense-date muted">${formatDateDisplay(
                i.date
              )}</span>
              ${
                i.note
                  ? `<span class="muted">&nbsp;- ${escapeHtml(i.note)}</span>`
                  : ""
              }
            </span>
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
                <button class="btn ghost icon" type="button" data-action="clone" aria-label="Nhân bản thu nhập">
                  📄
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

    if (action === "clone") {
      const orig = currentExpenses.find((i) => i._id === id);
      if (!orig) return;
      const payload = {
        source: orig.source,
        amount: orig.amount,
        date: todayISO(),
        note: orig.note || "",
      };
      await createExpense(payload);
      await renderExpenses();
      onChanged?.();
      return;
    }
  });

  return { renderExpenses };
}
