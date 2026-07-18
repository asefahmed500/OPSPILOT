import { getToken } from "next-auth/jwt"
import { NextResponse, type NextRequest } from "next/server"
import { decodeAuthJwt } from "@/lib/auth-jwt"

export async function proxy(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET ?? process.env.AUTH_JWT_SECRET,
    decode: decodeAuthJwt,
  })

  if (!token) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/app/:path*"],
}
