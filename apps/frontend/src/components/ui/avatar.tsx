import * as React from 'react'
import Image from 'next/image'
import { cn } from '@/lib/utils'

interface AvatarProps {
  src?: string | null
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const sizeMap = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-xl',
}

const sizePixels = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
}

function getInitials(name?: string): string {
  if (!name) return '?'
  const parts = name.trim().split(' ')
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function getAvatarColor(name?: string): string {
  const colors = [
    'bg-orange-400',
    'bg-pink-400',
    'bg-purple-400',
    'bg-blue-400',
    'bg-teal-400',
    'bg-green-400',
  ]
  if (!name) return colors[0]
  const index = name.charCodeAt(0) % colors.length
  return colors[index]
}

export function Avatar({ src, name, size = 'md', className }: AvatarProps) {
  const sizeClass = sizeMap[size]
  const px = sizePixels[size]

  if (src) {
    return (
      <div className={cn('relative rounded-full overflow-hidden flex-shrink-0', sizeClass, className)}>
        <Image
          src={src}
          alt={name ?? 'Avatar'}
          fill
          sizes={`${px}px`}
          className="object-cover"
        />
      </div>
    )
  }

  return (
    <div
      className={cn(
        'rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-white',
        sizeClass,
        getAvatarColor(name),
        className
      )}
    >
      {getInitials(name)}
    </div>
  )
}

interface AvatarGroupProps {
  users: Array<{ id: string; name: string; avatarUrl?: string | null }>
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({ users, max = 3, size = 'xs' }: AvatarGroupProps) {
  const visible = users.slice(0, max)
  const overflow = users.length - max

  return (
    <div className="flex -space-x-1.5">
      {visible.map((user) => (
        <div key={user.id} className="ring-2 ring-white rounded-full">
          <Avatar src={user.avatarUrl} name={user.name} size={size} />
        </div>
      ))}
      {overflow > 0 && (
        <div
          className={cn(
            'ring-2 ring-white rounded-full flex items-center justify-center bg-gray-300 text-gray-700 font-bold',
            sizeMap[size]
          )}
        >
          <span className="text-[9px]">+{overflow}</span>
        </div>
      )}
    </div>
  )
}
