const BASE_URL = "https://api.football-data.org/v4";

export interface ApiMatch {
  id: number;
  stage: string;
  group: string | null;
  utcDate: string;
  status: string;
  homeTeam: {
    name: string;
    crest: string | null;
  };
  awayTeam: {
    name: string;
    crest: string | null;
  };
  score: {
    fullTime: {
      home: number | null;
      away: number | null;
    };
  };
}

export async function fetchMatchesFromApi(): Promise<{ matches: ApiMatch[] }> {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY is not defined in environment variables.");
  }

  // Force WC 2026 competition
  const url = `${BASE_URL}/competitions/WC/matches?season=2026`;

  const response = await fetch(url, {
    headers: {
      "X-Auth-Token": apiKey,
    },
  });

  // Extract rate-limit headers for auditing
  const availableStr = response.headers.get("x-requests-available-minute");
  const resetStr = response.headers.get("x-requestcounter-reset");

  console.log(`[Football-Data API] Available requests/min: ${availableStr}, Reset time (seconds): ${resetStr}`);

  if (response.status === 429) {
    const retryAfter = resetStr ? parseInt(resetStr, 10) : 60;
    throw new Error(`Rate limit hit. Retry after ${retryAfter} seconds.`);
  }

  if (!response.ok) {
    throw new Error(`Football-Data API error: ${response.statusText}`);
  }

  return response.json();
}
