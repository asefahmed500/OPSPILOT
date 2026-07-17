import "server-only"
import { db } from "@/lib/db"
import { AppError } from "@/lib/errors"

export async function getPrimaryWorkspace(userId: string) {
  const membership = await db.membership.findFirst({
    where: { userId },
    include: { workspace: true },
    orderBy: { createdAt: "asc" },
  })

  return membership?.workspace ?? null
}

export async function requireWorkspace(userId: string) {
  const workspace = await getPrimaryWorkspace(userId)

  if (!workspace) {
    throw new AppError("No workspace found for user", 403, "WORKSPACE_REQUIRED")
  }

  return workspace
}

export function workspaceSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "")
    .slice(0, 48)
}
