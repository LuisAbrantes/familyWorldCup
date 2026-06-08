import { NextResponse } from "next/server";
import { db } from "@/db";
import { predictions, matches } from "@/db/schema";
import { getOrCreateLocalUser } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function POST(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { matchId, predictedHome, predictedAway } = await req.json();

    if (
      typeof predictedHome !== "number" || predictedHome < 0 ||
      typeof predictedAway !== "number" || predictedAway < 0
    ) {
      return NextResponse.json({ error: "Os placares devem ser inteiros positivos." }, { status: 400 });
    }

    // Verify Match status and Date lock
    const matchRecord = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!matchRecord) {
      return NextResponse.json({ error: "Jogo não encontrado." }, { status: 404 });
    }

    const now = new Date();
    const isLocked =
      (matchRecord.status !== "SCHEDULED" && matchRecord.status !== "TIMED") ||
      now.getTime() >= new Date(matchRecord.utcDate).getTime();

    if (isLocked) {
      return NextResponse.json({ error: "Palpite travado. O jogo já começou ou está finalizado." }, { status: 403 });
    }

    // Upsert prediction using conflict handling
    const result = await db.insert(predictions)
      .values({
        userId: localUser.id,
        matchId,
        predictedHome,
        predictedAway,
      })
      .onConflictDoUpdate({
        target: [predictions.userId, predictions.matchId],
        set: {
          predictedHome,
          predictedAway,
          updatedAt: new Date(),
        }
      })
      .returning();

    return NextResponse.json({ success: true, prediction: result[0] });
  } catch (error) {
    console.error("POST /api/predictions error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
