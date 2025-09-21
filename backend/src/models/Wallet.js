import mongoose from "mongoose";

const { Schema, model } = mongoose;

const walletSchema = new Schema(
  {
    name: { type: String, required: true, trim: true }, // Ví Tiền mặt, VCB, Momo...
    type: {
      type: String,
      enum: ["cash", "bank", "ewallet", "other"],
      default: "cash",
    },
    currency: { type: String, default: "VND" },
    balance: { type: Number, default: 0 },
    isDefault: { type: Boolean, default: false },
    archived: { type: Boolean, default: false },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

const Wallet = model("Wallet", walletSchema);
export default Wallet;
