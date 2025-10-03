// modules/goal.js
import {
  getGoals,
  createGoal,
  updateGoal,
  deleteGoal,
  createGoalContribution,
  deleteGoalContribution,
  getGoalContributions,
  getWallets,
} from "../data/storage.api.js";
// import { setupQuickAmountButtons } from "./formatAndQuickbuttons.js";
import {
  setupQuickAmountButtons,
  todayISO,
  ensureDefaultDate,
  escapeHtml,
} from "./formatAndQuickbuttons.js";
import { showToast } from "./toast.js";
import { wireModal } from "./modal.js";

let currentGoals = [];
let walletMap = {};
let editingId = null; // <-- thêm state
let submitting = false; // <-- để chặn double-submit

const els = {
  page: document.getElementById("goals"),
  list: document.getElementById("goal-list"),
  empty: document.getElementById("goal-empty"),
  btnAdd: document.getElementById("btn-add-goal"),
  modalGoal: document.getElementById("modal-goal"),
  modalContrib: document.getElementById("modal-goal-contrib"),
  modalWithdraw: document.getElementById("modal-goal-withdraw"),
};

// Khởi tạo helper cho 3 modal
const goalModal = els.modalGoal ? wireModal(els.modalGoal) : null;
const contribModal = els.modalContrib ? wireModal(els.modalContrib) : null;
const withdrawModal = els.modalWithdraw ? wireModal(els.modalWithdraw) : null;

async function refreshWalletMap() {
  const wallets = await getWallets();
  walletMap = Object.fromEntries(
    (wallets || []).map((w) => [String(w._id), w.name])
  );
}

function shortISO(d) {
  try {
    return new Date(d).toISOString().slice(0, 10);
  } catch {
    return String(d || "").slice(0, 10);
  }
}
function signFmt(n) {
  const v = Number(n || 0);
  return (v >= 0 ? "+" : "") + v.toLocaleString("vi-VN");
}

function formatCurrency(n) {
  return Number(n || 0).toLocaleString("vi-VN");
}

function progressPct(saved, target) {
  if (!target) return 0;
  return Math.min(100, Math.round((saved / target) * 100));
}

async function render() {
  const list = els.list;
  if (!list) return;
  let goals = [];
  try {
    goals = await getGoals();
  } catch {
    list.innerHTML = `<li class="muted">Không tải được danh sách mục tiêu.</li>`;
    return;
  }
  currentGoals = goals;
  els.empty.style.display = goals.length ? "none" : "block";

  list.innerHTML = goals
    .map((g) => {
      const name = escapeHtml(g.name ?? "");
      const note = escapeHtml(g.note ?? "");
      const pct = progressPct(g.savedAmount, g.targetAmount);
      return `
      <li class="goal" data-id="${g._id}">
        <div class="row between">
          <div>
            <b>${name}</b>
            ${g.note ? `<div class="muted small">${note}</div>` : ""}
          </div>
          <div class="muted">
            ${formatCurrency(g.savedAmount)} / ${formatCurrency(g.targetAmount)}
          </div>
        </div>
        <div class="bar"><span style="width:${pct}%"></span></div>
        <div class="actions right" style="gap:8px;margin-top:8px">
          <button class="btn ghost toggle-contrib">📂 Xem </button>
          <button class="btn ghost add-contrib">➕ Góp</button>
          <button class="btn ghost withdraw-contrib">➖ Rút</button>
          <button class="btn ghost edit-goal">✏️</button>
          <button class="btn ghost del-goal">🗑️</button>
        </div>
        <ul class="contrib-list hidden" aria-hidden="true"></ul>
      </li>
    `;
    })
    .join("");
}

function openModalGoal() {
  const m = els.modalGoal;
  const form = m.querySelector("form");
  if (!editingId) {
    // chỉ reset khi tạo mới
    form.reset();
    m.querySelector("#goal-modal-title").textContent = "Thêm mục tiêu";
  } else {
    m.querySelector("#goal-modal-title").textContent = "Sửa mục tiêu";
  }
  goalModal?.open();
}

function closeModalGoal() {
  goalModal?.close();
  editingId = null; // reset
}

function openModalContrib(goalId) {
  const m = els.modalContrib;
  const form = m.querySelector("form");
  form.reset();
  form.dataset.goalId = goalId;
  // fill wallets
  const sel = form.querySelector('select[name="walletId"]');
  sel.innerHTML = Object.entries(walletMap)
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join("");

  // quick buttons
  const amountInput = form.querySelector('input[name="amount"]');
  setupQuickAmountButtons(m, amountInput, {
    amounts: [1000000, 500000, 200000, 100000, 50000, 20000, 10000, 0],
  });
  const dateInput = form.querySelector('input[name="date"]');
  ensureDefaultDate(dateInput, todayISO());

  contribModal?.open();
}

function closeModalContrib() {
  contribModal?.close();
}

