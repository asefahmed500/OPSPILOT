import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { createWorkflow } from "@/lib/ops/workflows"
import { workflowSchema } from "@/lib/validation"

export async function GET() {
  try {
    const { workspace } = await requireRequestContext()
    const workflows = await db.workflow.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { runs: { orderBy: { createdAt: "desc" }, take: 3 } },
      take: 100,
    })

    return Response.json({ workflows })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = workflowSchema.parse(await request.json())
    const workflow = await createWorkflow(
      workspace.id,
      input.prompt,
      input.name,
      {
        customerEmail: input.customerEmail || undefined,
        customerName: input.customerName,
        company: input.company,
      }
    )

    return Response.json({ workflow }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
