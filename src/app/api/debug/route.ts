import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    const isUserAdmin = localUser ? await isAdmin(localUser.clerkUserId) : false;

    if (!localUser || !isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let dbStatus = "NOT TESTED";
    let sampleMatch = null;
    try {
      const dbUsers = await db.select().from(users).limit(1);
      dbStatus = `SUCCESS: Connected successfully, users found: ${dbUsers.length}`;
      sampleMatch = await db.query.matches.findFirst();
    } catch (err: any) {
      dbStatus = JSON.stringify({
        name: err?.name || "Unknown",
        message: err?.message || String(err),
        code: err?.code || null,
        severity: err?.severity || null,
        detail: err?.detail || null,
        hint: err?.hint || null,
        stack: err?.stack || null
      }, null, 2);
    }

    return NextResponse.json({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || "NOT DEFINED",
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY 
        ? `${process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.substring(0, 15)}...`
        : "NOT DEFINED",
      DATABASE_URL_DEFINED: !!process.env.DATABASE_URL,
      DATABASE_CONNECTIVITY: dbStatus,
      SAMPLE_MATCH: sampleMatch,
      ADMIN_USER_IDS: process.env.ADMIN_USER_IDS || "NOT DEFINED",
      NODE_ENV: process.env.NODE_ENV || "unknown"
    });
  } catch (error) {
    console.error("GET /api/debug error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
