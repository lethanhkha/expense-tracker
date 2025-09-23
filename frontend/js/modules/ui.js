export const showError = (err, fallback = "Có lỗi xảy ra.") =>
  alert(err?.message || fallback);
