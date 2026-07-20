import "server-only"
import { ZodError } from "zod"

export class AppError extends Error {
  status: number
  code: string

  constructor(message: string, status = 400, code = "APP_ERROR") {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
  }
}

export function errorResponse(error: unknown, fallbackStatus = 500) {
  if (error instanceof AppError) {
    return Response.json(
      { error: error.message, code: error.code },
      { status: error.status }
    )
  }

  if (error instanceof ZodError) {
    return Response.json(
      {
        error: "Validation failed",
        code: "VALIDATION_ERROR",
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 422 }
    )
  }

  const message = error instanceof Error ? error.message : String(error)
  console.error("[api] unhandled error:", error)

  return Response.json(
    { error: fallbackStatus >= 500 ? "Unexpected server error" : "Request failed", detail: message },
    { status: fallbackStatus }
  )
}
