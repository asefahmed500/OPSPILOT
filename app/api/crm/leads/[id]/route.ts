import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { deleteLead } from "@/lib/ops/lead"

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const { id } = await context.params
    const result = await deleteLead(workspace.id, id)

    return Response.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