function openModalWithdraw(goalId) {
  const m = els.modalWithdraw;
  const form = m.querySelector("form");
  form.reset();
  form.dataset.goalId = goalId;

  const sel = form.querySelector('select[name="walletId"]');
  sel.innerHTML = Object.entries(walletMap)
    .map(([id, name]) => `<option value="${id}">${name}</option>`)
    .join("");

  const dateInput = form.querySelector('input[name="date"]');
  ensureDefaultDate(dateInput, todayISO());

  withdrawModal?.open();
}

function closeModalWithdraw() {
  withdrawModal?.close();
}

export function initGoals() {
  if (!els.page) return;

  els.btnAdd?.addEventListener("click", openModalGoal);

  els.list?.addEventListener("click", async (e) => {
    const li = e.target.closest(".goal");
    if (!li) return;
    const id = li.dataset.id;

    // Toggle hiển thị / ẩn danh sách góp
    if (e.target.closest(".toggle-contrib")) {
      const ul = li.querySelector(".contrib-list");
      if (ul.classList.contains("hidden")) {
        await renderContribList(li, id);
        ul.classList.remove("hidden");
        ul.setAttribute("aria-hidden", "false");
        e.target.textContent = "📁 Ẩn góp";
      } else {
        ul.classList.add("hidden");
        ul.setAttribute("aria-hidden", "true");
        e.target.textContent = "📂 Xem góp";
      }
      return;
    }

    if (e.target.closest(".add-contrib")) {
      await refreshWalletMap();
      if (!Object.keys(walletMap).length) {
        Swal.fire("Chưa có ví", "Hãy tạo ít nhất 1 ví trước khi góp.", "info");
        return;
      }
      openModalContrib(id);
      return;
    }

    if (e.target.closest(".edit-goal")) {
      // mở modal sửa, fill dữ liệu
      const g = currentGoals.find((x) => x._id === id);
      if (!g) return;
      editingId = id;
      const form = els.modalGoal.querySelector("form");
      form.name.value = g.name || "";
      form.targetAmount.value = Number(g.targetAmount || 0);
      form.note.value = g.note || "";
      openModalGoal();
      return;
    }

    if (e.target.closest(".withdraw-contrib")) {
      // await refreshWalletMap();
      // openModalWithdraw(id);
      const choice = await Swal.fire({
        title: "Rút tiền ư?",
        text: "Rút ròi sao đạt mục tiêu được =))))",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Vẫn rút",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });
      if (!choice.isConfirmed) return; // Huỷ/đóng: dừng luôn

      await Swal.fire({
        title: "tui hong cho rút leu leu =)))",
        icon: "info",
        confirmButtonText: "OK",
        showCloseButton: true,
      });
      return; // Bấm OK hay nút X đều dừng, không làm gì tiếp
    }

    if (e.target.closest(".del-goal")) {
      const ok = await Swal.fire({
        title: "Xoá mục tiêu?",
        text: "Sẽ xoá cả các khoản góp liên quan.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!ok.isConfirmed) return;
      try {
        await deleteGoal(id);
        await render();
        Swal.fire("Đã xoá!", "Mục tiêu đã được xoá.", "success");
        window.dispatchEvent(new CustomEvent("kpi:refresh"));
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá thất bại.", "error");
      }

      return;
    }
  });

  // submit create goal
  els.modalGoal
    ?.querySelector("form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitting) return;
      submitting = true;
      const form = e.currentTarget;
      const submitBtn = form.querySelector('button[type="submit"]');
      const cancelBtn = form.querySelector(".btn-cancel,[data-close]");
      submitBtn?.setAttribute("disabled", "true");
      cancelBtn?.setAttribute("disabled", "true");
      form.setAttribute("aria-busy", "true");
      const f = e.currentTarget;
      const payload = {
        name: f.name.value.trim(),
        targetAmount: Number(f.targetAmount.value || 0),
        note: f.note.value.trim(),
      };
      if (!payload.name || payload.targetAmount <= 0) {
        Swal.fire(
          "Thiếu dữ liệu",
          "Nhập tên và số tiền mục tiêu hợp lệ.",
          "warning"
        );
        submitBtn?.removeAttribute("disabled");
        cancelBtn?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        submitting = false;
        return;
      }
      try {
        if (editingId) {
          await updateGoal(editingId, payload);
          showToast("Đã cập nhật mục tiêu!");
        } else {
          await createGoal(payload);
          showToast("Đã tạo mục tiêu!");
        }
        closeModalGoal();
        await render();
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Tạo mục tiêu thất bại.", "error");
      } finally {
        submitBtn?.removeAttribute("disabled");
        cancelBtn?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        submitting = false;
      }
    });

  // submit add contribution
  els.modalContrib
    ?.querySelector("form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitting) return;
      submitting = true;
      const form = e.currentTarget;
      const submitBtn = form.querySelector('button[type="submit"]');
      const cancelBtn = form.querySelector(".btn-cancel,[data-close]");
      submitBtn?.setAttribute("disabled", "true");
      cancelBtn?.setAttribute("disabled", "true");
      form.setAttribute("aria-busy", "true");

      const f = e.currentTarget;
      const goalId = f.dataset.goalId;
      const payload = {
        amount: Number(f.amount.value || 0),
        walletId: f.walletId.value,
        date: f.date.value || undefined,
        note: f.note.value?.trim(),
      };
      if (!goalId || !payload.walletId || payload.amount <= 0) {
        Swal.fire(
          "Thiếu dữ liệu",
          "Chọn ví và nhập số tiền hợp lệ.",
          "warning"
        );
        submitBtn?.removeAttribute("disabled");
        cancelBtn?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        submitting = false;
        return;
      }
      try {
        await createGoalContribution(goalId, payload);
        showToast("Đã ghi nhận khoản góp!");
        closeModalContrib();
        await render();
        // tự mở danh sách góp của goal vừa góp
        const li = els.list.querySelector(`.goal[data-id="${goalId}"]`);
        const toggle = li?.querySelector(".toggle-contrib");
        if (toggle) toggle.click();
        // ví & KPI đổi ngay
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        window.dispatchEvent(new CustomEvent("kpi:refresh"));
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Góp thất bại.", "error");
      } finally {
        submitBtn?.removeAttribute("disabled");
        cancelBtn?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        submitting = false;
      }
    });

  els.modalWithdraw
    ?.querySelector("form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      if (submitting) return;
      submitting = true;

      const form = e.currentTarget;
      const submitBtn = form.querySelector('button[type="submit"]');
      const cancelBtn = form.querySelector(".btn-cancel,[data-close]");
      submitBtn?.setAttribute("disabled", "true");
      cancelBtn?.setAttribute("disabled", "true");
      form.setAttribute("aria-busy", "true");

      const goalId = form.dataset.goalId;
      const payload = {
        amount: Number(form.amount.value || 0) * -1, // số âm để rút
        walletId: form.walletId.value,
        date: form.date.value || undefined,
        note: form.note.value?.trim(),
      };

      if (!goalId || !payload.walletId || payload.amount === 0) {
        Swal.fire(
          "Thiếu dữ liệu",
          "Chọn ví và nhập số tiền hợp lệ.",
          "warning"
        );
        submitBtn?.removeAttribute("disabled");
        cancelBtn?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        submitting = false;
        return;
      }

      try {
        await createGoalContribution(goalId, payload); // vẫn gọi API góp nhưng số âm
        closeModalWithdraw();
        await render();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        window.dispatchEvent(new CustomEvent("kpi:refresh"));
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Rút thất bại.", "error");
      } finally {
        submitBtn?.removeAttribute("disabled");
        cancelBtn?.removeAttribute("disabled");
        form.removeAttribute("aria-busy");
        submitting = false;
      }
    });

  // close modals
  els.modalGoal
    ?.querySelector(".btn-cancel")
    ?.addEventListener("click", closeModalGoal);
  els.modalContrib
    ?.querySelector(".btn-cancel")
    ?.addEventListener("click", closeModalContrib);
  els.modalWithdraw
    ?.querySelector(".btn-cancel")
    ?.addEventListener("click", closeModalWithdraw);
  render();
}

// ===== Render danh sách contributions dưới một goal =====
async function renderContribList(goalLi, goalId) {
  const ul = goalLi.querySelector(".contrib-list");
  if (!ul) return;
  ul.innerHTML = `<li class="muted">Đang tải...</li>`;
  let list = [];
  try {
    list = await getGoalContributions(goalId);
  } catch {
    ul.innerHTML = `<li class="muted">Không tải được danh sách góp.</li>`;
    return;
  }
  if (!Array.isArray(list) || list.length === 0) {
    ul.innerHTML = `<li class="muted">Chưa có khoản góp nào.</li>`;
    return;
  }
  // đảm bảo có map tên ví
  if (!Object.keys(walletMap || {}).length) await refreshWalletMap();
  ul.innerHTML = list
    .map((c) => {
      const wname = walletMap?.[String(c.walletId || "")] || "—";
      const amt = Number(c.amount || 0);
      const note = c.note
        ? `<div class="muted small">${escapeHtml(c.note)}</div>`
        : "";
      return `
        <li class="contrib" data-id="${c._id}">
          <div class="row between">
            <div class="" style="display: flex; flex-direction: column;">
              <b>${shortISO(c.date)}</b>
              <span class="muted">Ví: ${escapeHtml(wname)}</span>
              ${note}
            </div>
            <div class="${
              amt >= 0 ? "income-amount" : "text-danger"
            }">${signFmt(amt)}</div>
          </div>
        </li>
      `;
    })
    .join("");
}
