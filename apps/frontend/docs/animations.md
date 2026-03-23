# Animations — Framer Motion рецепты

Все анимации используют Framer Motion. Принципы: ощущение нативного приложения, отклик на прикосновение, плавные переходы.

---

## Page Transition

Используется на каждой странице. Вынесено в `PageTransition.tsx`:

```typescript
// components/layout/PageTransition.tsx
'use client'
import { motion } from 'framer-motion'

export function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="flex-1 overflow-y-auto"
    >
      {children}
    </motion.div>
  )
}

// Использование в каждой странице:
export default function GroupsPage() {
  return (
    <PageTransition>
      {/* контент страницы */}
    </PageTransition>
  )
}
```

> Для `exit` анимации необходим `AnimatePresence` в родительском layout.

---

## Card Tap Feedback

Тактильный отклик при нажатии на карточку:

```typescript
// components/groups/GroupCard.tsx
<motion.div
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
  className="cursor-pointer"
  onClick={onClick}
>
  {/* карточка */}
</motion.div>
```

---

## Stagger List — Список карточек

Карточки появляются поочерёдно с задержкой:

```typescript
// variants для контейнера и элементов
const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.05,
    },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' },
  },
}

// Применение:
<motion.ul variants={containerVariants} initial="hidden" animate="show">
  {groups.map((group) => (
    <motion.li key={group.id} variants={itemVariants}>
      <GroupCard group={group} />
    </motion.li>
  ))}
</motion.ul>
```

---

## FAB (Floating Action Button)

```typescript
<motion.button
  whileHover={{ scale: 1.08 }}
  whileTap={{ scale: 0.92 }}
  transition={{ type: 'spring', stiffness: 500, damping: 20 }}
  className="fixed bottom-20 right-4 w-14 h-14 rounded-full bg-primary text-white
             shadow-lg shadow-primary/40 flex items-center justify-center z-10"
>
  <Plus size={24} />
</motion.button>
```

---

## Photo Lightbox (Shared Layout Animation)

Фото "расширяется" из галереи на весь экран:

```typescript
// В PhotoGallery.tsx — каждое фото:
<motion.div
  layoutId={`photo-${photo.id}`}
  className="cursor-zoom-in"
  onClick={() => openLightbox(photo.id)}
>
  <Image src={photo.url} fill className="object-cover" alt="" />
</motion.div>

// В PhotoLightbox.tsx:
<AnimatePresence>
  {isOpen && (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex items-center justify-center"
    >
      <motion.div
        layoutId={`photo-${activePhotoId}`}
        className="w-full max-h-screen"
      >
        <Image src={activePhoto.url} fill className="object-contain" alt="" />
      </motion.div>
    </motion.div>
  )}
</AnimatePresence>
```

---

## BottomNav Dot Indicator

Точка плавно перемещается между активными табами:

```typescript
// components/layout/BottomNav.tsx
const tabs = [
  { href: '/groups', icon: Home, label: 'Группы' },
  { href: '/map', icon: Map, label: 'Карта' },
  { href: '/friends', icon: Users, label: 'Друзья' },
  { href: '/profile', icon: User, label: 'Профиль' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="...">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        return (
          <Link key={tab.href} href={tab.href} className="flex flex-col items-center gap-1 py-2">
            <tab.icon
              size={22}
              className={isActive ? 'text-primary' : 'text-gray-400'}
            />
            <span className={`text-[10px] font-semibold uppercase tracking-wider ${
              isActive ? 'text-primary' : 'text-gray-400'
            }`}>
              {tab.label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"  // ← один layoutId на весь nav
                className="w-1 h-1 rounded-full bg-primary"
              />
            )}
          </Link>
        )
      })}
    </nav>
  )
}
```

---

## Skeleton → Content Transition

Плавная замена skeleton на реальный контент:

```typescript
<AnimatePresence mode="wait">
  {isLoading ? (
    <motion.div
      key="skeleton"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
    >
      <GroupsListSkeleton />
    </motion.div>
  ) : (
    <motion.div
      key="content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <GroupsList groups={groups} />
    </motion.div>
  )}
</AnimatePresence>
```

---

## Modal / Sheet Появление

```typescript
// Sheet (Vaul) уже имеет встроенные анимации spring physics.
// Дополнительно для контента внутри Sheet:

<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ delay: 0.1, duration: 0.2 }}
>
  {/* контент */}
</motion.div>
```

---

## Общие правила

1. **Spring physics** для tap/hover анимаций — ощущение нативного приложения
2. **ease-out** для появления элементов (не ease-in, не linear)
3. **Длительность:** 200–300ms для переходов страниц, 100–150ms для tap feedback
4. **Не анимировать** элементы, которых пользователь не замечает (layout shifts)
5. **`will-change: transform`** Framer добавляет автоматически — не добавлять вручную
6. **`AnimatePresence`** обязателен для `exit` анимаций (unmount)
7. **`layoutId`** для shared element transitions — имена должны быть уникальными глобально
