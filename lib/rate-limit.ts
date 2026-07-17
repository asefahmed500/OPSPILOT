import "server-only"
import { AppError } from "@/lib/errors"

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 500) {
    return
  }

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key)
    }
  }
}

export function getClientKey(request: Request, scope: string) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
  const realIp = request.headers.get("x-real-ip")
  return `${scope}:${forwardedFor ?? realIp ?? "local"}`
}

export function assertRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now()
  pruneExpiredBuckets(now)
  const current = buckets.get(key)

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return
  }

  if (current.count >= limit) {
    throw new AppError("Too many requests. Please try again shortly.", 429, "RATE_LIMITED")
  }

  current.count += 1
}
