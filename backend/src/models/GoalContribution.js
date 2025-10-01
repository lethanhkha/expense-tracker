// Các khoản góp vào mục tiêu
import mongoose from "mongoose";
const goalContributionSchema = new mongoose.Schema(
  {
    //Id khoản góp
    goalId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Goal",
      required: true,
    },
    //Số tiền góp
    amount: { type: Number, required: true },
    //Ngày góp (Có thể nhập, mặc định hôm nay)
    date: { type: Date, default: Date.now },
    //Ghi chú
    note: String,
    //Ví bị trừ tiền
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
