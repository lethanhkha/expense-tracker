import {
  escapeHtml,
  formatCurrency,
} from "../modules/formatAndQuickbuttons.js";
import {
  getPresets,
  createPreset,
  updatePreset,
  deletePreset,
  getWallets,
  createWallet,
  updateWallet,
  deleteWallet,
  setDefaultWallet,
  transferWallet,
} from "../data/storage.api.js";

import { showToast } from "../modules/toast.js";
import { wireModal } from "../modules/modal.js";

export function initCategories() {
  const openBtn = document.getElementById("categoryButton");
  const modal = document.getElementById("modal-categories");
  if (!modal || !openBtn) return;
  const catModal = modal ? wireModal(modal) : null;

  const closeBtns = modal.querySelectorAll("[data-close]");
  const tabBtns = modal.querySelectorAll(".modal-tab");
  const pages = modal.querySelectorAll(".cat-page");

  // Preset
  const listIncome = document.getElementById("cat-income-list");
  const listExpense = document.getElementById("cat-expense-list");
  const btnCatAdd = document.getElementById("btn-cat-add");
  const catForm = document.getElementById("cat-form");
  const typeEl = document.getElementById("cat-type");
  const sourceEl = document.getElementById("cat-source");
  const amountEl = document.getElementById("cat-amount");
  const noteEl = document.getElementById("cat-note");
  const btnCatBack = document.getElementById("btn-cat-back");

  // Wallet
  const walletsList = document.getElementById("wallets-list");
  const walletForm = document.getElementById("wallet-form");
  const walletNameEl = document.getElementById("wallet-name");
  const walletTypeEl = document.getElementById("wallet-type");
  const walletCurrencyEl = document.getElementById("wallet-currency");
  const btnWalletAdd = document.getElementById("btn-wallet-add");
  const btnWalletBack = document.getElementById("btn-wallet-back");

  const btnOpenTransfer = document.getElementById("open-transfer");
  // Modal chuyển tiền
  const modalTransfer = document.getElementById("modal-transfer");
  const transferModal = modalTransfer ? wireModal(modalTransfer) : null;
  const tfForm = document.getElementById("tf-form");
  const tfFrom = document.getElementById("tf-from");
  const tfClose = document.getElementById("tf-close");
  const tfCancel = document.getElementById("tf-cancel");
  const tfTo = document.getElementById("tf-to");
  const tfAmount = document.getElementById("tf-amount");
  const tfDate = document.getElementById("tf-date");
  const tfNote = document.getElementById("tf-note");

  let currentIncome = [];
  let currentExpense = [];
  let currentWallets = [];

  // ===== Transfer money between wallets (Modal) =====
  function openTransferModal() {
    transferModal?.open();
  }
  function closeTransferModal() {
    // 1) blur phần tử đang focus trong modal để tránh aria-hidden warning
    if (modalTransfer && modalTransfer.contains(document.activeElement)) {
      try {
        document.activeElement?.blur();
      } catch {}
    }
    // 2) đóng modal chuyển
    transferModal?.close();
    tfForm?.reset();
    // 3) quay lại modal danh mục ở tab Ví (list mode)
    switchTab("cat-wallets");
    modal.dataset.mode = "list";
    // 4) đưa focus về nút mở "Chuyển tiền" để tiếp tục thao tác
    setTimeout(() => {
      btnOpenTransfer?.focus?.();
    }, 0);
  }

  async function populateTransferFields() {
    await refreshWallets();
    if (!Array.isArray(currentWallets) || currentWallets.length < 2) {
      showToast("Cần ít nhất 2 ví để chuyển tiền.", "info");
      return false;
    }
    // options
    const opts = currentWallets
      .map(
        (w) =>
          `<option value="${w._id}">${escapeHtml(w.name)} — ${formatCurrency(
            +w.balance || 0
          )} ${escapeHtml(w.currency || "VND")}</option>`
      )
      .join("");
    tfFrom.innerHTML = opts;
    tfTo.innerHTML = opts;
    // defaults: from = ví mặc định, to = ví khác đầu tiên
    const def = currentWallets.find((w) => w.isDefault) || currentWallets[0];
    const other =
      currentWallets.find((w) => String(w._id) !== String(def._id)) ||
      currentWallets[1];
    if (def) tfFrom.value = String(def._id);
    if (other) tfTo.value = String(other._id);
    // prefll date = today
    const d = new Date(),
      pad = (n) => String(n).padStart(2, "0");
    tfDate.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )}`;
    // focus amount
    tfAmount.focus();
    return true;
  }

  btnOpenTransfer?.addEventListener("click", async () => {
    const ok = await populateTransferFields();
    if (ok) openTransferModal();
  });

  // đảm bảo nút Close/Huỷ cũng dùng closeTransferModal (ngoài data-close)
  tfClose?.addEventListener("click", (e) => {
    e.preventDefault();
    closeTransferModal();
  });
  tfCancel?.addEventListener("click", (e) => {
    e.preventDefault();
    closeTransferModal();
  });

  // tránh chọn cùng 1 ví
  function ensureDifferentWallets() {
    if (!tfFrom || !tfTo) return;
    if (tfFrom.value && tfTo.value && tfFrom.value === tfTo.value) {
      // đổi to sang ví khác nếu trùng
      const alt = Array.from(tfTo.options).find(
        (o) => o.value !== tfFrom.value
      );
      if (alt) tfTo.value = alt.value;
    }
  }
  tfFrom?.addEventListener("change", ensureDifferentWallets);
  tfTo?.addEventListener("change", ensureDifferentWallets);

  // Submit chuyển tiền
  tfForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fromWalletId = tfFrom?.value;
    const toWalletId = tfTo?.value;
    const amount = Number(tfAmount?.value || 0);
    const date = tfDate?.value || undefined;
    const note = tfNote?.value || "";

    if (!fromWalletId || !toWalletId) {
      showToast("Vui lòng chọn đủ 2 ví.", "error");
      return;
    }
    if (fromWalletId === toWalletId) {
      showToast("Hai ví phải khác nhau.", "error");
      return;
    }
    if (!amount || amount <= 0) {
      showToast("Số tiền phải > 0.", "error");
      return;
    }
    // check số dư (client)
    const fromW = currentWallets.find(
      (w) => String(w._id) === String(fromWalletId)
    );
    if (fromW && Number(fromW.balance || 0) < amount) {
      showToast("Số dư ví nguồn không đủ.", "error");
      return;
    }
    try {
      await transferWallet({ fromWalletId, toWalletId, amount, date, note });
      showToast("Đã chuyển tiền giữa các ví.", "success");
      closeTransferModal();
      await refreshWallets();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
    } catch (err) {
      showToast(err?.message || "Lỗi chuyển tiền.", "error");
    }
  });

  // ===== Helpers =====
  function switchTab(id) {
    pages.forEach((p) => p.classList.add("hidden"));
    tabBtns.forEach((b) => b.classList.remove("active"));
    document.getElementById(id)?.classList.remove("hidden");
    modal
      .querySelector(`.modal-tab[data-tab="${id}"]`)
      ?.classList.add("active");
    modal.dataset.mode = "list";
  }

  function activeTypeFromTab() {
    const t = modal.querySelector(".modal-tab.active")?.dataset.tab;
    return t === "cat-expense" ? "expense" : "income";
  }

  // ===== Presets =====
  async function refreshPresets() {
    try {
      const [inc, exp] = await Promise.all([
        getPresets("income"),
        getPresets("expense"),
      ]);
      currentIncome = inc || [];
      currentExpense = exp || [];
      renderPresetList(listIncome, currentIncome);
      renderPresetList(listExpense, currentExpense);
    } catch (err) {
      const msg = `<li class="muted" style="padding:8px 0;">Không tải được danh mục: ${
        err?.message || "lỗi mạng/ máy chủ"
      }.</li>`;
      if (listIncome) listIncome.innerHTML = msg;
      if (listExpense) listExpense.innerHTML = msg;
    }
  }

  function renderPresetList(ul, arr) {
    if (!ul) return;
    if (!arr || arr.length === 0) {
      ul.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có danh mục nào.</li>`;
      return;
    }
    ul.innerHTML = arr
      .map(
        (i) => `
      <li class="cat-item" data-id="${i._id}">
        <div class="cat-main">
          <span class="cat-source">${escapeHtml(i.source)}</span>
          ${
            i.note
              ? `<div class="muted cat-note">${escapeHtml(i.note)}</div>`
              : ""
          }
        </div>
        <div class="cat-group-amount-actions">
          <div class="cat-actions">
            <button class="btn ghost icon" type="button" data-action="edit" title="Sửa">✏️</button>
            <button class="btn ghost icon" type="button" data-action="delete" title="Xoá">🗑️</button>
          </div>
          ${
            typeof i.amount === "number"
              ? `<span class="cat-amount">${formatCurrency(i.amount)}</span>`
              : ""
          }
        </div>
      </li>`
      )
      .join("");
  }

  // ===== Wallets =====
  async function refreshWallets() {
    if (!walletsList) return;
    try {
      const wallets = await getWallets();
      currentWallets = wallets || [];
    } catch (err) {
      walletsList.innerHTML = `<li class="muted" style="padding:8px 0;">Không tải được ví: ${
        err?.message || "lỗi mạng/ máy chủ"
      }.</li>`;
      return;
    }
    if (currentWallets.length === 0) {
      walletsList.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có ví nào.</li>`;
      return;
    }
    walletsList.innerHTML = currentWallets
      .map(
        (w) => `
      <li class="cat-item" data-id="${w._id}">
        <div class="cat-main">
          <span class="cat-source">${escapeHtml(w.name)}</span>
        <div class="muted">Loại: ${escapeHtml(w.type || "other")}
          ${w.isDefault ? ' · <span class="tag">Mặc định</span>' : ""}
        </div>
        </div>
        <div class="cat-group-amount-actions">
          <div class="cat-actions">
            <button class="btn ghost icon" type="button" data-action="edit-wallet" title="Sửa">✏️</button>
            <button class="btn ghost icon" type="button" data-action="delete-wallet" title="Xoá">🗑️</button>
            ${
              w.isDefault
                ? ""
                : `<button class="btn ghost icon" type="button" data-action="set-default" title="Đặt mặc định">⭐</button>`
            }
          </div>
          <span class="cat-amount">
            ${formatCurrency(+w.balance || 0)} ${escapeHtml(
          w.currency || "VND"
        )}
          </span>
        </div>
      </li>`
      )
      .join("");
  }

  window.addEventListener("wallets:refresh", () => {
    refreshWallets();
  });

  // ===== Open/Close =====
  function open() {
    catModal?.open();
    modal.dataset.mode = "list";
    switchTab("cat-income");
    refreshPresets();
    refreshWallets();
  }
  function close() {
    catModal?.close();
  }

  // ===== Events =====
  openBtn.addEventListener("click", open);
  closeBtns.forEach((b) => b.addEventListener("click", close));
  tabBtns.forEach((b) =>
    b.addEventListener("click", () => switchTab(b.dataset.tab))
  );

  // Footer buttons
  btnCatAdd?.addEventListener("click", () => {
    modal.dataset.mode = "form-preset";
    typeEl.value = activeTypeFromTab();
    sourceEl.value = "";
    amountEl.value = "";
    noteEl.value = "";
    delete catForm.dataset.editId;
  });
  btnCatBack?.addEventListener("click", () => (modal.dataset.mode = "list"));

  btnWalletAdd?.addEventListener("click", () => {
    modal.dataset.mode = "form-wallet";
    walletNameEl.value = "";
    walletTypeEl.value = "cash";
    walletCurrencyEl.value = "VND";
    delete walletForm.dataset.editId;
  });
  btnWalletBack?.addEventListener("click", () => (modal.dataset.mode = "list"));

  // Submit forms
  catForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      type: (typeEl.value || "income").toLowerCase(),
      source: (sourceEl.value || "").trim(),
      amount: Number(amountEl.value) || 0,
      note: (noteEl.value || "").trim(),
    };
    if (!payload.source)
      return showToast("Tên danh mục không được trống.", "error");

    try {
      if (catForm.dataset.editId) {
        await updatePreset(catForm.dataset.editId, payload);
        delete catForm.dataset.editId;
      } else {
        await createPreset(payload);
      }
      e.target.reset();
      await refreshPresets();
      modal.dataset.mode = "list";
      switchTab(payload.type === "expense" ? "cat-expense" : "cat-income");
      showToast("Thêm thành công");
    } catch (err) {
      showToast(err?.message || "Lưu danh mục thất bại.", "error");
    }
  });

  walletForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: (walletNameEl.value || "").trim(),
      type: walletTypeEl.value || "cash",
      currency: (walletCurrencyEl.value || "VND").trim(),
    };
    if (!payload.name) return showToast("Tên ví không được trống", "error");

    try {
      if (walletForm.dataset.editId) {
        await updateWallet(walletForm.dataset.editId, payload);
        delete walletForm.dataset.editId;
      } else {
        await createWallet(payload);
      }
      e.target.reset();
      walletCurrencyEl.value = "VND";
      await refreshWallets();
      window.dispatchEvent(new CustomEvent("wallets:refresh"));
      modal.dataset.mode = "list";
      showToast("Lưu ví thành công", "success");
    } catch (err) {
      showToast(err?.message || "Lưu ví thất bại.", "error");
    }
  });

  // Click actions (edit/delete)
  modal.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest("li[data-id]");
    if (!li) return;
    const id = li.dataset.id;

    const action = btn.dataset.action;

    if (action === "edit") {
      const activeTab = modal.querySelector(".modal-tab.active")?.dataset.tab;
      const dataset =
        activeTab === "cat-income" ? currentIncome : currentExpense;
      const item = dataset.find((x) => x._id === id);
      if (!item) return;
      modal.dataset.mode = "form-preset";
      typeEl.value = activeTab === "cat-expense" ? "expense" : "income";
      sourceEl.value = item.source || "";
      amountEl.value = item.amount ?? 0;
      noteEl.value = item.note || "";
      catForm.dataset.editId = id;
    }

    if (action === "delete") {
      const result = await Swal.fire({
        title: "Bạn chắc chắn?",
        text: "Xoá danh mục này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!result.isConfirmed) return;

      try {
        await deletePreset(id);
        await refreshPresets();
        Swal.fire("Đã xoá!", "Danh mục đã bị xoá.", "success");
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá danh mục thất bại.", "error");
      }
    }

    if (action === "set-default") {
      try {
        await setDefaultWallet(id);
        await refreshWallets();
        window.dispatchEvent(new CustomEvent("wallets:refresh"));
        showToast("Đã đặt ví mặc định.", "success");
      } catch (err) {
        showToast(err?.message || "Không đặt được ví mặc định.", "error");
      }
    }

    if (action === "edit-wallet") {
      const w = currentWallets.find((x) => x._id === id);
      if (!w) return;
      modal.dataset.mode = "form-wallet";
      walletNameEl.value = w.name || "";
      walletTypeEl.value = w.type || "cash";
      walletCurrencyEl.value = w.currency || "VND";
      walletForm.dataset.editId = id;
    }

    if (action === "delete-wallet") {
      const result = await Swal.fire({
        title: "Bạn chắc chắn?",
        text: "Xoá ví này?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Xoá",
        cancelButtonText: "Huỷ",
        confirmButtonColor: "#d33",
        cancelButtonColor: "#3085d6",
      });

      if (!result.isConfirmed) return;

      try {
        await deleteWallet(id);
        await refreshWallets();
        Swal.fire("Đã xoá!", "Ví đã bị xoá.", "success");
      } catch (err) {
        Swal.fire("Lỗi!", err?.message || "Xoá ví thất bại.", "error");
      }
    }
  });

  return { open, close, switchTab };
}
