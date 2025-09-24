import mongoose from "mongoose";
const tipSchema = new mongoose.Schema(
  {
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true }, // ngày ghi tip
    customer: { type: String, trim: true },
    note: { type: String, trim: true },
    walletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    received: { type: Boolean, default: false },
  },
  { timestamps: true }
);
export default mongoose.model("Tip", tipSchema);
