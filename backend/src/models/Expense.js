//Thu
import mongoose from "mongoose";

const expenseSchema = new mongoose.Schema(
  {
    //Nguồn chi tiêu (Tên chi tiêu, ví dụ Ăn uống, Xăng, Mua sắm, ...)
    source: { type: String, required: true, trim: true },
    //Số tiền
    amount: { type: Number, required: true, min: 0 },
    //Ngày giờ người dùng nhập
    date: { type: Date, required: true },
    //Ghi chú
    note: { type: String, trim: true, default: "", maxlength: 1000 },
    //Ví tiền bị trừ
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    // Ngày logic theo Asia/Ho_Chi_Minh (YYYY-MM-DD)
    localDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  { timestamps: true }
);

expenseSchema.index({ localDate: 1, createdAt: -1 });
expenseSchema.index({ walletId: 1, localDate: 1 });

export default mongoose.model("Expense", expenseSchema);
