import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { createLead } from "@/lib/ops/lead"
import { leadSchema } from "@/lib/validation"

export async function GET() {
  try {
    const { workspace } = await requireRequestContext()
    const leads = await db.lead.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { company: true, contact: true },
      take: 100,
    })

    return Response.json({ leads })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = leadSchema.parse(await request.json())
    const lead = await createLead(workspace.id, input)

    return Response.json({ lead }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
