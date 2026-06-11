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

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 seconds timeout

  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        "X-Auth-Token": apiKey,
      },
      signal: controller.signal,
    });
  } catch (err: any) {
    console.error("[Football API Client] Fetch error details:", err);
    if (err.name === "AbortError") {
      throw new Error("Timeout ao conectar com a API de futebol (limite de 3 segundos excedido)");
    }
    const message = err instanceof Error ? err.message : "Unknown network error";
    throw new Error(`Failed to fetch match data: ${message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  // Extract rate-limit headers for auditing
  const availableStr = response.headers.get("x-requests-available-minute");
  const resetStr = response.headers.get("x-requestcounter-reset");

  console.log(`[Football-Data API] Available requests/min: ${availableStr}, Reset time (seconds): ${resetStr}`);

  if (response.status === 429) {
    const parsedReset = resetStr ? parseInt(resetStr, 10) : NaN;
    const retryAfter = isNaN(parsedReset) ? 60 : parsedReset;
    throw new Error(`Rate limit hit. Retry after ${retryAfter} seconds.`);
  }

  if (!response.ok) {
    throw new Error(`Football-Data API error: ${response.statusText}`);
  }

  return response.json();
}
