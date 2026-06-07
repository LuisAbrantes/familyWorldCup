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

vi.mock("@/db", () => {
  return {
    db: {
      select: vi.fn(),
      query: {
        users: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("GET /api/users/[id]/predictions returns 401 if unauthorized", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue(null);

  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ id: "2" }),
  });
  expect(response.status).toBe(401);
});

test("GET /api/users/[id]/predictions applies visibility rules correctly", async () => {
  // Alice is viewer (id: 1)
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({
    id: 1,
    displayName: "Alice",
  } as any);

  // Bob is target (id: 2)
  vi.mocked(db.query.users.findFirst).mockResolvedValue({
    id: 2,
    displayName: "Bob",
  } as any);

  const createMockChain = (resolvedValue: any) => {
    const chain = {} as any;
    chain.from = vi.fn().mockReturnValue(chain);
    chain.innerJoin = vi.fn().mockReturnValue(chain);
    chain.where = vi.fn().mockReturnValue(chain);
    chain.orderBy = vi.fn().mockReturnValue(chain);
    chain.then = (onfulfilled: any) => Promise.resolve(resolvedValue).then(onfulfilled);
    return chain;
  };

  // Mock Bob's predictions
  const mockBobPredictions = [
    {
      id: 10,
      matchId: 101,
      predictedHome: 2,
      predictedAway: 1,
      pointsAwarded: null,
      status: "SCHEDULED",
      homeTeamName: "Brazil",
      awayTeamName: "Germany",
    },
    {
      id: 11,
      matchId: 102,
      predictedHome: 3,
      predictedAway: 3,
      pointsAwarded: null,
      status: "SCHEDULED",
      homeTeamName: "France",
      awayTeamName: "Italy",
    },
    {
      id: 12,
      matchId: 103,
      predictedHome: 1,
      predictedAway: 0,
      pointsAwarded: 10,
      status: "FINISHED",
      homeTeamName: "Spain",
      awayTeamName: "Portugal",
    },
  ];

  // Viewer Alice's predictions: only predicted match 101
  const mockViewerPredictions = [
    { matchId: 101 },
  ];

  vi.mocked(db.select)
    .mockReturnValueOnce(createMockChain(mockBobPredictions))
    .mockReturnValueOnce(createMockChain(mockViewerPredictions));

  const response = await GET(new Request("http://localhost"), {
    params: Promise.resolve({ id: "2" }),
  });
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.user.displayName).toBe("Bob");

  // Bob's predictions processed:
  // Match 101: SCHEDULED, Alice predicted -> Bob's scores visible (2 x 1)
  expect(data.predictions[0].predictedHome).toBe(2);
  expect(data.predictions[0].isOculto).toBe(false);

  // Match 102: SCHEDULED, Alice has not predicted -> Bob's scores hidden (null)
  expect(data.predictions[1].predictedHome).toBeNull();
  expect(data.predictions[1].isOculto).toBe(true);

  // Match 103: FINISHED -> Bob's scores visible (1 x 0)
  expect(data.predictions[2].predictedHome).toBe(1);
  expect(data.predictions[2].isOculto).toBe(false);
});
