import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { deleteWorkflow } from "@/lib/ops/workflows"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const { id } = await context.params
    await deleteWorkflow(workspace.id, id)

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
