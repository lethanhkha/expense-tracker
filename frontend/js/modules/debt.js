import {
  getDebts,
  createDebt,
  updateDebt,
  deleteDebt,
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
};

let current = []; // danh sách nợ
let editingId = null; // id đang sửa

const debtModal = document.getElementById("modal-debt")
  ? wireModal(document.getElementById("modal-debt"))
  : null;

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

function render() {
  if (!els.list) return;
  els.list.innerHTML = "";
  if (!current.length) {
    els.empty.style.display = "block";
    els.sum.textContent = "0";
    return;
  }
  els.empty.style.display = "none";
  const frag = document.createDocumentFragment();

  current.forEach((item) => {
    const li = document.createElement("li");
    li.className = "debt-item";
    li.dataset.id = item._id;

    li.innerHTML = `
      <div class="debt-left">
        <input type="checkbox" class="debt-check" ${item.done ? "checked" : ""}>
        <div class="debt-text ${item.done ? "is-done" : ""}">
          <div><strong>${item.title || "(Không tên)"}</strong></div>
          <small class="muted">
            ${(+item.amount || 0).toLocaleString("vi-VN")} đ
            ${
              item.dueDate
                ? " • hạn trả " +
                  new Date(item.dueDate).toLocaleDateString("vi-VN")
                : ""
            }
          </small>
        </div>
      </div>
      <div class="debt-actions">
        <button class="btn icon edit" title="Sửa">✏️</button>
        <button class="btn icon del" title="Xoá">🗑️</button>
      </div>
    `;
    frag.appendChild(li);
  });

  els.list.appendChild(frag);
  els.sum.textContent = fmtMoney(computeOpenAmount(current));
}

async function load() {
  try {
    const res = await getDebts();
    current = res?.data || res || []; // tuỳ backend trả {data} hay mảng
    render();
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
    if (!li) return;
    const id = li.dataset.id;

    // checkbox toggle
    if (e.target.classList.contains("debt-check")) {
      const checked = e.target.checked;
      try {
        await updateDebt(id, { done: checked });
        li.querySelector(".debt-text")?.classList.toggle("is-done", checked);
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
}

export function initDebtsPage() {
  bindEvents();
  load();
}
