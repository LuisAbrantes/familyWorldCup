import { expect, test, describe } from "vitest";
import { computePoints } from "./scoreEngine";

describe("Score Engine - computePoints", () => {
  test("Rule 1: Exact score match awards 10 points", () => {
    // Exact win
    expect(computePoints(2, 1, 2, 1)).toBe(10);
    // Exact draw
    expect(computePoints(1, 1, 1, 1)).toBe(10);
    // Exact loss/away win
    expect(computePoints(0, 3, 0, 3)).toBe(10);
  });

  test("Rule 2: Correct result and goal difference (non-exact) awards 7 points", () => {
    // Correct win result & +1 goal diff (e.g. predicted 1-0, actual 2-1)
    expect(computePoints(1, 0, 2, 1)).toBe(7);
    expect(computePoints(3, 2, 2, 1)).toBe(7);
    
    // Correct draw result (draws always have 0 diff, but non-exact)
    expect(computePoints(0, 0, 1, 1)).toBe(7);
    expect(computePoints(2, 2, 0, 0)).toBe(7);

    // Correct loss result & -2 goal diff (predicted 0-2, actual 1-3)
    expect(computePoints(0, 2, 1, 3)).toBe(7);
  });

  test("Rule 3: Correct result only (goal difference mismatch) awards 5 points", () => {
    // Correct win result, diff +2 vs +1 (predicted 2-0, actual 2-1)
    expect(computePoints(2, 0, 2, 1)).toBe(5);
    // Correct win result, diff +1 vs +2 (predicted 1-0, actual 3-1)
    expect(computePoints(1, 0, 3, 1)).toBe(5);

    // Correct loss result, diff -1 vs -2 (predicted 0-1, actual 0-2)
    expect(computePoints(0, 1, 0, 2)).toBe(5);
  });

  test("Rule 4: Incorrect result awards 0 points", () => {
    // Predicted away victory, got home victory
    expect(computePoints(0, 1, 2, 1)).toBe(0);
    // Predicted away victory, got draw
    expect(computePoints(1, 2, 0, 0)).toBe(0);
    // Predicted draw, got win
    expect(computePoints(1, 1, 2, 0)).toBe(0);
  });
});
