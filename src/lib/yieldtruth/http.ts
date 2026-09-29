import { serverConfig } from "./config.ts";

const buckets = new Map<string, { count: number; reset: number }>();
const MAX_BUCKETS = 2_000;

/**
 * Rate-limit identity.
 *
 * The backend binds to 127.0.0.1 and is only reachable through the nginx vhost,
 * which *overwrites* `X-Real-IP` with `$remote_addr`. It *appends* the peer to
 * `X-Forwarded-For` ($proxy_add_x_forwarded_for), so the leading XFF entry is
 * whatever the client typed — keying on it let any caller mint a fresh bucket per
 * request and bypass the limit entirely. Key on the overwritten header only, and
 * fail closed to one shared bucket when it is absent.
 */
export function clientKey(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  return real || "unattributed";
}


function evictBuckets(now: number): void {
  if (buckets.size < MAX_BUCKETS) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.reset) buckets.delete(key);
  }
  while (buckets.size >= MAX_BUCKETS) {
    const oldest = buckets.keys().next().value;
    if (oldest === undefined) break;
    buckets.delete(oldest);
  }
}

export function takeRateLimit(key: string, now = Date.now()): boolean {
  evictBuckets(now);
  const current = buckets.get(key);
  if (!current || now >= current.reset) {
    buckets.set(key, { count: 1, reset: now + serverConfig.rateLimitWindowMs });
    return true;
  }
  if (current.count >= serverConfig.rateLimitMax) return false;
  current.count += 1;
  return true;
}

export function rateLimitSize(): number {
  return buckets.size;
}

export function resetRateLimits(): void {
  buckets.clear();
}

export function readId(value: string): number | null {
  if (!/^[1-9]\d{0,6}$/.test(value)) return null;
  const id = Number(value);
  return id <= 1_000_000 ? id : null;
}

export function readPage(url: URL): { limit: number; offset: number } | { error: string } {
  const limitRaw = url.searchParams.get("limit");
  const offsetRaw = url.searchParams.get("offset");
  const limit = limitRaw == null || limitRaw === "" ? 20 : Number(limitRaw);
  const offset = offsetRaw == null || offsetRaw === "" ? 0 : Number(offsetRaw);
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) return { error: "bad page" };
  if (!Number.isInteger(offset) || offset < 0 || offset > 10_000) return { error: "bad page" };
  return { limit, offset };
}

function securityHeaders(response: Response, request: Request): Response {
  const headers = new Headers(response.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("referrer-policy", "strict-origin-when-cross-origin");
  headers.set("cache-control", "no-store");
  headers.set("x-request-id", request.headers.get("x-request-id") || crypto.randomUUID());
  const origin = request.headers.get("origin");
  if (origin && serverConfig.corsOrigins.includes(origin)) {
    headers.set("access-control-allow-origin", origin);
    headers.set("vary", "origin");
  }
  return new Response(response.body, { status: response.status, headers });
}

export function json(body: unknown, status = 200, request?: Request): Response {
  const response = new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
  return request ? securityHeaders(response, request) : response;
}

export function guard(request: Request): Response | null {
  const length = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > 16_384) return json({ error: "payload too large", code: "payload_too_large" }, 413, request);
  if (request.method !== "OPTIONS" && !takeRateLimit(clientKey(request))) {
    return json({ error: "rate limit", code: "rate_limit" }, 429, request);
  }
  if (request.method === "OPTIONS") {
    return json({ ok: true }, 204, request);
  }
  return null;
}

export async function handle(request: Request, work: () => Promise<Response>): Promise<Response> {
  const blocked = guard(request);
  if (blocked) return blocked;
  try {
    return await work();
  } catch (error) {
    console.error("yieldtruth api", error instanceof Error ? error.message : "request failed");
    return json({ error: "request failed", code: "internal" }, 500, request);
  }
}
