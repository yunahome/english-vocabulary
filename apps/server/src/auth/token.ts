import { createHmac, timingSafeEqual } from 'node:crypto'

export interface SessionTokenPayload {
  sub: string
  iat: number
  exp: number
}

function encode(value: string | Buffer): string {
  return Buffer.from(value).toString('base64url')
}

function sign(unsigned: string, secret: string): string {
  return createHmac('sha256', secret).update(unsigned).digest('base64url')
}

export function signSessionToken(
  userId: string,
  secret: string,
  ttlSeconds: number,
  nowSeconds = Math.floor(Date.now() / 1000),
): string {
  const header = encode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = encode(
    JSON.stringify({ sub: userId, iat: nowSeconds, exp: nowSeconds + ttlSeconds }),
  )
  const unsigned = `${header}.${payload}`
  return `${unsigned}.${sign(unsigned, secret)}`
}

export function verifySessionToken(
  token: string,
  secret: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): SessionTokenPayload | null {
  const [header, payload, signature, extra] = token.split('.')
  if (!header || !payload || !signature || extra) return null

  const expected = Buffer.from(sign(`${header}.${payload}`, secret))
  const actual = Buffer.from(signature)
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null

  try {
    const decoded = JSON.parse(
      Buffer.from(payload, 'base64url').toString('utf8'),
    ) as SessionTokenPayload
    if (
      typeof decoded.sub !== 'string' ||
      typeof decoded.iat !== 'number' ||
      typeof decoded.exp !== 'number' ||
      decoded.exp <= nowSeconds
    ) {
      return null
    }
    return decoded
  } catch {
    return null
  }
}
