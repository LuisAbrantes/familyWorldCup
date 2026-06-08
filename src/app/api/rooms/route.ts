import { NextResponse } from "next/server";
import { db } from "@/db";
import { rooms, roomMembers, authorizedCreators, users, predictions } from "@/db/schema";
import { getOrCreateLocalUser, isAdmin, isEmailAuthorizedCreator } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userRooms = await db
      .select({
        id: rooms.id,
        name: rooms.name,
        inviteCode: rooms.inviteCode,
        creatorUserId: rooms.creatorUserId,
        createdAt: rooms.createdAt,
        role: roomMembers.role,
        maxMembers: rooms.maxMembers,
      })
      .from(rooms)
      .innerJoin(roomMembers, eq(rooms.id, roomMembers.roomId))
      .where(eq(roomMembers.userId, localUser.id))
      .orderBy(rooms.createdAt);

    // Fetch member count for each room
    const roomsWithCounts = await Promise.all(
      userRooms.map(async (r) => {
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

    return NextResponse.json({ rooms: roomsWithCounts });
  } catch (error: any) {
    console.error("GET /api/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, adminEmail } = await req.json();
    if (!name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json({ error: "Nome do grupo deve ter pelo menos 3 caracteres" }, { status: 400 });
    }

    // Check authorization: Super Admin or in whitelist
    const isSuper = await isAdmin(localUser.clerkUserId);
    const isAuthorized = isSuper || (localUser.email ? await isEmailAuthorizedCreator(localUser.email) : false);

    if (!isAuthorized) {
      return NextResponse.json(
        { error: "Você precisa de autorização por e-mail para criar um grupo. Fale com o organizador no WhatsApp." },
        { status: 403 }
      );
    }

    // Determine creator user ID and admin email
    let targetCreatorUserId = localUser.id;
    let targetAdminEmail: string | null = null;
    let targetUser: any = null;

    if (adminEmail && typeof adminEmail === "string" && isSuper) {
      targetAdminEmail = adminEmail.toLowerCase().trim();
      targetUser = await db.query.users.findFirst({
        where: eq(users.email, targetAdminEmail),
      });
      if (targetUser) {
        targetCreatorUserId = targetUser.id;
      }
    }

    // Generate unique 6-character invite code
    let inviteCode = "";
    let isUnique = false;
    let attempts = 0;
    while (!isUnique && attempts < 10) {
      inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      const existing = await db.query.rooms.findFirst({
        where: eq(rooms.inviteCode, inviteCode),
      });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      inviteCode = `COPA${Math.floor(10 + Math.random() * 90)}`;
    }

    // Create room and add creator as member
    const newRoom = await db.transaction(async (tx) => {
      const insertedRooms = await tx
        .insert(rooms)
        .values({
          name: name.trim(),
          inviteCode,
          creatorUserId: targetCreatorUserId,
          adminEmail: targetAdminEmail,
        })
        .returning();

      const createdRoom = insertedRooms[0];

      // Add targetUser as admin if they exist, otherwise add the super admin who created it
      await tx.insert(roomMembers).values({
        roomId: createdRoom.id,
        userId: targetUser ? targetUser.id : localUser.id,
        role: "admin",
      });


      // Decrement authorizedCreators allowance if not super admin
      if (!isSuper && localUser.email) {
        const cleanEmail = localUser.email.toLowerCase().trim();
        const auth = await tx.query.authorizedCreators.findFirst({
          where: eq(authorizedCreators.email, cleanEmail),
        });

        if (auth && auth.roomsAllowed > 0) {
          await tx
            .update(authorizedCreators)
            .set({ roomsAllowed: auth.roomsAllowed - 1 })
            .where(eq(authorizedCreators.email, cleanEmail));
        }
      }

      return createdRoom;
    });

    return NextResponse.json({ room: newRoom });
  } catch (error: any) {
    console.error("POST /api/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

async function checkIsRoomAdmin(localUserId: number, clerkUserId: string, roomId: number): Promise<boolean> {
  const isSuper = await isAdmin(clerkUserId);
  if (isSuper) return true;

  const room = await db.query.rooms.findFirst({
    where: eq(rooms.id, roomId),
  });
  if (room && room.creatorUserId === localUserId) return true;

  const member = await db.query.roomMembers.findFirst({
    where: and(
      eq(roomMembers.roomId, roomId),
      eq(roomMembers.userId, localUserId)
    ),
  });
  if (member && member.role === "admin") return true;

  return false;
}

export async function PUT(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { roomId, name } = await req.json();
    if (!roomId || !name || typeof name !== "string" || name.trim().length < 3) {
      return NextResponse.json({ error: "Dados inválidos ou nome muito curto" }, { status: 400 });
    }

    const hasPermission = await checkIsRoomAdmin(localUser.id, localUser.clerkUserId, roomId);
    if (!hasPermission) {
      return NextResponse.json({ error: "Você não tem permissão para editar este grupo." }, { status: 403 });
    }

    await db
      .update(rooms)
      .set({ name: name.trim() })
      .where(eq(rooms.id, roomId));

    return NextResponse.json({ success: true, message: "Nome do grupo atualizado com sucesso!" });
  } catch (error: any) {
    console.error("PUT /api/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const roomIdStr = url.searchParams.get("roomId");
    const userIdStr = url.searchParams.get("userId");

    if (!roomIdStr || !userIdStr) {
      return NextResponse.json({ error: "Faltando roomId ou userId" }, { status: 400 });
    }

    const roomId = parseInt(roomIdStr, 10);
    const userId = parseInt(userIdStr, 10);

    const hasPermission = await checkIsRoomAdmin(localUser.id, localUser.clerkUserId, roomId);
    if (!hasPermission) {
      return NextResponse.json({ error: "Você não tem permissão para remover participantes deste grupo." }, { status: 403 });
    }

    // Can't remove the room creator/owner
    const room = await db.query.rooms.findFirst({
      where: eq(rooms.id, roomId),
    });
    if (room && room.creatorUserId === userId) {
      return NextResponse.json({ error: "Não é possível remover o proprietário/criador do grupo." }, { status: 400 });
    }

    // Delete member and predictions in a transaction
    await db.transaction(async (tx) => {
      // 1. Delete predictions
      await tx
        .delete(predictions)
        .where(
          and(
            eq(predictions.roomId, roomId),
            eq(predictions.userId, userId)
          )
        );

      // 2. Delete member association
      await tx
        .delete(roomMembers)
        .where(
          and(
            eq(roomMembers.roomId, roomId),
            eq(roomMembers.userId, userId)
          )
        );
    });

    return NextResponse.json({ success: true, message: "Participante removido com sucesso!" });
  } catch (error: any) {
    console.error("DELETE /api/rooms error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
