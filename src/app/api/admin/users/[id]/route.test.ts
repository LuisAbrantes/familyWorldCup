/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { DELETE } from "./route";
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
      delete: vi.fn(),
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

test("DELETE /api/admin/users/[id] returns 403 if user is not admin", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "non_admin" } as any);
  vi.mocked(isAdmin).mockResolvedValue(false);

  const response = await DELETE(new Request("http://localhost/api/admin/users/123"), {
    params: Promise.resolve({ id: "123" }),
  });

  expect(response.status).toBe(403);
  const data = await response.json();
  expect(data.error).toBe("Forbidden");
});

test("DELETE /api/admin/users/[id] returns 400 if user tries to delete themselves", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "admin_1" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);
  
  vi.mocked(db.query.users.findFirst).mockResolvedValue({
    id: 123,
    clerkUserId: "admin_1",
    displayName: "Luis",
  } as any);

  const response = await DELETE(new Request("http://localhost/api/admin/users/123"), {
    params: Promise.resolve({ id: "123" }),
  });

  expect(response.status).toBe(400);
  const data = await response.json();
  expect(data.error).toBe("Cannot delete yourself");
});

test("DELETE /api/admin/users/[id] deletes user if admin and not deleting themselves", async () => {
  vi.mocked(auth).mockResolvedValue({ userId: "admin_1" } as any);
  vi.mocked(isAdmin).mockResolvedValue(true);
  
  vi.mocked(db.query.users.findFirst).mockResolvedValue({
    id: 123,
    clerkUserId: "user_to_delete",
    displayName: "Some User",
  } as any);

  const mockWhere = vi.fn().mockResolvedValue([]);
  vi.mocked(db.delete).mockReturnValue({ where: mockWhere } as any);

  const response = await DELETE(new Request("http://localhost/api/admin/users/123"), {
    params: Promise.resolve({ id: "123" }),
  });

  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.success).toBe(true);
  expect(db.delete).toHaveBeenCalled();
  expect(mockWhere).toHaveBeenCalled();
});
