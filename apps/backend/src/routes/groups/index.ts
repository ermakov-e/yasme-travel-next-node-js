import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import {
  moveTempCover,
  getPublicUrl,
  deleteObject,
  verifyObjectExists,
} from '../../services/storage.service.js'

// ── Schemas ────────────────────────────────────────────────────

const CreateGroupBody = z.object({
  name: z.string().min(2).max(100),
  coverKey: z.string().optional(),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  address: z.string().max(300).optional(),
  memberIds: z.array(z.string().uuid()).optional().default([]),
})

const UpdateGroupBody = z.object({
  name: z.string().min(2).max(100).optional(),
  coverKey: z.string().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  address: z.string().max(300).optional().nullable(),
})

const GroupIdParam = z.object({
  id: z.string().uuid(),
})

const MemberUserIdParam = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
})

const AddMemberBody = z.object({
  userId: z.string().uuid(),
})

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

// ── Helper ────────────────────────────────────────────────────

function serializeGroup(group: any) {
  return {
    ...group,
    coverUrl: group.coverKey ? getPublicUrl(group.coverKey) : null,
  }
}

// ── Routes ───────────────────────────────────────────────────

const groupsRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes in this plugin require auth
  fastify.addHook('preHandler', fastify.requireAuth)

  // ── GET /groups — список групп пользователя ─────────────────
  fastify.get<{ Querystring: z.infer<typeof PaginationQuery> }>(
    '/groups',
    async (request, reply) => {
      const { page, limit } = PaginationQuery.parse(request.query)
      const userId = request.user.sub
      const skip = (page - 1) * limit

      const [memberships, total] = await Promise.all([
        fastify.prisma.groupMember.findMany({
          where: { userId },
          skip,
          take: limit,
          orderBy: { joinedAt: 'desc' },
          include: {
            group: {
              include: {
                _count: { select: { photos: true, members: true } },
                members: {
                  take: 4,
                  include: { user: { select: { id: true, name: true, avatarUrl: true } } },
                },
              },
            },
          },
        }),
        fastify.prisma.groupMember.count({ where: { userId } }),
      ])

      const groups = memberships.map((m) => serializeGroup(m.group))

      return reply.send({ data: groups, total, page, limit })
    }
  )

  // ── POST /groups — создать группу ──────────────────────────
  fastify.post<{ Body: z.infer<typeof CreateGroupBody> }>(
    '/groups',
    async (request, reply) => {
      const body = CreateGroupBody.parse(request.body)
      const userId = request.user.sub

      // Move temp cover to final location if provided
      let finalCoverKey: string | null = null
      if (body.coverKey) {
        // Verify the temp object exists in S3
        const exists = await verifyObjectExists(body.coverKey)
        if (!exists) {
          return reply.status(400).send({
            error: 'BAD_REQUEST',
            message: 'Cover image not found in storage',
            statusCode: 400,
          })
        }
      }

      // Create group + owner membership in a transaction
      const group = await fastify.prisma.$transaction(async (tx) => {
        const newGroup = await tx.group.create({
          data: {
            name: body.name,
            lat: body.lat,
            lng: body.lng,
            address: body.address,
            ownerId: userId,
          },
        })

        // Move cover from temp/ to groups/{id}/
        if (body.coverKey) {
          const ext = body.coverKey.split('.').pop() ?? 'jpg'
          finalCoverKey = await moveTempCover(body.coverKey, newGroup.id, ext)
          await tx.group.update({
            where: { id: newGroup.id },
            data: { coverKey: finalCoverKey },
          })
          newGroup.coverKey = finalCoverKey
        }

        // Add owner as OWNER member
        await tx.groupMember.create({
          data: { groupId: newGroup.id, userId, role: 'OWNER' },
        })

        // Add invited members (skip owner if accidentally included)
        const uniqueMembers = [...new Set(body.memberIds)].filter((id) => id !== userId)
        if (uniqueMembers.length > 0) {
          await tx.groupMember.createMany({
            data: uniqueMembers.map((memberId) => ({
              groupId: newGroup.id,
              userId: memberId,
              role: 'MEMBER' as const,
            })),
            skipDuplicates: true,
          })
        }

        return newGroup
      })

      const fullGroup = await fastify.prisma.group.findUnique({
        where: { id: group.id },
        include: {
          _count: { select: { photos: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
        },
      })

      return reply.status(201).send(serializeGroup(fullGroup))
    }
  )

  // ── GET /groups/:id — детали группы ────────────────────────
  fastify.get<{ Params: z.infer<typeof GroupIdParam> }>(
    '/groups/:id',
    async (request, reply) => {
      const { id } = GroupIdParam.parse(request.params)
      const userId = request.user.sub

      const group = await fastify.prisma.group.findUnique({
        where: { id },
        include: {
          _count: { select: { photos: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
          owner: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      if (!group) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Group not found', statusCode: 404 })
      }

      // Only members can view
      const isMember = group.members.some((m) => m.userId === userId)
      if (!isMember) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this group', statusCode: 403 })
      }

      return reply.send(serializeGroup(group))
    }
  )

  // ── PATCH /groups/:id — обновить группу (только owner) ─────
  fastify.patch<{ Params: z.infer<typeof GroupIdParam>; Body: z.infer<typeof UpdateGroupBody> }>(
    '/groups/:id',
    async (request, reply) => {
      const { id } = GroupIdParam.parse(request.params)
      const body = UpdateGroupBody.parse(request.body)
      const userId = request.user.sub

      const group = await fastify.prisma.group.findUnique({ where: { id } })
      if (!group) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Group not found', statusCode: 404 })
      }
      if (group.ownerId !== userId) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only owner can edit group', statusCode: 403 })
      }

      let newCoverKey = body.coverKey
      if (body.coverKey && body.coverKey !== group.coverKey) {
        const exists = await verifyObjectExists(body.coverKey)
        if (!exists) {
          return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Cover image not found in storage', statusCode: 400 })
        }

        // Move new cover
        const ext = body.coverKey.split('.').pop() ?? 'jpg'
        newCoverKey = await moveTempCover(body.coverKey, id, ext)

        // Delete old cover if exists
        if (group.coverKey) {
          await deleteObject(group.coverKey).catch(() => {/* ignore */})
        }
      }

      const updated = await fastify.prisma.group.update({
        where: { id },
        data: {
          ...(body.name !== undefined && { name: body.name }),
          ...(newCoverKey !== undefined && { coverKey: newCoverKey }),
          ...(body.lat !== undefined && { lat: body.lat }),
          ...(body.lng !== undefined && { lng: body.lng }),
          ...(body.address !== undefined && { address: body.address }),
        },
        include: {
          _count: { select: { photos: true, members: true } },
          members: {
            include: { user: { select: { id: true, name: true, avatarUrl: true } } },
          },
          owner: { select: { id: true, name: true, avatarUrl: true } },
        },
      })

      return reply.send(serializeGroup(updated))
    }
  )

  // ── DELETE /groups/:id — удалить группу (только owner) ─────
  fastify.delete<{ Params: z.infer<typeof GroupIdParam> }>(
    '/groups/:id',
    async (request, reply) => {
      const { id } = GroupIdParam.parse(request.params)
      const userId = request.user.sub

      const group = await fastify.prisma.group.findUnique({ where: { id } })
      if (!group) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Group not found', statusCode: 404 })
      }
      if (group.ownerId !== userId) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only owner can delete group', statusCode: 403 })
      }

      // Delete cover from storage if exists
      if (group.coverKey) {
        await deleteObject(group.coverKey).catch(() => {/* ignore */})
      }

      // Cascade deletes GroupMember + Photo rows (see schema onDelete: Cascade)
      await fastify.prisma.group.delete({ where: { id } })

      return reply.status(204).send()
    }
  )

  // ── GET /groups/:id/members ─────────────────────────────────
  fastify.get<{ Params: z.infer<typeof GroupIdParam> }>(
    '/groups/:id/members',
    async (request, reply) => {
      const { id } = GroupIdParam.parse(request.params)
      const userId = request.user.sub

      const membership = await fastify.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId } },
      })
      if (!membership) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not a member of this group', statusCode: 403 })
      }

      const members = await fastify.prisma.groupMember.findMany({
        where: { groupId: id },
        include: { user: { select: { id: true, name: true, avatarUrl: true, phone: true } } },
        orderBy: { joinedAt: 'asc' },
      })

      return reply.send(members)
    }
  )

  // ── POST /groups/:id/members — добавить участника ───────────
  fastify.post<{ Params: z.infer<typeof GroupIdParam>; Body: z.infer<typeof AddMemberBody> }>(
    '/groups/:id/members',
    async (request, reply) => {
      const { id } = GroupIdParam.parse(request.params)
      const { userId: targetUserId } = AddMemberBody.parse(request.body)
      const requesterId = request.user.sub

      // Only owner can add members
      const group = await fastify.prisma.group.findUnique({ where: { id } })
      if (!group) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Group not found', statusCode: 404 })
      }
      if (group.ownerId !== requesterId) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Only owner can add members', statusCode: 403 })
      }

      // Check target user exists
      const targetUser = await fastify.prisma.user.findUnique({ where: { id: targetUserId } })
      if (!targetUser) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'User not found', statusCode: 404 })
      }

      // Check not already a member
      const existing = await fastify.prisma.groupMember.findUnique({
        where: { groupId_userId: { groupId: id, userId: targetUserId } },
      })
      if (existing) {
        return reply.status(409).send({ error: 'CONFLICT', message: 'User is already a member', statusCode: 409 })
      }

      const member = await fastify.prisma.groupMember.create({
        data: { groupId: id, userId: targetUserId, role: 'MEMBER' },
        include: { user: { select: { id: true, name: true, avatarUrl: true } } },
      })

      return reply.status(201).send(member)
    }
  )

  // ── DELETE /groups/:id/members/:userId — удалить участника ─
  fastify.delete<{ Params: z.infer<typeof MemberUserIdParam> }>(
    '/groups/:id/members/:userId',
    async (request, reply) => {
      const { id, userId: targetUserId } = MemberUserIdParam.parse(request.params)
      const requesterId = request.user.sub

      const group = await fastify.prisma.group.findUnique({ where: { id } })
      if (!group) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Group not found', statusCode: 404 })
      }

      // Owner can remove anyone; members can remove themselves
      const isOwner = group.ownerId === requesterId
      const isSelf = targetUserId === requesterId
      if (!isOwner && !isSelf) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not allowed to remove this member', statusCode: 403 })
      }

      // Owner cannot leave their own group
      if (targetUserId === group.ownerId) {
        return reply.status(400).send({ error: 'BAD_REQUEST', message: 'Owner cannot leave the group. Transfer ownership or delete the group.', statusCode: 400 })
      }

      await fastify.prisma.groupMember.delete({
        where: { groupId_userId: { groupId: id, userId: targetUserId } },
      })

      return reply.status(204).send()
    }
  )
}

export default groupsRoutes
