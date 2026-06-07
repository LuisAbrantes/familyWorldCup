import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db";
import { users, matches, predictions } from "@/db/schema";
import { isAdmin } from "@/lib/auth";
import { eq, count, sum, sql, desc, asc } from "drizzle-orm";

export async function GET() {
  try {
    const { userId } = await auth();
    const isUserAdmin = await isAdmin(userId);

    if (!isUserAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 1. Get totals
    const matchesCountResult = await db.select({ count: count() }).from(matches);
    const totalMatches = matchesCountResult[0]?.count || 0;

    const participantsCountResult = await db.select({ count: count() }).from(users);
    const totalParticipants = participantsCountResult[0]?.count || 0;

    const predictionsCountResult = await db.select({ count: count() }).from(predictions);
    const totalPredictions = predictionsCountResult[0]?.count || 0;

    const pointsSumResult = await db.select({ totalPoints: sum(predictions.pointsAwarded) }).from(predictions);
    const totalPointsDistributed = pointsSumResult[0]?.totalPoints ? parseInt(pointsSumResult[0].totalPoints as string, 10) : 0;

    // 2. Games with full participation
    const gamesFullParticipationResult = await db.select({
      matchId: predictions.matchId,
      predCount: count(predictions.id),
    })
    .from(predictions)
    .groupBy(predictions.matchId);

    const gamesWithFullParticipation = gamesFullParticipationResult.filter(
      g => g.predCount === totalParticipants
    ).length;

    // 3. Participant engagement
    const rawEngagement = await db.select({
      userId: users.id,
      displayName: users.displayName,
      predictionCount: count(predictions.id),
      totalPoints: sum(predictions.pointsAwarded),
      exactScores: sql<number>`count(case when ${predictions.pointsAwarded} = 10 then 1 end)`,
    })
    .from(users)
    .leftJoin(predictions, eq(predictions.userId, users.id))
    .groupBy(users.id, users.displayName);

    const participantEngagement = rawEngagement.map(row => {
      const predictionCount = row.predictionCount || 0;
      const totalPoints = row.totalPoints ? parseInt(row.totalPoints as string, 10) : 0;
      return {
        userId: row.userId,
        displayName: row.displayName,
        predictionCount,
        coveragePercent: totalMatches > 0 ? Math.round((predictionCount / totalMatches) * 100) : 0,
        totalPoints,
        exactScores: Number(row.exactScores) || 0,
        avgPointsPerPrediction: predictionCount > 0 ? parseFloat((totalPoints / predictionCount).toFixed(2)) : 0,
      };
    }).sort((a, b) => b.totalPoints - a.totalPoints);

    // 4. Points distribution
    const rawDist = await db.select({
      points: predictions.pointsAwarded,
      count: count(predictions.id)
    })
    .from(predictions)
    .groupBy(predictions.pointsAwarded);

    let exactScore = 0;
    let resultAndGD = 0;
    let resultOnly = 0;
    let wrong = 0;

    for (const row of rawDist) {
      if (row.points === 10) exactScore = row.count;
      else if (row.points === 7) resultAndGD = row.count;
      else if (row.points === 5) resultOnly = row.count;
      else if (row.points === 0) wrong = row.count;
    }

    // 5. Top and bottom games
    const matchPredictions = await db.select({
      matchId: matches.id,
      homeTeamName: matches.homeTeamName,
      awayTeamName: matches.awayTeamName,
      utcDate: matches.utcDate,
      predictionCount: count(predictions.id),
    })
    .from(matches)
    .leftJoin(predictions, eq(predictions.matchId, matches.id))
    .groupBy(matches.id, matches.homeTeamName, matches.awayTeamName, matches.utcDate);

    const top = [...matchPredictions]
      .sort((a, b) => b.predictionCount - a.predictionCount)
      .slice(0, 5)
      .map(m => ({
        matchId: m.matchId,
        homeTeam: m.homeTeamName,
        awayTeam: m.awayTeamName,
        count: m.predictionCount,
      }));

    const bottom = [...matchPredictions]
      .sort((a, b) => {
        if (a.predictionCount !== b.predictionCount) {
          return a.predictionCount - b.predictionCount;
        }
        return new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();
      })
      .slice(0, 5)
      .map(m => ({
        matchId: m.matchId,
        homeTeam: m.homeTeamName,
        awayTeam: m.awayTeamName,
        count: m.predictionCount,
      }));

    return NextResponse.json({
      overview: {
        totalPredictions,
        totalParticipants,
        totalPointsDistributed,
        gamesWithFullParticipation,
      },
      participantEngagement,
      pointsDistribution: {
        exactScore,
        resultAndGD,
        resultOnly,
        wrong,
      },
      topAndBottomGames: {
        top,
        bottom,
      },
    });
  } catch (error) {
    console.error("GET /api/admin/stats error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
