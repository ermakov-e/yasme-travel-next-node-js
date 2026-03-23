'use client'

import { motion } from 'framer-motion'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, Camera } from 'lucide-react'
import { AvatarGroup } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate, pluralize } from '@/lib/utils'
import type { Group } from '@/hooks/useGroups'

interface GroupCardProps {
  group: Group
  index?: number
}

export function GroupCard({ group, index = 0 }: GroupCardProps) {
  const isNew = (() => {
    const dayMs = 24 * 60 * 60 * 1000
    return Date.now() - new Date(group.updatedAt).getTime() < 2 * dayMs
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05, ease: 'easeOut' }}
      whileTap={{ scale: 0.97 }}
    >
      <Link href={`/groups/${group.id}`} className="block">
        <div className="relative overflow-hidden rounded-2xl shadow-md bg-gray-100 aspect-[4/3]">
          {/* Cover image */}
          {group.coverUrl ? (
            <Image
              src={group.coverUrl}
              alt={group.name}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority={index < 2}
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-orange-300 to-pink-400" />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 card-gradient" />

          {/* Top badges */}
          {isNew && (
            <div className="absolute top-3 right-3">
              <Badge variant="new">🔥 новое</Badge>
            </div>
          )}

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            {/* Location */}
            {group.address && (
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-white/70 flex-shrink-0" />
                <span className="text-white/70 text-xs truncate">{group.address}</span>
              </div>
            )}

            {/* Group name */}
            <h3 className="text-white font-bold text-lg uppercase tracking-wide leading-tight mb-2 line-clamp-2">
              {group.name}
            </h3>

            {/* Meta row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {group.members.length > 0 && (
                  <AvatarGroup
                    users={group.members.map((m) => m.user)}
                    max={3}
                    size="xs"
                  />
                )}
                <span className="text-white/70 text-xs">
                  {pluralize(group._count.members, 'участник', 'участника', 'участников')}
                </span>
              </div>

              <div className="flex items-center gap-1 text-white/70">
                <Camera className="w-3.5 h-3.5" />
                <span className="text-xs">{group._count.photos}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card footer */}
        <div className="px-1 pt-2 pb-1">
          <p className="text-xs text-muted-foreground">
            {formatRelativeDate(group.updatedAt)}
          </p>
        </div>
      </Link>
    </motion.div>
  )
}

export function GroupCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="rounded-2xl overflow-hidden aspect-[4/3] skeleton-shimmer" />
      <div className="px-1 pt-2 pb-1">
        <div className="h-3 w-20 bg-gray-200 rounded" />
      </div>
    </div>
  )
}
