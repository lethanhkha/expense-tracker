//Ví tiền
import mongoose from "mongoose";

const { Schema, model } = mongoose;

const walletSchema = new Schema(
  {
    //Tên ví
    name: { type: String, required: true, trim: true }, // Tiền mặt, VCB, Momo...
    //Loại ví (cash = tiền mặt, bank = ngân hàng, ewallet = ví điện tử, other = mục khác)
    type: {
      type: String,
      enum: ["cash", "bank", "ewallet", "other"],
      default: "cash",
    },
    //Loại tiền tệ
    currency: { type: String, default: "VND" },
    //Số dư
    balance: { type: Number, default: 0 },
    //Mặc định (nếu được set thì các khoản thu/chi sẽ tự áp ví này)
    isDefault: { type: Boolean, default: false },
    //Trạng thái ví (true = Lưu trữ, false = Đang hoạt động, mặc định Đang hoạt động)
    archived: { type: Boolean, default: false },
    //Ghi chú
    note: { type: String, default: "" },
  },
  { timestamps: true }
);

const Wallet = model("Wallet", walletSchema);
export default Wallet;
