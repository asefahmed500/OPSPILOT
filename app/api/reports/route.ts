import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { createReport } from "@/lib/ops/reports"
import { reportSchema } from "@/lib/validation"

export async function GET() {
  try {
    const { workspace } = await requireRequestContext()
    const reports = await db.report.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      take: 12,
    })

    return Response.json({ reports })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = reportSchema.parse(await request.json())
    const report = await createReport(workspace.id, input.period)

    return Response.json({ report }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
