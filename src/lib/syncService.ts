import { db } from "../db";
import { matches, predictions } from "../db/schema";
import { fetchMatchesFromApi } from "./footballApi";
import { computePoints } from "./scoreEngine";
import { eq, and, isNull } from "drizzle-orm";

const SYNC_TTL_MS = 60 * 1000; // 60 seconds

export async function syncMatches(force = false): Promise<void> {
  // 1. Check if we need to sync based on TTL
  const latestMatch = await db.query.matches.findFirst({
    orderBy: (matches, { desc }) => [desc(matches.lastSyncedAt)],
  });

  const now = new Date();
  if (!force && latestMatch && now.getTime() - new Date(latestMatch.lastSyncedAt).getTime() < SYNC_TTL_MS) {
    console.log("[Sync Service] Skipping sync, cache is still fresh.");
    return;
  }

  console.log("[Sync Service] Sincronizando dados com football-data.org...");
  
  try {
    const data = await fetchMatchesFromApi();
    const syncedTime = new Date();

    for (const apiMatch of data.matches) {
      const matchId = apiMatch.id;
      const status = apiMatch.status;
      const homeScore = apiMatch.score.fullTime.home;
      const awayScore = apiMatch.score.fullTime.away;

      // Upsert match
      await db.insert(matches)
        .values({
          id: matchId,
          stage: apiMatch.stage,
          groupName: apiMatch.group,
          homeTeamName: apiMatch.homeTeam.name || "A definir",
          awayTeamName: apiMatch.awayTeam.name || "A definir",
          homeTeamCrest: apiMatch.homeTeam.crest,
          awayTeamCrest: apiMatch.awayTeam.crest,
          utcDate: new Date(apiMatch.utcDate),
          status: status,
          homeScore: homeScore,
          awayScore: awayScore,
          lastSyncedAt: syncedTime,
        })
        .onConflictDoUpdate({
          target: matches.id,
          set: {
            stage: apiMatch.stage,
            groupName: apiMatch.group,
            homeTeamName: apiMatch.homeTeam.name || "A definir",
            awayTeamName: apiMatch.awayTeam.name || "A definir",
            homeTeamCrest: apiMatch.homeTeam.crest,
            awayTeamCrest: apiMatch.awayTeam.crest,
            utcDate: new Date(apiMatch.utcDate),
            status: status,
            homeScore: homeScore,
            awayScore: awayScore,
            lastSyncedAt: syncedTime,
          },
        });

      // If the match is finished, check if we need to award prediction points
      if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
        // Find all predictions for this match (if force, recalculate everything; otherwise, only uncalculated ones)
        const whereClause = force
          ? eq(predictions.matchId, matchId)
          : and(eq(predictions.matchId, matchId), isNull(predictions.pointsAwarded));

        const uncalculatedPredictions = await db.select()
          .from(predictions)
          .where(whereClause);

        for (const pred of uncalculatedPredictions) {
          const points = computePoints(pred.predictedHome, pred.predictedAway, homeScore, awayScore);
          await db.update(predictions)
            .set({
              pointsAwarded: points,
              updatedAt: new Date(),
            })
            .where(eq(predictions.id, pred.id));
        }
      }
    }
  } catch (error) {
    console.error("[Sync Service] Erro na sincronização:", error);
    // Graceful degradation: let app load from DB without erroring
    if (!latestMatch) {
      throw error; // If DB is empty, we must throw, otherwise we can fail silently
    }
  }
}
