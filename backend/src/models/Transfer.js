// models/Transfer.js
import mongoose from "mongoose";

const TransferSchema = new mongoose.Schema(
  {
    fromWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    toWalletId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Wallet",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

export default mongoose.model("Transfer", TransferSchema);
