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

test("GET /api/admin/users returns 403 if user is not an admin", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "non_admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);

  const response = await GET();
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe("Forbidden");
});

test("GET /api/admin/users returns user list when user is admin", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);

  const mockRawUsers = [
    {
      id: 1,
      clerkUserId: "user_1",
      displayName: "Alice",
      createdAt: new Date("2026-06-01T12:00:00Z"),
      totalPredictions: 5,
      totalPoints: "50",
    },
    {
      id: 2,
      clerkUserId: "user_2",
      displayName: "Bob",
      createdAt: new Date("2026-06-02T12:00:00Z"),
      totalPredictions: 3,
      totalPoints: "70",
    },
    {
      id: 3,
      clerkUserId: "user_3",
      displayName: "Charlie",
      createdAt: new Date("2026-06-03T12:00:00Z"),
      totalPredictions: 0,
      totalPoints: null,
    },
  ];

  const mockGroupBy = vi.fn().mockResolvedValue(mockRawUsers);
  const mockLeftJoin = vi.fn().mockReturnValue({ groupBy: mockGroupBy });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

  const response = await GET();
  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data.users).toEqual([
    {
      id: 2,
      clerkUserId: "user_2",
      displayName: "Bob",
      createdAt: "2026-06-02T12:00:00.000Z",
      totalPredictions: 3,
      totalPoints: 70,
    },
    {
      id: 1,
      clerkUserId: "user_1",
      displayName: "Alice",
      createdAt: "2026-06-01T12:00:00.000Z",
      totalPredictions: 5,
      totalPoints: 50,
    },
    {
      id: 3,
      clerkUserId: "user_3",
      displayName: "Charlie",
      createdAt: "2026-06-03T12:00:00.000Z",
      totalPredictions: 0,
      totalPoints: 0,
    },
  ]);
});
