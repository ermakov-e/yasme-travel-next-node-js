import fp from 'fastify-plugin'
import jwt from 'jsonwebtoken'
import type { FastifyPluginAsync, FastifyRequest, FastifyReply, preHandlerHookHandler } from 'fastify'
import { env } from '../config/env.js'

export interface JwtPayload {
  sub: string
  yandexId: string
  name: string
  avatarUrl: string | null
  iat: number
  exp: number
}

declare module 'fastify' {
  interface FastifyRequest {
    user: JwtPayload
  }
  interface FastifyInstance {
    requireAuth: preHandlerHookHandler
  }
}

const authPlugin: FastifyPluginAsync = fp(async (fastify) => {
  const requireAuth: preHandlerHookHandler = async (
    request: FastifyRequest,
    reply: FastifyReply
  ) => {
    const token = request.cookies?.token

    if (!token) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
        statusCode: 401,
      })
    }

    try {
      const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload
      request.user = payload
    } catch {
      reply.clearCookie('token')
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: 'Invalid or expired token',
        statusCode: 401,
      })
    }
  }

  fastify.decorate('requireAuth', requireAuth)
})

export default authPlugin
