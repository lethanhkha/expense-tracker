// models/GoalContribution.js
import mongoose from "mongoose";
const goalContributionSchema = new mongoose.Schema(
  {
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
    note: String,
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    expenseId: { type: mongoose.Schema.Types.ObjectId, ref: "Expense" }, // track expense liên kết
  },
  { timestamps: true }
);
export default mongoose.model("GoalContribution", goalContributionSchema);
