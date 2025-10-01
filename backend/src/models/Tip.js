import mongoose from "mongoose";
const tipSchema = new mongoose.Schema(
  {
    //Số tiền nhận được
    amount: { type: Number, required: true, min: 0 },
    //Ngày thực tế ghi tip
    date: { type: Date, required: true },
    //Khách hàng (Tên khách, Khách vãng lai, ...)
    customer: { type: String, trim: true },
    //Ghi chú
    note: { type: String, trim: true },
    //Ví tiền được cộng
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    //Đã nhận tip hay chưa, mặc định chưa nhận
    received: { type: Boolean, default: false },
    // Ngày logic theo Asia/Ho_Chi_Minh (YYYY-MM-DD)
    localDate: {
      type: String,
      required: true,
      match: /^\d{4}-\d{2}-\d{2}$/,
    },
  },
  { timestamps: true }
);

tipSchema.index({ localDate: 1, createdAt: -1 });
tipSchema.index({ walletId: 1, localDate: 1 });

export default mongoose.model("Tip", tipSchema);
