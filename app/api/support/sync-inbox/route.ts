import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { syncSupportInbox } from "@/lib/email-inbox"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "support-sync-inbox"), 5, 60_000)
    const { workspace } = await requireRequestContext()
    const result = await syncSupportInbox(workspace.id)

    return Response.json(result)
  } catch (error) {
    return jsonError(error)
  }
}
