// import { getTips, saveTips } from "../data/storage.local.js";
import {
  getTips,
  createTip,
  updateTip,
  deleteTip,
} from "../data/storage.api.js";
import { formatCurrency } from "./income.js";

// Utils
// function formatCurrency(amount) {
//   return (Number(amount) || 0).toLocaleString("vi-VN") + "đ";
// }

// function todayStr() {
//   return new Date().toISOString().split("T")[0];
// }

const todayStr = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
    .toISOString()
    .slice(0, 10); // yyyy-mm-dd (local midnight)
};

// function getClaimableTipsTotal() {
//   const today = todayStr();
//   return getTips()
//     .filter((t) => t.date < today)
//     .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);
// }

// Render list
// function renderTips() {
let currentTips = [];

async function renderTips() {
  const list = document.getElementById("tip-list");
  if (!list) return;

  // const tips = getTips();
  const tips = await getTips();
  currentTips = tips;
  if (tips.length === 0) {
    list.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có tip nào.</li>`;
    return;
  }

  // list.innerHTML = tips
  //   .map(
  //     (t) => `
  //     <li class="tip-item" data-id="${t._id}">
  //       <div class="tip-group-source-date">
  //         <span class="tip-amount">${formatCurrency(t.amount)}</span>
  //         <span class="tip-date">${t.date?.slice(0, 10)}</span>
  //         ${
  //           t.customer
  //             ? `<span class="income-source">${escapeHtml(t.customer)}</span>`
  //             : ""
  //         }
  //         ${t.note ? `<span class="muted">${escapeHtml(t.note)}</span>` : ""}
  //       </div>
  //       <div class="item-actions">
  //         <button class="btn ghost icon" type="button" data-action="edit" aria-label="Chỉnh sửa tip">
  //           ✏️
  //         </button>
  //         <button class="btn ghost icon" type="button" data-action="delete" aria-label="Xoá tip">
  //           🗑️
  //         </button>
  //       </div>
  //     </li>`
  //   )

  // <span class="tip-customer">${escapeHtml(i.customer)}</span>

  list.innerHTML = tips
    .map(
      (i) => `
          <li class="tip-item" data-id="${i._id}">
            <div class="tip-group-customer-date-note">
              ${
                i.customer
                  ? `<span class="tip-customer">${escapeHtml(
                      i.customer
                    )}</span>`
                  : ""
              }
              <div class="tip-group-date-note">
                <span class="tip-date muted">${(i.date || "").slice(
                  0,
                  10
                )}</span>
              ${
                i.note
                  ? `<span class="muted">&nbsp;- ${escapeHtml(i.note)}</span>`
                  : ""
              }

              </div>
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
                <span class="tip-amount">+${formatCurrency(i.amount)}</span>
              </div>
            </div>
          </li>
          `
    )
    // <span class="income-date">${t.date}</span>
    .join("");
}
function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function initTip({ onChanged } = {}) {
  const tipModal = document.getElementById("modal-tip");
  const tipForm = document.getElementById("tip-form");
  const tipTitle = document.getElementById("tip-modal-title");
  const tipOpenBtn = document.getElementById("btn-add-tip");
  const list = document.getElementById("tip-list");

  function openTipModal(mode = "add", data = null) {
    tipForm?.reset();
    document.getElementById("tip-date").value = todayStr();

    if (mode === "edit" && data) {
      // document.getElementById("tip-id").value = data.id;
      document.getElementById("tip-id").value = data._id;
      document.getElementById("tip-amount").value = data.amount;
      // document.getElementById("tip-date").value = data.date;
      document.getElementById("tip-date").value = (data.date || "").slice(
        0,
        10
      );
      document.getElementById("tip-customer").value = data.customer || "";
      document.getElementById("tip-note").value = data.note || "";
      tipTitle.textContent = "Chỉnh sửa tip";
    } else {
      document.getElementById("tip-id").value = "";
      tipTitle.textContent = "Thêm tip";
    }

    tipModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeTipModal() {
    tipModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  // function submitTipForm(e) {
  async function submitTipForm(e) {
    e.preventDefault();
    const payload = {
      // id: document.getElementById("tip-id").value || Date.now().toString(),
      amount: Number(document.getElementById("tip-amount").value) || 0,
      date: document.getElementById("tip-date").value,
      customer: (document.getElementById("tip-customer").value || "").trim(),
      note: (document.getElementById("tip-note").value || "").trim(),
    };

    // let tips = getTips();
    // const idx = tips.findIndex((t) => t.id === payload.id);
    // if (idx >= 0) {
    //   tips[idx] = payload;
    // } else {
    //   tips.push(payload);
    // }

    // saveTips(tips);
    // renderTips();
    const id = document.getElementById("tip-id").value.trim();
    if (id) {
      await updateTip(id, payload);
    } else {
      await createTip(payload);
    }
    await renderTips();
    if (typeof onChanged === "function") onChanged();
    closeTipModal();
  }

  // Events
  tipOpenBtn?.addEventListener("click", () => openTipModal("add"));
  tipModal
    ?.querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", closeTipModal));
  tipModal?.addEventListener("click", (e) => {
    if (e.target === tipModal) closeTipModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && tipModal.classList.contains("show"))
      closeTipModal();
  });
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
      if (!confirm(`Xoá tip ${name}?`)) return;
      await deleteTip(id);
      await renderTips();
      if (typeof onChanged === "function") onChanged();
    }
  });

  renderTips();

  // Trả API giống income/expense
  return {
    renderTips,
    // getTips,
    // saveTips,
    // getClaimableTipsTotal,
  };
}

// Xuất hàm chính
// export { initTip, getClaimableTipsTotal };
// export { initTip };
