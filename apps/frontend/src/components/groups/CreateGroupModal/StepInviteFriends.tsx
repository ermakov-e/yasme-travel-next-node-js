'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Check } from 'lucide-react'
import { Avatar } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'

interface FriendUser {
  id: string
  name: string
  avatarUrl: string | null
  phone: string | null
}

interface StepInviteFriendsProps {
  selectedIds: string[]
  onToggle: (userId: string) => void
  onSubmit: () => void
  onBack: () => void
  isLoading: boolean
}

export function StepInviteFriends({
  selectedIds,
  onToggle,
  onSubmit,
  onBack,
  isLoading,
}: StepInviteFriendsProps) {
  const [search, setSearch] = useState('')

  const { data, isLoading: loadingFriends } = useQuery<{ data: FriendUser[] }>({
    queryKey: ['friends', search],
    queryFn: () =>
      api.get(`/friends?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    staleTime: 60 * 1000,
  })

  const friends = data?.data ?? []

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-medium text-foreground mb-1">
          Пригласить в поездку
        </p>
        <p className="text-xs text-muted-foreground mb-3">
          {selectedIds.length > 0
            ? `Выбрано: ${selectedIds.length}`
            : 'Можно пропустить и добавить позже'}
        </p>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Поиск по имени..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-3 rounded-xl border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Friends list */}
      <div className="max-h-52 overflow-y-auto flex flex-col gap-1 -mx-2 px-2">
        {loadingFriends ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 p-2">
              <Skeleton className="w-10 h-10 rounded-full" />
              <div className="flex flex-col gap-1 flex-1">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
            </div>
          ))
        ) : friends.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {search ? 'Никого не нашли' : 'Нет других пользователей'}
          </p>
        ) : (
          friends.map((user) => {
            const isSelected = selectedIds.includes(user.id)

            return (
              <button
                key={user.id}
                type="button"
                onClick={() => onToggle(user.id)}
                className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                  isSelected ? 'bg-primary/5' : 'hover:bg-muted'
                }`}
              >
                <Avatar src={user.avatarUrl} name={user.name} size="md" />
                <div className="flex flex-col items-start flex-1 min-w-0">
                  <span className="text-sm font-medium truncate">{user.name}</span>
                  {user.phone && (
                    <span className="text-xs text-muted-foreground">{user.phone}</span>
                  )}
                </div>
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                    isSelected
                      ? 'bg-primary border-primary'
                      : 'border-gray-300'
                  }`}
                >
                  {isSelected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </div>
              </button>
            )
          })
        )}
      </div>

      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1" disabled={isLoading}>
          Назад
        </Button>
        <Button onClick={onSubmit} className="flex-[2]" size="lg" disabled={isLoading}>
          {isLoading ? 'Создаём...' : 'Создать поездку 🎉'}
        </Button>
      </div>
    </div>
  )
}
