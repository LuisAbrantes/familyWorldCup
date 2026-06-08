import { NextResponse } from "next/server";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";
import { syncMatches } from "@/lib/syncService";

export async function POST(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    const isUserAdmin = localUser ? await isAdmin(localUser.clerkUserId) : false;

    if (!localUser || !isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Force sync bypassing the 60 seconds cache
    await syncMatches(true);

    return NextResponse.json({ success: true, message: "Sincronização forçada concluída com sucesso." });
  } catch (error) {
    console.error("POST /api/sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
