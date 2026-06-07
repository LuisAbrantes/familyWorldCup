import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, predictions, matches } from "@/db/schema";
import { getOrCreateLocalUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const localUser = await getOrCreateLocalUser();
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await props.params;
    const targetUserId = parseInt(params.id, 10);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: "Invalid User ID" }, { status: 400 });
    }

    // Fetch target user profile
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, targetUserId),
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch target user predictions joined with match details
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
    .where(eq(predictions.userId, targetUserId))
    .orderBy(matches.utcDate);

    // Fetch viewer's predictions for spoiler check
    const viewerPredictions = await db.select({
      matchId: predictions.matchId,
    })
    .from(predictions)
    .where(eq(predictions.userId, localUser.id));

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
