import { NextResponse } from "next/server";
import { getOrCreateLocalUser } from "../../../../lib/auth";

export async function GET() {
  try {
    const user = await getOrCreateLocalUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ user });
  } catch (error) {
    console.error("Auth sync error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
