import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { env } from "@/lib/env"
import { AppError } from "@/lib/errors"
import { ingestInboundEmail } from "@/lib/ops/support"
import { inboundEmailSchema } from "@/lib/validation"

async function workspaceIdForInboundEmail(request: Request, workspaceSlug?: string) {
  const webhookSecret = request.headers.get("x-opspilot-inbound-secret")

  if (env.INBOUND_EMAIL_WEBHOOK_SECRET && webhookSecret === env.INBOUND_EMAIL_WEBHOOK_SECRET) {
    if (!workspaceSlug) {
      throw new AppError("Webhook inbound email needs workspaceSlug", 400, "WORKSPACE_SLUG_REQUIRED")
    }

    const workspace = await db.workspace.findUnique({
      where: { slug: workspaceSlug },
      select: { id: true },
    })

    if (!workspace) {
      throw new AppError("Workspace not found", 404, "WORKSPACE_NOT_FOUND")
    }

    return workspace.id
  }

  requireSameOrigin(request)
  const { workspace } = await requireRequestContext()
  return workspace.id
}

export async function POST(request: Request) {
  try {
    const input = inboundEmailSchema.parse(await request.json())
    const workspaceId = await workspaceIdForInboundEmail(request, input.workspaceSlug)
    const result = await ingestInboundEmail(workspaceId, input)

    return Response.json(result, { status: result.created ? 201 : 200 })
  } catch (error) {
    return jsonError(error)
  }
}
