import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncMatches } from "@/lib/syncService";
import { getOrCreateLocalUser } from "@/lib/auth";
import { predictions, users } from "@/db/schema";
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

    // Fetch all predictions from all users in a single query
    const allPredictions = await db.select({
      id: predictions.id,
      matchId: predictions.matchId,
      userId: predictions.userId,
      predictedHome: predictions.predictedHome,
      predictedAway: predictions.predictedAway,
      pointsAwarded: predictions.pointsAwarded,
      userDisplayName: users.displayName,
    })
    .from(predictions)
    .innerJoin(users, eq(predictions.userId, users.id));

    // Fetch all registered users to identify non-predictors
    const allUsers = await db.select({
      id: users.id,
      displayName: users.displayName,
    }).from(users);

    // Group predictions by matchId and then by userId
    const predictionsByMatch: Record<number, Record<number, typeof allPredictions[0]>> = {};
    allPredictions.forEach(pred => {
      if (!predictionsByMatch[pred.matchId]) {
        predictionsByMatch[pred.matchId] = {};
      }
      predictionsByMatch[pred.matchId][pred.userId] = pred;
    });

    // Generate socialPredictions mapping with spoiler rule
    const socialPredictions: Record<number, { participants: any[] }> = {};
    matchesList.forEach(match => {
      const viewerPrediction = predictionsByMatch[match.id]?.[localUser.id];
      const viewerHasPredicted = !!viewerPrediction;
      const gameStarted = !["SCHEDULED", "TIMED"].includes(match.status);
      const canSeeOthers = gameStarted || viewerHasPredicted;

      const participants = allUsers.map(u => {
        const isCurrentUser = u.id === localUser.id;
        const userPred = predictionsByMatch[match.id]?.[u.id];

        if (isCurrentUser) {
          return {
            userId: u.id,
            displayName: u.displayName,
            hasPredicted: !!userPred,
            prediction: userPred ? {
              predictedHome: userPred.predictedHome,
              predictedAway: userPred.predictedAway,
              pointsAwarded: userPred.pointsAwarded,
            } : null,
          };
        }

        return {
          userId: u.id,
          displayName: u.displayName,
          hasPredicted: !!userPred,
          prediction: userPred ? {
            predictedHome: canSeeOthers ? userPred.predictedHome : null,
            predictedAway: canSeeOthers ? userPred.predictedAway : null,
            pointsAwarded: userPred.pointsAwarded,
          } : null,
        };
      });

      socialPredictions[match.id] = { participants };
    });

    return NextResponse.json({
      matches: matchesList,
      predictions: userPredictions,
      socialPredictions,
    });
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
