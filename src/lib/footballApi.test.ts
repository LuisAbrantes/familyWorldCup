import { expect, test, vi, beforeEach } from "vitest";
import { fetchMatchesFromApi } from "./footballApi";

beforeEach(() => {
  vi.stubEnv("FOOTBALL_DATA_API_KEY", "test_key");
});

test("fetchMatchesFromApi parses rate limit headers and fetches correctly", async () => {
  const mockMatches = [{ id: 1, stage: "GROUP_STAGE", status: "SCHEDULED" }];
  
  const mockFetch = vi.fn().mockResolvedValue({
    ok: true,
    headers: new Map([
      ["x-requests-available-minute", "9"],
      ["x-requestcounter-reset", "45"]
    ]),
    json: async () => ({ matches: mockMatches })
  });
  
  vi.stubGlobal("fetch", mockFetch);
  
  const result = await fetchMatchesFromApi();
  expect(result.matches).toEqual(mockMatches);
  expect(mockFetch).toHaveBeenCalledWith("https://api.football-data.org/v4/competitions/WC/matches?season=2026", {
    headers: {
      "X-Auth-Token": "test_key"
    }
  });
});
