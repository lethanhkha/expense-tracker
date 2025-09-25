import mongoose from "mongoose";

const DebtSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    dueDate: { type: Date },
    done: { type: Boolean, default: false },
    note: { type: String, trim: true },
  },
  { timestamps: true }
);

// Tối ưu truy vấn phổ biến
DebtSchema.index({ done: 1, dueDate: 1, createdAt: -1 });
DebtSchema.index({ title: "text", note: "text" });

export default mongoose.model("Debt", DebtSchema);
