export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";
import Tx from "@/models/Tx";
import Player from "@/models/Player";

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const code = params.code;
    const { requestId } = await req.json();

    // 1) Pasar de "pending" a "processing" una sola vez (evita dobles ejecuciones)
    const game = await Game.findOneAndUpdate(
      { code, "swapRequest.id": requestId, "swapRequest.status": "pending" },
      { $set: { "swapRequest.status": "processing" } },
      { new: true }
    );
    if (!game) {
      return new Response(JSON.stringify({ error: "No hay solicitud pendiente (o ya fue procesada/cancelada)." }), { status: 409 });
    }

    const { fromId, toId } = game.swapRequest || {};
    if (!fromId || !toId) {
      await Game.updateOne({ code }, { $set: { "swapRequest": { id:"", fromId:"", toId:"", status:"", createdAt:null } } });
      return new Response(JSON.stringify({ error: "Solicitud inválida" }), { status: 400 });
    }

    // 2) Sumas actuales de A y B
    const txs = await Tx.find({ gameCode: code, playerId: { $in: [fromId, toId] } }).lean();
    let sumA = 0, sumB = 0;
    for (const t of txs) {
      if (t.playerId === fromId) sumA += Number(t.amount || 0);
      if (t.playerId === toId)   sumB += Number(t.amount || 0);
    }

    // 3) Nombres para el "reason"
    const players = await Player.find({ gameCode: code, id: { $in: [fromId, toId] } }).lean();
    const pA = players.find(p=>p.id===fromId);
    const pB = players.find(p=>p.id===toId);
    const nameA = pA?.name || "A";
    const nameB = pB?.name || "B";

    const deltaA = sumB - sumA; // aplicar a A para que quede con GP de B
    const deltaB = sumA - sumB; // aplicar a B para que quede con GP de A
    const gid = `SWAP_${requestId}`;

    const ops = [];
    if (deltaA) ops.push(Tx.create({
      id: "t_" + Math.random().toString(36).slice(2),
      gameCode: code,
      playerId: fromId,
      amount: deltaA,
      reason: `Intercambio con ${nameB}`,
      groupId: gid,
      sourcePlayerId: toId,
    }));
    if (deltaB) ops.push(Tx.create({
      id: "t_" + Math.random().toString(36).slice(2),
      gameCode: code,
      playerId: toId,
      amount: deltaB,
      reason: `Intercambio con ${nameA}`,
      groupId: gid,
      sourcePlayerId: fromId,
    }));
    if (ops.length) await Promise.all(ops);

    // 4) Limpiar solicitud
    await Game.updateOne(
      { code, "swapRequest.id": requestId },
      { $set: { "swapRequest": { id:"", fromId:"", toId:"", status:"", createdAt:null } } }
    );

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
