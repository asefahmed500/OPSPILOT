import { AssistantChat } from "@/components/app/assistant-chat"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"

export default async function AssistantPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const conversation = await db.conversation.findFirst({
    where: { userId: user.id, workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 12 } },
  })

  return (
    <div>
      <h1 className="text-3xl font-semibold">AI Assistant</h1>
      <p className="mt-2 text-slate-600">Ask OpsPilot to create tasks, leads, support tickets, and reports.</p>
      <div className="mt-6">
        <AssistantChat
          initialConversationId={conversation?.id}
          initialMessages={(conversation?.messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
            action: message.action,
          }))}
        />
      </div>
    </div>
  )
}
