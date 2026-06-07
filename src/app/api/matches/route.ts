import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncMatches } from "@/lib/syncService";
import { getOrCreateLocalUser } from "@/lib/auth";
import { predictions } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const localUser = await getOrCreateLocalUser();
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lazy sync from API
    await syncMatches();

    const matchesList = await db.query.matches.findMany({
      orderBy: (matches, { asc }) => [asc(matches.utcDate)],
    });

    const userPredictions = await db.select()
      .from(predictions)
      .where(eq(predictions.userId, localUser.id));

    return NextResponse.json({
      matches: matchesList,
      predictions: userPredictions,
    });
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
