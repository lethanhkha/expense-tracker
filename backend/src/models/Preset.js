//Danh mục mẫu
import mongoose from "mongoose";

const PresetSchema = new mongoose.Schema(
  {
    //Loại danh mục (Thu nhập || Chi tiêu)
    type: { type: String, enum: ["income", "expense"], required: true },
    //Nguồn chi tiêu || Nguồn thu nhập (giống source bên Income.js và Expense.js)
    source: { type: String, required: true, trim: true },
    //Số tiền
    amount: { type: Number, required: true, min: 0 },
    //Ghi chú
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// (tuỳ chọn) tránh trùng tên trong cùng 1 loại
// PresetSchema.index({ type: 1, source: 1 }, { unique: true });

export default mongoose.model("Preset", PresetSchema);
