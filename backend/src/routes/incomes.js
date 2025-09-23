import { Router } from "express";
import Income from "../models/Income.js";
import Wallet from "../models/Wallet.js";
import mongoose from "mongoose";

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
    const data = await Income.find(q).sort({ date: -1, createdAt: -1 });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    const updated = await Income.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const [inc] = await Income.create([req.body], { session });

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

// r.patch("/:id", async (req, res) => {
//   const session = await mongoose.startSession();
//   session.startTransaction();
//   try {
//     const old = await Income.findById(req.params.id).session(session);
//     if (!old) throw new Error("Income not found");

//     const updated = await Income.findByIdAndUpdate(req.params.id, req.body, {
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
//         w.balance += delta;
//         await w.save({ session });
//       }
//     } else {
//       if (oldWid) {
//         const wOld = await Wallet.findById(oldWid).session(session);
//         if (wOld) {
//           wOld.balance -= oldAmount;
//           await wOld.save({ session });
//         }
//       }
//       if (newWid) {
//         const wNew = await Wallet.findById(newWid).session(session);
//         if (wNew) {
//           wNew.balance += newAmount;
//           await wNew.save({ session });
//         }
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

// ví dụ cho incomes.js
r.patch("/:id", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const old = await Income.findById(req.params.id).session(session);
    if (!old) return res.status(404).json({ message: "Not found" });

    const { amount, walletId, ...rest } = req.body;

    const amtOld = Number(old.amount || 0);
    const amtNew = amount != null ? Number(amount) : amtOld;
    const walletOld = old.walletId?.toString() || null;
    const walletNew = walletId || walletOld;

    // 1) cập nhật bản ghi
    old.set({ ...rest, amount: amtNew, walletId: walletNew });
    await old.save({ session });

    // 2) cân lại số dư ví
    if (walletOld === walletNew) {
      // cùng ví: chỉ cần chênh lệch amount
      if (amtNew !== amtOld) {
        const w = await Wallet.findById(walletNew).session(session);
        if (w) {
          w.balance += amtNew - amtOld;
          await w.save({ session });
        }
      }
    } else {
      // khác ví: trừ ví cũ, cộng ví mới
      if (walletOld) {
        const wOld = await Wallet.findById(walletOld).session(session);
        if (wOld) {
          wOld.balance -= amtOld;
          await wOld.save({ session });
        }
      }
      if (walletNew) {
        const wNew = await Wallet.findById(walletNew).session(session);
        if (wNew) {
          wNew.balance += amtNew;
          await wNew.save({ session });
        }
      }
    }

    await session.commitTransaction();
    res.json(old);
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
