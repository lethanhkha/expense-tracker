import { Router } from "express";
import Tip from "../models/Tip.js";
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
    const data = await Tip.find(q).sort({ date: -1, createdAt: -1 });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

r.post("/", async (req, res, next) => {
  try {
    const { amount, date, customer, note } = req.body;
    const created = await Tip.create({ amount, date, customer, note });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

r.put("/:id", async (req, res, next) => {
  try {
    const updated = await Tip.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

r.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Tip.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
