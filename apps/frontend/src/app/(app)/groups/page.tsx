'use client'

import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { GroupCard, GroupCardSkeleton } from '@/components/groups/GroupCard'
import { PageTransition } from '@/components/layout/PageTransition'
import { useGroups } from '@/hooks/useGroups'
import { useUIStore } from '@/store/ui.store'

export default function GroupsPage() {
  const { data, isLoading } = useGroups()
  const { openCreateGroup } = useUIStore()

  const groups = data?.data ?? []

  return (
    <PageTransition>
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface/90 backdrop-blur-sm border-b border-border/50">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-bold">Мои поездки</h1>
          {data && (
            <span className="text-sm text-muted-foreground">{data.total}</span>
          )}
        </div>
      </div>

      {/* Groups grid */}
      <div className="px-4 py-4">
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <GroupCardSkeleton key={i} />
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState onCreateGroup={openCreateGroup} />
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {groups.map((group, i) => (
              <GroupCard key={group.id} group={group} index={i} />
            ))}
          </div>
        )}
      </div>

      {/* FAB — create group */}
      <motion.button
        className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-accent text-white shadow-lg flex items-center justify-center z-40"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openCreateGroup}
      >
        <Plus className="w-6 h-6" strokeWidth={2.5} />
      </motion.button>
    </PageTransition>
  )
}

function EmptyState({ onCreateGroup }: { onCreateGroup: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <motion.div
        className="w-24 h-24 rounded-3xl bg-gradient-to-br from-primary/15 to-accent/15 flex items-center justify-center mb-6"
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <span className="text-5xl">✈️</span>
      </motion.div>
      <h2 className="text-xl font-bold mb-2">Ещё нет поездок</h2>
      <p className="text-muted-foreground text-sm mb-8 max-w-xs">
        Создайте свою первую поездку и пригласите друзей делиться фотографиями
      </p>
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={onCreateGroup}
        className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-primary to-accent text-white font-semibold shadow-md"
      >
        <Plus className="w-5 h-5" />
        Создать первую поездку
      </motion.button>
    </div>
  )
}
