// js/modules/income.js
// import { getIncomes, saveIncomes } from "../data/storage.local.js";
import {
  getIncomes,
  createIncome,
  updateIncome,
  deleteIncome,
} from "../data/storage.api.js";

function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export function formatCurrency(amount) {
  return (Number(amount) || 0).toLocaleString("vi-VN") + "đ";
}

export function initIncome({ onChanged }) {
  const modal = document.getElementById("modal-income");
  const openBtn = document.getElementById("btn-add-income");
  const form = document.getElementById("income-form");
  const title = document.getElementById("income-modal-title");

  const idInput = document.getElementById("income-id");
  const sourceInput = document.getElementById("income-source");
  const amountInput = document.getElementById("income-amount");
  const dateInput = document.getElementById("income-date");
  const listEl = document.getElementById("income-list");
  let currentIncomes = [];

  // open/close modal (lấy nhanh, hoặc có thể dùng wireModal ở trên)
  // function open() {
  function open({ mode = "add", data = null } = {}) {
    form?.reset();
    idInput.value = "";
    title.textContent = "Thêm khoản thu";

    if (mode === "edit" && data) {
      idInput.value = data._id;
      sourceInput.value = data.source || "";
      amountInput.value = data.amount ?? "";
      dateInput.value = (data.date || "").slice(0, 10);
      title.textContent = "Chỉnh sửa khoản thu";
    }

    modal.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function close() {
    modal.classList.remove("show");
    document.body.style.overflow = "";
  }

  // openBtn?.addEventListener("click", open);
  openBtn?.addEventListener("click", () => open());
  modal
    .querySelectorAll("[data-close]")
    .forEach((b) => b.addEventListener("click", close));
  modal.addEventListener("click", (e) => {
    if (e.target === modal) close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("show")) close();
  });

  // form?.addEventListener("submit", (e) => {
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const payload = {
      //   id: document.getElementById("income-id").value || Date.now().toString(),
      // source: document.getElementById("income-source").value.trim(),
      // amount: parseFloat(document.getElementById("income-amount").value),
      // date: document.getElementById("income-date").value,
      source: sourceInput.value.trim(),
      amount: parseFloat(amountInput.value),
      date: dateInput.value,
    };

    // const list = getIncomes();
    // const ix = list.findIndex((i) => i.id === payload.id);
    // if (ix >= 0) list[ix] = payload;
    // else list.push(payload);
    // saveIncomes(list);

    // const id = document.getElementById("income-id").value.trim();
    const id = idInput.value.trim();
    if (id) {
      await updateIncome(id, payload);
    } else {
      await createIncome(payload);
    }

    // renderIncomes();
    await renderIncomes();
    onChanged?.();
    close();
  });

  // function renderIncomes() {
  async function renderIncomes() {
    // const listEl = document.getElementById("income-list");
    if (!listEl) return;
    // const incomes = getIncomes();
    const incomes = await getIncomes();
    currentIncomes = incomes;

    if (incomes.length === 0) {
      listEl.innerHTML = `<li class="muted" style="padding:8px 0;">Chưa có khoản thu nhập nào.</li>`;
      return;
    }

    listEl.innerHTML = incomes
      .map(
        (i) => `
          <li class="income-item" data-id="${i._id}">
            <div class="income-group-source-date">
              <span class="income-source">${escapeHtml(i.source)}</span>
              <span class="income-date muted">${(i.date || "").slice(
                0,
                10
              )}</span>
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
                </div>
                <span class="income-amount">+${formatCurrency(i.amount)}</span>
              </div>
            </div>
          </li>
        `
      )
      .join("");
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
      const name = data?.source ? `"${data.source}"` : "mục thu nhập";
      if (!confirm(`Xoá ${name}?`)) return;
      await deleteIncome(id);
      await renderIncomes();
      onChanged?.();
    }
  });

  return { renderIncomes };
}
