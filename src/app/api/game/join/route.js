export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Tx from "@/models/Tx";

function rid(p="p_"){ return p + Math.random().toString(36).slice(2); }

export async function POST(req) {
  try {
    const { code, name } = await req.json();
    await dbConnect();

    const game = await Game.findOne({ code });
    if (!game) return new Response(JSON.stringify({ error: "Juego no existe" }), { status: 404 });

    const seat = (game.maxSeat || 0) + 1;
    const playerId = rid();

    await Player.create({ id: playerId, gameCode: code, name: name || "Jugador", seat, alive: true });
    await Tx.create({
      id: "t_" + Math.random().toString(36).slice(2),
      gameCode: code,
      playerId,
      amount: game.initialGP,
      reason: "GP inicial",
    });
    await Game.updateOne({ code }, { $set: { maxSeat: seat } });

    return new Response(JSON.stringify({ playerId, seat }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
