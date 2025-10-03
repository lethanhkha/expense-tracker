// routes/goals.js
import express from "express";
import mongoose from "mongoose";
import Goal from "../models/Goal.js";
import GoalContribution from "../models/GoalContribution.js";
import Expense from "../models/Expense.js";
import Wallet from "../models/Wallet.js";
import Income from "../models/Income.js"; // dùng cho compute
import Tip from "../models/Tip.js"; // dùng cho compute

const r = express.Router();

/** chỉ tính Tip đã nhận */
async function computeWalletBalanceById(wid, session) {
  if (!wid) return 0;
  const oid = typeof wid === "string" ? new mongoose.Types.ObjectId(wid) : wid;
  const sumExpr = { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } };

  const [incAgg, expAgg, tipAgg, contribAgg] = await Promise.all([
    Income.aggregate([
      { $match: { walletId: oid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    Expense.aggregate([
      { $match: { walletId: oid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    Tip.aggregate([
      { $match: { walletId: oid, received: true } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    GoalContribution.aggregate([
      { $match: { walletId: oid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
  ]);
  const inc = Number(incAgg?.[0]?.total || 0);
  const exp = Number(expAgg?.[0]?.total || 0);
  const tip = Number(tipAgg?.[0]?.total || 0);
  const contrib = Number(contribAgg?.[0]?.total || 0);
  return inc + tip - exp - contrib;
}

/** GET /api/goals  -> trả goals + savedAmount (sum contributions) */
r.get("/", async (_req, res, next) => {
  try {
    const goals = await Goal.find({}).sort({ createdAt: -1 }).lean();
    if (!goals.length) return res.json([]);

    const ids = goals.map((g) => g._id);
    const sums = await GoalContribution.aggregate([
      { $match: { goalId: { $in: ids } } },
      {
        $group: {
          _id: "$goalId",
          total: { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } },
        },
      },
    ]);
    const sumMap = Object.fromEntries(
      sums.map((x) => [String(x._id), Number(x.total || 0)])
    );
    const withSum = goals.map((g) => ({
      ...g,
      savedAmount: sumMap[String(g._id)] || 0,
    }));
    res.json(withSum);
  } catch (e) {
    next(e);
  }
});

/** GET /api/goals/:id/contributions  -> danh sách góp theo goal (mới nhất trước) */
r.get("/:id/contributions", async (req, res, next) => {
  try {
    const gid = req.params.id;
    const list = await GoalContribution.find({ goalId: gid })
      .sort({ date: -1, createdAt: -1 })
      .lean();
    res.json(list || []);
  } catch (e) {
    next(e);
  }
});

/** POST /api/goals */
r.post("/", async (req, res, next) => {
  try {
    const g = await Goal.create(req.body);
    res.status(201).json(g);
  } catch (e) {
    next(e);
  }
});

/** POST /api/goals/:id/contributions  (tạo contribution, recompute ví – KHÔNG tạo Expense) */
r.post("/:id/contributions", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const goal = await Goal.findById(req.params.id).session(session);
    if (!goal) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Goal not found" });
    }
    const { amount, walletId, date, note } = req.body || {};
    if (!walletId) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Thiếu walletId" });
    }

    // 1) tạo Contribution
    const [contrib] = await GoalContribution.create(
      [
        {
          goalId: goal._id,
          amount,
          walletId,
          date: date || new Date(),
          note,
        },
      ],
      { session }
    );

    // 2) Recompute số dư ví (có tính cả Contribution)
    const bal = await computeWalletBalanceById(walletId, session);
    await Wallet.findByIdAndUpdate(walletId, { balance: bal }, { session });

    await session.commitTransaction();
    res.status(201).json({ contribution: contrib });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

/** PATCH /api/goals/:id */
r.patch("/:id", async (req, res, next) => {
  try {
    const g = await Goal.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!g) return res.status(404).json({ message: "Goal not found" });
    res.json(g);
  } catch (e) {
    next(e);
  }
});

/** DELETE /api/goals/:id  (xoá goal + contributions + expense liên quan, recompute ví bị ảnh hưởng) */
r.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const gid = req.params.id;
    const contribs = await GoalContribution.find({ goalId: gid }).session(
      session
    );
    const affectedWallets = new Set(
      contribs.map((c) => String(c.walletId || ""))
    );

    // xoá expenses liên quan
    const expIds = contribs.map((c) => c.expenseId).filter(Boolean);
    if (expIds.length) {
      await Expense.deleteMany({ _id: { $in: expIds } }).session(session);
    }

    await GoalContribution.deleteMany({ goalId: gid }).session(session);
    await Goal.findByIdAndDelete(gid).session(session);

    for (const wid of affectedWallets) {
      if (!wid) continue;
      const bal = await computeWalletBalanceById(wid, session);
      await Wallet.findByIdAndUpdate(wid, { balance: bal }, { session });
    }

    await session.commitTransaction();
    res.json({ ok: true });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

/** DELETE /api/goals/:gid/contributions/:cid  (xoá contribution + expense + recompute) */
r.delete("/:gid/contributions/:cid", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const c = await GoalContribution.findById(req.params.cid).session(session);
    if (!c) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Contribution not found" });
    }
    const wid = c.walletId;

    if (c.expenseId)
      await Expense.deleteOne({ _id: c.expenseId }).session(session);
    await GoalContribution.deleteOne({ _id: c._id }).session(session);

    if (wid) {
      const bal = await computeWalletBalanceById(wid, session);
      await Wallet.findByIdAndUpdate(wid, { balance: bal }, { session });
    }

    await session.commitTransaction();
    res.json({ ok: true });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

export default r;
