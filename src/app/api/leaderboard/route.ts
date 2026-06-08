import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, predictions } from "@/db/schema";
import { getOrCreateLocalUser } from "@/lib/auth";
import { eq, sum } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Query leaderboard: sum points per user
    const rawLeaderboard = await db.select({
      id: users.id,
      displayName: users.displayName,
      clerkUserId: users.clerkUserId,
      totalPoints: sum(predictions.pointsAwarded),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id)
    .orderBy(users.id); // Base ordering to keep resolves stable

    // Process and sort by points descending, fallback stable sort by displayName
    const sortedLeaderboard = rawLeaderboard.map(row => ({
      id: row.id,
      displayName: row.displayName,
      isCurrentUser: row.clerkUserId === localUser.clerkUserId,
      totalPoints: row.totalPoints ? parseInt(row.totalPoints as string, 10) : 0,
    })).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return NextResponse.json({ leaderboard: sortedLeaderboard });
  } catch (error) {
    console.error("GET /api/leaderboard error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
