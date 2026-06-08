import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, roomMembers } from "@/db/schema";
import { getOrCreateLocalUser } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { inviteCode } = await req.json();
    if (!inviteCode || typeof inviteCode !== "string") {
      return NextResponse.json({ error: "Código de convite é obrigatório" }, { status: 400 });
    }

    const cleanCode = inviteCode.toUpperCase().trim();

    // Find the room
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.inviteCode, cleanCode),
    });

    if (!room) {
      return NextResponse.json({ error: "Grupo não encontrado. Verifique o código digitado." }, { status: 404 });
    }

    // Check if user is already a member
    const existingMember = await db.query.roomMembers.findFirst({
      where: and(eq(roomMembers.roomId, room.id), eq(roomMembers.userId, localUser.id)),
    });

    if (existingMember) {
      return NextResponse.json({ success: true, room, message: "Você já faz parte deste grupo!" });
    }

    // Add user as a member
    await db.insert(roomMembers).values({
      roomId: room.id,
      userId: localUser.id,
      role: "member",
    });

    return NextResponse.json({ success: true, room });
  } catch (error: any) {
    console.error("POST /api/rooms/join error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
