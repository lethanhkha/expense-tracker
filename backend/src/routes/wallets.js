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
  const { fromId, toId, amount } = req.body;
  if (!fromId || !toId || !amount || amount <= 0)
    return res.status(400).json({ message: "Invalid payload" });

  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const from = await Wallet.findById(fromId).session(session);
    const to = await Wallet.findById(toId).session(session);
    if (!from || !to) throw new Error("Wallet not found");
    if (from.balance < amount) throw new Error("Insufficient funds");

    from.balance -= amount;
    to.balance += amount;
    await from.save({ session });
    await to.save({ session });

    await session.commitTransaction();
    res.json({ ok: true, from, to });
  } catch (e) {
    await session.abortTransaction();
    res.status(400).json({ message: e.message });
  } finally {
    session.endSession();
  }
});

export default router;
