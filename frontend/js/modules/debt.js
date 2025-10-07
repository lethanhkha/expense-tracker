import {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
  getDebtContributions,
  createDebtContribution,
  deleteDebtContribution,
} from "../data/storage.api.js";
import { showToast } from "../modules/toast.js";
import { setupQuickAmountButtons } from "../modules/formatAndQuickbuttons.js";
import { wireModal } from "../modules/modal.js";

const els = {
  list: document.getElementById("debt-list"),
  empty: document.getElementById("debt-empty"),
  sum: document.getElementById("debt-open-amount"),
  addBtn: document.getElementById("btn-add-debt"),
  modal: document.getElementById("modal-debt"),
  form: document.getElementById("debt-form"),
  title: document.getElementById("debt-modal-title"),
  contribModalEl: document.getElementById("modal-debt-contrib"),
  contribForm: document.getElementById("debt-contrib-form"),
};

let current = []; // danh sách nợ
let editingId = null; // id đang sửa

const debtModal = document.getElementById("modal-debt")
  ? wireModal(document.getElementById("modal-debt"))
  : null;
const debtContribModal = els.contribModalEl
  ? wireModal(els.contribModalEl)
  : null;
let activeContribDebtId = null; // debtId đang mở modal góp

function fmtMoney(v) {
  return (+v || 0).toLocaleString("vi-VN");
}
function openModal() {
  debtModal?.open();
  attachQuickButtons();
}
function closeModal() {
  debtModal?.close();
  els.form.reset();
  editingId = null;
  els.title.textContent = "Thêm khoản nợ";
}

function computeOpenAmount(items) {
  return items.filter((x) => !x.done).reduce((s, x) => s + (+x.amount || 0), 0);
}

function attachQuickButtons() {
  // tránh gắn trùng mỗi lần mở modal
  if (els.modal.dataset.qbAttached === "1") return;

  const amountInput = els.form.querySelector('input[name="amount"]');
  if (!amountInput) return;

  // Gắn dải nút nhanh – bạn có thể chỉnh lại mảng amounts cho phù hợp
  setupQuickAmountButtons(els.modal, amountInput, {
    amounts: [500000, 200000, 100000, 50000, 20000, 10000, 5000, -5000, 0],
  });

  els.modal.dataset.qbAttached = "1";
}

async function render() {
  if (!els.list) return;
  els.list.innerHTML = "";
  if (!current.length) {
    els.empty.style.display = "block";
    els.sum.textContent = "0";
    return;
  }
  els.empty.style.display = "none";
  // === Lấy tổng góp cho từng khoản nợ để vẽ progress giống goal ===
  const paidMap = {};
  await Promise.all(
    current.map(async (item) => {
      try {
        const list = await getDebtContributions(item._id);
        const paid = (list || []).reduce((s, c) => s + (+c.amount || 0), 0);
        paidMap[item._id] = paid;
      } catch {
        paidMap[item._id] = 0;
      }
    })
  );

  els.list.innerHTML = current
    .map((item) => {
      const title = item.title || "(Không tên)";
      const amt = (+item.amount || 0).toLocaleString("vi-VN");
      const due = item.dueDate
        ? new Date(item.dueDate).toLocaleDateString("vi-VN")
        : "";
      const doneCls = item.done ? "is-done" : "";
      const paid = Number(paidMap[item._id] || 0);
      const pct = item.amount
        ? Math.min(100, Math.round((paid / item.amount) * 100))
        : 0;
      const paidFmt = paid.toLocaleString("vi-VN");
      return `
        <li class="debt" data-id="${item._id}">
          <div class="row between">
            <div class="${doneCls}">
              <b>${title}</b>
              <div class="muted small">
                ${paidFmt} / ${amt} đ
              </div>
              <div class="muted small">              
                ${due ? "hạn trả " + due : ""}
              </div>
            </div>
            <label class="muted small" style="display:flex;align-items:center;gap:6px;">
              <input type="checkbox" class="debt-check" ${
                item.done ? "checked" : ""
              }>
              Đã trả
            </label>
          </div>
          <div class="bar"><span style="width:${pct}%"></span></div>
          <div class="actions right" style="gap:8px;margin-top:8px">
            <button class="btn ghost toggle-contrib">📂</button>
            <button class="btn ghost contribute">➕</button>
            <button class="btn ghost edit">✏️</button>
            <button class="btn ghost del">🗑️</button>
          </div>
          <ul class="contrib-list hidden" aria-hidden="true"></ul>
        </li>
      `;
    })
    .join("");
  els.sum.textContent = fmtMoney(computeOpenAmount(current));
}

