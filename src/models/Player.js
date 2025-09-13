import mongoose, { Schema } from "mongoose";

const PlayerSchema = new Schema({
  id: { type: String, unique: true, index: true },  // playerId
  gameCode: { type: String, index: true },
  name: { type: String, required: true },
  seat: { type: Number, required: true },
  alive: { type: Boolean, default: true }, // 👈 nuevo
});

export default mongoose.models.Player || mongoose.model("Player", PlayerSchema);
