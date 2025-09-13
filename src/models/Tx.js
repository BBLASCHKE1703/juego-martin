import mongoose, { Schema } from "mongoose";

const TxSchema = new Schema({
  id: { type: String, unique: true, index: true },
  gameCode: { type: String, index: true },
  playerId: { type: String, index: true },
  amount: { type: Number, default: 0 },
  reason: { type: String, default: "" },
  groupId: { type: String, default: "" },
  sourcePlayerId: { type: String, default: "" },
}, { timestamps: true });

export default mongoose.models.Tx || mongoose.model("Tx", TxSchema);