async function load() {
  try {
    const res = await getDebts();
    current = res?.data || res || [];
    await render();
  } catch (err) {
    showToast(err?.message || "Không tải được danh sách nợ", "error");
  }
}

function bindEvents() {
  els.addBtn?.addEventListener("click", () => {
    openModal();
  });

  els.form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(els.form);
    const payload = {
      title: (fd.get("title") || "").trim(),
      amount: +fd.get("amount") || 0,
      dueDate: fd.get("dueDate") || null,
    };
    try {
      if (editingId) {
        await updateDebt(editingId, payload);
        showToast("Đã cập nhật nợ", "success");
      } else {
        await createDebt({ ...payload, done: false });
        showToast("Đã thêm nợ", "success");
      }
      closeModal();
      await load();
    } catch (err) {
      showToast(err?.message || "Lưu nợ thất bại", "error");
    }
  });

  // delegation: check, edit, delete
  els.list?.addEventListener("click", async (e) => {
    const li = e.target.closest(".debt-item");
    const li2 = e.target.closest(".debt");
    const host = li || li2;
    if (!host) return;
    const id = host.dataset.id;
    // toggle "Xem" danh sách góp
    if (e.target.closest(".toggle-contrib")) {
      const btn = e.target.closest(".toggle-contrib");
      const ul = host.querySelector(".contrib-list");
      if (!ul) return;
      if (ul.classList.contains("hidden")) {
        await renderContribList(id, ul);
        ul.classList.remove("hidden");
        ul.setAttribute("aria-hidden", "false");
        if (btn) btn.textContent = "📁 Ẩn";
      } else {
        ul.classList.add("hidden");
        ul.setAttribute("aria-hidden", "true");
        if (btn) btn.textContent = "📂 Xem";
      }
      return;
    }

    // mở/ẩn danh sách góp
    if (e.target.closest(".contribute")) {
      // mở modal góp
      activeContribDebtId = id;
      // set default date = hôm nay
      if (els.contribForm) {
        const d = new Date(),
          pad = (n) => String(n).padStart(2, "0");
        els.contribForm.date.value = `${d.getFullYear()}-${pad(
          d.getMonth() + 1
        )}-${pad(d.getDate())}`;
        els.contribForm.amount.value = "";
        els.contribForm.note.value = "";
      }
      debtContribModal?.open();
      // đồng thời hiển thị list góp (nếu đang ẩn)
      const ul = host.querySelector(".contrib-list");
      if (ul?.classList.contains("hidden")) {
        await renderContribList(id, ul);
        ul.classList.remove("hidden");
        ul.setAttribute("aria-hidden", "false");
        const tgl = host.querySelector(".toggle-contrib");
        if (tgl) tgl.textContent = "📁 Ẩn";
      }
      return;
    }

    // checkbox toggle
    if (e.target.classList.contains("debt-check")) {
      const checked = e.target.checked;
      try {
        await updateDebt(id, { done: checked });
        host.querySelector(".is-done")?.classList.toggle("is-done", checked);
        // cập nhật sum mở
        const item = current.find((x) => x._id === id);
        if (item) {
          item.done = checked;
          els.sum.textContent = fmtMoney(computeOpenAmount(current));
        }
      } catch (err) {
        e.target.checked = !checked; // revert
        showToast(err?.message || "Không đổi trạng thái được", "error");
      }
      return;
    }

    // edit
    if (e.target.closest(".edit")) {
      const item = current.find((x) => x._id === id);
      if (!item) return;
      editingId = id;
      els.title.textContent = "Sửa khoản nợ";
      els.form.title.value = item.title || "";
      els.form.amount.value = item.amount || 0;
      els.form.dueDate.value = item.dueDate
        ? String(item.dueDate).slice(0, 10)
        : "";
      openModal();
      return;
    }

    // delete
    if (e.target.closest(".del")) {
      const result = await Swal.fire({
        title: "Bạn chắc chắn?",
        text: "Xoá khoản nợ này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });
      if (!result.isConfirmed) return;

      try {
        await deleteDebt(id);
        await load();
        Swal.fire("Đã xoá!", "Khoản nợ đã bị xoá.", "success");
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá khoản nợ thất bại.", "error");
      }
    }
  });
  // Render danh sách góp cho 1 khoản nợ
  async function renderContribList(debtId, hostUl) {
    try {
      const list = await getDebtContributions(debtId);
      if (!hostUl) {
        const li = els.list.querySelector(`.debt[data-id="${debtId}"]`);
        hostUl = li?.querySelector(".contrib-list");
      }
      if (!hostUl) return;
      if (!list?.length) {
        hostUl.innerHTML = `<li class="muted">Chưa có lần góp nào.</li>`;
        return;
      }
      hostUl.innerHTML = list
        .map((c) => {
          const d = c.date ? new Date(c.date).toLocaleDateString("vi-VN") : "";
          const amt = (+c.amount || 0).toLocaleString("vi-VN");
          const note = c.note ? `<div class="muted small">${c.note}</div>` : "";
          return `
            <li class="contrib" data-cid="${c._id}">
              <div class="row between">
                <div style="display:flex;flex-direction:column;">
                  <b>${d}</b>
                  ${note}
                </div>
                <strong class="income-amount">+${amt} đ</strong>
              </div>
              <div class="actions right" style="margin-top:6px">
                <button class="btn ghost" data-del="${c._id}" title="Xoá">🗑️</button>
              </div>
            </li>`;
        })
        .join("");
      // bind xoá (uỷ quyền)
      hostUl.onclick = async (ev) => {
        const cid = ev.target?.dataset?.del;
        if (!cid) return;
        try {
          await deleteDebtContribution(debtId, cid);
          await renderContribList(debtId, hostUl);
          showToast("Đã xoá lần góp", "success");
        } catch (err) {
          showToast(err?.message || "Xoá không thành công", "error");
        }
      };
    } catch (err) {
      hostUl.innerHTML = `<li class="muted">Không tải được danh sách góp.</li>`;
    }
  }
  // Submit modal góp nợ
  els.contribForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(els.contribForm);
    const payload = {
      amount: +fd.get("amount") || 0,
      date: fd.get("date") || undefined,
      note: (fd.get("note") || "").trim(),
    };
    if (!activeContribDebtId) return;
    if (!payload.amount || payload.amount <= 0) {
      return showToast("Số tiền phải > 0", "error");
    }
    try {
      await createDebtContribution(activeContribDebtId, payload);
      showToast("Đã ghi góp nợ", "success");
      debtContribModal?.close();
      // refresh danh sách góp của khoản nợ đang mở
      await renderContribList(activeContribDebtId);
      // (tuỳ chọn) cập nhật tổng nợ chưa trả hiển thị
      await load(); // để tính lại sum mở ở đầu trang nợ
    } catch (err) {
      showToast(err?.message || "Góp nợ thất bại", "error");
    }
  });
}

export function initDebtsPage() {
  bindEvents();
  load();
}
