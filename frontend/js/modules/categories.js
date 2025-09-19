// js/modules/categories.js
import {
  escapeHtml,
  formatCurrency,
} from "../modules/formatAndQuickbuttons.js";
import { getPresets, createPreset, deletePreset } from "../data/storage.api.js";

export function initCategories() {
  // ==== DOM refs (phải có modal-categories trong HTML) ====
  const openBtn = document.getElementById("categoryButton");
  const modal = document.getElementById("modal-categories");
  if (!modal || !openBtn) {
    console.warn("[categories] Missing #categoryButton or #modal-categories");
    return;
  }

  const closeBtns = modal.querySelectorAll("[data-close]");
  const tabBtns = modal.querySelectorAll(".modal-tab"); // 2 nút tab trong modal
  const pages = modal.querySelectorAll(".cat-page"); // 2 page list
  const tabsEl = modal.querySelector(".cat-tabs"); // thanh tab
  const pagesEl = modal.querySelector(".cat-pages"); // vùng chứa list 2 tab
  const footerEl = modal.querySelector(".cat-footer"); // footer có nút + Thêm danh mục

  const listIncome = document.getElementById("cat-income-list");
  const listExpense = document.getElementById("cat-expense-list");

  const toggleAddBtn = document.getElementById("btn-cat-add"); // + Thêm danh mục (footer)
  const form = document.getElementById("cat-form"); // form thêm danh mục
  const typeEl = document.getElementById("cat-type");
  const sourceEl = document.getElementById("cat-source");
  const amountEl = document.getElementById("cat-amount");
  const noteEl = document.getElementById("cat-note");
  const backBtn = document.getElementById("btn-cat-back"); // Quay lại danh mục (trong form)

  let currentIncome = [];
  let currentExpense = [];
  let adding = false;

  // ========= Helpers =========
  function switchTab(id) {
    pages.forEach((p) => p.classList.add("hidden"));
    tabBtns.forEach((b) => b.classList.remove("active"));
    document.getElementById(id)?.classList.remove("hidden");
    modal
      .querySelector(`.modal-tab[data-tab="${id}"]`)
      ?.classList.add("active");
  }

  function activeTypeFromTab() {
    const t = modal.querySelector(".modal-tab.active")?.dataset.tab;
    return t === "cat-expense" ? "expense" : "income";
  }

  function showAddForm(prefillType = activeTypeFromTab()) {
    // Ẩn tabs + list + footer, chỉ show form
    // tabsEl?.classList.add("hidden");
    // pagesEl?.classList.add("hidden");
    // footerEl?.classList.add("hidden");
    // form?.classList.remove("hidden");
    modal.dataset.mode = "form";
    form?.classList.remove("hidden");

    if (typeEl) typeEl.value = prefillType;
    if (sourceEl) sourceEl.value = "";
    if (amountEl) amountEl.value = "";
    if (noteEl) noteEl.value = "";

    form?.scrollIntoView({ behavior: "smooth", block: "end" });
  }

  function showListView(focusType = activeTypeFromTab()) {
    // Ẩn form, hiện lại tabs + list + footer
    // form?.classList.add("hidden");
    // tabsEl?.classList.remove("hidden");
    // pagesEl?.classList.remove("hidden");
    // footerEl?.classList.remove("hidden");
    modal.dataset.mode = "list";
    switchTab(focusType === "expense" ? "cat-expense" : "cat-income");
  }

  async function refresh() {
    const [inc, exp] = await Promise.all([
      getPresets("income"),
      getPresets("expense"),
    ]);
    currentIncome = inc || [];
    currentExpense = exp || [];
    renderList(listIncome, currentIncome);
    renderList(listExpense, currentExpense);
  }

  function renderList(ul, arr) {
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
              typeof i.amount === "number"
                ? `<span class="cat-amount">${formatCurrency(i.amount)}</span>`
                : ""
            }
          </div>
          ${
            i.note
              ? `<div class="muted cat-note">${escapeHtml(i.note)}</div>`
              : ""
          }
          <div class="cat-actions">
            <button class="btn ghost icon" type="button" data-action="use" title="Dùng danh mục này">↪</button>
            <button class="btn ghost icon" type="button" data-action="delete" title="Xoá">🗑️</button>
          </div>
        </li>`
      )
      .join("");
  }

  function open() {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    modal.dataset.mode = "list";
    switchTab("cat-income"); // mặc định vào tab Thu nhập
    // showListView("income");
    refresh();
  }

  function close() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  // ========= Events =========
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

  toggleAddBtn?.addEventListener("click", () => {
    showAddForm(); // theo tab đang mở
  });

  backBtn?.addEventListener("click", () => showListView());

  // click Use/Delete trong list
  modal.addEventListener("click", async (e) => {
    const btn = e.target.closest("button[data-action]");
    if (!btn) return;
    const li = btn.closest("li[data-id]");
    if (!li) return;

    const id = li.dataset.id;
    const activeTab = modal.querySelector(".modal-tab.active")?.dataset.tab;
    const isIncome = activeTab === "cat-income";
    const dataset = isIncome ? currentIncome : currentExpense;
    const item = dataset.find((x) => x._id === id);
    if (!item) return;

    const action = btn.dataset.action;

    if (action === "use") {
      if (isIncome) {
        document.getElementById("btn-add-income")?.click();
        setTimeout(() => {
          document.getElementById("income-source").value = item.source || "";
          document.getElementById("income-amount").value = item.amount ?? 0;
          document.getElementById("income-note").value = item.note || "";
        }, 0);
      } else {
        document.getElementById("btn-add-expense")?.click();
        setTimeout(() => {
          document.getElementById("expense-source").value = item.source || "";
          document.getElementById("expense-amount").value = item.amount ?? 0;
          document.getElementById("expense-note").value = item.note || "";
        }, 0);
      }
      close();
      return;
    }

    if (action === "delete") {
      if (!confirm("Xoá danh mục này?")) return;
      await deletePreset(id);
      await refresh();
    }
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (adding) return;
    adding = true;

    const payload = {
      type: (typeEl.value || "income").toLowerCase(),
      source: (sourceEl.value || "").trim(),
      amount: Number(amountEl.value) || 0,
      note: (noteEl.value || "").trim(),
    };

    try {
      if (!payload.source) {
        alert("Tên danh mục không được trống.");
        return;
      }
      await createPreset(payload);
      form.reset();
      await refresh();
      showListView(payload.type); // quay lại list đúng tab
    } finally {
      adding = false;
    }
  });

  return { open, close, refresh, switchTab };
}
