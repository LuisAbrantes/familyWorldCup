/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { GET } from "./route";
import { db } from "@/db";
import { getOrCreateLocalUser } from "@/lib/auth";

vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
    },
  };
});

vi.mock("@/lib/auth", () => {
  return {
    getOrCreateLocalUser: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("GET /api/leaderboard returns 401 if user is unauthorized", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue(null);

  const response = await GET();
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.error).toBe("Unauthorized");
});

test("GET /api/leaderboard aggregates, processes, and sorts the leaderboard correctly", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({
    id: 1,
    clerkUserId: "user_1",
    displayName: "Alice",
    createdAt: new Date(),
  });

  // Mock data returned by db.select() query
  // Let's mock the chain: db.select().from().leftJoin().groupBy().orderBy()
  const mockRawData = [
    { id: 1, displayName: "Alice", clerkUserId: "user_1", totalPoints: "10" },
    { id: 2, displayName: "Bob", clerkUserId: "user_2", totalPoints: "25" },
    { id: 3, displayName: "Charlie", clerkUserId: "user_3", totalPoints: "10" },
    { id: 4, displayName: "David", clerkUserId: "user_4", totalPoints: null },
  ];

  const mockOrderBy = vi.fn().mockResolvedValue(mockRawData);
  const mockGroupBy = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockLeftJoin = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

  const response = await GET();
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.leaderboard).toBeDefined();
  
  // Sorted ranking order expected:
  // 1. Bob (25 points)
  // 2. Alice (10 points, isCurrentUser: true) - Alice comes before Charlie alphabetically
  // 3. Charlie (10 points, isCurrentUser: false)
  // 4. David (0 points)
  expect(data.leaderboard).toEqual([
    { id: 2, displayName: "Bob", isCurrentUser: false, totalPoints: 25 },
    { id: 1, displayName: "Alice", isCurrentUser: true, totalPoints: 10 },
    { id: 3, displayName: "Charlie", isCurrentUser: false, totalPoints: 10 },
    { id: 4, displayName: "David", isCurrentUser: false, totalPoints: 0 },
  ]);

  expect(db.select).toHaveBeenCalled();
});
