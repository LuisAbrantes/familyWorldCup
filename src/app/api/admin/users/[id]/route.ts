import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const localUser = await getOrCreateLocalUser(request);
    const isUserAdmin = localUser ? await isAdmin(localUser.clerkUserId) : false;

    if (!localUser || !isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const params = await props.params;
    const targetId = parseInt(params.id, 10);

    if (isNaN(targetId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Find the user first to make sure they are not deleting themselves
    const userToDelete = await db.query.users.findFirst({
      where: eq(users.id, targetId),
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    if (userToDelete.clerkUserId === localUser.clerkUserId) {
      return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    // Delete user
    await db.delete(users).where(eq(users.id, targetId));

    return NextResponse.json({ success: true, message: "Usuário removido com sucesso." });
  } catch (error) {
    console.error("DELETE /api/admin/users/[id] error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
