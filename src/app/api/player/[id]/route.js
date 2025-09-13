export const runtime = "nodejs";
import dbConnect from "@/lib/mongodb";
import Player from "@/models/Player";

export async function PATCH(req, { params }) {
  try {
    await dbConnect();
    const { id } = params;
    const { alive } = await req.json();
    if (typeof alive !== "boolean") {
      return new Response(JSON.stringify({ error: "Missing alive (boolean)" }), { status: 400 });
    }
    const updated = await Player.findOneAndUpdate({ id }, { $set: { alive } }, { new: true });
    if (!updated) return new Response(JSON.stringify({ error: "Player not found" }), { status: 404 });
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message }), { status: 500 });
  }
}
