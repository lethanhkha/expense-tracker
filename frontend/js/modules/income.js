import { showToast } from "../modules/toast.js";

import {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
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
  // formatDateTimeVN,
} from "../modules/formatAndQuickbuttons.js";

import { wireModal } from "../modules/modal.js";

let walletMap = {};

async function refreshWalletMap() {
  const wallets = await getWallets();
  walletMap = Object.fromEntries(wallets.map((w) => [String(w._id), w.name]));
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
  const presetSelect = document.getElementById("income-preset");
  const walletSelect = document.getElementById("income-wallet");
  const listEl = document.getElementById("income-list");
  const monthInput = document.getElementById("income-month");

  let currentIncomes = [];

  const incomeModal = modal ? wireModal(modal) : null;

  async function loadIncomePresets() {
    if (!presetSelect) return;
    presetSelect.innerHTML = `<option value="">-- Chọn mẫu --</option>`;
    const presets = await getPresets("income");
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
    (wallets || []).forEach((w) => {
      walletSelect.insertAdjacentHTML(
        "beforeend",
        `<option value="${w._id}">${w.name} (${(w.balance ?? 0).toLocaleString(
          "vi-VN"
        )} ${w.currency || "VND"})</option>`
      );
    });

    // Ưu tiên chọn theo preselectId khi edit
    if (preselectId) {
      walletSelect.value = preselectId;
    } else if (!idInput.value && wallets && wallets.length) {
      // add mode -> chọn ví đầu
      walletSelect.value = wallets[0]._id;
    }
  }

  presetSelect?.addEventListener("change", () => {
    const opt = presetSelect.selectedOptions[0];

    // Nếu chọn lại option "Chọn mẫu" (value rỗng) -> reset form theo mode
    if (!opt || !opt.value) {
      // reset các field do preset fill
      sourceInput.value = "";
      amountInput.value = "";
      noteInput.value = "";

      // nếu đang thêm mới (không có id) -> đặt lại mặc định
      if (!idInput.value) {
        ensureDefaultDate(dateInput, todayISO());
        amountInput.value = amountInput.value || 0; // về 0 nếu rỗng
      }
      return;
    }

    // Ngược lại: chọn 1 preset -> autofill
    sourceInput.value = opt.dataset.source || "";
    amountInput.value = opt.dataset.amount || 0;
    noteInput.value = opt.dataset.note || "";
    // ngày giữ nguyên (today khi thêm mới / ngày cũ khi sửa)
  });

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
      loadWallets(data.walletId);
    } else {
      // mặc định hôm nay
      ensureDefaultDate(dateInput, todayISO());
      amountInput.value = amountInput.value || 0;
      loadWallets();
    }

    setupQuickAmountButtons(modal, amountInput);

    loadIncomePresets();

    presetSelect && (presetSelect.value = "");

    incomeModal?.open();
  }

  function close() {
    incomeModal?.close();
  }

  openBtn?.addEventListener("click", () => open());

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (submitting) return; // chặn double click
    submitting = true;
    const submitBtn = form.querySelector('button[type="submit"]');
    const cancelBtn = form.querySelector("[data-close]");
    submitBtn?.setAttribute("disabled", "true");
    cancelBtn?.setAttribute("disabled", "true");
    form.setAttribute("aria-busy", "true");

    if (walletSelect && walletSelect.options.length === 0) {
      showToast(
        "Vui lòng tạo ít nhất một ví trước khi thêm thu nhập.",
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
    const id = idInput.value.trim();

    try {
      if (id) await updateIncome(id, payload);
      else await createIncome(payload);
      // đóng modal NGAY, rồi mới đợi render (đỡ cảm giác lag)
      const renderPromise = renderIncomes();
      if (typeof onChanged === "function") onChanged();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
      close();
      await renderPromise;
      showToast("Thêm thành công", "success");
    } catch (err) {
      showToast(err?.message || "Có lỗi khi lưu khoản thu.", "error");
    } finally {
      submitBtn?.removeAttribute("disabled");
      cancelBtn?.removeAttribute("disabled");
      form.removeAttribute("aria-busy");
      submitting = false;
    }
  });

  // Set default yyyy-mm nếu trống
  function ensureMonthDefault() {
    if (!monthInput) return;
    if (!monthInput.value) {
      const now = new Date();
      monthInput.value =
        String(now.getFullYear()) +
        "-" +
        String(now.getMonth() + 1).padStart(2, "0");
    }
  }

  function monthRangeFromValue(val) {
    // val: "yyyy-mm" | null
    let y, m;
    if (val && /^\d{4}-\d{2}$/.test(val)) {
      const [yy, mm] = val.split("-").map((s) => parseInt(s, 10));
      y = yy;
      m = mm - 1;
    } else {
      const d = new Date();
      y = d.getFullYear();
      m = d.getMonth();
    }
    const from = new Date(y, m, 1);
    const to = new Date(y, m + 1, 0);
    const pad = (n) => String(n).padStart(2, "0");
    return {
      from: `${from.getFullYear()}-${pad(from.getMonth() + 1)}-${pad(
        from.getDate()
      )}`,
      to: `${to.getFullYear()}-${pad(to.getMonth() + 1)}-${pad(to.getDate())}`,
    };
  }

  async function renderIncomes() {
    if (!listEl) return;
    ensureMonthDefault();
    let incomes = [];
    try {
      const { from, to } = monthRangeFromValue(monthInput?.value);
      incomes = await getIncomes({ from, to });
    } catch (err) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Không tải được danh sách thu nhập: ${
        err?.message || "lỗi mạng/ máy chủ"
      }.</li>`;
      return;
    }
    currentIncomes = incomes;

    if (incomes.length === 0) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có khoản thu nhập nào.</li>`;
      return;
    }
    // load map ví
    await refreshWalletMap();

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
                <div class="group-amount-wallet">
                  <span class="income-amount">+${formatCurrency(
                    i.amount
                  )}</span>
                  <span class="wallet">(Ví: ${escapeHtml(
                    walletMap[String(i.walletId ?? "")] || "—"
                  )})</span>
                  </div>
                  </div>
                  </div>
                  </li>
                  `
      )
      .join("");
    // <span class="income-created muted" title="${escapeHtml(
    //   i.createdAt || ""
    // )}">• tạo lúc ${formatDateTimeVN(i.createdAt)}</span>
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
      const name = data?.source ? `"${data.source}"` : "khoản thu";

      const result = await Swal.fire({
        title: "Bạn chắc chắn?",
        text: `Xoá ${name}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!result.isConfirmed) return;

      try {
        await deleteIncome(id);
        await renderIncomes();
        onChanged?.();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        Swal.fire("Đã xoá!", `${name} đã bị xoá.`, "success");
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá khoản thu thất bại.", "error");
      }
    }

    if (action === "clone") {
      const orig = currentIncomes.find((i) => i._id === id);
      if (!orig) return;

      // Legacy record (tạo trước khi có Ví) -> bắt user cập nhật ví trước
      if (!orig.walletId) {
        showToast(
          "Khoản thu này được tạo trước khi bạn có Ví. Hãy chỉnh sửa và chọn Ví trước khi nhân bản.",
          "error"
        );
        // Mở luôn modal ở chế độ sửa để user gán Ví
        open({ mode: "edit", data: orig });
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
        await createIncome(payload);
        await renderIncomes();
        if (typeof onChanged === "function") onChanged();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        showToast("Đã nhân bản khoản thu.", "success");
      } catch (err) {
        showToast(err?.message || "Nhân bản khoản thu thất bại.", "error");
      }
      return;
    }
  });

  monthInput?.addEventListener("change", () => renderIncomes());

  renderIncomes();

  return { renderIncomes };
}

