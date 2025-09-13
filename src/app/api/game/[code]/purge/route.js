export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";
import Player from "@/models/Player";
import Tx from "@/models/Tx";

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const code = params.code;

    const game = await Game.findOne({ code }).lean();
    if (!game) return new Response(JSON.stringify({ error: "Juego no existe" }), { status: 404 });

    await Promise.all([
      Tx.deleteMany({ gameCode: code }),
      Player.deleteMany({ gameCode: code }),
      Game.deleteOne({ code })
    ]);

    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
