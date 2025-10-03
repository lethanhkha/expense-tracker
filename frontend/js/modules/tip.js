import {
  getTips,
  createTip,
  updateTip,
  deleteTip,
  getWallets,
  updateTipReceived,
} from "../data/storage.api.js";

import {
  formatCurrency,
  todayISO,
  ensureDefaultDate,
  escapeHtml,
  setupQuickAmountButtons,
  formatDateDisplayTip,
  currentMonthRangeISO,
} from "../modules/formatAndQuickbuttons.js";
import { showToast } from "../modules/toast.js";
import { wireModal } from "../modules/modal.js";

let currentTips = [];
const monthInput = document.getElementById("tip-month");

let walletMap = {};

async function refreshWalletMap() {
  const wallets = await getWallets();
  walletMap = Object.fromEntries(wallets.map((w) => [String(w._id), w.name]));
}

function groupBy(arr, keyFn) {
  return arr.reduce((acc, item) => {
    const key = keyFn(item);
    (acc[key] = acc[key] || []).push(item);
    return acc;
  }, {});
}

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

async function renderTips() {
  const list = document.getElementById("tip-list");
  if (!list) return;
  ensureMonthDefault();
  let tips = [];
  try {
    const { from, to } = monthRangeFromValue(monthInput?.value);
    tips = await getTips({ from, to });
  } catch (err) {
    list.innerHTML = `<li class="muted">Không tải được danh sách tip.</li>`;
    return;
  }
  currentTips = tips;
  if (tips.length === 0) {
    list.innerHTML = `<li class="muted">Chưa có tip nào.</li>`;
    return;
  }

  await refreshWalletMap();

  const grouped = groupBy(tips, (t) => (t.date || "").slice(0, 10));
  list.innerHTML = Object.entries(grouped)
    .map(([day, items]) => {
      const allChecked = items.every((t) => t.received);
      return `
        <li class="tip-day" data-day="${day}">
          <div class="tip-day-header">
            <input type="checkbox" class="day-checkbox" ${
              allChecked ? "checked" : ""
            } data-day="${day}" />
            <span class="day-label">${formatDateDisplayTip(day)}</span>
          </div>
          <ul class="tip-day-list">
            ${items
              .map(
                (i) => `
              <li class="tip-item" data-id="${i._id}">
                <span class="tip-group-checkbox-customer-note">
                    <input type="checkbox" class="tip-checkbox" data-id="${
                      i._id
                    }" ${i.received ? "checked" : ""}/>
                      <span class="tip-group-customer-note">
                        ${
                          i.customer
                            ? `<span class="tip-customer">${escapeHtml(
                                i.customer
                              )}</span>`
                            : ""
                        }
                        ${
                          i.note
                            ? `<span class="muted">&nbsp;${escapeHtml(
                                i.note
                              )}</span>`
                            : ""
                        }
                      </span>
                  </span>
                  <span class="tip-group-action-amount">
                    <div class="item-actions">
                      <div class="item-action-buttons">
                        <button class="btn ghost icon" data-action="edit">✏️</button>
                        <button class="btn ghost icon" data-action="delete">🗑️</button>
                      </div>
                    </div>
                    <div class="group-amount-wallet">
                      <span class="tip-amount">+${formatCurrency(
                        i.amount
                      )}</span>
                      <span class="wallet">[Ví: ${
                        walletMap[String(i.walletId ?? "")] || "—"
                      }]</span>
                    </div>
                  </span>
                </span>

              </li>`
              )
              .join("")}
          </ul>
        </li>
      `;
    })
    .join("");
}

