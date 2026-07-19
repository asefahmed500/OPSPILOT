import { AssistantChat } from "@/components/app/assistant-chat"
import { AssistantGuideCard } from "@/components/app/assistant-guide-card"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { opsPilotAgentTeam } from "@/lib/agents/agent-team"

export default async function AssistantPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const conversations = await db.conversation.findMany({
    where: { userId: user.id, workspaceId: workspace.id },
    orderBy: { updatedAt: "desc" },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 30 } },
    take: 20,
  })
  const conversation = conversations[0]

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold">AI Assistant</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Ask OpsPilot to plan and execute safe workspace actions across CRM, tasks, support, email, workflows, and reports.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white/80 px-4 py-3 text-sm shadow-sm">
          <p className="font-semibold text-slate-950">Demo mode</p>
          <p className="mt-1 text-slate-500">Use a real email you control before sending.</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <AssistantChat
          initialConversationId={conversation?.id}
          initialMessages={(conversation?.messages ?? []).map((message) => ({
            role: message.role,
            content: message.content,
            action: message.action,
          }))}
          initialConversations={conversations.map((item) => ({
            id: item.id,
            title: item.title,
            updatedAt: item.updatedAt.toISOString(),
            messages: item.messages.map((message) => ({
              role: message.role,
              content: message.content,
              action: message.action,
            })),
          }))}
        />

        <aside className="space-y-4">
          <AssistantGuideCard />

          <section className="op-panel p-5">
            <p className="text-sm font-semibold">Specialized agents available</p>
            <div className="mt-4 space-y-3">
              {opsPilotAgentTeam.map((agent) => (
                <div key={agent.id} className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                  <p className="text-sm font-semibold text-slate-950">{agent.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{agent.responsibility}</p>
                  <p className="mt-2 text-xs font-medium text-slate-600">{agent.safeTools}</p>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
