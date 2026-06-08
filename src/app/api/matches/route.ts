import { NextResponse } from "next/server";
import { db } from "@/db";
import { syncMatches } from "@/lib/syncService";
import { getOrCreateLocalUser, isRoomMember } from "@/lib/auth";
import { predictions, users, roomMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export async function GET(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Lazy sync from API
    await syncMatches();

    const url = req?.url || "http://localhost/api/matches";
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

    // If still no roomId, return empty or wait until they create/join a room
    if (!roomId) {
      const matchesList = await db.query.matches.findMany({
        orderBy: (matches, { asc }) => [asc(matches.utcDate)],
      });
      return NextResponse.json({
        matches: matchesList,
        predictions: [],
        socialPredictions: {},
        noRooms: true,
      });
    }

    const matchesList = await db.query.matches.findMany({
      orderBy: (matches, { asc }) => [asc(matches.utcDate)],
    });

    const userPredictions = await db
      .select()
      .from(predictions)
      .where(and(eq(predictions.userId, localUser.id), eq(predictions.roomId, roomId)));

    // Fetch all predictions in this room
    const allPredictions = await db
      .select({
        id: predictions.id,
        matchId: predictions.matchId,
        userId: predictions.userId,
        predictedHome: predictions.predictedHome,
        predictedAway: predictions.predictedAway,
        pointsAwarded: predictions.pointsAwarded,
        userDisplayName: users.displayName,
      })
      .from(predictions)
      .innerJoin(users, eq(predictions.userId, users.id))
      .where(eq(predictions.roomId, roomId));

    // Fetch only registered users in this room
    const allUsers = await db
      .select({
        id: users.id,
        displayName: users.displayName,
      })
      .from(users)
      .innerJoin(roomMembers, eq(users.id, roomMembers.userId))
      .where(eq(roomMembers.roomId, roomId));

    // Group predictions by matchId and then by userId
    const predictionsByMatch: Record<number, Record<number, typeof allPredictions[0]>> = {};
    allPredictions.forEach((pred) => {
      if (!predictionsByMatch[pred.matchId]) {
        predictionsByMatch[pred.matchId] = {};
      }
      predictionsByMatch[pred.matchId][pred.userId] = pred;
    });

    // Generate socialPredictions mapping with spoiler rule
    const socialPredictions: Record<number, { participants: any[] }> = {};
    matchesList.forEach((match) => {
      const viewerPrediction = predictionsByMatch[match.id]?.[localUser.id];
      const viewerHasPredicted = !!viewerPrediction;
      const gameStarted = !["SCHEDULED", "TIMED"].includes(match.status);
      const canSeeOthers = gameStarted || viewerHasPredicted;

      const participants = allUsers.map((u) => {
        const isCurrentUser = u.id === localUser.id;
        const userPred = predictionsByMatch[match.id]?.[u.id];

        if (isCurrentUser) {
          return {
            userId: u.id,
            displayName: u.displayName,
            hasPredicted: !!userPred,
            prediction: userPred
              ? {
                  predictedHome: userPred.predictedHome,
                  predictedAway: userPred.predictedAway,
                  pointsAwarded: userPred.pointsAwarded,
                }
              : null,
          };
        }

        return {
          userId: u.id,
          displayName: u.displayName,
          hasPredicted: !!userPred,
          prediction: userPred
            ? {
                predictedHome: canSeeOthers ? userPred.predictedHome : null,
                predictedAway: canSeeOthers ? userPred.predictedAway : null,
                pointsAwarded: userPred.pointsAwarded,
              }
            : null,
        };
      });

      socialPredictions[match.id] = { participants };
    });

    return NextResponse.json({
      matches: matchesList,
      predictions: userPredictions,
      socialPredictions,
      roomId,
    });
  } catch (error) {
    console.error("GET /api/matches error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
