'use client'

import { use } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { ArrowLeft, MapPin, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { useGroup } from '@/hooks/useGroups'
import { PhotoGallery } from '@/components/groups/PhotoGallery'
import { AvatarGroup } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { useAuthStore } from '@/store/auth.store'
import { pluralize } from '@/lib/utils'

interface GroupPageProps {
  params: Promise<{ id: string }>
}

export default function GroupPage({ params }: GroupPageProps) {
  const { id } = use(params)
  const { user } = useAuthStore()
  const { data: group, isLoading, isError } = useGroup(id)

  if (isError) notFound()

  const isOwner = group?.ownerId === user?.id

  return (
    <div className="min-h-screen bg-surface">
      {/* Hero / Cover */}
      <div className="relative h-72 bg-gradient-to-br from-orange-300 to-pink-400">
        {isLoading ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : group?.coverUrl ? (
          <Image
            src={group.coverUrl}
            alt={group.name}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-pink-500" />
        )}

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Back button */}
        <Link
          href="/groups"
          className="absolute top-4 left-4 w-10 h-10 rounded-full bg-black/30 backdrop-blur-sm flex items-center justify-center text-white"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>

        {/* Group info overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              <Skeleton className="h-7 w-48 bg-white/20" />
              <Skeleton className="h-4 w-32 bg-white/20" />
            </div>
          ) : group ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {group.address && (
                <div className="flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-white/70" />
                  <span className="text-white/70 text-xs">{group.address}</span>
                </div>
              )}
              <h1 className="text-2xl font-extrabold text-white uppercase tracking-wide leading-tight mb-2">
                {group.name}
              </h1>

              <div className="flex items-center gap-3">
                <AvatarGroup
                  users={group.members.map((m) => m.user)}
                  max={4}
                  size="xs"
                />
                <div className="flex items-center gap-1 text-white/80">
                  <Users className="w-3.5 h-3.5" />
                  <span className="text-xs">
                    {pluralize(group._count.members, 'участник', 'участника', 'участников')}
                  </span>
                </div>
              </div>
            </motion.div>
          ) : null}
        </div>
      </div>

      {/* Photo gallery */}
      <div className="pt-4">
        {group ? (
          <PhotoGallery groupId={id} isOwner={isOwner} />
        ) : (
          <div className="px-4 masonry-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="w-full rounded-xl h-40 mb-1" />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
