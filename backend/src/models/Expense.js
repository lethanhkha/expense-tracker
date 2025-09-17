import mongoose from "mongoose";
const expenseSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
  },
  { timestamps: true }
);
export default mongoose.model("Expense", expenseSchema);
