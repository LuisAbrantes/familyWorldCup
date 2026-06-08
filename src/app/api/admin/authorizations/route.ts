import { NextResponse } from "next/server";
import { db } from "@/db";
import { authorizedCreators } from "@/db/schema";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    const isSuper = localUser ? await isAdmin(localUser.clerkUserId) : false;
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const creators = await db.query.authorizedCreators.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
    });

    return NextResponse.json({ creators });
  } catch (error: any) {
    console.error("GET /api/admin/authorizations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    const isSuper = localUser ? await isAdmin(localUser.clerkUserId) : false;
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, roomsAllowed = 1 } = await req.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim();

    // Upsert the authorization
    const existing = await db.query.authorizedCreators.findFirst({
      where: eq(authorizedCreators.email, cleanEmail),
    });

    let result;
    if (existing) {
      result = await db
        .update(authorizedCreators)
        .set({ roomsAllowed: existing.roomsAllowed + roomsAllowed })
        .where(eq(authorizedCreators.email, cleanEmail))
        .returning();
    } else {
      result = await db
        .insert(authorizedCreators)
        .values({
          email: cleanEmail,
          roomsAllowed,
        })
        .returning();
    }

    return NextResponse.json({ creator: result[0] });
  } catch (error: any) {
    console.error("POST /api/admin/authorizations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    const isSuper = localUser ? await isAdmin(localUser.clerkUserId) : false;
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email parameter required" }, { status: 400 });
    }

    await db
      .delete(authorizedCreators)
      .where(eq(authorizedCreators.email, email.toLowerCase().trim()));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("DELETE /api/admin/authorizations error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
