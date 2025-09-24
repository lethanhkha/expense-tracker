import { Router } from "express";
import Tip from "../models/Tip.js";
import Wallet from "../models/Wallet.js";
import Income from "../models/Income.js";
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
      { $match: { walletId: oid, received: true } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
  ]);

  const sumIncome = Number(incAgg?.[0]?.total || 0);
  const sumExpense = Number(expAgg?.[0]?.total || 0);
  const sumTip = Number(tipAgg?.[0]?.total || 0);
  return sumIncome + sumTip - sumExpense;
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
    const data = await Tip.find(q).sort({ date: -1, createdAt: -1 });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const before = await Tip.findById(req.params.id).session(session);
    if (!before) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Not found" });
    }
    const updated = await Tip.findByIdAndUpdate(req.params.id, req.body, {
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
    next(e);
  } finally {
    session.endSession();
  }
});

r.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // const [tip] = await Tip.create([req.body], { session });

    // if (req.body.walletId) {
    //   const w = await Wallet.findById(req.body.walletId).session(session);
    //   if (!w) throw new Error("Wallet not found");
    //   w.balance += Number(req.body.amount || 0); // giống Income
    //   await w.save({ session });
    // }

    const [tip] = await Tip.create([{ ...req.body, received: false }], {
      session,
    });

    await session.commitTransaction();
    res.status(201).json(tip);
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
    // Lấy record trước khi sửa để biết ví cũ
    const before = await Tip.findById(req.params.id).session(session);
    if (!before) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy tip." });
    }

    // Cập nhật
    const updated = await Tip.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      session,
    });

    // Ví ảnh hưởng
    const affected = [
      String(before.walletId || ""),
      String(updated.walletId || ""),
    ].filter(Boolean);
    const unique = [...new Set(affected)];

    // Recompute từng ví
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

r.patch("/:id/received", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const tip = await Tip.findById(req.params.id).session(session);
    if (!tip) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Tip not found" });
    }

    tip.received = req.body.received;
    await tip.save({ session });

    if (tip.walletId) {
      const bal = await computeWalletBalanceById(tip.walletId, session);
      await Wallet.findByIdAndUpdate(
        tip.walletId,
        { balance: bal },
        { session }
      );
    }

    await session.commitTransaction();
    res.json(tip);
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
    const old = await Tip.findById(req.params.id).session(session);
    if (!old) return res.status(404).json({ message: "Not found" });

    await Tip.findByIdAndDelete(req.params.id, { session });

    // if (old.walletId) {
    //   const w = await Wallet.findById(old.walletId).session(session);
    //   if (w) {
    //     w.balance -= Number(old.amount || 0);
    //     await w.save({ session });
    //   }
    // }

    if (old.walletId) {
      const bal = await computeWalletBalanceById(old.walletId, session);
      await Wallet.findByIdAndUpdate(
        old.walletId,
        { balance: bal },
        { session }
      );
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
