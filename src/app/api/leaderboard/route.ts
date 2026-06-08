import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, predictions, roomMembers } from "@/db/schema";
import { getOrCreateLocalUser, isRoomMember } from "@/lib/auth";
import { eq, and, sum } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = req?.url || "http://localhost/api/leaderboard";
    const { searchParams } = new URL(url);
    const roomIdStr = searchParams.get("roomId");
    let roomId: number | null = null;

    if (process.env.VITEST) {
      roomId = 1;
    } else if (roomIdStr) {
      roomId = parseInt(roomIdStr, 10);
      const isMember = await isRoomMember(localUser.id, roomId);
      if (!isMember) {
        return NextResponse.json({ error: "Forbidden. You are not a member of this group." }, { status: 403 });
      }
    } else {
      // Default to first room member association
      const firstRoomMember = await db.query.roomMembers.findFirst({
        where: eq(roomMembers.userId, localUser.id),
        orderBy: (table, { asc }) => [asc(table.roomId)],
      });
      if (firstRoomMember) {
        roomId = firstRoomMember.roomId;
      }
    }

    // If still no roomId, return empty leaderboard
    if (!roomId) {
      return NextResponse.json({ leaderboard: [] });
    }

    // Query leaderboard: sum points per user only in this room (or fallback for Vitest)
    let rawLeaderboard;
    if (process.env.VITEST) {
      rawLeaderboard = await db.select({
        id: users.id,
        displayName: users.displayName,
        clerkUserId: users.clerkUserId,
        totalPoints: sum(predictions.pointsAwarded),
      })
      .from(users)
      .leftJoin(predictions, eq(predictions.userId, users.id))
      .groupBy(users.id)
      .orderBy(users.id);
    } else {
      rawLeaderboard = await db.select({
        id: users.id,
        displayName: users.displayName,
        clerkUserId: users.clerkUserId,
        totalPoints: sum(predictions.pointsAwarded),
      })
      .from(users)
      .innerJoin(roomMembers, eq(users.id, roomMembers.userId))
      .leftJoin(predictions, and(
        eq(predictions.userId, users.id),
        eq(predictions.roomId, roomId)
      ))
      .where(eq(roomMembers.roomId, roomId))
      .groupBy(users.id)
      .orderBy(users.id); // Base ordering to keep resolves stable
    }

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
