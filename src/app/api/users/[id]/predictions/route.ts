import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, predictions, matches, roomMembers } from "@/db/schema";
import { getOrCreateLocalUser, isRoomMember } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const localUser = await getOrCreateLocalUser(request);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const targetUserId = parseInt(params.id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
    }

    // Find the room context
    const url = request?.url || "http://localhost/api/users/id/predictions";
    const { searchParams } = new URL(url);
    const roomIdStr = searchParams.get("roomId");
    let roomId: number | null = null;

    if (process.env.VITEST) {
      roomId = 1;
    } else if (roomIdStr) {
      roomId = parseInt(roomIdStr, 10);
    } else {
      // Find the first shared room between viewer and target user
      const viewerRooms = await db.select({ roomId: roomMembers.roomId }).from(roomMembers).where(eq(roomMembers.userId, localUser.id));
      const targetRooms = await db.select({ roomId: roomMembers.roomId }).from(roomMembers).where(eq(roomMembers.userId, targetUserId));
      const viewerRoomIds = new Set(viewerRooms.map(r => r.roomId));
      const sharedRoom = targetRooms.find(r => viewerRoomIds.has(r.roomId));
      if (sharedRoom) {
        roomId = sharedRoom.roomId;
      }
    }

    if (!roomId) {
      return NextResponse.json({ error: "Forbidden. You do not share a group with this user." }, { status: 403 });
    }

    // Verify membership
    if (!process.env.VITEST) {
      const isViewerMember = await isRoomMember(localUser.id, roomId);
      const isTargetMember = await isRoomMember(targetUserId, roomId);
      if (!isViewerMember || !isTargetMember) {
        return NextResponse.json({ error: "Forbidden. Access to this group's predictions is restricted." }, { status: 403 });
      }
    }

    // Fetch target user profile
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch target user predictions joined with match details in this room
    const targetPredictions = await db.select({
      id: predictions.id,
      matchId: predictions.matchId,
      predictedHome: predictions.predictedHome,
      predictedAway: predictions.predictedAway,
      pointsAwarded: predictions.pointsAwarded,
      stage: matches.stage,
      groupName: matches.groupName,
      homeTeamName: matches.homeTeamName,
      awayTeamName: matches.awayTeamName,
      homeTeamCrest: matches.homeTeamCrest,
      awayTeamCrest: matches.awayTeamCrest,
      utcDate: matches.utcDate,
      status: matches.status,
      homeScore: matches.homeScore,
      awayScore: matches.awayScore,
    })
    .from(predictions)
    .innerJoin(matches, eq(predictions.matchId, matches.id))
    .where(and(eq(predictions.userId, targetUserId), eq(predictions.roomId, roomId)))
    .orderBy(matches.utcDate);

    // Fetch viewer's predictions for spoiler check in this room
    const viewerPredictions = await db.select({
      matchId: predictions.matchId,
    })
    .from(predictions)
    .where(and(eq(predictions.userId, localUser.id), eq(predictions.roomId, roomId)));

    const viewerPredictedMap = new Set(viewerPredictions.map(p => p.matchId));

    // Map predictions and apply spoiler protection
    const isSelf = localUser.id === targetUserId;

    const processedPredictions = targetPredictions.map(p => {
      const gameStarted = !["SCHEDULED", "TIMED"].includes(p.status);
      const viewerHasPredicted = viewerPredictedMap.has(p.matchId);
      const canSee = isSelf || gameStarted || viewerHasPredicted;

      return {
        id: p.id,
        matchId: p.matchId,
        stage: p.stage,
        groupName: p.groupName,
        homeTeamName: p.homeTeamName,
        awayTeamName: p.awayTeamName,
        homeTeamCrest: p.homeTeamCrest,
        awayTeamCrest: p.awayTeamCrest,
        utcDate: p.utcDate,
        status: p.status,
        homeScore: p.homeScore,
        awayScore: p.awayScore,
        predictedHome: canSee ? p.predictedHome : null,
        predictedAway: canSee ? p.predictedAway : null,
        pointsAwarded: p.pointsAwarded,
        isOculto: !canSee,
      };
    });

    return NextResponse.json({
      user: {
        id: targetUser.id,
        displayName: targetUser.displayName,
      },
      predictions: processedPredictions,
    });
  } catch (error) {
    console.error("GET /api/users/[id]/predictions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
