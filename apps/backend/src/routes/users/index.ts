import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import { getPublicUrl } from '../../services/storage.service.js'

// ── Schemas ────────────────────────────────────────────────────

const UpdateMeBody = z.object({
  name: z.string().min(1).max(100).optional(),
  avatarKey: z.string().optional().nullable(),
})

// ── Routes ───────────────────────────────────────────────────

const usersRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.requireAuth)

  // ── GET /users/me ───────────────────────────────────────────
  fastify.get('/users/me', async (request, reply) => {
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

  // ── PATCH /users/me ─────────────────────────────────────────
  fastify.patch<{ Body: z.infer<typeof UpdateMeBody> }>(
    '/users/me',
    async (request, reply) => {
      const body = UpdateMeBody.parse(request.body)
      const userId = request.user.sub

      const updateData: Record<string, any> = {}

      if (body.name !== undefined) {
        updateData.name = body.name
      }

      if (body.avatarKey !== undefined) {
        // avatarKey can be null (reset) or a new storage key
        updateData.avatarUrl = body.avatarKey ? getPublicUrl(body.avatarKey) : null
      }

      if (Object.keys(updateData).length === 0) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: 'No fields to update',
          statusCode: 400,
        })
      }

      const user = await fastify.prisma.user.update({
        where: { id: userId },
        data: updateData,
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

      return reply.send(user)
    }
  )
}

export default usersRoutes
