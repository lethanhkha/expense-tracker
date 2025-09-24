// routes/stats.js
import express from "express";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Tip from "../models/Tip.js";
import Wallet from "../models/Wallet.js";

const r = express.Router();

r.get("/kpi", async (_req, res) => {
  const sumExpr = { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } };

  const [incAgg, expAgg, tipAgg, wallets] = await Promise.all([
    Income.aggregate([{ $group: { _id: null, total: sumExpr } }]),
    Expense.aggregate([{ $group: { _id: null, total: sumExpr } }]),
    // Tip.aggregate([{ $group: { _id: null, total: sumExpr } }]),
    Tip.aggregate([
      { $match: { received: true } },
      { $group: { _id: null, total: sumExpr } },
    ]),
    Wallet.find({ archived: false }, { balance: 1 }).lean(), // chỉ để so sánh
  ]);

  const totalIncome = Number(incAgg?.[0]?.total || 0);
  const totalExpense = Number(expAgg?.[0]?.total || 0);
  const totalTip = Number(tipAgg?.[0]?.total || 0);

  const totalBalance = totalIncome + totalTip - totalExpense;
  const sumWallets = wallets.reduce(
    (acc, w) => acc + Number(w.balance || 0),
    0
  );

  res.json({
    totalIncome,
    totalExpense,
    totalTip,
    totalBalance, // ← dùng giá trị này cho dashboard
    sumWallets, // ← giá trị tham chiếu/đối chiếu
  });
});

export default r;
