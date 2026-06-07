/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { db } from "@/db";
import { isAdmin } from "@/lib/auth";
import { auth } from "@clerk/nextjs/server";

vi.mock("@clerk/nextjs/server", () => {
  return {
    auth: vi.fn(),
  };
});

vi.mock("@/lib/auth", () => {
  return {
    isAdmin: vi.fn(),
  };
});

vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("GET /api/admin/stats returns 403 if user is not admin", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "non_admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);

  const response = await GET();
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe("Forbidden");
});

test("GET /api/admin/stats returns correct stats structure when user is admin", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);

  const createMockChain = (resolvedValue: any) => {
    const chain = {} as any;
    chain.from = vi.fn().mockReturnValue(chain);
    chain.leftJoin = vi.fn().mockReturnValue(chain);
    chain.groupBy = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled);
    return chain;
  };

  vi.mocked(db.select)
    .mockReturnValueOnce(createMockChain([{ count: 64 }])) // 1. Matches count
    .mockReturnValueOnce(createMockChain([{ count: 5 }]))  // 2. Users count
    .mockReturnValueOnce(createMockChain([{ count: 120 }])) // 3. Predictions count
    .mockReturnValueOnce(createMockChain([{ totalPoints: "450" }])) // 4. Points sum
    .mockReturnValueOnce(createMockChain([
      { matchId: 1, predCount: 5 }, // Full participation match
      { matchId: 2, predCount: 3 },
    ])) // 5. Full participation
    .mockReturnValueOnce(createMockChain([
      { userId: 1, displayName: "User A", predictionCount: 20, totalPoints: "150", exactScores: 8 },
      { userId: 2, displayName: "User B", predictionCount: 15, totalPoints: "100", exactScores: 5 },
    ])) // 6. Engagement
    .mockReturnValueOnce(createMockChain([
      { points: 10, count: 12 },
      { points: 7, count: 25 },
      { points: 5, count: 40 },
      { points: 0, count: 43 },
    ])) // 7. Points distribution
    .mockReturnValueOnce(createMockChain([
      { matchId: 1, homeTeamName: "Brazil", awayTeamName: "Germany", utcDate: new Date("2026-06-10T12:00:00Z"), predictionCount: 5 },
      { matchId: 2, homeTeamName: "France", awayTeamName: "Italy", utcDate: new Date("2026-06-11T12:00:00Z"), predictionCount: 4 },
      { matchId: 3, homeTeamName: "Spain", awayTeamName: "Portugal", utcDate: new Date("2026-06-12T12:00:00Z"), predictionCount: 3 },
      { matchId: 4, homeTeamName: "Argentina", awayTeamName: "Uruguay", utcDate: new Date("2026-06-13T12:00:00Z"), predictionCount: 2 },
      { matchId: 5, homeTeamName: "England", awayTeamName: "Croatia", utcDate: new Date("2026-06-14T12:00:00Z"), predictionCount: 1 },
      { matchId: 6, homeTeamName: "Mexico", awayTeamName: "USA", utcDate: new Date("2026-06-15T12:00:00Z"), predictionCount: 0 },
    ])); // 8. Match predictions

  const response = await GET();
  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data.overview).toEqual({
    totalPredictions: 120,
    totalParticipants: 5,
    totalPointsDistributed: 450,
    gamesWithFullParticipation: 1,
  });

  expect(data.participantEngagement).toHaveLength(2);
  expect(data.participantEngagement[0]).toEqual({
    userId: 1,
    displayName: "User A",
    predictionCount: 20,
    coveragePercent: 31, // Math.round(20/64 * 100) = 31
    totalPoints: 150,
    exactScores: 8,
    avgPointsPerPrediction: 7.5,
  });

  expect(data.pointsDistribution).toEqual({
    exactScore: 12,
    resultAndGD: 25,
    resultOnly: 40,
    wrong: 43,
  });

  expect(data.topAndBottomGames.top).toHaveLength(5);
  expect(data.topAndBottomGames.top[0].homeTeam).toBe("Brazil");
  expect(data.topAndBottomGames.bottom[0].homeTeam).toBe("Mexico"); // count 0
});
