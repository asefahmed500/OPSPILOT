import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { sendConfirmedTicketDraft } from "@/lib/ops/support"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"
import { sendTicketDraftSchema } from "@/lib/validation"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "ticket-send-draft"), 20, 60_000)
    const { workspace } = await requireRequestContext()
    const { id } = await context.params
    const input = sendTicketDraftSchema.parse(await request.json())
    const result = await sendConfirmedTicketDraft(workspace.id, id, input.body)

    return Response.json(result, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
