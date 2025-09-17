import { Router } from "express";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Tip from "../models/Tip.js";

const r = Router();

r.get("/kpi", async (req, res, next) => {
  try {
    // tổng income
    const [{ totalIncome = 0 } = {}] = await Income.aggregate([
      { $group: { _id: null, totalIncome: { $sum: "$amount" } } },
    ]);

    // tổng expense
    const [{ totalExpense = 0 } = {}] = await Expense.aggregate([
      { $group: { _id: null, totalExpense: { $sum: "$amount" } } },
    ]);

    // tip nhận được = tip có date < hôm nay
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [{ totalTip = 0 } = {}] = await Tip.aggregate([
      { $match: { date: { $lt: today } } },
      { $group: { _id: null, totalTip: { $sum: "$amount" } } },
    ]);

    const balance = totalIncome - totalExpense + totalTip;

    res.json({ totalIncome, totalExpense, totalTip, balance });
  } catch (e) {
    next(e);
  }
});

export default r;
