// routes/stats.js
import express from "express";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Tip from "../models/Tip.js";
import Wallet from "../models/Wallet.js";
import GoalContribution from "../models/GoalContribution.js";
const r = express.Router();

r.get("/kpi", async (req, res) => {
  const { from, to, walletId } = req.query || {};
  const matchDate = {};
  if (from) matchDate.$gte = new Date(from);
  if (to) matchDate.$lte = new Date(to);
  const dateStage = Object.keys(matchDate).length
    ? [{ $match: { date: matchDate } }]
    : [];
  const walletStage = walletId ? [{ $match: { walletId } }] : [];
  const sumExpr = { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } };

  const [incAgg, expAgg, tipAgg, contribAgg, wallets] = await Promise.all([
    Income.aggregate([
      ...walletStage,
      ...dateStage,
      { $group: { _id: null, total: sumExpr } },
    ]),
    Expense.aggregate([
      ...walletStage,
      ...dateStage,
      { $group: { _id: null, total: sumExpr } },
    ]),
    Tip.aggregate([
      ...walletStage,
      ...dateStage,
      { $match: { received: true } },
      { $group: { _id: null, total: sumExpr } },
    ]),
    GoalContribution.aggregate([
      ...walletStage,
      ...dateStage,
      { $group: { _id: null, total: sumExpr } },
    ]),
    Wallet.find({ archived: false }, { balance: 1 }).lean(),
  ]);

  const totalIncome = Number(incAgg?.[0]?.total || 0);
  const totalExpense =
    Number(expAgg?.[0]?.total || 0) + Number(contribAgg?.[0]?.total || 0);
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
