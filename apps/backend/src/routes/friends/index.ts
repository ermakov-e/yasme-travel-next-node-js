import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'

// ── Schemas ────────────────────────────────────────────────────

const FriendsQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  search: z.string().max(100).optional(),
})

// ── Routes ───────────────────────────────────────────────────

const friendsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.requireAuth)

  // ── GET /friends — все зарегистрированные пользователи ─────
  // MVP: shows all users so they can be invited to groups
  fastify.get<{ Querystring: z.infer<typeof FriendsQuery> }>(
    '/friends',
    async (request, reply) => {
      const { page, limit, search } = FriendsQuery.parse(request.query)
      const currentUserId = request.user.sub
      const skip = (page - 1) * limit

      const whereClause: any = {
        id: { not: currentUserId }, // Exclude current user
      }

      if (search) {
        whereClause.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search } },
        ]
      }

      const [users, total] = await Promise.all([
        fastify.prisma.user.findMany({
          where: whereClause,
          skip,
          take: limit,
          orderBy: { name: 'asc' },
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            phone: true,
            createdAt: true,
          },
        }),
        fastify.prisma.user.count({ where: whereClause }),
      ])

      return reply.send({ data: users, total, page, limit })
    }
  )
}

export default friendsRoutes
