import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { bulkDeleteLeads } from "@/lib/ops/lead"
import { bulkDeleteSchema } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = bulkDeleteSchema.parse(await request.json())
    const result = await bulkDeleteLeads(workspace.id, input.ids)

    return Response.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
