'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import Image from 'next/image'
import Link from 'next/link'
import { MapPin, ArrowRight } from 'lucide-react'
import { useGroups, type Group } from '@/hooks/useGroups'

// Map must be loaded client-side only (no SSR)
const YandexMap = dynamic(
  () => import('@/components/map/YandexMap').then((m) => m.YandexMap),
  { ssr: false }
)

export default function MapPage() {
  const { data } = useGroups(1, 100)
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null)

  const groups = data?.data ?? []

  function handleGroupClick(groupId: string) {
    const group = groups.find((g) => g.id === groupId) ?? null
    setSelectedGroup(group)
  }

  return (
    <div className="fixed inset-0 pb-16">
      {/* Header overlay */}
      <div className="absolute top-0 left-0 right-0 z-10 px-4 pt-4 pointer-events-none">
        <div className="glass rounded-2xl px-4 py-2 inline-flex items-center gap-2 pointer-events-auto">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">
            {groups.length > 0 ? `${groups.length} поездок на карте` : 'Карта поездок'}
          </span>
        </div>
      </div>

      {/* Map fills the screen */}
      <YandexMap
        groups={groups}
        onGroupClick={handleGroupClick}
      />

      {/* Group preview bottom sheet */}
      {selectedGroup && (
        <div className="absolute bottom-20 left-4 right-4 z-20">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="flex items-stretch gap-3 p-3">
              {/* Cover thumb */}
              <div className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 bg-gradient-to-br from-orange-200 to-pink-200">
                {selectedGroup.coverUrl && (
                  <Image
                    src={selectedGroup.coverUrl}
                    alt={selectedGroup.name}
                    fill
                    sizes="80px"
                    className="object-cover"
                  />
                )}
              </div>

              {/* Info */}
              <div className="flex flex-col justify-between flex-1 min-w-0">
                <div>
                  <h3 className="font-bold text-sm uppercase tracking-wide line-clamp-1">
                    {selectedGroup.name}
                  </h3>
                  {selectedGroup.address && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-muted-foreground truncate">
                        {selectedGroup.address}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  {selectedGroup._count.photos} фото · {selectedGroup._count.members} участников
                </p>
              </div>

              {/* Open button */}
              <Link
                href={`/groups/${selectedGroup.id}`}
                className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary text-white self-center flex-shrink-0"
              >
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Dismiss overlay tap */}
      {selectedGroup && (
        <div
          className="absolute inset-0 z-10"
          style={{ pointerEvents: 'none' }}
          onClick={() => setSelectedGroup(null)}
        />
      )}
    </div>
  )
}
