import {
  S3Client,
  PutObjectCommand,
  HeadObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { env } from '../config/env.js'

export const s3Client = new S3Client({
  endpoint: env.YOS_ENDPOINT,
  region: env.YOS_REGION,
  credentials: {
    accessKeyId: env.YOS_ACCESS_KEY_ID,
    secretAccessKey: env.YOS_SECRET_ACCESS_KEY,
  },
  forcePathStyle: false,
})

export function getPublicUrl(storageKey: string): string {
  return `${env.YOS_ENDPOINT}/${env.YOS_BUCKET_NAME}/${storageKey}`
}

export async function generatePresignedPutUrl(
  storageKey: string,
  contentType: string,
  expiresInSeconds = 300
): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: env.YOS_BUCKET_NAME,
    Key: storageKey,
    ContentType: contentType,
  })

  return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds })
}

export async function verifyObjectExists(storageKey: string): Promise<boolean> {
  try {
    await s3Client.send(
      new HeadObjectCommand({ Bucket: env.YOS_BUCKET_NAME, Key: storageKey })
    )
    return true
  } catch (error: unknown) {
    if ((error as { name?: string }).name === 'NotFound') return false
    throw error
  }
}

export async function moveTempCover(
  tempKey: string,
  groupId: string,
  extension: string
): Promise<string> {
  const finalKey = `groups/${groupId}/cover.${extension}`

  await s3Client.send(
    new CopyObjectCommand({
      Bucket: env.YOS_BUCKET_NAME,
      CopySource: `${env.YOS_BUCKET_NAME}/${tempKey}`,
      Key: finalKey,
    })
  )

  await s3Client.send(
    new DeleteObjectCommand({ Bucket: env.YOS_BUCKET_NAME, Key: tempKey })
  )

  return finalKey
}

export async function deleteObject(storageKey: string): Promise<void> {
  await s3Client.send(
    new DeleteObjectCommand({ Bucket: env.YOS_BUCKET_NAME, Key: storageKey })
  )
}

export function generateStorageKey(prefix: string, ext: string): string {
  return `${prefix}/${crypto.randomUUID()}.${ext}`
}

export function getExtension(filename: string): string {
  return filename.split('.').pop()?.toLowerCase() ?? 'jpg'
}

export function getMimeExtension(contentType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  }
  return map[contentType] ?? 'jpg'
}

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
export const MAX_PHOTO_SIZE = 10 * 1024 * 1024 // 10MB
export const MAX_AVATAR_SIZE = 5 * 1024 * 1024  // 5MB
