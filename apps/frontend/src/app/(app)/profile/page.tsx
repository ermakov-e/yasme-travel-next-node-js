'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Camera, LogOut, Check, X } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PageTransition } from '@/components/layout/PageTransition'
import { useAuthStore } from '@/store/auth.store'
import { usePresignedUpload } from '@/hooks/usePresignedUpload'
import { api } from '@/lib/api-client'

export default function ProfilePage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user, setUser, logout } = useAuthStore()
  const avatarInputRef = useRef<HTMLInputElement>(null)

  const [isEditingName, setIsEditingName] = useState(false)
  const [nameInput, setNameInput] = useState(user?.name ?? '')

  const { isUploading, progress, uploadAvatar } = usePresignedUpload()

  const { mutateAsync: updateProfile, isPending } = useMutation({
    mutationFn: (data: { name?: string; avatarKey?: string | null }) =>
      api.patch<typeof user>('/users/me', data),
    onSuccess: (updated) => {
      if (updated) {
        setUser(updated as any)
        queryClient.setQueryData(['user', 'me'], updated)
      }
    },
  })

  const { mutateAsync: logoutMutation, isPending: loggingOut } = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
      logout()
      queryClient.clear()
      router.push('/login')
    },
  })

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const avatarKey = await uploadAvatar(file)
    if (avatarKey) {
      await updateProfile({ avatarKey })
    }
    e.target.value = ''
  }

  async function handleNameSave() {
    if (!nameInput.trim() || nameInput === user?.name) {
      setIsEditingName(false)
      return
    }
    await updateProfile({ name: nameInput.trim() })
    setIsEditingName(false)
  }

  if (!user) return null

  return (
    <PageTransition>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold">Профиль</h1>
        </div>
      </div>

      <div className="px-4 py-6 flex flex-col gap-6">
        {/* Avatar section */}
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Avatar src={user.avatarUrl} name={user.name} size="xl" />

            {/* Upload progress ring */}
            {isUploading && (
              <div className="absolute inset-0 rounded-full border-4 border-primary/30">
                <div
                  className="absolute inset-0 rounded-full border-4 border-primary"
                  style={{
                    clipPath: `polygon(50% 50%, 50% 0%, ${50 + 50 * Math.sin((progress / 100) * 2 * Math.PI)}% ${50 - 50 * Math.cos((progress / 100) * 2 * Math.PI)}%, 50% 50%)`,
                  }}
                />
              </div>
            )}

            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => avatarInputRef.current?.click()}
              className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center shadow-lg"
            >
              <Camera className="w-4 h-4" />
            </motion.button>
          </div>

          <input
            ref={avatarInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        {/* Profile info */}
        <div className="bg-white rounded-2xl p-4 flex flex-col gap-4 shadow-sm">
          {/* Name field */}
          <div>
            <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
              Имя
            </label>
            {isEditingName ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="flex-1 h-10 px-3 rounded-xl border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleNameSave()
                    if (e.key === 'Escape') {
                      setNameInput(user.name)
                      setIsEditingName(false)
                    }
                  }}
                />
                <button
                  onClick={handleNameSave}
                  disabled={isPending}
                  className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center"
                >
                  <Check className="w-4 h-4" />
                </button>
                <button
                  onClick={() => {
                    setNameInput(user.name)
                    setIsEditingName(false)
                  }}
                  className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingName(true)}
                className="w-full text-left p-2.5 rounded-xl hover:bg-muted transition-colors group flex items-center justify-between"
              >
                <span className="font-semibold">{user.name}</span>
                <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  Изменить
                </span>
              </button>
            )}
          </div>

          {/* Phone (read-only, from Yandex) */}
          {user.phone && (
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide block mb-1.5">
                Телефон
              </label>
              <p className="text-sm px-2.5 py-2 text-foreground">{user.phone}</p>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
            В приложении с
          </p>
          <p className="text-sm font-semibold">
            {new Intl.DateTimeFormat('ru-RU', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            }).format(new Date(user.createdAt))}
          </p>
        </div>

        {/* Logout */}
        <Button
          variant="outline"
          className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
          onClick={() => logoutMutation()}
          disabled={loggingOut}
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Выходим...' : 'Выйти из аккаунта'}
        </Button>
      </div>
    </PageTransition>
  )
}
