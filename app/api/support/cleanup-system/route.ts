import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { cleanupSystemSupportTickets } from "@/lib/ops/support"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "support-cleanup-system"), 5, 60_000)
    const { workspace } = await requireRequestContext()
    const result = await cleanupSystemSupportTickets(workspace.id)

    return Response.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
