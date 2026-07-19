import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { createTask } from "@/lib/ops/tasks"
import { taskSchema } from "@/lib/validation"

export async function GET() {
  try {
    const { workspace } = await requireRequestContext()
    const tasks = await db.task.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { lead: true, ticket: true },
      take: 100,
    })

    return Response.json({ tasks })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = taskSchema.parse(await request.json())
    const task = await createTask(workspace.id, input)

    return Response.json({ task }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
