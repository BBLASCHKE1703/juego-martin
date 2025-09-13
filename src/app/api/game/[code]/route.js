// src/app/api/game/[code]/route.js
export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Tx from "@/models/Tx";

/** Suma GP de un jugador usando las TX */
async function gpFor(gameCode, playerId){
  const txs = await Tx.find({ gameCode, playerId }).lean();
  return txs.reduce((s,t)=> s + Number(t.amount||0), 0);
}

export async function GET(_req, { params }){
  try {
    await dbConnect();
    const code = params.code;

    // Trae el juego con TODOS los campos (incluye swapRequest)
    const gameDoc = await Game.findOne({ code }).lean();
    if(!gameDoc) return new Response(JSON.stringify({ error:"No existe" }), { status:404 });

    // Jugadores
    const players = await Player.find({ gameCode: code }).lean();

    // Historial (ordenado por fecha)
    const history = await Tx.find({ gameCode: code }).sort({ createdAt: 1 }).lean();

    // Ranking (incluye vivos/muertos)
    const withGp = await Promise.all(players.map(async p=>{
      const gp = await gpFor(code, p.id);
      return { id:p.id, name:p.name, seat:p.seat, alive: p.alive!==false, gp };
    }));
    withGp.sort((a,b)=> b.gp - a.gp || a.seat - b.seat);

    // Respuesta
    const out = {
      game: {
        code: gameDoc.code,
        name: gameDoc.name,
        status: gameDoc.status,
        initialGP: gameDoc.initialGP,
        multiplier: gameDoc.multiplier,
        maxSeat: gameDoc.maxSeat,
        hostId: gameDoc.hostId,
        currentPotGroup: gameDoc.currentPotGroup || "",
        currentPotAmount: gameDoc.currentPotAmount || 0,
        // 👇 MUY IMPORTANTE: incluir swapRequest completo
        swapRequest: gameDoc.swapRequest || { id:"", fromId:"", toId:"", status:"", createdAt:null },
        winnerName: gameDoc.winnerName || "",
        finalizedAt: gameDoc.finalizedAt || null,
        createdAt: gameDoc.createdAt,
        updatedAt: gameDoc.updatedAt,
      },
      players: players.map(p=>({ id:p.id, name:p.name, seat:p.seat, alive: p.alive!==false })),
      ranking: withGp,
      history: history.map(h=>({
        id: h.id,
        playerId: h.playerId,
        amount: h.amount,
        reason: h.reason,
        groupId: h.groupId || "",
        sourcePlayerId: h.sourcePlayerId || "",
        createdAt: h.createdAt,
      })),
    };

    return new Response(JSON.stringify(out), { status:200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error:e.message }), { status:500 });
  }
}

export async function PATCH(req, { params }){
  try {
    await dbConnect();
    const code = params.code;
    const body = await req.json();

    const set = {};
    if (typeof body.status === "string") set.status = body.status;                   // Lobby | EnJuego | Finalizado
    if (typeof body.multiplier === "number") set.multiplier = body.multiplier;       // x1/x2
    if (typeof body.currentPotGroup === "string") set.currentPotGroup = body.currentPotGroup;
    if (typeof body.currentPotAmount === "number") set.currentPotAmount = body.currentPotAmount;
    if (typeof body.winnerName === "string") set.winnerName = body.winnerName;
    if (body.finalizedAt) set.finalizedAt = new Date(body.finalizedAt);

    // swapRequest: permitir escribir objeto completo o limpiarlo con null
    if (body.swapRequest === null) {
      set.swapRequest = { id:"", fromId:"", toId:"", status:"", createdAt:null };
    } else if (body.swapRequest && typeof body.swapRequest === "object") {
      set.swapRequest = {
        id: body.swapRequest.id || body.swapRequest.groupId || body.swapRequest._id || "",
        fromId: body.swapRequest.fromId || "",
        toId: body.swapRequest.toId || "",
        status: body.swapRequest.status || "pending",
        createdAt: body.swapRequest.createdAt ? new Date(body.swapRequest.createdAt) : new Date(),
      };
    }

    if (Object.keys(set).length === 0) {
      return new Response(JSON.stringify({ error:"Nada que actualizar" }), { status:400 });
    }

    const updated = await Game.findOneAndUpdate({ code }, { $set:set }, { new:true }).lean();
    if (!updated) return new Response(JSON.stringify({ error:"No existe" }), { status:404 });

    return new Response(JSON.stringify({ ok:true }), { status:200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error:e.message }), { status:500 });
  }
}
