/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach, afterEach } from "vitest";
import { syncMatches } from "./syncService";
import { db } from "../db";
import { fetchMatchesFromApi } from "./footballApi";

vi.mock("../db", () => {
  return {
    db: {
      query: {
        matches: {
          findFirst: vi.fn(),
        },
      },
      insert: vi.fn(() => ({
        values: vi.fn(() => ({
          onConflictDoUpdate: vi.fn(),
        })),
      })),
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => []),
        })),
      })),
      update: vi.fn(() => ({
        set: vi.fn(() => ({
          where: vi.fn(),
        })),
      })),
    },
  };
});

vi.mock("./footballApi", () => {
  return {
    fetchMatchesFromApi: vi.fn(),
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("syncMatches skips fetch if latest match lastSyncedAt is within TTL", async () => {
  const mockFindFirst = vi.mocked(db.query.matches.findFirst);
  // Mock last synced 30 seconds ago
  mockFindFirst.mockResolvedValue({
    lastSyncedAt: new Date(Date.now() - 30 * 1000),
  } as any);

  await syncMatches();

  expect(fetchMatchesFromApi).not.toHaveBeenCalled();
});

test("syncMatches calls fetch if latest match lastSyncedAt is past TTL", async () => {
  const mockFindFirst = vi.mocked(db.query.matches.findFirst);
  // Mock last synced 120 seconds ago
  mockFindFirst.mockResolvedValue({
    lastSyncedAt: new Date(Date.now() - 120 * 1000),
  } as any);

  const mockFetch = vi.mocked(fetchMatchesFromApi);
  mockFetch.mockResolvedValue({ matches: [] });

  await syncMatches();

  expect(fetchMatchesFromApi).toHaveBeenCalled();
});

test("syncMatches syncs matches, updates match records, and calculates points for finished match predictions (double points for Brazil)", async () => {
  const mockFindFirst = vi.mocked(db.query.matches.findFirst);
  // Database is empty (latestMatch = undefined)
  mockFindFirst.mockResolvedValue(undefined as any);

  const mockFetch = vi.mocked(fetchMatchesFromApi);
  mockFetch.mockResolvedValue({
    matches: [
      {
        id: 101,
        stage: "GROUP_STAGE",
        group: "GROUP_A",
        utcDate: "2026-06-08T18:00:00Z",
        status: "FINISHED",
        homeTeam: { name: "Brazil", crest: "brazil.png" },
        awayTeam: { name: "Croatia", crest: "croatia.png" },
        score: {
          fullTime: { home: 3, away: 1 }
        }
      }
    ]
  } as any);

  // Mock prediction query to return one prediction with no points awarded
  const mockWhere = vi.fn().mockReturnValue([
    {
      id: 1,
      userId: 42,
      matchId: 101,
      predictedHome: 3,
      predictedAway: 1,
      pointsAwarded: null,
    }
  ]);
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.mocked(db.select);
  mockSelect.mockReturnValue({ from: mockFrom } as any);

  const mockUpdateWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.mocked(db.update);
  mockUpdate.mockReturnValue({ set: mockSet } as any);

  await syncMatches();

  expect(fetchMatchesFromApi).toHaveBeenCalled();
  
  // Verify insert was called with the match data
  expect(db.insert).toHaveBeenCalled();

  // Verify that it selected predictions
  expect(mockSelect).toHaveBeenCalled();
  
  // Verify update was called for predictions (exact score * 2 = 20 points for Brazil)
  expect(db.update).toHaveBeenCalled();
  expect(mockSet).toHaveBeenCalledWith(
    expect.objectContaining({
      pointsAwarded: 20,
    })
  );
});

test("syncMatches calculates standard points (no multiplier) for non-Brazil matches", async () => {
  const mockFindFirst = vi.mocked(db.query.matches.findFirst);
  mockFindFirst.mockResolvedValue(undefined as any);

  const mockFetch = vi.mocked(fetchMatchesFromApi);
  mockFetch.mockResolvedValue({
    matches: [
      {
        id: 103,
        stage: "GROUP_STAGE",
        group: "GROUP_A",
        utcDate: "2026-06-08T18:00:00Z",
        status: "FINISHED",
        homeTeam: { name: "Argentina", crest: "argentina.png" },
        awayTeam: { name: "Croatia", crest: "croatia.png" },
        score: {
          fullTime: { home: 3, away: 1 }
        }
      }
    ]
  } as any);

  const mockWhere = vi.fn().mockReturnValue([
    {
      id: 2,
      userId: 42,
      matchId: 103,
      predictedHome: 3,
      predictedAway: 1,
      pointsAwarded: null,
    }
  ]);
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.mocked(db.select);
  mockSelect.mockReturnValue({ from: mockFrom } as any);

  const mockUpdateWhere = vi.fn();
  const mockSet = vi.fn(() => ({ where: mockUpdateWhere }));
  const mockUpdate = vi.mocked(db.update);
  mockUpdate.mockReturnValue({ set: mockSet } as any);

  await syncMatches();

  // Verify update was called for predictions (exact score = 10 points)
  expect(db.update).toHaveBeenCalled();
  expect(mockSet).toHaveBeenCalledWith(
    expect.objectContaining({
      pointsAwarded: 10,
    })
  );
});

test("syncMatches recalculates all predictions (even those with pointsAwarded) when force is true", async () => {
  const mockFindFirst = vi.mocked(db.query.matches.findFirst);
  mockFindFirst.mockResolvedValue({
    lastSyncedAt: new Date(Date.now() - 30 * 1000), // Cache is technically fresh (30s old)
  } as any);

  const mockFetch = vi.mocked(fetchMatchesFromApi);
  mockFetch.mockResolvedValue({
    matches: [
      {
        id: 101,
        stage: "GROUP_STAGE",
        group: "GROUP_A",
        utcDate: "2026-06-08T18:00:00Z",
        status: "FINISHED",
        homeTeam: { name: "Brazil", crest: "brazil.png" },
        awayTeam: { name: "Croatia", crest: "croatia.png" },
        score: {
          fullTime: { home: 3, away: 1 }
        }
      }
    ]
  } as any);

  const mockWhere = vi.fn().mockReturnValue([]);
  const mockFrom = vi.fn(() => ({ where: mockWhere }));
  const mockSelect = vi.mocked(db.select);
  mockSelect.mockReturnValue({ from: mockFrom } as any);

  // Invoke syncMatches with force = true
  await syncMatches(true);

  // Even though cache is fresh, fetch should be called because force = true
  expect(fetchMatchesFromApi).toHaveBeenCalled();
  expect(mockSelect).toHaveBeenCalled();
});

test("syncMatches uses 'A definir' fallback if homeTeam.name or awayTeam.name is missing/null", async () => {
  const mockFindFirst = vi.mocked(db.query.matches.findFirst);
  mockFindFirst.mockResolvedValue(undefined as any);

  const mockFetch = vi.mocked(fetchMatchesFromApi);
  mockFetch.mockResolvedValue({
    matches: [
      {
        id: 102,
        stage: "LAST_32",
        group: null,
        utcDate: "2026-06-28T19:00:00Z",
        status: "TIMED",
        homeTeam: { name: null, crest: null },
        awayTeam: { name: undefined, crest: null },
        score: {
          fullTime: { home: null, away: null }
        }
      }
    ]
  } as any);

  const mockValues = vi.fn(() => ({
    onConflictDoUpdate: vi.fn(),
  }));
  const mockInsert = vi.mocked(db.insert);
  mockInsert.mockReturnValue({
    values: mockValues,
  } as any);

  await syncMatches();

  expect(mockInsert).toHaveBeenCalled();
  expect(mockValues).toHaveBeenCalledWith(
    expect.objectContaining({
      homeTeamName: "A definir",
      awayTeamName: "A definir",
    })
  );
});
