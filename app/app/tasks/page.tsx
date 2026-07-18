import { ActionForm } from "@/components/app/action-form"
import { requireUser } from "@/lib/auth"
import { requireWorkspace } from "@/lib/workspace"
import { db } from "@/lib/db"
import { DeleteTaskButton } from "@/components/app/delete-task-button"

export default async function TasksPage() {
  const user = await requireUser()
  const workspace = await requireWorkspace(user.id)
  const tasks = await db.task.findMany({ where: { workspaceId: workspace.id }, orderBy: { createdAt: "desc" } })

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div>
        <h1 className="text-3xl font-semibold">Tasks</h1>
        <p className="mt-2 text-slate-600">Track generated and manual operational work.</p>
        <div className="mt-6">
          <ActionForm kind="task" endpoint="/api/tasks" submitLabel="Create task" successLabel="Task created" />
        </div>
      </div>
      <div className="op-panel p-5">
        <h2 className="font-semibold tracking-tight">Task board</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {tasks.map((task) => (
            <div key={task.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium">{task.title}</p>
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium">{task.priority}</span>
                  <DeleteTaskButton taskId={task.id} />
                </div>
              </div>
              <p className="mt-2 text-sm text-slate-600">{task.description}</p>
              <p className="mt-3 text-xs text-slate-500">{task.status}</p>
            </div>
          ))}
          {!tasks.length ? <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">No tasks yet.</p> : null}
        </div>
      </div>
    </div>
  )
}
