import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./db.js";

import incomes from "./routes/incomes.js";
import expenses from "./routes/expenses.js";
import tips from "./routes/tips.js";
import stats from "./routes/stats.js";
import presets from "./routes/presets.js";
import wallets from "./routes/wallets.js";
import debts from "./routes/debts.js";
import goals from "./routes/goals.js";

const envFile = process.env.NODE_ENV === "production" ? ".env" : ".env.dev";
dotenv.config({ path: envFile });

const app = express();

const allow = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow tools/postman
      if (allow.length === 0 || allow.includes(origin)) return cb(null, true);
      cb(new Error(`CORS blocked for ${origin}`));
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ ok: true, name: "expense-tracker-api" }));

app.use("/api/incomes", incomes);
app.use("/api/expenses", expenses);
app.use("/api/tips", tips);
app.use("/api/stats", stats);
app.use("/api/presets", presets);
app.use("/api/wallets", wallets);
app.use("/api/debts", debts);
app.use("/api/goals", goals);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ message: "Not Found" });
});

// error handler JSON
app.use((err, req, res, next) => {
  console.error("❌ API Error:", err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Internal Error" });
});

const port = process.env.PORT || 8000;

connectDB(process.env.MONGODB_URI)
  .then(() =>
    app.listen(port, () => {
      console.log(`🚀 API on http://localhost:${port}`);
      console.log(process.env.MONGODB_URI);
    })
  )
  .catch((e) => {
    console.error("❌ DB connect error:", e);
    process.exit(1);
  });
