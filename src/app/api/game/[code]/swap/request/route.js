export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";

function swpId(){ return "SWP_" + Date.now() + "_" + Math.random().toString(36).slice(2); }

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const code = params.code;
    const { fromId, toId } = await req.json();

    if (!fromId || !toId) {
      return new Response(JSON.stringify({ error: "fromId y toId requeridos" }), { status: 400 });
    }
    if (fromId === toId) {
      return new Response(JSON.stringify({ error: "Elige a otra persona" }), { status: 400 });
    }

    const game = await Game.findOne({ code });
    if (!game) return new Response(JSON.stringify({ error: "Juego no existe" }), { status: 404 });

    // Si había una pendiente muy vieja, la pisa (anti-bloqueo)
    const old = game.swapRequest || {};
    const isStale =
      old.status === "pending" &&
      old.createdAt &&
      (Date.now() - new Date(old.createdAt).getTime() > 60_000); // 60s

    if (old.status === "pending" && !isStale) {
      return new Response(JSON.stringify({ error: "Ya hay un intercambio pendiente" }), { status: 409 });
    }

    game.swapRequest = {
      id: swpId(),
      fromId,
      toId,
      status: "pending",
      createdAt: new Date(),
    };
    await game.save();

    return new Response(JSON.stringify({ id: game.swapRequest.id }), { status: 200 });
  } catch (e) {
    console.error("swap/request error:", e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
