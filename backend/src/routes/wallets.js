import express from "express";
import mongoose from "mongoose";
import Wallet from "../models/Wallet.js";

const router = express.Router();

// GET /api/wallets
router.get("/", async (_req, res) => {
  const list = await Wallet.find({ archived: false }).sort({
    isDefault: -1,
    createdAt: 1,
  });
  res.json(list);
});

// POST /api/wallets
router.post("/", async (req, res) => {
  try {
    const w = await Wallet.create(req.body);
    res.status(201).json(w);
  } catch (e) {
    res.status(400).json({ message: e.message });
  }
});

// PATCH /api/wallets/:id
router.patch("/:id", async (req, res) => {
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
router.delete("/:id", async (req, res) => {
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

// OPTIONAL: chuyển tiền giữa ví
router.post("/transfer", async (req, res) => {
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

export default router;
