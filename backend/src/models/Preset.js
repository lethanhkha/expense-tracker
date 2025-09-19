// models/Preset.js
import mongoose from "mongoose";

const PresetSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["income", "expense"], required: true },
    source: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    note: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

// (tuỳ chọn) tránh trùng tên trong cùng 1 loại
// PresetSchema.index({ type: 1, source: 1 }, { unique: true });

export default mongoose.model("Preset", PresetSchema);
