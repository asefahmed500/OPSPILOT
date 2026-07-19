import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { createTicket } from "@/lib/ops/support"
import { ticketSchema } from "@/lib/validation"

export async function GET() {
  try {
    const { workspace } = await requireRequestContext()
    const tickets = await db.ticket.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { messages: true },
      take: 100,
    })

    return Response.json({ tickets })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = ticketSchema.parse(await request.json())
    const ticket = await createTicket(workspace.id, input)

    return Response.json({ ticket }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
