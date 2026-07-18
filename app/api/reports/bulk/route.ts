import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { bulkDeleteReports } from "@/lib/ops/reports"
import { bulkDeleteSchema } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = bulkDeleteSchema.parse(await request.json())
    const result = await bulkDeleteReports(workspace.id, input.ids)

    return Response.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
