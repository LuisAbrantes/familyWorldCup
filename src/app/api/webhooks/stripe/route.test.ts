/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, vi, beforeEach } from "vitest";
import { POST } from "./route";
import { db } from "@/db";

vi.mock("@/db", () => {
  return {
    db: {
      insert: vi.fn(),
      update: vi.fn(),
      query: {
        authorizedCreators: {
          findFirst: vi.fn(),
        },
        rooms: {
          findFirst: vi.fn(),
        },
        users: {
          findFirst: vi.fn(),
        },
      },
    },
  };
});

// Mock Stripe so it doesn't throw or make requests
vi.mock("stripe", () => {
  class StripeMock {
    webhooks = {
      constructEvent: vi.fn(),
    };
  }
  return {
    default: StripeMock,
  };
});

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NODE_ENV = "test";
  vi.mocked(db.query.rooms.findFirst).mockResolvedValue(null as any);
  vi.mocked(db.query.users.findFirst).mockResolvedValue({ id: 1, displayName: "Luis" } as any);
});

test("POST /api/webhooks/stripe inserts new authorized creator if email doesn't exist", async () => {
  const sessionCompletedEvent = {
    type: "checkout.session.completed",
    data: {
      object: {
        customer_details: {
          email: "new-user@test.com",
        },
      },
    },
  };

  // Mock finding no existing user
  vi.mocked(db.query.authorizedCreators.findFirst).mockResolvedValue(null as any);

  const mockValues = vi.fn().mockResolvedValue({});
  vi.mocked(db.insert).mockReturnValue({ values: mockValues } as any);

  const req = new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionCompletedEvent),
  });

  const response = await POST(req);
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.received).toBe(true);

  expect(db.query.authorizedCreators.findFirst).toHaveBeenCalled();
  expect(db.insert).toHaveBeenCalled();
  expect(mockValues).toHaveBeenCalledWith({
    email: "new-user@test.com",
    roomsAllowed: 1,
  });
});

test("POST /api/webhooks/stripe updates roomsAllowed if creator already exists", async () => {
  const sessionCompletedEvent = {
    type: "checkout.session.completed",
    data: {
      object: {
        customer_details: {
          email: "existing-user@test.com",
        },
      },
    },
  };

  // Mock finding an existing user with roomsAllowed = 1
  vi.mocked(db.query.authorizedCreators.findFirst).mockResolvedValue({
    id: 42,
    email: "existing-user@test.com",
    roomsAllowed: 1,
  } as any);

  const mockWhere = vi.fn().mockResolvedValue({});
  const mockSet = vi.fn().mockReturnValue({ where: mockWhere });
  vi.mocked(db.update).mockReturnValue({ set: mockSet } as any);

  const req = new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(sessionCompletedEvent),
  });

  const response = await POST(req);
  expect(response.status).toBe(200);

  const data = await response.json();
  expect(data.received).toBe(true);

  expect(db.query.authorizedCreators.findFirst).toHaveBeenCalled();
  expect(db.update).toHaveBeenCalled();
  expect(mockSet).toHaveBeenCalledWith({
    roomsAllowed: 2,
  });
});
