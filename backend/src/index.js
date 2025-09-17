import express from "express";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import { connectDB } from "./db.js";

import incomes from "./routes/incomes.js";
import expenses from "./routes/expenses.js";
import tips from "./routes/tips.js";
import stats from "./routes/stats.js";

dotenv.config();
const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan("dev"));

app.get("/", (req, res) => res.json({ ok: true, name: "expense-tracker-api" }));

app.use("/api/incomes", incomes);
app.use("/api/expenses", expenses);
app.use("/api/tips", tips);
app.use("/api/stats", stats);

const port = process.env.PORT || 8000;

connectDB(process.env.MONGODB_URI)
  .then(() =>
    app.listen(port, () => console.log(`🚀 API on http://localhost:${port}`))
  )
  .catch((e) => {
    console.error("❌ DB connect error:", e);
    process.exit(1);
  });
