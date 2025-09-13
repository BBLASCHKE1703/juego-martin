export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Tx from "@/models/Tx";

function code6(){ return Math.random().toString(36).slice(2,8).toUpperCase(); }
function rid(p="p_"){ return p + Math.random().toString(36).slice(2); }

export async function POST(req) {
  try {
    const body = await req.json();
    await dbConnect();

    const code = code6();
    const hostId = rid();

    const game = await Game.create({
      code,
      name: body.name || "Partida",
      status: "Lobby",
      initialGP: 15,
      multiplier: 1,
      maxSeat: 1,
      hostId,
      currentPotGroup: "",
      currentPotAmount: 0,
      swapRequest: null,
    });

    await Player.create({ id: hostId, gameCode: code, name: body.hostName || "Host", seat: 1, alive: true });

    await Tx.create({
      id: "t_" + Math.random().toString(36).slice(2),
      gameCode: code,
      playerId: hostId,
      amount: game.initialGP,
      reason: "GP inicial",
    });

    return new Response(JSON.stringify({ code, hostId }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
