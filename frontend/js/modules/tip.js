// import { getTips, saveTips } from "../data/storage.local.js";
import {
  getTips,
  createTip,
  updateTip,
  deleteTip,
  getWallets,
} from "../data/storage.api.js";

import {
  formatCurrency,
  formatDateDisplayTip,
  todayISO,
  ensureDefaultDate,
  escapeHtml,
  setupQuickAmountButtons,
} from "../modules/formatAndQuickbuttons.js";

import { showToast } from "../modules/toast.js";

let currentTips = [];

async function renderTips() {
  const list = document.getElementById("tip-list");
  if (!list) return;

  // const tips = getTips();
  // const tips = await getTips();
  let tips = [];
  try {
    tips = await getTips();
  } catch (err) {
    list.innerHTML = `<li class="muted" style="padding:8px 0;">Không tải được danh sách tip: ${
      err?.message || "lỗi mạng/ máy chủ"
    }.</li>`;
    return;
  }
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
              <span class="tip-date muted">${formatDateDisplayTip(
                i.date
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

export function initTip({ onChanged } = {}) {
  const tipModal = document.getElementById("modal-tip");
  const tipForm = document.getElementById("tip-form");
  const tipTitle = document.getElementById("tip-modal-title");
  const tipOpenBtn = document.getElementById("btn-add-tip");
  const list = document.getElementById("tip-list");
  const walletSelect = document.getElementById("tip-wallet");

  function openTipModal(mode = "add", data = null) {
    tipForm?.reset();
    ensureDefaultDate(document.getElementById("tip-date"), todayISO());

    if (mode === "edit" && data) {
      document.getElementById("tip-id").value = data._id;
      document.getElementById("tip-amount").value = data.amount;
      document.getElementById("tip-date").value = (data.date || "").slice(
        0,
        10
      );
      document.getElementById("tip-customer").value = data.customer || "";
      document.getElementById("tip-note").value = data.note || "";
      if (data?.walletId && walletSelect) {
        walletSelect.value = data.walletId;
      }
      tipTitle.textContent = "Chỉnh sửa tip";
    } else {
      document.getElementById("tip-id").value = "";
      tipTitle.textContent = "Thêm tip";
    }

    setupQuickAmountButtons(tipModal, document.getElementById("tip-amount"));

    loadWallets();

    tipModal.classList.add("show");
    document.body.style.overflow = "hidden";
  }

  function closeTipModal() {
    tipModal.classList.remove("show");
    document.body.style.overflow = "";
  }

  async function loadWallets() {
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

    if (!document.getElementById("tip-id").value && wallets && wallets.length) {
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

    // if (action === "delete") {
    //   const data = currentTips.find((t) => t._id === id);
    //   const name = data?.customer ? `của ${data.customer}` : "này";
    //   if (!confirm(`Xoá tip ${name}?`)) return;
    //   const ok = await showConfirm(`Xoá tip ${name}?`, {
    //     confirmText: "Xoá",
    //     variant: "danger",
    //   });
    //   if (!ok) return;
    //   try {
    //     await deleteTip(id);
    //     await renderTips();
    //     if (typeof onChanged === "function") onChanged();
    //     showToast("Đã xoá tip.", "success");
    //   } catch (err) {
    //     // alert(err?.message || "Xoá tip thất bại.");
    //     showToast(err?.message || "Xoá tip thất bại.", "error");
    //   }
    // }

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

  renderTips();

  // Trả API giống income/expense
  return {
    renderTips,
  };
}
