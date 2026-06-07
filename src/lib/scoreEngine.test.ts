import { expect, test } from "vitest";
import { computePoints } from "./scoreEngine";

test("computePoints calculates points based on the prediction rules matrix", () => {
  // 1. Placar exato -> 10 points
  expect(computePoints(2, 1, 2, 1)).toBe(10);
  expect(computePoints(1, 1, 1, 1)).toBe(10);

  // 2. Resultado e saldo certos (but not exact) -> 7 points
  expect(computePoints(1, 0, 2, 1)).toBe(7); // Home victory, diff +1
  expect(computePoints(3, 2, 2, 1)).toBe(7); // Home victory, diff +1
  expect(computePoints(0, 0, 1, 1)).toBe(7); // Draw, diff 0

  // 3. Só o resultado certo (diff mismatch) -> 5 points
  expect(computePoints(2, 0, 2, 1)).toBe(5); // Home victory, diff +2 vs +1
  expect(computePoints(1, 0, 3, 1)).toBe(5); // Home victory, diff +1 vs +2

  // 4. Errou o resultado -> 0 points
  expect(computePoints(0, 1, 2, 1)).toBe(0); // Predicted away victory, got home victory
  expect(computePoints(1, 2, 0, 0)).toBe(0); // Predicted away victory, got draw
});
