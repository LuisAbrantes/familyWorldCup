/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { GET } from "./route";
import { db } from "@/db";
import { getOrCreateLocalUser, isAdmin } from "@/lib/auth";

vi.mock("@/lib/auth", () => {
  return {
    getOrCreateLocalUser: vi.fn(),
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
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "non_admin", displayName: "User" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);

  const req = new Request("http://localhost/api/admin/users");
  const response = await GET(req);
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe("Forbidden");
});

test("GET /api/admin/users returns user list when user is admin", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "admin", displayName: "Admin" } as any);
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

  const req = new Request("http://localhost/api/admin/users");
  const response = await GET(req);
  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data.users).toEqual([
    {
      id: 2,
      clerkUserId: "user_2",
      displayName: "Bob",
      email: "Não informado",
      createdAt: "2026-06-02T12:00:00.000Z",
      totalPredictions: 3,
      totalPoints: 70,
    },
    {
      id: 1,
      clerkUserId: "user_1",
      displayName: "Alice",
      email: "Não informado",
      createdAt: "2026-06-01T12:00:00.000Z",
      totalPredictions: 5,
      totalPoints: 50,
    },
    {
      id: 3,
      clerkUserId: "user_3",
      displayName: "Charlie",
      email: "Não informado",
      createdAt: "2026-06-03T12:00:00.000Z",
      totalPredictions: 0,
      totalPoints: 0,
    },
  ]);
});
