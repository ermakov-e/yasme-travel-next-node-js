import { buildServer } from './server.js'
import { env } from './config/env.js'

async function main() {
  const fastify = await buildServer()

  try {
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' })
    console.log(`🚀 Backend running at http://localhost:${env.PORT}`)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}

main()
