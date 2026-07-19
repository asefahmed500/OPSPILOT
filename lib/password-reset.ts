import "server-only"
import { createHash, randomBytes } from "node:crypto"
import { db } from "@/lib/db"
import { AppError } from "@/lib/errors"
import { hashPassword } from "@/lib/security"

const TOKEN_TTL_MS = 30 * 60 * 1000

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex")
}

export async function createPasswordResetToken(userId: string) {
  const token = randomBytes(32).toString("hex")
  const tokenHash = hashResetToken(token)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS)

  await db.$transaction([
    db.passwordResetToken.deleteMany({
      where: {
        userId,
        OR: [{ usedAt: { not: null } }, { expiresAt: { lt: new Date() } }],
      },
    }),
    db.passwordResetToken.create({
      data: {
        tokenHash,
        userId,
        expiresAt,
      },
    }),
  ])

  return token
}

export async function resetPasswordWithToken(token: string, password: string) {
  const tokenHash = hashResetToken(token)
  const passwordHash = await hashPassword(password)

  const email = await db.$transaction(async (tx) => {
    const resetToken = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    })

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      throw new AppError(
        "Reset link is invalid or expired",
        400,
        "INVALID_RESET_TOKEN"
      )
    }

    const claimedToken = await tx.passwordResetToken.updateMany({
      where: {
        id: resetToken.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: { usedAt: new Date() },
    })

    if (claimedToken.count !== 1) {
      throw new AppError(
        "Reset link is invalid or expired",
        400,
        "INVALID_RESET_TOKEN"
      )
    }

    await tx.user.update({
      where: { id: resetToken.userId },
      data: { passwordHash },
    })

    return resetToken.user.email
  })

  return email
}
