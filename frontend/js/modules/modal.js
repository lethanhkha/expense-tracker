// js/modules/modal.js
export function wireModal(modalEl) {
  if (!modalEl) return;

  function open() {
    modalEl.classList.add("show");
    document.body.style.overflow = "hidden";
  }
  function close() {
    modalEl.classList.remove("show");
    document.body.style.overflow = "";
  }

  // click backdrop
  modalEl.addEventListener("click", (e) => {
    if (e.target === modalEl) close();
  });
  // ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modalEl.classList.contains("show")) close();
  });
  // buttons [data-close]
  modalEl.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", close);
  });

  return { open, close };
}
