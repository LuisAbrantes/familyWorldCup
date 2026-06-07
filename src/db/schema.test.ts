import { expect, test } from "vitest";
import * as schema from "./schema";

test("Database schemas are correctly exported", () => {
  expect(schema.users).toBeDefined();
  expect(schema.matches).toBeDefined();
  expect(schema.predictions).toBeDefined();
});
