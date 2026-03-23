import Fastify, { type FastifyError } from 'fastify'
import cookie from '@fastify/cookie'
import sensible from '@fastify/sensible'
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'

import corsPlugin from './plugins/cors.plugin.js'
import prismaPlugin from './plugins/prisma.plugin.js'
import authPlugin from './plugins/auth.plugin.js'

import authRoutes from './routes/auth/index.js'
import usersRoutes from './routes/users/index.js'
import groupsRoutes from './routes/groups/index.js'
import photosRoutes from './routes/photos/index.js'
import friendsRoutes from './routes/friends/index.js'
import storageRoutes from './routes/storage/index.js'

export async function buildServer() {
  const fastify = Fastify({
    logger: {
      transport:
        process.env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true } }
          : undefined,
    },
  })

  // Zod type provider
  fastify.setValidatorCompiler(validatorCompiler)
  fastify.setSerializerCompiler(serializerCompiler)

  // Global error handler
  fastify.setErrorHandler((error: FastifyError, _request, reply) => {
    const statusCode = error.statusCode ?? 500
    const errorCode = (error as FastifyError & { code?: string }).code
      ?? error.name?.toUpperCase().replace(/ /g, '_')
      ?? 'INTERNAL_ERROR'

    fastify.log.error(error)

    return reply.status(statusCode).send({
      error: errorCode,
      message: error.message ?? 'Internal server error',
      statusCode,
    })
  })

  // ── Plugins (order matters) ───────────────────────────────
  await fastify.register(cookie, {
    secret: process.env.COOKIE_SECRET ?? 'yasme-cookie-secret-change-in-prod',
  })
  await fastify.register(sensible)
  await fastify.register(corsPlugin)
  await fastify.register(prismaPlugin)
  await fastify.register(authPlugin)

  // ── Health check ──────────────────────────────────────────
  fastify.get('/health', async () => ({ status: 'ok', timestamp: new Date().toISOString() }))

  // ── Routes ────────────────────────────────────────────────
  fastify.register(authRoutes, { prefix: '/api/v1' })
  fastify.register(usersRoutes, { prefix: '/api/v1' })
  fastify.register(groupsRoutes, { prefix: '/api/v1' })
  fastify.register(photosRoutes, { prefix: '/api/v1' })
  fastify.register(friendsRoutes, { prefix: '/api/v1' })
  fastify.register(storageRoutes, { prefix: '/api/v1' })

  return fastify
}
