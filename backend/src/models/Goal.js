// models/Goal.js
import mongoose from "mongoose";
const goalSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    targetAmount: { type: Number, required: true },
    note: String,
    // computed (không lưu cứng): savedAmount = sum(GoalContribution.amount)
    // status: "active" | "done" | "archived" (tuỳ chọn)
  },
  { timestamps: true }
);
export default mongoose.model("Goal", goalSchema);
