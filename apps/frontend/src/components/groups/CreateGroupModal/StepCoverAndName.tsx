'use client'

import { useRef, useState } from 'react'
import Image from 'next/image'
import { Camera, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { usePresignedUpload } from '@/hooks/usePresignedUpload'

interface StepCoverAndNameProps {
  name: string
  coverKey: string | null
  coverPreview: string | null
  onNameChange: (name: string) => void
  onCoverChange: (key: string, preview: string) => void
  onCoverClear: () => void
  onNext: () => void
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024

export function StepCoverAndName({
  name,
  coverPreview,
  onNameChange,
  onCoverChange,
  onCoverClear,
  onNext,
}: StepCoverAndNameProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const { isUploading, progress, uploadCover } = usePresignedUpload()

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setFileError(null)

    if (!ALLOWED_TYPES.includes(file.type)) {
      setFileError('Формат не поддерживается. Используйте JPEG, PNG или WebP')
      return
    }
    if (file.size > MAX_SIZE) {
      setFileError('Файл слишком большой. Максимум 5 МБ')
      return
    }

    const preview = URL.createObjectURL(file)
    const key = await uploadCover(file)

    if (key) {
      onCoverChange(key, preview)
    } else {
      setFileError('Ошибка загрузки. Попробуйте ещё раз')
      URL.revokeObjectURL(preview)
    }
  }

  const canProceed = name.trim().length >= 2

  return (
    <div className="flex flex-col gap-5">
      {/* Cover picker */}
      <div>
        <label className="text-sm font-medium text-foreground block mb-2">
          Обложка группы
        </label>

        <div
          className="relative rounded-2xl overflow-hidden aspect-video bg-gradient-to-br from-orange-100 to-pink-100 cursor-pointer"
          onClick={() => !isUploading && fileRef.current?.click()}
        >
          {coverPreview ? (
            <>
              <Image src={coverPreview} alt="Cover" fill className="object-cover" />
              <div className="absolute inset-0 bg-black/20" />

              {/* Clear button */}
              <button
                type="button"
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/50 flex items-center justify-center"
                onClick={(e) => {
                  e.stopPropagation()
                  onCoverClear()
                }}
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-orange-400">
              <Camera className="w-8 h-8" />
              <span className="text-sm font-medium">Добавить обложку</span>
              <span className="text-xs text-muted-foreground">JPEG, PNG, WebP до 5 МБ</span>
            </div>
          )}

          {/* Upload progress overlay */}
          {isUploading && (
            <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center">
              <div className="w-24 h-1.5 bg-white/30 rounded-full overflow-hidden">
                <div
                  className="h-full bg-white rounded-full transition-all"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-white text-xs mt-2">{progress}%</span>
            </div>
          )}
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ALLOWED_TYPES.join(',')}
          className="hidden"
          onChange={handleFileChange}
        />

        {fileError && <p className="text-xs text-destructive mt-1">{fileError}</p>}
      </div>

      {/* Name input */}
      <Input
        label="Название поездки"
        placeholder="Алтай, Август 2024"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        maxLength={100}
      />

      <Button
        onClick={onNext}
        disabled={!canProceed || isUploading}
        className="w-full"
        size="lg"
      >
        Далее — выбрать место
      </Button>
    </div>
  )
}
