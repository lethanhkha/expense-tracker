//Nợ
import mongoose from "mongoose";

const debtSchema = new mongoose.Schema(
  {
    //Mô tả nợ (Ví dụ: Nợ ngân hàng, Nợ anh A, ...)
    title: { type: String, required: true, trim: true },
    //Số tiền nợ
    amount: { type: Number, required: true, min: 0 },
    //Ngày đến hạn trả
    dueDate: { type: Date },
    //Trạng thái nợ (true: Đã trả, false: Chưa trả, mặc định false)
    done: { type: Boolean, default: false },
    //Ghi chú
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// Tối ưu truy vấn phổ biến
debtSchema.index({ done: 1, dueDate: 1, createdAt: -1 });
debtSchema.index({ title: "text", note: "text" });

export default mongoose.model("Debt", debtSchema);
