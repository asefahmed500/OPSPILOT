import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { contactSchema } from "@/lib/validation"

export async function GET() {
  try {
    const { workspace } = await requireRequestContext()
    const contacts = await db.contact.findMany({
      where: { workspaceId: workspace.id },
      orderBy: { createdAt: "desc" },
      include: { company: true },
      take: 100,
    })

    return Response.json({ contacts })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    const { workspace } = await requireRequestContext()
    const input = contactSchema.parse(await request.json())
    const contact = await db.contact.upsert({
      where: {
        workspaceId_email: {
          workspaceId: workspace.id,
          email: input.email.toLowerCase().trim(),
        },
      },
      update: input,
      create: {
        ...input,
        email: input.email.toLowerCase().trim(),
        workspaceId: workspace.id,
      },
    })

    return Response.json({ contact }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
