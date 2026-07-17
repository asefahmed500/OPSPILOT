import { z } from "zod"
import { jsonError, requireRequestContext, requireSameOrigin } from "@/lib/api"
import { db } from "@/lib/db"
import { executeAssistantRequest } from "@/lib/ai"
import { assistantSchema } from "@/lib/validation"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"
import { AppError } from "@/lib/errors"

const chatSchema = assistantSchema.extend({
  conversationId: z.string().optional(),
})

export async function GET() {
  try {
    const { user, workspace } = await requireRequestContext()
    const conversations = await db.conversation.findMany({
      where: { userId: user.id, workspaceId: workspace.id },
      orderBy: { updatedAt: "desc" },
      include: { messages: { orderBy: { createdAt: "asc" } } },
      take: 8,
    })

    return Response.json({ conversations })
  } catch (error) {
    return jsonError(error, 401)
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "assistant"), 30, 60_000)
    const { user, workspace } = await requireRequestContext()
    const input = chatSchema.parse(await request.json())
    const conversation = input.conversationId
      ? await db.conversation.findFirst({
          where: { id: input.conversationId, userId: user.id, workspaceId: workspace.id },
        })
      : await db.conversation.create({
          data: {
            title: input.message.slice(0, 48),
            userId: user.id,
            workspaceId: workspace.id,
          },
        })

    if (!conversation) {
      return jsonError(new AppError("Conversation not found", 404, "CONVERSATION_NOT_FOUND"))
    }

    await db.aiMessage.create({
      data: {
        role: "user",
        content: input.message,
        conversationId: conversation.id,
      },
    })

    const result = await executeAssistantRequest(workspace.id, input.message)

    const assistantMessage = await db.aiMessage.create({
      data: {
        role: "assistant",
        content: result.content,
        action: result.action,
        conversationId: conversation.id,
      },
    })

    await db.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    })

    return Response.json({
      conversationId: conversation.id,
      message: assistantMessage,
    })
  } catch (error) {
    return jsonError(error)
  }
}
