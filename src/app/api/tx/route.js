export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Tx from "@/models/Tx";

export async function POST(req) {
  try {
    const body = await req.json(); // { gameCode, playerId, amount, reason, groupId?, sourcePlayerId? }
    await dbConnect();

    await Tx.create({
      id: "t_" + Math.random().toString(36).slice(2),
      gameCode: body.gameCode,
      playerId: body.playerId,
      amount: Number(body.amount || 0),
      reason: body.reason || "",
      groupId: body.groupId || "",
      sourcePlayerId: body.sourcePlayerId || "",
    });

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
