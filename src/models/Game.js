import mongoose, { Schema } from "mongoose";

const GameSchema = new Schema({
  code: { type: String, unique: true, index: true },
  name: String,
  status: { type: String, default: "Lobby" },
  initialGP: { type: Number, default: 15 },
  multiplier: { type: Number, default: 1 },
  maxSeat: { type: Number, default: 1 },
  hostId: { type: String },

  currentPotGroup: { type: String, default: "" },
  currentPotAmount: { type: Number, default: 0 },

  // 👇 que NUNCA sea null: siempre un objeto vacío por defecto
  swapRequest: {
    id:      { type: String, default: "" },
    fromId:  { type: String, default: "" },
    toId:    { type: String, default: "" },
    status:  { type: String, default: "" }, // "", "pending", "processing"
    createdAt: { type: Date },
  },

  winnerName: { type: String, default: "" },
  finalizedAt: { type: Date },
}, { timestamps: true });

export default mongoose.models.Game || mongoose.model("Game", GameSchema);
