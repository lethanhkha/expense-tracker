import express from "express";
import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";
import Income from "../models/Income.js";
import Expense from "../models/Expense.js";
import Tip from "../models/Tip.js";

const r = express.Router();
const sumExpr = { $sum: { $toDouble: { $ifNull: ["$amount", 0] } } };

// Hàm tính lại balance cho 1 ví
async function computeWalletBalanceById(wid, session) {
  const [incAgg, expAgg, tipAgg] = await Promise.all([
    Income.aggregate([
      { $match: { walletId: wid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    Expense.aggregate([
      { $match: { walletId: wid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
    Tip.aggregate([
      { $match: { walletId: wid } },
      { $group: { _id: null, total: sumExpr } },
    ]).session(session),
  ]);

  const sumIncome = Number(incAgg?.[0]?.total || 0);
  const sumExpense = Number(expAgg?.[0]?.total || 0);
  const sumTip = Number(tipAgg?.[0]?.total || 0);
  return sumIncome + sumTip - sumExpense;
}

// GET /api/wallets
r.get("/", async (_req, res) => {
  const list = await Wallet.find({ archived: false }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  res.json(list);
});

r.post("/", async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    // CHỈ ĐẾM VÍ ACTIVE
    const activeCount = await Wallet.countDocuments({
      archived: false,
    }).session(session);

    const doc = await Wallet.create([{ ...req.body, balance: 0 }], { session });
    const created = doc[0];

    if (activeCount === 0) {
      // ===== Trường hợp VÍ ĐẦU TIÊN (không có ví active nào trước đó) =====
      const wid = created._id;

      await Promise.all([
        Income.updateMany({}, { $set: { walletId: wid } }, { session }),
        Expense.updateMany({}, { $set: { walletId: wid } }, { session }),
        Tip.updateMany({}, { $set: { walletId: wid } }, { session }),
      ]);

      const balance = await computeWalletBalanceById(wid, session);
      created.balance = balance;
      created.isDefault = true;
      await created.save({ session });
    } else {
      // ===== Không phải ví đầu tiên: cứu hộ dữ liệu mồ côi (nếu có) =====
      // Sau create, số ví active sẽ là activeCount + 1.
      const activeWallets = await Wallet.find({ archived: false }).session(
        session
      );
      if (activeWallets.length === 1) {
        const wid = activeWallets[0]._id;

        // Gán walletId cho các bản ghi còn thiếu
        const orphanFilter = {
          $or: [{ walletId: { $exists: false } }, { walletId: null }],
        };
        await Promise.all([
          Income.updateMany(
            orphanFilter,
            { $set: { walletId: wid } },
            { session }
          ),
          Expense.updateMany(
            orphanFilter,
            { $set: { walletId: wid } },
            { session }
          ),
          Tip.updateMany(
            orphanFilter,
            { $set: { walletId: wid } },
            { session }
          ),
        ]);

        const balance = await computeWalletBalanceById(wid, session);
        await Wallet.findByIdAndUpdate(
          wid,
          { balance },
          { new: true, session }
        );
      }
    }

    await session.commitTransaction();
    const fresh = await Wallet.findById(created._id);
    res.json(fresh);
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

r.post("/recompute", async (_req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const wallets = await Wallet.find({}).session(session);

    for (const w of wallets) {
      const balance = await computeWalletBalanceById(w._id, session);
      w.balance = balance;
      await w.save({ session });
    }

    await session.commitTransaction();
    res.json({ ok: true, updated: wallets.length });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

// OPTIONAL: chuyển tiền giữa ví
r.post("/transfer", async (req, res) => {
  const { fromWalletId, toWalletId, amount, note, date } = req.body || {};
  const amt = Number(amount);

  if (!fromWalletId || !toWalletId || !amt)
    return res.status(400).json({ message: "Thiếu tham số." });
  if (fromWalletId === toWalletId)
    return res.status(400).json({ message: "Hai ví phải khác nhau." });
  if (amt <= 0) return res.status(400).json({ message: "Số tiền phải > 0." });

  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const from = await Wallet.findById(fromWalletId).session(session);
    const to = await Wallet.findById(toWalletId).session(session);

    if (!from || !to) {
      await session.abortTransaction();
      return res.status(404).json({ message: "Không tìm thấy ví." });
    }
    if ((from.balance ?? 0) < amt) {
      await session.abortTransaction();
      return res.status(400).json({ message: "Số dư ví nguồn không đủ." });
    }

    from.balance = (from.balance ?? 0) - amt;
    to.balance = (to.balance ?? 0) + amt;
    await from.save({ session });
    await to.save({ session });

    await session.commitTransaction();
    res.status(201).json({ ok: true });
  } catch (err) {
    await session.abortTransaction();
    console.error(err);
    res.status(500).json({ message: "Lỗi chuyển tiền." });
  } finally {
    session.endSession();
  }
});

// PATCH /api/wallets/:id
r.patch("/:id", async (req, res) => {
  try {
    const updated = await Wallet.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// DELETE /api/wallets/:id  (archive)
r.delete("/:id", async (req, res) => {
  try {
    const updated = await Wallet.findByIdAndUpdate(
      req.params.id,
      { archived: true },
      { new: true }
    );
    res.json(updated);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

export default r;
