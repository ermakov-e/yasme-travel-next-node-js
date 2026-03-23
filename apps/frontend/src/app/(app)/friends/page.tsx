'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search } from 'lucide-react'
import { motion } from 'framer-motion'
import { Avatar } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { PageTransition } from '@/components/layout/PageTransition'
import { api } from '@/lib/api-client'

interface FriendUser {
  id: string
  name: string
  avatarUrl: string | null
  phone: string | null
  createdAt: string
}

export default function FriendsPage() {
  const [search, setSearch] = useState('')

  const { data, isLoading } = useQuery<{ data: FriendUser[]; total: number }>({
    queryKey: ['friends', search],
    queryFn: () =>
      api.get(`/friends?limit=50${search ? `&search=${encodeURIComponent(search)}` : ''}`),
    staleTime: 60 * 1000,
  })

  const friends = data?.data ?? []

  return (
    <PageTransition>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold">Пользователи</h1>
          {data && (
            <span className="text-sm text-muted-foreground">{data.total}</span>
          )}
        </div>

        {/* Search bar */}
        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Поиск по имени..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 rounded-xl bg-white border border-input text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="px-4 py-2">
        {isLoading ? (
          <div className="flex flex-col gap-1">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex flex-col gap-1.5 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
            ))}
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="text-lg mb-1">😕</p>
            <p className="font-medium">{search ? 'Никого не нашли' : 'Пока никого нет'}</p>
            {!search && (
              <p className="text-sm mt-1">Другие пользователи появятся здесь после регистрации</p>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-1">
            {friends.map((user, i) => (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.2, delay: i * 0.03 }}
                className="flex items-center gap-3 p-3 rounded-2xl hover:bg-white transition-colors"
              >
                <Avatar src={user.avatarUrl} name={user.name} size="lg" />
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-sm truncate">{user.name}</span>
                  {user.phone && (
                    <span className="text-xs text-muted-foreground">{user.phone}</span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  )
}
