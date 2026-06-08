/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "./route";
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
      update: vi.fn(),
      delete: vi.fn(),
      transaction: vi.fn(),
      query: {
        rooms: {
          findFirst: vi.fn(),
        },
        roomMembers: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(db.transaction).mockImplementation(async (cb: any) => cb(db));
});

test("PUT /api/rooms returns 401 if user is unauthorized", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue(null);

  const req = new Request("http://localhost/api/rooms", {
    method: "PUT",
    body: JSON.stringify({ roomId: 1, name: "Novo Grupo" }),
  });
  const response = await PUT(req);
  expect(response.status).toBe(401);
  const data = await response.json();
  expect(data.error).toBe("Unauthorized");
});

test("PUT /api/rooms returns 400 if invalid request body", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "user_1" } as any);

  const req = new Request("http://localhost/api/rooms", {
    method: "PUT",
    body: JSON.stringify({ roomId: null, name: "" }),
  });
  const response = await PUT(req);
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBe("Dados inválidos ou nome muito curto");
});

test("PUT /api/rooms updates name successfully for room creator", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "user_1" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);
  vi.mocked(db.query.rooms.findFirst).mockResolvedValue({ id: 10, creatorUserId: 1 } as any);

  const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

  const req = new Request("http://localhost/api/rooms", {
    method: "PUT",
    body: JSON.stringify({ roomId: 10, name: "Novo Nome Valido" }),
  });
  const response = await PUT(req);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(db.update).toHaveBeenCalled();
  expect(mockSet).toHaveBeenCalledWith({ name: "Novo Nome Valido" });
});

test("PUT /api/rooms updates name successfully for room admin member", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 2, clerkUserId: "user_2" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);
  // Room is owned by user 1
  vi.mocked(db.query.rooms.findFirst).mockResolvedValue({ id: 10, creatorUserId: 1 } as any);
  // User 2 has role admin
  vi.mocked(db.query.roomMembers.findFirst).mockResolvedValue({ roomId: 10, userId: 2, role: "admin" } as any);

  const mockSet = vi.fn().mockReturnValue({ where: vi.fn().mockResolvedValue([]) });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

  const req = new Request("http://localhost/api/rooms", {
    method: "PUT",
    body: JSON.stringify({ roomId: 10, name: "Novo Nome Valido" }),
  });
  const response = await PUT(req);
  expect(response.status).toBe(200);
  expect(db.update).toHaveBeenCalled();
});

test("PUT /api/rooms returns 403 if user is not admin", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 2, clerkUserId: "user_2" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);
  // Room is owned by user 1
  vi.mocked(db.query.rooms.findFirst).mockResolvedValue({ id: 10, creatorUserId: 1 } as any);
  // User 2 has role member (not admin)
  vi.mocked(db.query.roomMembers.findFirst).mockResolvedValue({ roomId: 10, userId: 2, role: "member" } as any);

  const req = new Request("http://localhost/api/rooms", {
    method: "PUT",
    body: JSON.stringify({ roomId: 10, name: "Nome Invalido" }),
  });
  const response = await PUT(req);
  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe("Você não tem permissão para editar este grupo.");
});

test("DELETE /api/rooms deletes member and predictions successfully", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "user_1" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);
  vi.mocked(db.query.rooms.findFirst).mockResolvedValue({ id: 10, creatorUserId: 1 } as any);

  const mockWhere = vi.fn().mockResolvedValue([]);
  vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

  const req = new Request("http://localhost/api/rooms?roomId=10&userId=2", {
    method: "DELETE",
  });
  const response = await DELETE(req);
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(db.delete).toHaveBeenCalledTimes(2); // Deletes predictions first, then room member
});

test("DELETE /api/rooms returns 400 if trying to delete owner", async () => {
  vi.mocked(getOrCreateLocalUser).mockResolvedValue({ id: 1, clerkUserId: "user_1" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);
  // User 1 is owner, trying to delete user 1 (owner)
  vi.mocked(db.query.rooms.findFirst).mockResolvedValue({ id: 10, creatorUserId: 1 } as any);

  const req = new Request("http://localhost/api/rooms?roomId=10&userId=1", {
    method: "DELETE",
  });
  const response = await DELETE(req);
  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBe("Não é possível remover o proprietário/criador do grupo.");
});
