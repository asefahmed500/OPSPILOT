import { jsonError, requireSameOrigin } from "@/lib/api"
import { resetPasswordWithToken } from "@/lib/password-reset"
import { assertRateLimit, getClientKey } from "@/lib/rate-limit"
import { resetPasswordSchema } from "@/lib/validation"

export async function POST(request: Request) {
  try {
    requireSameOrigin(request)
    assertRateLimit(getClientKey(request, "reset-password"), 10, 60_000)

    const input = resetPasswordSchema.parse(await request.json())
    await resetPasswordWithToken(input.token, input.password)

    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
