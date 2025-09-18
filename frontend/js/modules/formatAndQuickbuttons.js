/** Định dạng tiền VND ngắn gọn */
export function formatCurrency(amount) {
  return (Number(amount) || 0).toLocaleString("vi-VN") + "đ";
}

export function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Hiển thị dd/MM/yyyy từ chuỗi ISO yyyy-mm-dd hoặc Date */

export function formatDateDisplay(input) {
  if (!input) return "";
  const dateObj = new Date(input);
  if (isNaN(dateObj)) return input;

  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yy = String(dateObj.getFullYear()).slice(-2);

  return `${dd}/${mm}/${yy}`;
}

export function formatDateDisplayTip(input) {
  if (!input) return "";
  const dateObj = new Date(input);
  if (isNaN(dateObj)) return input;

  // cộng thêm 1 ngày
  dateObj.setDate(dateObj.getDate() + 1);

  const dd = String(dateObj.getDate()).padStart(2, "0");
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const yy = String(dateObj.getFullYear()).slice(-2);

  return `${dd}/${mm}/${yy}`;
}

/** Đọc số trong ô amount an toàn (trả về 0 nếu rỗng/NaN) */
export function getNumberValue(el) {
  if (!el) return 0;
  const v = String(el.value ?? "").replace(/\s+/g, "");
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/**
 * Gắn nút nhập nhanh số tiền & cộng dồn.
 * - modalEl: phần tử modal (để tìm container tái sử dụng)
 * - amountEl: <input> số tiền
 * - options.amounts: mảng số mặc định (đơn vị đồng)
 */
export function setupQuickAmountButtons(modalEl, amountEl, options = {}) {
  if (!modalEl || !amountEl) return;
  const amounts = options.amounts ?? [
    500000, 200000, 100000, 50000, 20000, 10000, 5000, -5000, 0,
  ];

  // Tạo/đặt lại container (idempotent)
  let container = modalEl.querySelector(".quick-amounts");
  if (!container) {
    container = document.createElement("div");
    container.className = "quick-amounts";
    container.style.display = "flex";
    container.style.flexWrap = "wrap";
    container.style.gap = "8px";
    container.style.marginTop = "8px";
    amountEl.insertAdjacentElement("afterend", container);
  } else {
    container.innerHTML = "";
  }

  amounts.forEach((val) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn ghost";
    if (val === 0) {
      btn.textContent = "0";
    } else {
      btn.textContent = (val > 0 ? "+" : "") + val / 1000 + "k";
    }
    btn.addEventListener("click", () => {
      const current = getNumberValue(amountEl);
      let next;
      if (val === 0) {
        next = 0; // reset về 0
      } else {
        next = Math.max(0, current + val);
      }
      amountEl.value = next;
      amountEl.dispatchEvent(new Event("input")); // nếu bạn có validate realtime
    });
    container.appendChild(btn);
  });
}

/** Set mặc định ngày hôm nay cho <input type="date"> khi mở modal (nếu đang rỗng) */
export function ensureDefaultDate(dateInputEl, iso = todayISO()) {
  if (!dateInputEl) return;
  if (!dateInputEl.value) dateInputEl.value = iso;
}

/** Escape text hiển thị để tránh XSS */
export function escapeHtml(str) {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
