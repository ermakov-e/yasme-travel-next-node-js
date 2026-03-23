import { z } from 'zod'
import type { FastifyPluginAsync } from 'fastify'
import {
  generatePresignedPutUrl,
  generateStorageKey,
  getMimeExtension,
  ALLOWED_IMAGE_TYPES,
  MAX_AVATAR_SIZE,
} from '../../services/storage.service.js'

// ── Schemas ────────────────────────────────────────────────────

const CoverPresignBody = z.object({
  contentType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  fileSize: z.number().int().min(1).max(MAX_AVATAR_SIZE),
})

const AvatarPresignBody = z.object({
  contentType: z.enum(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']),
  fileSize: z.number().int().min(1).max(MAX_AVATAR_SIZE),
})

// ── Routes ───────────────────────────────────────────────────

const storageRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', fastify.requireAuth)

  // ── POST /storage/cover-presign ─────────────────────────────
  // Generates a presigned URL for uploading a group cover image to temp/
  // Frontend uploads directly to S3, then sends the storageKey in POST /groups
  fastify.post<{ Body: z.infer<typeof CoverPresignBody> }>(
    '/storage/cover-presign',
    async (request, reply) => {
      const body = CoverPresignBody.parse(request.body)

      if (!ALLOWED_IMAGE_TYPES.includes(body.contentType)) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: `Unsupported content type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
          statusCode: 400,
        })
      }

      const ext = getMimeExtension(body.contentType)
      // Store in temp/ — will be moved to groups/{id}/ on group creation
      const storageKey = generateStorageKey('temp', ext)

      const presignedUrl = await generatePresignedPutUrl(storageKey, body.contentType)

      return reply.send({ presignedUrl, storageKey })
    }
  )

  // ── POST /storage/avatar-presign ────────────────────────────
  // Generates a presigned URL for uploading a user avatar
  fastify.post<{ Body: z.infer<typeof AvatarPresignBody> }>(
    '/storage/avatar-presign',
    async (request, reply) => {
      const body = AvatarPresignBody.parse(request.body)
      const userId = request.user.sub

      if (!ALLOWED_IMAGE_TYPES.includes(body.contentType)) {
        return reply.status(400).send({
          error: 'BAD_REQUEST',
          message: `Unsupported content type. Allowed: ${ALLOWED_IMAGE_TYPES.join(', ')}`,
          statusCode: 400,
        })
      }

      const ext = getMimeExtension(body.contentType)
      const storageKey = generateStorageKey(`avatars/${userId}`, ext)

      const presignedUrl = await generatePresignedPutUrl(storageKey, body.contentType)

      return reply.send({ presignedUrl, storageKey })
    }
  )
}

export default storageRoutes
