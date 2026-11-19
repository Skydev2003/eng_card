import { database } from "@/server/db";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response(null, { status: 401 });
  }
  try {
    const db = database();
    if (!db) return new Response(null, { status: 503 });
    await db.$queryRaw`SELECT 1 FROM "game_rooms" LIMIT 1`;
    return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new Response(null, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
