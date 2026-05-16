import Redis from "ioredis";
import { NextResponse } from "next/server";

// Disable all caching — this endpoint is the live state feed.
export const dynamic = "force-dynamic";
export const revalidate = 0;

let client: Redis | null = null;

function getClient(): Redis {
  if (client) return client;
  client = new Redis(
    process.env.REDIS_URL ?? "redis://localhost:6379",
    {
      lazyConnect: false,
      maxRetriesPerRequest: 1,
      retryStrategy() {
        return null; // fail fast — UI falls back to mock
      },
    },
  );
  client.on("error", () => {
    /* swallow — handled in the route */
  });
  return client;
}

type ClaimState = {
  id: string;
  text: string;
  truth: boolean;
  verdict: boolean | null;
  rationale?: string;
};

type RoundPayload = {
  index: number;
  scorePct: number;
  status: string;
  claims: ClaimState[];
};

type ApiState = {
  available: boolean;
  status: string;
  round: RoundPayload | null;
  vulnerabilities: { claim: string; severity: number }[];
  additions: string[];
};

export async function GET() {
  const r = getClient();
  const empty: ApiState = {
    available: false,
    status: "offline",
    round: null,
    vulnerabilities: [],
    additions: [],
  };

  try {
    const [roundJson, stateHash, vulnsRaw, additions] = await Promise.all([
      r.get("round:current"),
      r.hgetall("state"),
      r.zrevrange("vulnerabilities", 0, 4, "WITHSCORES"),
      r.lrange("wiki:additions", 0, 9),
    ]);

    const round: RoundPayload | null = roundJson
      ? (JSON.parse(roundJson) as RoundPayload)
      : null;

    const vulnerabilities: { claim: string; severity: number }[] = [];
    for (let i = 0; i < vulnsRaw.length; i += 2) {
      vulnerabilities.push({
        claim: vulnsRaw[i],
        severity: Number(vulnsRaw[i + 1]),
      });
    }

    return NextResponse.json({
      available: true,
      status: stateHash?.status ?? "unknown",
      round,
      vulnerabilities,
      additions,
    } satisfies ApiState);
  } catch {
    return NextResponse.json(empty);
  }
}
