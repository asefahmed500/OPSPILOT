import { randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { hashPassword } from "@/lib/security"
import { workspaceSlug } from "@/lib/workspace"
import { jsonError, requireSameOrigin } from "@/lib/api"
import { registerSchema } from "@/lib/validation"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"
import { AppError } from "@/lib/errors"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "register"), 5, 60_000)
    const input = registerSchema.parse(await request.json())
    const email = input.email.toLowerCase().trim()
    const existing = await db.user.findUnique({ where: { email } })

    if (existing) {
      return jsonError(new AppError("An account already exists for this email", 409, "ACCOUNT_EXISTS"))
    }

    const baseSlug = workspaceSlug(input.workspaceName) || "workspace"
    const slug = `${baseSlug}-${randomBytes(3).toString("hex")}`
    const passwordHash = await hashPassword(input.password)

    const user = await db.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        memberships: {
          create: {
            role: "OWNER",
            workspace: {
              create: {
                name: input.workspaceName,
                slug,
                integrations: {
                  createMany: {
                    data: [
                      { provider: "mock-crm", status: "mock" },
                      { provider: "mock-slack", status: "mock" },
                      { provider: "smtp-email", status: "mock" },
                    ],
                  },
                },
              },
            },
          },
        },
      },
    })

    return Response.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (error) {
    return jsonError(error)
  }
}
