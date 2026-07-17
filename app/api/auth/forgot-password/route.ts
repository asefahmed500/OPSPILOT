import { db } from "@/lib/db"
import { sendPasswordResetEmail } from "@/lib/email"
import { createPasswordResetToken } from "@/lib/password-reset"
import { jsonError, requireSameOrigin } from "@/lib/api"
import { env } from "@/lib/env"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"
import { forgotPasswordSchema } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "forgot-password"), 5, 60_000)

    const input = forgotPasswordSchema.parse(await request.json())
    const user = await db.user.findUnique({ where: { email: input.email } })

    if (user) {
      const token = await createPasswordResetToken(user.id)
      const resetUrl = new URL("/reset-password", env.NEXT_PUBLIC_APP_URL)
      resetUrl.searchParams.set("token", token)

      await sendPasswordResetEmail(user.email, resetUrl.toString()).catch((error: unknown) => {
        console.error("Password reset email failed", error)
      })
    }

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
