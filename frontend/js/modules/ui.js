import { showToast } from "../modules/toast.js";

export const showError = (err, fallback = "Có lỗi xảy ra.") =>
  showToast(err?.message || fallback, "error");
