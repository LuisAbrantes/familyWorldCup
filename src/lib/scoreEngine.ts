export const POINTS_CONFIG = {
  EXACT_SCORE: 10,
  RESULT_AND_GD: 7,
  RESULT_ONLY: 5,
  NO_POINTS: 0,
} as const;

/**
 * Calculates prediction points based on predicted vs actual scores.
 * 
 * Rules:
 * 1. Exact score match -> 10 points
 * 2. Correct result + correct goal difference (but not exact match) -> 7 points
 * 3. Correct result only -> 5 points
 * 4. Incorrect result -> 0 points
 */
export function computePoints(
  predictedHome: number,
  predictedAway: number,
  actualHome: number,
  actualAway: number
): number {
  // Exact Match
  if (predictedHome === actualHome && predictedAway === actualAway) {
    return POINTS_CONFIG.EXACT_SCORE;
  }

  const predictedDiff = predictedHome - predictedAway;
  const actualDiff = actualHome - actualAway;

  // Check if result matches (win, draw, loss)
  const predictedResult = Math.sign(predictedDiff);
  const actualResult = Math.sign(actualDiff);

  if (predictedResult === actualResult) {
    // Result matches. Check goal difference.
    if (predictedDiff === actualDiff) {
      return POINTS_CONFIG.RESULT_AND_GD;
    }
    return POINTS_CONFIG.RESULT_ONLY;
  }

  return POINTS_CONFIG.NO_POINTS;
}
