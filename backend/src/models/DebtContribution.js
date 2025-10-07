// models/DebtContribution.js
import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    debtId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Debt",
      required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

schema.index({ debtId: 1, date: -1, createdAt: -1 });

export default mongoose.model("DebtContribution", schema);
