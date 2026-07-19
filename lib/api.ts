import "server-only"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { env } from "@/lib/env"
import { AppError, errorResponse } from "@/lib/errors"

export async function requireRequestContext() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)

  return { user, workspace }
}

export function jsonError(error: unknown, status = 400) {
  return errorResponse(error, status)
}

export function requireSameOrigin(request: Request) {
  const origin = request.headers.get("origin")
  const referer = request.headers.get("referer")
  const requestOrigin = new URL(request.url).origin
  const appOrigin = new URL(env.NEXT_PUBLIC_APP_URL).origin

  if (origin) {
    if (origin !== requestOrigin && origin !== appOrigin) {
      throw new AppError("Invalid request origin", 403, "INVALID_ORIGIN")
    }

    return
  }

  if (!referer) {
    throw new AppError("Missing request origin", 403, "MISSING_ORIGIN")
  }

  let refererOrigin: string

  try {
    refererOrigin = new URL(referer).origin
  } catch {
    throw new AppError("Invalid request origin", 403, "INVALID_ORIGIN")
  }

  if (refererOrigin !== requestOrigin && refererOrigin !== appOrigin) {
    throw new AppError("Invalid request origin", 403, "INVALID_ORIGIN")
  }
}
