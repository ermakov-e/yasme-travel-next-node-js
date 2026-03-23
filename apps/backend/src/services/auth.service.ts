import jwt from 'jsonwebtoken'
import type { PrismaClient } from '@prisma/client'
import { env } from '../config/env.js'
import type { JwtPayload } from '../plugins/auth.plugin.js'

// ── Yandex OAuth ─────────────────────────────────────────────

export interface YandexProfile {
  id: string
  real_name: string
  display_name: string
  default_avatar_id: string
  default_phone?: { number: string }
  login: string
  emails?: string[]
}

export async function exchangeCodeForToken(code: string): Promise<string> {
  const response = await fetch('https://oauth.yandex.ru/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: env.YANDEX_CLIENT_ID,
      client_secret: env.YANDEX_CLIENT_SECRET,
    }),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Yandex token exchange failed: ${text}`)
  }

  const data = (await response.json()) as { access_token: string }
  return data.access_token
}

export async function getYandexProfile(accessToken: string): Promise<YandexProfile> {
  const response = await fetch('https://login.yandex.ru/info?format=json', {
    headers: { Authorization: `OAuth ${accessToken}` },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch Yandex profile')
  }

  return response.json() as Promise<YandexProfile>
}

export function buildAvatarUrl(avatarId: string | undefined): string | null {
  if (!avatarId || avatarId === '0') return null
  return `https://avatars.yandex.net/get-yapic/${avatarId}/islands-200`
}

// ── User upsert ──────────────────────────────────────────────

export async function upsertUser(prisma: PrismaClient, profile: YandexProfile) {
  return prisma.user.upsert({
    where: { yandexId: profile.id },
    update: {
      name: profile.real_name || profile.display_name || profile.login,
      avatarUrl: buildAvatarUrl(profile.default_avatar_id),
    },
    create: {
      yandexId: profile.id,
      name: profile.real_name || profile.display_name || profile.login,
      avatarUrl: buildAvatarUrl(profile.default_avatar_id),
      phone: profile.default_phone?.number ?? null,
    },
  })
}

// ── JWT ──────────────────────────────────────────────────────

export function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  // Cast expiresIn — jsonwebtoken accepts '7d', '1h' etc. as StringValue
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`,
    algorithm: 'HS256',
  })
}

export function buildYandexAuthUrl(state: string): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.YANDEX_CLIENT_ID,
    redirect_uri: env.YANDEX_REDIRECT_URI,
    state,
    scope: 'login:info login:email login:avatar login:phone',
  })
  return `https://oauth.yandex.ru/authorize?${params.toString()}`
}
