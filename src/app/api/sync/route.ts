import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { isAdmin } from "@/lib/auth";
import { syncMatches } from "@/lib/syncService";

export async function POST() {
  try {
    const { userId } = await auth();
    const isUserAdmin = await isAdmin(userId);

    if (!isUserAdmin) {
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
