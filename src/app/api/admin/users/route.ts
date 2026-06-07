import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, predictions } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { eq, count, sum } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    const isUserAdmin = await isAdmin(userId);

    if (!isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const rawUsers = await db.select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      displayName: users.displayName,
      createdAt: users.createdAt,
      totalPredictions: count(predictions.id),
      totalPoints: sum(predictions.pointsAwarded),
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id);

    const processedUsers = rawUsers.map(row => ({
      id: row.id,
      clerkUserId: row.clerkUserId,
      displayName: row.displayName,
      createdAt: row.createdAt,
      totalPredictions: row.totalPredictions || 0,
      totalPoints: row.totalPoints ? parseInt(row.totalPoints as string, 10) : 0,
    })).sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      return a.displayName.localeCompare(b.displayName);
    });

    return NextResponse.json({ users: processedUsers });
  } catch (error) {
    console.error("GET /api/admin/users error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
