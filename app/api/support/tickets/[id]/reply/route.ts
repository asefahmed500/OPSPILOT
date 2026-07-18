import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { handleCustomerReply } from "@/lib/ops/support"
import { ticketReplySchema } from "@/lib/validation"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "ticket-reply"), 20, 60_000)
    const { workspace } = await requireRequestContext()
    const { id } = await context.params
    const input = ticketReplySchema.parse(await request.json())
    const result = await handleCustomerReply(workspace.id, id, input.body)

    return Response.json(result, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
