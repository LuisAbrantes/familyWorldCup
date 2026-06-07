/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { db } from "@/db";
import { getOrCreateLocalUser } from "@/lib/auth";

vi.mock("@/lib/auth", () => {
  return {
    getOrCreateLocalUser: vi.fn(),
  };
});

vi.mock("@/lib/syncService", () => {
  return {
    syncMatches: vi.fn(),
  };
});

vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
      query: {
        matches: {
          findMany: vi.fn(),
        },
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("GET /api/matches returns matches and applies social prediction visibility rules", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({
    id: 1,
    displayName: "Alice",
    clerkUserId: "user_alice",
  } as any);

  vi.mocked(db.query.matches.findMany).mockResolvedValue([
    { id: 101, status: "SCHEDULED", homeTeamName: "Brazil", awayTeamName: "Germany", utcDate: new Date() },
    { id: 102, status: "SCHEDULED", homeTeamName: "France", awayTeamName: "Italy", utcDate: new Date() },
    { id: 103, status: "FINISHED", homeTeamName: "Spain", awayTeamName: "Portugal", utcDate: new Date() },
  ] as any);

  const createMockChain = (resolvedValue: any) => {
    const chain = {} as any;
    chain.from = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled);
    return chain;
  };

  // Mock selects:
  // 1. userPredictions (current user only)
  const mockUserPredictions = [
    { id: 1, userId: 1, matchId: 101, predictedHome: 2, predictedAway: 1, pointsAwarded: null }
  ];
  // 2. allPredictions
  const mockAllPredictions = [
    { id: 1, userId: 1, matchId: 101, predictedHome: 2, predictedAway: 1, pointsAwarded: null, userDisplayName: "Alice" },
    { id: 2, userId: 2, matchId: 101, predictedHome: 0, predictedAway: 0, pointsAwarded: null, userDisplayName: "Bob" },
    { id: 3, userId: 2, matchId: 102, predictedHome: 1, predictedAway: 1, pointsAwarded: null, userDisplayName: "Bob" },
    { id: 4, userId: 2, matchId: 103, predictedHome: 3, predictedAway: 2, pointsAwarded: 5, userDisplayName: "Bob" },
  ];
  // 3. allUsers
  const mockAllUsers = [
    { id: 1, displayName: "Alice" },
    { id: 2, displayName: "Bob" },
  ];

  vi.mocked(db.select)
    .mockReturnValueOnce(createMockChain(mockUserPredictions))
    .mockReturnValueOnce(createMockChain(mockAllPredictions))
    .mockReturnValueOnce(createMockChain(mockAllUsers));

  const response = await GET();
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.matches).toHaveLength(3);
  expect(data.predictions).toEqual(mockUserPredictions);
  
  // Match 101: SCHEDULED. Alice has predicted. Alice can see Bob's prediction.
  const match101Social = data.socialPredictions[101].participants;
  const bob101 = match101Social.find((p: any) => p.userId === 2);
  expect(bob101.hasPredicted).toBe(true);
  expect(bob101.prediction.predictedHome).toBe(0);

  // Match 102: SCHEDULED. Alice has NOT predicted. Alice CANNOT see Bob's prediction.
  const match102Social = data.socialPredictions[102].participants;
  const bob102 = match102Social.find((p: any) => p.userId === 2);
  expect(bob102.hasPredicted).toBe(true);
  expect(bob102.prediction.predictedHome).toBeNull();

  // Match 103: FINISHED. Bob predicted. Alice has not. Since match started/finished, Alice CAN see.
  const match103Social = data.socialPredictions[103].participants;
  const bob103 = match103Social.find((p: any) => p.userId === 2);
  expect(bob103.hasPredicted).toBe(true);
  expect(bob103.prediction.predictedHome).toBe(3);
});
