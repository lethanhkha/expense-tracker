import { http } from "./http.js";

/** ===== Incomes ===== */
export const getIncomes = () => http.get("/incomes");
export const createIncome = (data) => http.post("/incomes", data);
export const updateIncome = (id, data) => http.patch(`/incomes/${id}`, data);
export const deleteIncome = async (id) => {
  await http.delete(`/incomes/${id}`);
  return true;
};

/** ===== Expenses ===== */
export const getExpenses = () => http.get("/expenses");
export const createExpense = (data) => http.post("/expenses", data);
export const updateExpense = (id, data) => http.patch(`/expenses/${id}`, data);
export const deleteExpense = async (id) => {
  await http.delete(`/expenses/${id}`);
  return true;
};

/** ===== Tips ===== */
export const getTips = () => http.get("/tips");
export const createTip = (data) => http.post("/tips", data);
export const updateTip = (id, data) => http.patch(`/tips/${id}`, data);
export const deleteTip = async (id) => {
  await http.delete(`/tips/${id}`);
  return true;
};

/** ===== Presets (Categories) ===== */
export const getPresets = (type) =>
  http.get(`/presets${type ? `?type=${encodeURIComponent(type)}` : ""}`);
export const createPreset = (data) => http.post("/presets", data);
export const updatePreset = (id, data) => http.put(`/presets/${id}`, data);
export const deletePreset = async (id) => {
  await http.delete(`/presets/${id}`);
  return true;
};

/** ===== Wallets ===== */
// export const getWallets = () => http.get("/wallets");
export const getWallets = () => http.get(`/wallets?_=${Date.now()}`);
export const createWallet = (data) => http.post("/wallets", data);
export const updateWallet = (id, data) => http.patch(`/wallets/${id}`, data);
export const deleteWallet = async (id) => {
  await http.delete(`/wallets/${id}`);
  return true;
};
export const transferWallet = (data) => http.post("/wallets/transfer", data);

/** ===== Stats ===== */
// export const getKPI = () => http.get("/stats/kpi");
export const getKPI = () => http.get(`/stats/kpi?_=${Date.now()}`);

export const updateTipReceived = (id, state) =>
  http.patch(`/tips/${id}/received`, { received: state });

// ==== Debts ====
export const getDebts = (q) => http.get("/debts", { params: q });
export const getDebt = (id) => http.get(`/debts/${id}`);
export const createDebt = (payload) => http.post("/debts", payload);
export const updateDebt = (id, payload) => http.patch(`/debts/${id}`, payload);
export const deleteDebt = (id) => http.delete(`/debts/${id}`);
