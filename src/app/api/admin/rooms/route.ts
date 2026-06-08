import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, users, roomMembers } from "@/db/schema";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";
import { eq, desc } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isAdmin(localUser.clerkUserId);
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allRooms = await db
      .select({
        id: rooms.id,
        name: rooms.name,
        inviteCode: rooms.inviteCode,
        creatorUserId: rooms.creatorUserId,
        creatorName: users.displayName,
        creatorEmail: users.email,
        maxMembers: rooms.maxMembers,
        createdAt: rooms.createdAt,
      })
      .from(rooms)
      .leftJoin(users, eq(rooms.creatorUserId, users.id))
      .orderBy(desc(rooms.createdAt));

    const roomsWithCount = await Promise.all(
      allRooms.map(async (r) => {
        const members = await db
          .select()
          .from(roomMembers)
          .where(eq(roomMembers.roomId, r.id));
        return {
          ...r,
          memberCount: members.length,
        };
      })
    );

    return NextResponse.json({ rooms: roomsWithCount });
  } catch (error: any) {
    console.error("GET /api/admin/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isAdmin(localUser.clerkUserId);
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { roomId, name, maxMembers } = await req.json();
    if (!roomId) {
      return NextResponse.json({ error: "Faltando roomId" }, { status: 400 });
    }

    const updateData: any = {};
    if (name && typeof name === "string" && name.trim().length >= 3) {
      updateData.name = name.trim();
    }
    if (typeof maxMembers === "number" && maxMembers > 0) {
      updateData.maxMembers = maxMembers;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Nenhum dado válido para atualizar" }, { status: 400 });
    }

    await db
      .update(rooms)
      .set(updateData)
      .where(eq(rooms.id, roomId));

    return NextResponse.json({ success: true, message: "Sala atualizada com sucesso!" });
  } catch (error: any) {
    console.error("PUT /api/admin/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isAdmin(localUser.clerkUserId);
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(req.url);
    const roomIdStr = url.searchParams.get("roomId");
    if (!roomIdStr) {
      return NextResponse.json({ error: "Faltando roomId" }, { status: 400 });
    }

    const roomId = parseInt(roomIdStr, 10);

    // roomMembers and predictions have onDelete: "cascade" in schema
    await db
      .delete(rooms)
      .where(eq(rooms.id, roomId));

    return NextResponse.json({ success: true, message: "Sala excluída com sucesso!" });
  } catch (error: any) {
    console.error("DELETE /api/admin/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
