/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { GET, PUT, DELETE } from "./route";
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
      update: vi.fn(),
      delete: vi.fn(),
      query: {
        roomMembers: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
});

test("GET /api/admin/rooms returns 401 if user is unauthorized", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue(null);

  const response = await GET(new Request("http://localhost/api/admin/rooms"));
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.error).toBe("Unauthorized");
});

test("GET /api/admin/rooms returns 403 if user is not super admin", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "non_admin", displayName: "User" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);

  const response = await GET(new Request("http://localhost/api/admin/rooms"));
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe("Forbidden");
});

test("GET /api/admin/rooms returns all rooms when user is super admin", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "admin", displayName: "Admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);

  const mockRawRooms = [
    {
      id: 10,
      name: "Grupo de Teste",
      inviteCode: "ABCDEF",
      creatorUserId: 1,
      creatorName: "Admin",
      creatorEmail: "admin@test.com",
      maxMembers: 15,
      createdAt: new Date(),
    },
  ];

  const mockOrderBy = vi.fn().mockResolvedValue(mockRawRooms);
  const mockLeftJoin = vi.fn().mockReturnValue({ orderBy: mockOrderBy });
  const mockFrom = vi.fn().mockReturnValue({ leftJoin: mockLeftJoin });
  vi.mocked(db.select).mockReturnValue({ from: mockFrom } as any);

  // Mocking the room members selection query inside Promise.all
  vi.mocked(db.select).mockReturnValueOnce({ from: mockFrom } as any); // first call for outer join query
  vi.mocked(db.select).mockReturnValueOnce({ from: vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([{ id: 1 }]) }) } as any); // second call for members count

  const response = await GET(new Request("http://localhost/api/admin/rooms"));
  expect(response.status).toBe(200);
  const data = await response.json();

  expect(data.rooms).toBeDefined();
  expect(data.rooms[0].name).toBe("Grupo de Teste");
  expect(data.rooms[0].memberCount).toBe(1);
});

test("PUT /api/admin/rooms updates room name and max members successfully", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "admin", displayName: "Admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);

  const mockWhere = vi.fn().mockResolvedValue([]);
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

  const req = new Request("http://localhost/api/admin/rooms", {
    method: "PUT",
    body: JSON.stringify({
      roomId: 10,
      name: "Novo Nome Grupo",
      maxMembers: 50,
    }),
  });

  const response = await PUT(req);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);

  expect(db.update).toHaveBeenCalled();
  expect(mockSet).toHaveBeenCalledWith({
    name: "Novo Nome Grupo",
    maxMembers: 50,
  });
});

test("DELETE /api/admin/rooms deletes room successfully", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "admin", displayName: "Admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);

  const mockWhere = vi.fn().mockResolvedValue([]);
  vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

  const response = await DELETE(new Request("http://localhost/api/admin/rooms?roomId=10"));
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);

  expect(db.delete).toHaveBeenCalled();
});
