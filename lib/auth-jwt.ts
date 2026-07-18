import type { JWT, JWTDecodeParams, JWTEncodeParams } from "next-auth/jwt"

const textEncoder = new TextEncoder()
const textDecoder = new TextDecoder()

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = ""

  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

function base64UrlToBytes(value: string) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

function base64UrlEncode(value: string) {
  return bytesToBase64Url(textEncoder.encode(value))
}

function base64UrlDecode(value: string) {
  return textDecoder.decode(base64UrlToBytes(value))
}

function base64UrlJson(value: unknown) {
  return base64UrlEncode(JSON.stringify(value))
}

function secretBytes(secret: string | Buffer) {
  return typeof secret === "string" ? textEncoder.encode(secret) : new Uint8Array(secret)
}

async function signJwtInput(input: string, secret: string | Buffer) {
  const key = await crypto.subtle.importKey(
    "raw",
    secretBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(input))

  return bytesToBase64Url(new Uint8Array(signature))
}

function signaturesMatch(expected: string, actual: string) {
  const expectedBytes = textEncoder.encode(expected)
  const actualBytes = textEncoder.encode(actual)

  if (expectedBytes.length !== actualBytes.length) {
    return false
  }

  let difference = 0

  for (let index = 0; index < expectedBytes.length; index += 1) {
    difference |= expectedBytes[index] ^ actualBytes[index]
  }

  return difference === 0
}

export async function encodeAuthJwt({ token, maxAge, secret }: JWTEncodeParams) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64UrlJson({ alg: "HS256", typ: "JWT" })
  const payload = base64UrlJson({
    ...token,
    iat: now,
    exp: now + (maxAge ?? 30 * 24 * 60 * 60),
  })
  const input = `${header}.${payload}`

  return `${input}.${await signJwtInput(input, secret)}`
}

export async function decodeAuthJwt({ token, secret }: JWTDecodeParams): Promise<JWT | null> {
  if (!token) {
    return null
  }

  const parts = token.split(".")

  if (parts.length !== 3) {
    return null
  }

  const [header, payload, signature] = parts
  const expectedSignature = await signJwtInput(`${header}.${payload}`, secret)

  if (!signaturesMatch(expectedSignature, signature)) {
    return null
  }

  try {
    const decoded = JSON.parse(base64UrlDecode(payload)) as JWT & { exp?: number }

    if (decoded.exp && decoded.exp < Math.floor(Date.now() / 1000)) {
      return null
    }

    return decoded
  } catch {
    return null
  }
}
