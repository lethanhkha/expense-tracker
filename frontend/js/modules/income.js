// js/modules/income.js
// import { getIncomes, saveIncomes } from "../data/storage.local.js";
import {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
} from "../data/storage.api.js";

import {
  formatCurrency,
  formatDateDisplay,
  todayISO,
  setupQuickAmountButtons,
  ensureDefaultDate,
  escapeHtml,
} from "../modules/formatAndQuickbuttons.js";

/**
 * Return today's date in yyyy‑mm‑dd format (local timezone).
 * @returns {string}
 */
function todayStr() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10);
}

/**
 * Convert a yyyy-mm-dd date string to dd/MM/yyyy for display.
 * Returns an empty string if the input is falsy.
 * @param {string} dateStr
 * @returns {string}
 */
function formatDate(dateStr) {
  if (!dateStr) return "";
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

/**
 * Initialise the income module. Handles showing/closing the modal, submitting
 * the form to the backend, rendering the list, and wiring up quick amount buttons.
 * @param {object} options
 * @param {function} options.onChanged Callback fired after the list changes
 */
export function initIncome({ onChanged }) {
  let submitting = false;

  const modal = document.getElementById("modal-income");
  const openBtn = document.getElementById("btn-add-income");
  const form = document.getElementById("income-form");
  const title = document.getElementById("income-modal-title");

  const idInput = document.getElementById("income-id");
  const sourceInput = document.getElementById("income-source");
  const amountInput = document.getElementById("income-amount");
  const dateInput = document.getElementById("income-date");
  const noteInput = document.getElementById("income-note");

  const listEl = document.getElementById("income-list");
  let currentIncomes = [];

  /**
   * Show the modal. In add mode the form resets and the date is preset
   * to today; in edit mode the fields are prefilled from `data`.
   * @param {object} param0
   * @param {"add"|"edit"} param0.mode
   * @param {object|null} param0.data The income record to edit
   */
  function open({ mode = "add", data = null } = {}) {
    form?.reset();
    idInput.value = "";
    title.textContent = "Thêm khoản thu";

    if (mode === "edit" && data) {
      idInput.value = data._id;
      sourceInput.value = data.source || "";
      amountInput.value = data.amount ?? "";
      dateInput.value = (data.date || "").slice(0, 10);
      noteInput.value = data.note || "";
      title.textContent = "Chỉnh sửa khoản thu";
    } else {
      // mặc định hôm nay
      ensureDefaultDate(dateInput, todayISO());
      amountInput.value = amountInput.value || 0;
    }

    setupQuickAmountButtons(modal, amountInput);

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function close() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  openBtn?.addEventListener("click", () => open());
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
    if (submitting) return; // chặn double click
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
    };
    const id = idInput.value.trim();

    try {
      if (id) await updateIncome(id, payload);
      else await createIncome(payload);
      // đóng modal NGAY, rồi mới đợi render (đỡ cảm giác lag)
      const renderPromise = renderIncomes();
      if (typeof onChanged === "function") onChanged();
      close();
      await renderPromise;
    } finally {
      submitBtn?.removeAttribute("disabled");
      cancelBtn?.removeAttribute("disabled");
      form.removeAttribute("aria-busy");
      submitting = false;
    }
  });

  async function renderIncomes() {
    if (!listEl) return;
    const incomes = await getIncomes();
    currentIncomes = incomes;

    if (incomes.length === 0) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có khoản thu nhập nào.</li>`;
      return;
    }

    listEl.innerHTML = incomes
      .map(
        (i) => `
          <li class="income-item" data-id="${i._id}">
            <div class="income-group-source-date">
              <span class="income-source">${escapeHtml(i.source)}</span>
              <span class="income-group-date-note">
                <span class="income-date muted">${formatDateDisplay(
                  i.date
                )}</span>
                ${
                  i.note
                    ? `<span class="income-note muted">&nbsp;- ${escapeHtml(
                        i.note
                      )}</span>`
                    : ""
                } 
              </span>
            </div>
            <div class="income-group-action-amount">
              <div class="item-actions">
                <div class="item-action-buttons">
                  <button class="btn ghost icon" type="button" data-action="edit" aria-label="Chỉnh sửa thu nhập">
                    ✏️
                  </button>
                  <button class="btn ghost icon" type="button" data-action="delete" aria-label="Xoá thu nhập">
                    🗑️
                  </button>
                  <button class="btn ghost icon" type="button" data-action="clone" aria-label="Nhân bản thu nhập">
                    📄
                  </button>
                </div>
                <span class="income-amount">+${formatCurrency(i.amount)}</span>
              </div>
            </div>
          </li>
        `
      )
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
      const data = currentIncomes.find((i) => i._id === id);
      if (data) open({ mode: "edit", data });
      return;
    }

    if (action === "delete") {
      const data = currentIncomes.find((i) => i._id === id);
      const name = data?.source ? `"${data.source}"` : "mục thu nhập";
      if (!confirm(`Xoá ${name}?`)) return;
      await deleteIncome(id);
      await renderIncomes();
      if (typeof onChanged === "function") onChanged();
    }

    if (action === "clone") {
      const orig = currentIncomes.find((i) => i._id === id);
      if (!orig) return;
      const payload = {
        source: orig.source,
        amount: orig.amount,
        date: todayISO(), // clone nhưng mặc định ngày hôm nay
        note: orig.note || "",
      };
      await createIncome(payload);
      await renderIncomes();
      if (typeof onChanged === "function") onChanged();
      return;
    }
  });

  renderIncomes();

  return { renderIncomes };
}
