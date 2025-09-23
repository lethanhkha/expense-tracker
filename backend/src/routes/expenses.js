import { Router } from "express";
import Expense from "../models/Expense.js";
import Wallet from "../models/Wallet.js";
import Tip from "../models/Tip.js";
import Income from "../models/Income.js";
import mongoose from "mongoose";

// đặt ngay trên đầu file expenses.js (sau các import)
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

const r = Router();

r.get("/", async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const q = {};
    if (from || to) {
      q.date = {};
      if (from) q.date.$gte = new Date(from);
      if (to) q.date.$lte = new Date(to);
    }
    const data = await Expense.find(q).sort({ date: -1, createdAt: -1 });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// routes/expenses.js
r.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { source, amount, date, note, walletId } = req.body;

    const [exp] = await Expense.create(
      [{ source, amount, date, note, walletId }],
      { session }
    );

    if (walletId) {
      const w = await Wallet.findById(walletId).session(session);
      if (!w) throw new Error("Wallet not found");
      w.balance -= Number(amount || 0); // chi tiêu -> trừ tiền
      await w.save({ session });
    }

    await session.commitTransaction();
    res.status(201).json(exp);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// r.delete("/:id", async (req, res, next) => {
//   try {
//     const deleted = await Expense.findByIdAndDelete(req.params.id);
//     if (!deleted) return res.status(404).json({ message: "Not found" });
//     res.json({ ok: true });
//   } catch (e) {
//     next(e);
//   }
// });

// r.patch("/:id", async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const old = await Expense.findById(req.params.id).session(session);
//     if (!old) throw new Error("Expense not found");

//     const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
//       new: true,
//       session,
//     });

//     const oldAmount = Number(old.amount || 0);
//     const newAmount = Number(updated.amount || 0);
//     const delta = newAmount - oldAmount;

//     const oldWid = String(old.walletId || "");
//     const newWid = String(updated.walletId || "");

//     if (oldWid && newWid && oldWid === newWid) {
//       const w = await Wallet.findById(newWid).session(session);
//       if (w) {
//         w.balance -= delta;
//         await w.save({ session });
//       } // delta cho Expense là trừ
//     } else {
//       if (oldWid) {
//         const wOld = await Wallet.findById(oldWid).session(session);
//         if (wOld) {
//           wOld.balance += oldAmount;
//           await wOld.save({ session });
//         } // hoàn lại số cũ
//       }
//       if (newWid) {
//         const wNew = await Wallet.findById(newWid).session(session);
//         if (wNew) {
//           wNew.balance -= newAmount;
//           await wNew.save({ session });
//         } // trừ số mới
//       }
//     }

//     await session.commitTransaction();
//     res.json(updated);
//   } catch (e) {
//     await session.abortTransaction();
//     res.status(400).json({ message: e.message });
//   } finally {
//     session.endSession();
//   }
// });

r.patch("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // Lấy record trước khi sửa để biết ví cũ
    const before = await Expense.findById(req.params.id).session(session);
    if (!before) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy khoản chi." });
    }

    // Cập nhật
    const updated = await Expense.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      session,
    });

    // Xác định các ví bị ảnh hưởng (ví cũ & ví mới nếu đổi)
    const affected = [
      String(before.walletId || ""),
      String(updated.walletId || ""),
    ].filter(Boolean);
    const unique = [...new Set(affected)];

    // Recompute từng ví bị ảnh hưởng
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
    const old = await Expense.findById(req.params.id).session(session);
    if (!old) return res.status(404).json({ message: "Not found" });

    await Expense.findByIdAndDelete(req.params.id, { session });

    if (old.walletId) {
      const w = await Wallet.findById(old.walletId).session(session);
      if (w) {
        w.balance += Number(old.amount || 0);
        await w.save({ session });
      } // hoàn lại
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
