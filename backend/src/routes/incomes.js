import { Router } from "express";
import Tip from "../models/Tip.js";
import Income from "../models/Income.js";
import Wallet from "../models/Wallet.js";
import Expense from "../models/Expense.js";
import mongoose from "mongoose";

const r = Router();

async function computeWalletBalanceById(wid, session) {
  if (!wid) return 0;
  const oid = typeof wid === "string" ? new mongoose.Types.ObjectId(wid) : wid;
  const sumExpr = { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } };

  const [incAgg, expAgg, tipAgg] = await Promise.all([
    Income.aggregate([
      { $match: { walletId: oid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    Expense.aggregate([
      { $match: { walletId: oid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    Tip.aggregate([
      { $match: { walletId: oid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
  ]);

  const sumIncome = Number(incAgg?.[0]?.total || 0);
  const sumExpense = Number(expAgg?.[0]?.total || 0);
  const sumTip = Number(tipAgg?.[0]?.total || 0);
  return sumIncome + sumTip - sumExpense;
}

function toLocalISO_HCM(input) {
  const d = new Date(input);
  const y = d.getUTCFullYear(),
    m = d.getUTCMonth(),
    day = d.getUTCDate();
  const local = new Date(Date.UTC(y, m, day, 7, 0, 0));
  const yy = local.getUTCFullYear();
  const mm = String(local.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(local.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

r.get("/", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const q = {};
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const data = await Income.find(q).sort({ date: -1, createdAt: -1 });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const body = { ...req.body };
    if (body.date) body.localDate = toLocalISO_HCM(body.date);
    const [inc] = await Income.create([body], { session });

    if (req.body.walletId) {
      const w = await Wallet.findById(req.body.walletId).session(session);
      if (!w) throw new Error("Wallet not found");
      w.balance += Number(req.body.amount || 0);
      await w.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json(inc);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

r.patch("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const before = await Income.findById(req.params.id).session(session);
    if (!before) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy khoản thu." });
    }

    const patch = { ...req.body };
    if (patch.date) patch.localDate = toLocalISO_HCM(patch.date);
    const updated = await Income.findByIdAndUpdate(req.params.id, patch, {
      new: true,
      session,
    });

    const affected = [
      String(before.walletId || ""),
      String(updated.walletId || ""),
    ].filter(Boolean);
    const unique = [...new Set(affected)];

    for (const wid of unique) {
      const bal = await computeWalletBalanceById(wid, session);
      await Wallet.findByIdAndUpdate(wid, { balance: bal }, { session });
    }

    await session.commitTransaction();
    res.json(updated);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

r.delete("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const old = await Income.findById(req.params.id).session(session);
    if (!old) return res.status(404).json({ message: "Not found" });

    await Income.findByIdAndDelete(req.params.id, { session });

    if (old.walletId) {
      const w = await Wallet.findById(old.walletId).session(session);
      if (w) {
        w.balance -= Number(old.amount || 0);
        await w.save({ session });
      }
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
