import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { runWorkflow } from "@/lib/ops/workflows"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireSameOrigin(_request)
    assertRateLimit(getClientKey(_request, "workflow-run"), 20, 60_000)
    const { workspace } = await requireRequestContext()
    const { id } = await context.params
    const run = await runWorkflow(workspace.id, id)

    return Response.json({ run }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
