// routes/presets.js
import { Router } from "express";
import Preset from "../models/Preset.js";

const r = Router();

// GET /api/presets?type=income|expense&q=text
r.get("/", async (req, res, next) => {
  try {
    const { type, q } = req.query;
    const filter = {};
    if (type) filter.type = type; // income | expense
    if (q) filter.source = { $regex: String(q), $options: "i" };
    const data = await Preset.find(filter).sort({ updatedAt: -1 });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

// POST /api/presets
// body: { type: "income"|"expense", source: string, amount: number, note?: string }
r.post("/", async (req, res, next) => {
  try {
    let { type, source, amount, note = "" } = req.body;
    if (!["income", "expense"].includes(type || "")) {
      return res
        .status(400)
        .json({ message: "type must be 'income' or 'expense'" });
    }
    if (!source || !String(source).trim()) {
      return res.status(400).json({ message: "source is required" });
    }
    const created = await Preset.create({
      type,
      source: String(source).trim(),
      amount: Number(amount) || 0,
      note: String(note ?? "").trim(),
    });
    res.status(201).json(created);
  } catch (e) {
    next(e);
  }
});

// PUT /api/presets/:id  (update 1 phần)
r.put("/:id", async (req, res, next) => {
  try {
    const { type, source, amount, note } = req.body;
    const patch = {};
    if (type != null) {
      if (!["income", "expense"].includes(type)) {
        return res.status(400).json({ message: "type invalid" });
      }
      patch.type = type;
    }
    if (source != null) patch.source = String(source).trim();
    if (amount != null) patch.amount = Number(amount);
    if (note != null) patch.note = String(note).trim();

    const updated = await Preset.findByIdAndUpdate(req.params.id, patch, {
      new: true,
    });
    if (!updated) return res.status(404).json({ message: "Not found" });
    res.json(updated);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/presets/:id
r.delete("/:id", async (req, res, next) => {
  try {
    const deleted = await Preset.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
