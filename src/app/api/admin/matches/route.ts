import { NextResponse } from "next/server";
import { db } from "@/db";
import { matches, predictions } from "@/db/schema";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";
import { eq } from "drizzle-orm";
import { computePoints } from "@/lib/scoreEngine";

export async function POST(req: Request) {
  try {
    const localUser = await getOrCreateLocalUser(req);
    if (!localUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuper = await isAdmin(localUser.clerkUserId);
    if (!isSuper) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { matchId, homeScore, awayScore, status } = await req.json();

    if (matchId === undefined || homeScore === undefined || awayScore === undefined || !status) {
      return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
    }

    // 1. Buscar a partida para obter o nome das seleções (para saber se é jogo do Brasil)
    const match = await db.query.matches.findFirst({
      where: eq(matches.id, matchId),
    });

    if (!match) {
      return NextResponse.json({ error: "Partida não encontrada" }, { status: 404 });
    }

    const hScore = parseInt(homeScore, 10);
    const aScore = parseInt(awayScore, 10);

    if (isNaN(hScore) || isNaN(aScore)) {
      return NextResponse.json({ error: "Placares devem ser números válidos" }, { status: 400 });
    }

    // 2. Atualizar a partida no banco
    await db
      .update(matches)
      .set({
        homeScore: hScore,
        awayScore: aScore,
        status: status,
        lastSyncedAt: new Date(),
      })
      .where(eq(matches.id, matchId));

    // 3. Se estiver finalizada, calcular/recalcular pontuações
    if (status === "FINISHED") {
      const isBrazilMatch = match.homeTeamName === "Brazil" || match.awayTeamName === "Brazil";

      // Pegar todos os palpites para essa partida
      const matchPredictions = await db
        .select()
        .from(predictions)
        .where(eq(predictions.matchId, matchId));

      for (const pred of matchPredictions) {
        let points = computePoints(pred.predictedHome, pred.predictedAway, hScore, aScore);
        if (isBrazilMatch) {
          points = points * 2;
        }

        await db
          .update(predictions)
          .set({
            pointsAwarded: points,
            updatedAt: new Date(),
          })
          .where(eq(predictions.id, pred.id));
      }
    } else {
      // Se não for finished (tipo TIMED ou IN_PLAY), podemos resetar os pontos para null
      await db
        .update(predictions)
        .set({
          pointsAwarded: null,
          updatedAt: new Date(),
        })
        .where(eq(predictions.matchId, matchId));
    }

    return NextResponse.json({ success: true, message: "Placar atualizado e pontuações recalculadas!" });
  } catch (error: any) {
    console.error("POST /api/admin/matches error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
