// const BASE = "http://localhost:8000/api";
const BASE = "https://expense-tracker-production-7cff.up.railway.app/api";

const DEFAULT_TIMEOUT = 15000;

async function safeParse(res) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function buildError(resp, payload) {
  const msg =
    (payload && typeof payload === "object" && payload.message) ||
    (typeof payload === "string" && payload.trim()) ||
    `HTTP ${resp.status}`;
  const err = new Error(msg);
  err.status = resp.status;
  err.payload = payload;
  return err;
}

// async function request(
//   path,
//   { method = "GET", headers, body, timeout = DEFAULT_TIMEOUT } = {}
// ) {
function appendQuery(path, params) {
  if (!params || typeof params !== "object") return path;
  const usp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null) return;
    usp.append(k, String(v));
  });
  const qs = usp.toString();
  if (!qs) return path;
  return path + (path.includes("?") ? "&" : "?") + qs;
}

async function request(
  path,
  { method = "GET", headers, body, timeout = DEFAULT_TIMEOUT, params } = {}
) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeout);

  try {
    // const res = await fetch(BASE + path, {
    const finalPath = appendQuery(path, params);
    const res = await fetch(BASE + finalPath, {
      method,
      headers: { "Content-Type": "application/json", ...(headers || {}) },
      body: body != null ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });

    const payload = await safeParse(res);
    if (!res.ok) throw buildError(res, payload);
    return payload;
  } catch (e) {
    if (e.name === "AbortError") {
      const te = new Error("Yêu cầu quá thời gian. Vui lòng thử lại.");
      te.code = "ETIMEDOUT";
      throw te;
    }
    if (e instanceof TypeError && /fetch/i.test(String(e))) {
      const ne = new Error(
        "Không thể kết nối máy chủ. Kiểm tra mạng hoặc API."
      );
      ne.cause = e;
      throw ne;
    }
    throw e;
  } finally {
    clearTimeout(t);
  }
}

export const http = {
  get: (url, opts) => request(url, { ...opts, method: "GET" }),
  post: (url, body, opts) => request(url, { ...opts, method: "POST", body }),
  put: (url, body, opts) => request(url, { ...opts, method: "PUT", body }),
  patch: (url, body, opts) => request(url, { ...opts, method: "PATCH", body }),
  delete: (url, opts) => request(url, { ...opts, method: "DELETE" }),
};
