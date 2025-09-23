export function showToast(message, type = "success") {
  let container = document.querySelector(".toast-container");
  if (!container) {
    container = document.createElement("div");
    container.className = "toast-container";
    document.body.appendChild(container);
  }

  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.textContent = message;

  container.appendChild(el);

  // Tự hủy sau 3.3s
  setTimeout(() => {
    el.remove();
    if (container.children.length === 0) {
      container.remove();
    }
  }, 3300);
}
