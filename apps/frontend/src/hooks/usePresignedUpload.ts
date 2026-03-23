'use client'

import { useState, useCallback } from 'react'
import { api, uploadToS3 } from '@/lib/api-client'

interface PresignResponse {
  presignedUrl: string
  storageKey: string
}

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

export function usePresignedUpload() {
  const [state, setState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null,
  })

  const uploadCover = useCallback(async (file: File): Promise<string | null> => {
    setState({ isUploading: true, progress: 0, error: null })

    try {
      // 1. Get presigned URL from backend
      const { presignedUrl, storageKey } = await api.post<PresignResponse>(
        '/storage/cover-presign',
        { contentType: file.type, fileSize: file.size }
      )

      // 2. Upload directly to S3
      await uploadToS3(presignedUrl, file, (percent) => {
        setState((prev) => ({ ...prev, progress: percent }))
      })

      setState({ isUploading: false, progress: 100, error: null })
      return storageKey
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setState({ isUploading: false, progress: 0, error: message })
      return null
    }
  }, [])

  const uploadAvatar = useCallback(async (file: File): Promise<string | null> => {
    setState({ isUploading: true, progress: 0, error: null })

    try {
      const { presignedUrl, storageKey } = await api.post<PresignResponse>(
        '/storage/avatar-presign',
        { contentType: file.type, fileSize: file.size }
      )

      await uploadToS3(presignedUrl, file, (percent) => {
        setState((prev) => ({ ...prev, progress: percent }))
      })

      setState({ isUploading: false, progress: 100, error: null })
      return storageKey
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Upload failed'
      setState({ isUploading: false, progress: 0, error: message })
      return null
    }
  }, [])

  const uploadPhoto = useCallback(
    async (groupId: string, file: File): Promise<string | null> => {
      setState({ isUploading: true, progress: 0, error: null })

      try {
        const { presignedUrl, storageKey } = await api.post<PresignResponse>(
          `/groups/${groupId}/photos/presign`,
          { filename: file.name, contentType: file.type, fileSize: file.size }
        )

        await uploadToS3(presignedUrl, file, (percent) => {
          setState((prev) => ({ ...prev, progress: percent }))
        })

        setState({ isUploading: false, progress: 100, error: null })
        return storageKey
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Upload failed'
        setState({ isUploading: false, progress: 0, error: message })
        return null
      }
    },
    []
  )

  const reset = useCallback(() => {
    setState({ isUploading: false, progress: 0, error: null })
  }, [])

  return { ...state, uploadCover, uploadAvatar, uploadPhoto, reset }
}
