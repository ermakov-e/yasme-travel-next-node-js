import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),

  // Database
  DATABASE_URL: z.string().min(1),

  // JWT
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),

  // Yandex OAuth
  YANDEX_CLIENT_ID: z.string().min(1),
  YANDEX_CLIENT_SECRET: z.string().min(1),
  YANDEX_REDIRECT_URI: z.string().url(),

  // Yandex Object Storage
  YOS_ACCESS_KEY_ID: z.string().min(1),
  YOS_SECRET_ACCESS_KEY: z.string().min(1),
  YOS_BUCKET_NAME: z.string().min(1),
  YOS_REGION: z.string().default('ru-central1'),
  YOS_ENDPOINT: z.string().url().default('https://storage.yandexcloud.net'),

  // CORS
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
