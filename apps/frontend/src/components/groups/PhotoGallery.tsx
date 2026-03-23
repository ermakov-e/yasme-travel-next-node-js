'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Trash2, Camera } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import { usePresignedUpload } from '@/hooks/usePresignedUpload'
import { useAuthStore } from '@/store/auth.store'

interface Photo {
  id: string
  storageKey: string
  url: string
  caption: string | null
  createdAt: string
  uploader: { id: string; name: string; avatarUrl: string | null }
}

interface PaginatedPhotos {
  data: Photo[]
  total: number
  page: number
  limit: number
}

interface PhotoGalleryProps {
  groupId: string
  isOwner: boolean
}

export function PhotoGallery({ groupId, isOwner }: PhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { user } = useAuthStore()
  const { isUploading, progress, uploadPhoto } = usePresignedUpload()

  const { data, isLoading } = useQuery<PaginatedPhotos>({
    queryKey: ['photos', groupId],
    queryFn: () => api.get(`/groups/${groupId}/photos?limit=50`),
    staleTime: 30 * 1000,
  })

  const { mutateAsync: confirmUpload } = useMutation({
    mutationFn: ({ storageKey }: { storageKey: string }) =>
      api.post(`/groups/${groupId}/photos/confirm`, { storageKey }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] })
    },
  })

  const { mutate: deletePhoto } = useMutation({
    mutationFn: (photoId: string) =>
      api.delete(`/groups/${groupId}/photos/${photoId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['photos', groupId] })
      setLightboxIndex(null)
    },
  })

  const photos = data?.data ?? []

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    if (files.length === 0) return

    for (const file of files) {
      const storageKey = await uploadPhoto(groupId, file)
      if (storageKey) {
        await confirmUpload({ storageKey })
      }
    }

    // Reset input
    e.target.value = ''
  }

  function openLightbox(index: number) {
    setLightboxIndex(index)
  }

  function closeLightbox() {
    setLightboxIndex(null)
  }

  function prevPhoto() {
    setLightboxIndex((i) => (i !== null ? Math.max(0, i - 1) : null))
  }

  function nextPhoto() {
    setLightboxIndex((i) => (i !== null ? Math.min(photos.length - 1, i + 1) : null))
  }

  if (isLoading) {
    return (
      <div className="masonry-grid px-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton
            key={i}
            className="w-full rounded-xl mb-1"
            style={{ aspectRatio: i % 3 === 0 ? '3/4' : '4/3' }}
          />
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Upload button */}
      <div className="px-4 mb-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl border-2 border-dashed border-primary/30 text-primary font-medium text-sm hover:border-primary/60 transition-colors disabled:opacity-50"
        >
          {isUploading ? (
            <>
              <div className="w-24 h-1.5 bg-primary/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-xs">{progress}%</span>
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Добавить фото
            </>
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />
      </div>

      {/* Empty state */}
      {photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center px-8">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
            <Camera className="w-8 h-8 text-primary/50" />
          </div>
          <p className="font-semibold text-gray-700 mb-1">Фотографий пока нет</p>
          <p className="text-sm text-muted-foreground">
            Станьте первым — добавьте воспоминания из поездки
          </p>
        </div>
      )}

      {/* Masonry grid */}
      {photos.length > 0 && (
        <div className="masonry-grid px-1">
          {photos.map((photo, index) => (
            <motion.button
              key={photo.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: index * 0.03 }}
              className="w-full rounded-xl overflow-hidden block"
              onClick={() => openLightbox(index)}
              whileTap={{ scale: 0.97 }}
            >
              <div className="relative w-full" style={{ paddingBottom: '75%' }}>
                <Image
                  src={photo.url}
                  alt={photo.caption ?? 'Photo'}
                  fill
                  sizes="(max-width: 768px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            </motion.button>
          ))}
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxIndex !== null && photos[lightboxIndex] && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black flex items-center justify-center"
            onClick={closeLightbox}
          >
            {/* Photo */}
            <motion.div
              key={lightboxIndex}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="relative w-full h-full max-w-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={photos[lightboxIndex].url}
                alt={photos[lightboxIndex].caption ?? 'Photo'}
                fill
                sizes="100vw"
                className="object-contain"
              />
            </motion.div>

            {/* Controls */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
              {/* Delete button — uploader or group owner */}
              {(photos[lightboxIndex].uploader.id === user?.id || isOwner) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    deletePhoto(photos[lightboxIndex].id)
                  }}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white hover:bg-red-500/80 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              <button
                onClick={closeLightbox}
                className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prev / Next */}
            {lightboxIndex > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); prevPhoto() }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {lightboxIndex < photos.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); nextPhoto() }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center text-white"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Counter */}
            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 text-white text-sm">
              {lightboxIndex + 1} / {photos.length}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