function buildCommonParams() {
  // Tự động đọc filter nếu trang đang có (không có thì bỏ qua)
  const from = document.querySelector("#filter-from")?.value || "";
  const to = document.querySelector("#filter-to")?.value || "";
  const walletId = document.querySelector("#filter-wallet")?.value || "";
  const categoryId = document.querySelector("#filter-category")?.value || "";
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;
  if (walletId) params.walletId = walletId;
  if (categoryId) params.categoryId = categoryId;
  return params;
}

// === Xuất CSV (Thu - ALL fields) ===
(function setupIncomeExportCSV() {
  function normalize(val) {
    if (val === null || val === undefined) return "";
    if (typeof val === "object") return JSON.stringify(val);
    return String(val);
  }
  function escCSV(s) {
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }
  function toCSVAll(rows) {
    if (!rows.length) return "";
    // Lấy UNION tất cả key xuất hiện trong mảng rows
    const keys = Array.from(
      rows.reduce((set, r) => {
        Object.keys(r || {}).forEach((k) => set.add(k));
        return set;
      }, new Set())
    );
    const head = keys.map((k) => escCSV(k)).join(";");
    const body = rows
      .map((r) => keys.map((k) => escCSV(normalize(r?.[k]))).join(";"))
      .join("\n");
    return head + "\n" + body;
  }

  async function fetchIncomesAll() {
    const data = await getIncomes(); // Trả về mảng Income trực tiếp
    return Array.isArray(data) ? data : [];
  }

  async function exportCSVAll() {
    try {
      const list = await fetchIncomesAll();
      if (!list.length) {
        alert("Không có dữ liệu Thu để xuất.");
        return;
      }
      const csv = toCSVAll(list);
      const ts = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
      const blob = new Blob([`\uFEFF${csv}`], {
        type: "text/csv;charset=utf-8;",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `incomes-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Xuất CSV (Thu) thất bại.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.querySelector("#btn-export-income");
    if (btn) btn.addEventListener("click", exportCSVAll);
  });
})();
