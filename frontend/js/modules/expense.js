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

import { showToast } from "../modules/toast.js";

let walletMap = {};

async function refreshWalletMap() {
  const wallets = await getWallets();
  walletMap = Object.fromEntries(wallets.map((w) => [String(w._id), w.name]));
}

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

  async function loadWallets(preselectId) {
    if (!walletSelect) return;
    // walletSelect.innerHTML = `<option value="">-- Chọn ví --</option>`;
    walletSelect.innerHTML = "";
    const wallets = await getWallets();
    wallets.forEach((w) => {
      walletSelect.insertAdjacentHTML(
        "beforeend",
        `<option value="${w._id}">${w.name} (${w.balance} ${
          w.currency || "VND"
        })</option>`
      );
    });

    // Auto chọn ví: ưu tiên ví mặc định, nếu không có thì chọn ví đầu tiên
    if (preselectId) {
      walletSelect.value = preselectId;
    } else if (!idInput.value && wallets && wallets.length) {
      walletSelect.value = wallets[0]._id;
    }
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
    if (!data) return;
    form?.reset();
    title.textContent = "Chỉnh sửa chi tiêu";
    idInput.value = data._id;
    sourceInput.value = data.source || "";
    amountInput.value = data.amount ?? "";
    dateInput.value = (data.date || "").slice(0, 10);
    noteInput.value = data.note || "";
    setupQuickAmountButtons(modal, amountInput);
    loadExpensePresets();
    presetSelect && (presetSelect.value = "");
    // chỉ đổ ví 1 lần và preselect
    loadWallets(data.walletId);
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
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

    // Không có ví nào -> chặn submit
    if (walletSelect && walletSelect.options.length === 0) {
      showToast(
        "Vui lòng tạo ít nhất một ví trước khi thêm chi tiêu.",
        "error"
      );
      submitBtn?.removeAttribute("disabled");
      cancelBtn?.removeAttribute("disabled");
      form.removeAttribute("aria-busy");
      submitting = false;
      return;
    }

    const payload = {
      source: sourceInput.value.trim(),
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
      note: noteInput?.value.trim() || "",
      walletId: walletSelect?.value || null,
    };

    if (!payload.walletId) {
      // alert("Vui lòng chọn ví cho khoản chi.");
      showToast("Vui lòng chọn ví cho khoản chi.", "error");
      submitting = false;
      submitBtn?.removeAttribute("disabled");
      cancelBtn?.removeAttribute("disabled");
      form.removeAttribute("aria-busy");
      return;
    }

    const id = idInput.value.trim();

    try {
      if (id) await updateExpense(id, payload);
      else await createExpense(payload);
      const renderPromise = renderExpenses();
      onChanged?.();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
      close();
      await renderPromise;
      showToast("Thêm thành công");
    } catch (err) {
      showToast(err?.message || "Có lỗi xảy ra khi lưu khoản chi.");
    } finally {
      submitBtn?.removeAttribute("disabled");
      cancelBtn?.removeAttribute("disabled");
      form.removeAttribute("aria-busy");
      submitting = false;
    }
  });

  async function renderExpenses() {
    if (!listEl) return;
    let expenses = [];
    try {
      expenses = await getExpenses();
    } catch (err) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Không tải được danh sách chi tiêu: ${err?.message}.</li>`;
      return;
    }
    currentExpenses = expenses;

    if (expenses.length === 0) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có khoản chi tiêu nào.</li>`;
      return;
    }

    await refreshWalletMap();

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
              <div class="group-amount-wallet">
                <span class="expense-amount">-${formatCurrency(i.amount)}</span>
                <span class="wallet">(Ví: ${escapeHtml(
                  walletMap[String(i.walletId ?? "")] || "—"
                )})</span>
              </div>
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

    // if (action === "delete") {
    //   const data = currentExpenses.find((i) => i._id === id);
    //   const name = data?.source ? `"${data.source}"` : "khoản chi";
    //   const ok = await showConfirm(`Bạn có chắc chắn muốn xoá ${name}?`, {
    //     confirmText: "Xoá",
    //     variant: "danger",
    //   });
    //   if (!ok) return;
    //   try {
    //     await deleteExpense(id);
    //     await renderExpenses();
    //     onChanged?.();
    //     showToast("Đã xoá khoản chi.", "success");
    //   } catch (err) {
    //     showToast(err?.message || "Xoá khoản chi thất bại.", "error");
    //   }
    // }

    if (action === "delete") {
      const result = await Swal.fire({
        title: "Bạn chắc chắn?",
        text: "Xoá khoản chi này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!result.isConfirmed) return;

      try {
        await deleteExpense(id);
        await renderExpenses();
        onChanged?.();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        Swal.fire("Đã xoá!", "Khoản chi đã bị xoá.", "success");
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá khoản chi thất bại.", "error");
      }
    }

    if (action === "clone") {
      const orig = currentExpenses.find((i) => i._id === id);
      if (!orig) return;

      if (!orig.walletId) {
        showToast(
          "Khoản chi này được tạo trước khi bạn có Ví. Hãy chỉnh sửa và chọn Ví trước khi nhân bản.",
          "error"
        );
        openEdit(orig);
        return;
      }

      const payload = {
        source: orig.source,
        amount: orig.amount,
        date: todayISO(),
        note: orig.note || "",
        walletId: orig.walletId || null,
      };
      try {
        await createExpense(payload);
        await renderExpenses();
        onChanged?.();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        showToast("Đã nhân bản khoản chi.", "success");
      } catch (err) {
        showToast(err?.message || "Nhân bản khoản chi thất bại.", "error");
      }
      return;
    }
  });

  return { renderExpenses };
}
