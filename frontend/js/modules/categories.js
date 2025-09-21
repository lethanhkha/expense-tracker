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
} from "../data/storage.api.js";

export function initCategories() {
  const openBtn = document.getElementById("categoryButton");
  const modal = document.getElementById("modal-categories");
  if (!modal || !openBtn) return;

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

  let currentIncome = [];
  let currentExpense = [];
  let currentWallets = [];

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
    const [inc, exp] = await Promise.all([
      getPresets("income"),
      getPresets("expense"),
    ]);
    currentIncome = inc || [];
    currentExpense = exp || [];
    renderPresetList(listIncome, currentIncome);
    renderPresetList(listExpense, currentExpense);
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
    const wallets = await getWallets();
    currentWallets = wallets || [];
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

  // ===== Open/Close =====
  function open() {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    modal.dataset.mode = "list";
    switchTab("cat-income");
    refreshPresets();
    refreshWallets();
  }
  function close() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  // ===== Events =====
  openBtn.addEventListener("click", open);
  closeBtns.forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) close();
  });
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
    if (!payload.source) return alert("Tên danh mục không được trống.");

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
  });

  walletForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      name: (walletNameEl.value || "").trim(),
      type: walletTypeEl.value || "cash",
      currency: (walletCurrencyEl.value || "VND").trim(),
    };
    if (!payload.name) return alert("Tên ví không được trống.");

    if (walletForm.dataset.editId) {
      await updateWallet(walletForm.dataset.editId, payload);
      delete walletForm.dataset.editId;
    } else {
      await createWallet(payload);
    }
    e.target.reset();
    walletCurrencyEl.value = "VND";
    await refreshWallets();
    modal.dataset.mode = "list";
    switchTab("cat-wallets");
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
      if (!confirm("Xoá danh mục này?")) return;
      await deletePreset(id);
      await refreshPresets();
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
      if (!confirm("Xoá ví này?")) return;
      await deleteWallet(id);
      await refreshWallets();
    }
  });

  return { open, close, switchTab };
}
