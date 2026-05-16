import Redis from "ioredis";

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
        return null;
      },
    },
  );
  client.on("error", () => {});
  return client;
}

const EMPTY = `<!doctype html><meta charset="utf-8">
<style>
  html,body{margin:0;height:100%;background:transparent;color:#9CA3AF;
            font:14px/1.4 ui-sans-serif,system-ui,-apple-system;
            display:flex;align-items:center;justify-content:center;}
  div{text-align:center;}
</style>
<div>Waiting for the first graph snapshot…<br>
<small>The Python loop renders one as soon as ingest completes.</small></div>`;

export async function GET() {
  const r = getClient();
  try {
    const html = await r.get("graph:html");
    return new Response(html ?? EMPTY, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "no-store",
      },
    });
  } catch {
    return new Response(EMPTY, {
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
}
