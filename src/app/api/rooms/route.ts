import { NextRequest, NextResponse } from "next/server";
import { createRoom, mutateRoom, readRoom, RoomError } from "@/server/rooms";

const codePattern = /^\d{6}$/;
const cookie = (code: string) => `wordrun_${code}`;
const options = { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/api/rooms" } as const;

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });
}

function errorReply(error: unknown) {
  if (error instanceof RoomError) return reply({ error: error.message }, error.status);
  console.error("Room database operation failed", error instanceof Error ? error.name : typeof error);
  return reply({ error: "เชื่อมต่อห้องไม่ได้ กรุณาลองอีกครั้ง" }, 503);
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  if (!codePattern.test(code)) return reply({ error: "รหัสห้องต้องมี 6 หลัก" }, 400);
  try {
    return reply(await readRoom(code, request.cookies.get(cookie(code))?.value));
  } catch (error) {
    return errorReply(error);
  }
}

export async function POST(request: NextRequest) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return reply({ error: "คำขอนี้ไม่ได้รับอนุญาต" }, 403);
  if (request.headers.get("content-type")?.split(";")[0] !== "application/json") {
    return reply({ error: "ส่งข้อมูลเป็น JSON" }, 415);
  }
  try {
    const raw = await request.text();
    if (raw.length > 2048) throw new RoomError("คำขอมีขนาดใหญ่เกินไป", 413);
    let input: Record<string, unknown>;
    try { input = JSON.parse(raw); } catch { throw new RoomError("ข้อมูลไม่ถูกต้อง"); }
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new RoomError("ข้อมูลไม่ถูกต้อง");
    if (input.action === "create") {
      const result = await createRoom(input.name, input.settings, input.avatar);
      const response = reply(result.view, 201);
      response.cookies.set(cookie(result.view.code), result.token, { ...options, maxAge: 86_400 });
      return response;
    }
    const code = input.code;
    if (typeof code !== "string" || !codePattern.test(code)) throw new RoomError("รหัสห้องต้องมี 6 หลัก");
    const result = await mutateRoom(code, request.cookies.get(cookie(code))?.value, input);
    const response = reply(result.view);
    if ("token" in result && result.token) response.cookies.set(cookie(code), result.token, { ...options, maxAge: 86_400 });
    if (input.action === "leave") response.cookies.set(cookie(code), "", { ...options, maxAge: 0 });
    return response;
  } catch (error) {
    return errorReply(error);
  }
}
