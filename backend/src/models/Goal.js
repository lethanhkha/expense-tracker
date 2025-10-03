//Mục tiêu
import mongoose from "mongoose";

const goalSchema = new mongoose.Schema(
  {
    //Tên mục tiêu
    name: { type: String, required: true },
    //Số tiền đặt ra cho mục tiêu
    targetAmount: { type: Number, required: true },
    //Ghi chú
    note: String,
    // computed (không lưu cứng): savedAmount = sum(GoalContribution.amount)
    // status: "active" | "done" | "archived" (tuỳ chọn)
  },
  { timestamps: true }
);
export default mongoose.model("Goal", goalSchema);
