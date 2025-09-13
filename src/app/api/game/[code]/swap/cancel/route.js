export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Game from "@/models/Game";

export async function POST(req, { params }) {
  try {
    await dbConnect();
    const code = params.code;
    const { requestId } = await req.json();

    const game = await Game.findOneAndUpdate(
      { code, "swapRequest.id": requestId, "swapRequest.status": "pending" },
      { $set: { "swapRequest": { id:"", fromId:"", toId:"", status:"", createdAt:null } } },
      { new: true }
    );

    if (!game) {
      return new Response(JSON.stringify({ error: "No había nada que cancelar" }), { status: 409 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