export function initTip({ onChanged } = {}) {
  const tipModal = document.getElementById("modal-tip");
  const tipForm = document.getElementById("tip-form");
  const tipTitle = document.getElementById("tip-modal-title");
  const tipOpenBtn = document.getElementById("btn-add-tip");
  const list = document.getElementById("tip-list");
  const walletSelect = document.getElementById("tip-wallet");

  const tipW = tipModal ? wireModal(tipModal) : null;

  function openTipModal(mode = "add", data = null) {
    tipForm?.reset();
    ensureDefaultDate(document.getElementById("tip-date"), todayISO());
    let preselect = null;

    if (mode === "edit" && data) {
      document.getElementById("tip-id").value = data._id;
      document.getElementById("tip-amount").value = data.amount;
      document.getElementById("tip-date").value = (data.date || "").slice(
        0,
        10
      );
      document.getElementById("tip-customer").value = data.customer || "";
      document.getElementById("tip-note").value = data.note || "";

      preselect = data?.walletId ? String(data.walletId) : null;

      tipTitle.textContent = "Chỉnh sửa tip";
    } else {
      document.getElementById("tip-id").value = "";
      tipTitle.textContent = "Thêm tip";
    }

    setupQuickAmountButtons(tipModal, document.getElementById("tip-amount"));

    loadWallets(preselect);

    tipW?.open();
  }

  function closeTipModal() {
    tipW?.close();
  }

  async function loadWallets(preselectId) {
    if (!walletSelect) return;
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

    const isEdit = !!document.getElementById("tip-id").value;
    if (preselectId) {
      walletSelect.value = preselectId;
    } else if (!isEdit && wallets && wallets.length) {
      walletSelect.value = wallets[0]._id;
    }
  }

  async function submitTipForm(e) {
    e.preventDefault();

    if (walletSelect && walletSelect.options.length === 0) {
      showToast("Vui lòng tạo ít nhất một ví trước khi thêm tip.", "error");
      return;
    }

    const payload = {
      amount: Number(document.getElementById("tip-amount").value) || 0,
      date: document.getElementById("tip-date").value,
      customer: (document.getElementById("tip-customer").value || "").trim(),
      note: (document.getElementById("tip-note").value || "").trim(),
      walletId: walletSelect?.value || null,
    };

    const id = document.getElementById("tip-id").value.trim();

    try {
      if (id) await updateTip(id, payload);
      else await createTip(payload);
      await renderTips();
      if (typeof onChanged === "function") onChanged();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
      closeTipModal();
      showToast("Thêm thành công");
    } catch (err) {
      showToast(err?.message || "Có lỗi xảy ra khi lưu tip.", "error");
    }
  }

  // Events
  tipOpenBtn?.addEventListener("click", () => openTipModal("add"));

  tipForm?.addEventListener("submit", submitTipForm);

  list?.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest("li[data-id]");
    if (!li) return;
    const id = li.dataset.id;
    if (!id) return;

    const action = btn.dataset.action;
    if (action === "edit") {
      const data = currentTips.find((t) => t._id === id);
      if (data) openTipModal("edit", data);
      return;
    }

    if (action === "delete") {
      const data = currentTips.find((t) => t._id === id);
      const name = data?.customer ? `của ${data.customer}` : "này";

      const result = await Swal.fire({
        title: "Bạn chắc chắn?",
        text: `Xoá tip ${name}?`,
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!result.isConfirmed) return;

      try {
        await deleteTip(id);
        await renderTips();
        onChanged?.();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        Swal.fire("Đã xoá!", `Tip ${name} đã bị xoá.`, "success");
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá tip thất bại.", "error");
      }
    }
  });

  list?.addEventListener("change", async (e) => {
    // tip checkbox
    if (e.target.classList.contains("tip-checkbox")) {
      const id = e.target.dataset.id;
      const state = e.target.checked;
      await updateTipReceived(id, state);
      await renderTips();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
      window.dispatchEvent(new CustomEvent("kpi:refresh"));
      return;
    }
    // day checkbox
    if (e.target.classList.contains("day-checkbox")) {
      const day = e.target.dataset.day;
      const tipsOfDay = currentTips.filter((t) =>
        (t.date || "").startsWith(day)
      );
      for (const t of tipsOfDay) {
        await updateTipReceived(t._id, e.target.checked);
      }
      await renderTips();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
      window.dispatchEvent(new CustomEvent("kpi:refresh"));
      return;
    }
  });
  monthInput?.addEventListener("change", () => renderTips());
  renderTips();

  // Trả API
  return {
    renderTips,
  };
}

// === Xuất CSV (Tip - ALL fields) ===
(function setupTipExportCSV_All() {
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

  async function fetchTipsAll() {
    const data = await getTips(); // Trả về mảng Tip trực tiếp
    return Array.isArray(data) ? data : [];
  }

  async function exportCSVAll() {
    try {
      const list = await fetchTipsAll();
      if (!list.length) {
        alert("Không có dữ liệu Tip để xuất.");
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
      a.download = `tips-${ts}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
      alert("Xuất CSV (Tip) thất bại.");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    const btn = document.querySelector("#btn-export-tip");
    if (btn) btn.addEventListener("click", exportCSVAll);
  });
})();
