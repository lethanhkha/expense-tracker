// js/modules/confirm.js
export function showConfirm(
  message,
  {
    confirmText = "Xoá",
    cancelText = "Huỷ",
    variant = "danger", // danger | default
  } = {}
) {
  return new Promise((resolve) => {
    // container (1 cái duy nhất)
    let container = document.querySelector(".confirm-overlay");
    if (!container) {
      container = document.createElement("div");
      container.className = "confirm-overlay";
      container.innerHTML = `
        <div class="confirm-dialog" role="dialog" aria-modal="true">
          <div class="confirm-message"></div>
          <div class="confirm-actions">
            <button type="button" class="btn ghost confirm-cancel"></button>
            <button type="button" class="btn confirm-ok"></button>
          </div>
        </div>`;
      document.body.appendChild(container);
    }

    const dlg = container.querySelector(".confirm-dialog");
    const msgEl = container.querySelector(".confirm-message");
    const btnOk = container.querySelector(".confirm-ok");
    const btnCancel = container.querySelector(".confirm-cancel");

    msgEl.textContent = message;
    btnOk.textContent = confirmText;
    btnCancel.textContent = cancelText;

    // style theo variant
    dlg.dataset.variant = variant;

    function close(result) {
      container.classList.remove("show");
      document.removeEventListener("keydown", onKey);
      // để animation fadeOut xong rồi resolve
      setTimeout(() => resolve(result), 150);
    }

    function onKey(e) {
      if (e.key === "Escape") close(false);
      if (e.key === "Enter") close(true);
    }

    btnOk.onclick = () => close(true);
    btnCancel.onclick = () => close(false);
    container.onclick = (e) => {
      if (e.target === container) close(false); // click backdrop
    };

    document.addEventListener("keydown", onKey);
    // show
    container.classList.add("show");
    btnCancel.focus();
  });
}
