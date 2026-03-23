import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import {
  generatePresignedPutUrl,
  verifyObjectExists,
  deleteObject,
  getPublicUrl,
  generateStorageKey,
  getMimeExtension,
  ALLOWED_IMAGE_TYPES,
  MAX_PHOTO_SIZE,
} from '../../services/storage.service.js'

// ── Schemas ────────────────────────────────────────────────────

const GroupPhotoParams = z.object({
  groupId: z.string().uuid(),
})

const PhotoParams = z.object({
  groupId: z.string().uuid(),
  photoId: z.string().uuid(),
})

const PresignBody = z.object({
  filename: z.string().min(1).max(255),
  contentType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  fileSize: z.number().int().min(1).max(MAX_PHOTO_SIZE),
})

const ConfirmBody = z.object({
  storageKey: z.string().min(1),
  caption: z.string().max(500).optional(),
  takenAt: z.string().datetime().optional(),
})

const PaginationQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

// ── Helper ────────────────────────────────────────────────────

async function assertMembership(
  fastify: any,
  groupId: string,
  userId: string
): Promise<void> {
  const member = await fastify.prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId, userId } },
  })
  if (!member) {
    throw fastify.httpErrors.forbidden('Not a member of this group')
  }
}

// ── Routes ───────────────────────────────────────────────────

const photosRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.requireAuth)

  // ── GET /groups/:groupId/photos — список фото (paginated) ──
  fastify.get<{
    Params: z.infer<typeof GroupPhotoParams>
    Querystring: z.infer<typeof PaginationQuery>
  }>('/groups/:groupId/photos', async (request, reply) => {
    const { groupId } = GroupPhotoParams.parse(request.params)
    const { page, limit } = PaginationQuery.parse(request.query)
    const userId = request.user.sub

    await assertMembership(fastify, groupId, userId)

    const skip = (page - 1) * limit

    const [photos, total] = await Promise.all([
      fastify.prisma.photo.findMany({
        where: { groupId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          uploader: { select: { id: true, name: true, avatarUrl: true } },
        },
      }),
      fastify.prisma.photo.count({ where: { groupId } }),
    ])

    const enriched = photos.map((p: any) => ({
      ...p,
      url: getPublicUrl(p.storageKey),
    }))

    return reply.send({ data: enriched, total, page, limit })
  })

  // ── POST /groups/:groupId/photos/presign ────────────────────
  fastify.post<{
    Params: z.infer<typeof GroupPhotoParams>
    Body: z.infer<typeof PresignBody>
  }>('/groups/:groupId/photos/presign', async (request, reply) => {
    const { groupId } = GroupPhotoParams.parse(request.params)
    const body = PresignBody.parse(request.body)
    const userId = request.user.sub

    await assertMembership(fastify, groupId, userId)

    if (!ALLOWED_IMAGE_TYPES.includes(body.contentType)) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: `Unsupported content type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
        statusCode: 400,
      })
    }

    const ext = getMimeExtension(body.contentType)
    const storageKey = generateStorageKey(`groups/${groupId}/photos`, ext)

    const presignedUrl = await generatePresignedPutUrl(storageKey, body.contentType)

    return reply.status(200).send({ presignedUrl, storageKey })
  })

  // ── POST /groups/:groupId/photos/confirm ───────────────────
  fastify.post<{
    Params: z.infer<typeof GroupPhotoParams>
    Body: z.infer<typeof ConfirmBody>
  }>('/groups/:groupId/photos/confirm', async (request, reply) => {
    const { groupId } = GroupPhotoParams.parse(request.params)
    const body = ConfirmBody.parse(request.body)
    const userId = request.user.sub

    await assertMembership(fastify, groupId, userId)

    // Verify object actually exists in S3
    const exists = await verifyObjectExists(body.storageKey)
    if (!exists) {
      return reply.status(400).send({
        error: 'BAD_REQUEST',
        message: 'Photo not found in storage. Upload may have failed.',
        statusCode: 400,
      })
    }

    // Ensure storageKey belongs to this group (security check)
    const expectedPrefix = `groups/${groupId}/photos/`
    if (!body.storageKey.startsWith(expectedPrefix)) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: 'Storage key does not belong to this group',
        statusCode: 403,
      })
    }

    const photo = await fastify.prisma.photo.create({
      data: {
        groupId,
        uploaderId: userId,
        storageKey: body.storageKey,
        caption: body.caption,
        takenAt: body.takenAt ? new Date(body.takenAt) : null,
      },
      include: {
        uploader: { select: { id: true, name: true, avatarUrl: true } },
      },
    })

    return reply.status(201).send({
      ...photo,
      url: getPublicUrl(photo.storageKey),
    })
  })

  // ── DELETE /groups/:groupId/photos/:photoId ─────────────────
  fastify.delete<{ Params: z.infer<typeof PhotoParams> }>(
    '/groups/:groupId/photos/:photoId',
    async (request, reply) => {
      const { groupId, photoId } = PhotoParams.parse(request.params)
      const userId = request.user.sub

      const photo = await fastify.prisma.photo.findUnique({
        where: { id: photoId },
        include: { group: { select: { ownerId: true } } },
      })

      if (!photo || photo.groupId !== groupId) {
        return reply.status(404).send({ error: 'NOT_FOUND', message: 'Photo not found', statusCode: 404 })
      }

      // Only uploader or group owner can delete
      const isUploader = photo.uploaderId === userId
      const isGroupOwner = photo.group.ownerId === userId
      if (!isUploader && !isGroupOwner) {
        return reply.status(403).send({ error: 'FORBIDDEN', message: 'Not allowed to delete this photo', statusCode: 403 })
      }

      // Delete from S3
      await deleteObject(photo.storageKey).catch(() => {/* ignore if already gone */})

      await fastify.prisma.photo.delete({ where: { id: photoId } })

      return reply.status(204).send()
    }
  )
}

export default photosRoutes
