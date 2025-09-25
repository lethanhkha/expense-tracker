import { Router } from "express";
import Debt from "../models/Debt.js";

const r = Router();

r.get("/", async (req, res, next) => {
  try {
    const { from, to, done, q } = req.query;
    const filter = {};

    // Lọc theo done (true/false)
    if (typeof done !== "undefined") {
      const v = String(done).toLowerCase();
      if (["1", "true", "yes"].includes(v)) filter.done = true;
      if (["0", "false", "no"].includes(v)) filter.done = false;
    }

    // Khoảng thời gian theo dueDate (phù hợp màn Debts trên FE)
    if (from || to) {
      filter.dueDate = {};
      if (from) filter.dueDate.$gte = new Date(from);
      if (to) filter.dueDate.$lte = new Date(to);
    }
    // Tìm kiếm đơn giản theo title/note
    if (q) {
      const rx = new RegExp(q, "i");
      filter.$or = [{ title: rx }, { note: rx }];
    }

    const data = await Debt.find(filter).sort({
      done: 1,
      dueDate: 1,
      createdAt: -1,
    });
    res.json(data);
  } catch (e) {
    next(e);
  }
});

r.get("/:id", async (req, res, next) => {
  try {
    const doc = await Debt.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// POST /api/debts
r.post("/", async (req, res, next) => {
  try {
    let { title, amount, dueDate, note } = req.body || {};
    if (typeof dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      dueDate = new Date(dueDate + "T00:00:00.000Z");
    }
    const doc = await Debt.create({
      title,
      amount,
      dueDate,
      note,
      done: false,
    });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

// PATCH /api/debts/:id
r.patch("/:id", async (req, res, next) => {
  try {
    const update = {};
    for (const k of ["title", "amount", "dueDate", "note", "done"]) {
      if (typeof req.body?.[k] !== "undefined") update[k] = req.body[k];
    }
    if (
      typeof update.dueDate === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(update.dueDate)
    ) {
      update.dueDate = new Date(update.dueDate + "T00:00:00.000Z");
    }
    const doc = await Debt.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!doc) return res.status(404).json({ message: "Not found" });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

// DELETE /api/debts/:id
r.delete("/:id", async (req, res, next) => {
  try {
    const del = await Debt.findByIdAndDelete(req.params.id);
    if (!del) return res.status(404).json({ message: "Not found" });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default r;
