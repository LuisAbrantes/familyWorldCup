import { NextResponse } from "next/server";
import { getOrCreateLocalUserDetailed, isAdmin } from "@/lib/auth";

export async function GET(req: Request) {
  try {
    const { user, error } = await getOrCreateLocalUserDetailed(req);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized", details: error }, { status: 401 });
    }
    const isUserAdmin = await isAdmin(user.clerkUserId);
    return NextResponse.json({ user, isAdmin: isUserAdmin });
  } catch (error: any) {
    console.error("Auth sync error:", error);
    return NextResponse.json({ error: "Internal Server Error", details: error?.message || error }, { status: 500 });
  }
}
