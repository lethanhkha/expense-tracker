import mongoose from "mongoose";
const expenseSchema = new mongoose.Schema(
  {
    source: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    note: { type: String, trim: true, default: "", maxlength: 1000 },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
  },
  { timestamps: true }
);
export default mongoose.model("Expense", expenseSchema);
