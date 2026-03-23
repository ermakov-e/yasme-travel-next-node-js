import { randomBytes } from 'crypto'
import type { FastifyPluginAsync } from 'fastify'
import {
  buildYandexAuthUrl,
  exchangeCodeForToken,
  getYandexProfile,
  upsertUser,
  signJwt,
} from '../../services/auth.service.js'
import { env } from '../../config/env.js'

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /auth/yandex — redirect to Yandex OAuth
  fastify.get('/auth/yandex', async (request, reply) => {
    const state = randomBytes(16).toString('hex')

    // Store state in short-lived cookie (CSRF protection)
    reply.setCookie('oauth_state', state, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 minutes
      path: '/',
    })

    return reply.redirect(buildYandexAuthUrl(state))
  })

  // GET /auth/callback — handle Yandex OAuth callback
  fastify.get<{ Querystring: { code?: string; state?: string; error?: string } }>(
    '/auth/callback',
    async (request, reply) => {
      const { code, state, error } = request.query

      // User denied access
      if (error || !code) {
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=access_denied`)
      }

      // Verify CSRF state
      const savedState = request.cookies?.oauth_state
      if (!state || !savedState || state !== savedState) {
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=invalid_state`)
      }

      // Clear state cookie
      reply.clearCookie('oauth_state')

      try {
        // Exchange code for Yandex access token
        const accessToken = await exchangeCodeForToken(code)

        // Fetch user profile from Yandex
        const profile = await getYandexProfile(accessToken)

        // Upsert user in database
        const user = await upsertUser(fastify.prisma, profile)

        // Sign JWT
        const token = signJwt({
          sub: user.id,
          yandexId: user.yandexId,
          name: user.name,
          avatarUrl: user.avatarUrl,
        })

        // Set JWT cookie
        reply.setCookie('token', token, {
          httpOnly: true,
          secure: env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60, // 7 days
          path: '/',
        })

        return reply.redirect(`${env.CORS_ORIGIN}/groups`)
      } catch (err) {
        fastify.log.error(err, 'OAuth callback error')
        return reply.redirect(`${env.CORS_ORIGIN}/login?error=auth_failed`)
      }
    }
  )

  // POST /auth/logout
  fastify.post('/auth/logout', {
    preHandler: [fastify.requireAuth],
  }, async (_request, reply) => {
    reply.clearCookie('token', { path: '/' })
    return reply.send({ message: 'Logged out successfully' })
  })

  // GET /auth/me — session restore
  fastify.get('/auth/me', {
    preHandler: [fastify.requireAuth],
  }, async (request, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: request.user.sub },
      select: {
        id: true,
        yandexId: true,
        name: true,
        avatarUrl: true,
        phone: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    if (!user) {
      reply.clearCookie('token')
      return reply.status(401).send({ error: 'UNAUTHORIZED', message: 'User not found', statusCode: 401 })
    }

    return reply.send(user)
  })
}

export default authRoutes
