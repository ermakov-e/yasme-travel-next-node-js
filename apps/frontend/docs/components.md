# Frontend Components — Каталог компонентов

---

## Дерево компонентов

```
components/
├── ui/                          # shadcn/ui (Radix UI + Tailwind)
│   ├── button.tsx
│   ├── card.tsx
│   ├── avatar.tsx
│   ├── badge.tsx
│   ├── sheet.tsx               # Bottom sheet
│   ├── dialog.tsx              # Desktop модал
│   ├── skeleton.tsx
│   ├── input.tsx
│   ├── sonner.tsx              # Toast уведомления
│   └── separator.tsx
│
├── layout/
│   ├── BottomNav.tsx           # Нижняя навигация (4 таба)
│   ├── AppShell.tsx            # Обёртка страницы с паддингами
│   └── PageTransition.tsx      # Framer Motion wrapper
│
├── groups/
│   ├── GroupCard.tsx           # Карточка поездки (full-bleed фото)
│   ├── GroupsList.tsx          # Список + skeleton + empty state
│   ├── PhotoGallery.tsx        # Masonry grid фотографий
│   ├── PhotoLightbox.tsx       # Полноэкранный просмотр фото
│   ├── GroupPreviewSheet.tsx   # Preview при тапе на маркер карты
│   └── CreateGroupModal/
│       ├── index.tsx           # Sheet/Dialog + stepper логика
│       ├── StepCoverAndName.tsx
│       ├── StepLocation.tsx    # Яндекс.Карты + поиск адреса
│       └── StepInviteFriends.tsx
│
├── map/
│   ├── YandexMap.tsx           # dynamic import, ssr: false
│   └── GroupMarker.tsx         # Кастомный маркер с миниатюрой
│
└── auth/
    └── YandexLoginButton.tsx   # href="/api/v1/auth/yandex"
```

---

## Компоненты layout/

### `BottomNav.tsx`

**Назначение:** Нижняя навигация, присутствует на всех защищённых страницах.

```typescript
// Использование (в (app)/layout.tsx):
<BottomNav />

// Пропсы: нет (текущий маршрут определяется через usePathname)
```

**Детали реализации:**
- `'use client'` — использует `usePathname` и `useRouter`
- 4 таба: Groups (`/groups`), Map (`/map`), Friends (`/friends`), Profile (`/profile`)
- Активный таб: `text-primary` + animated dot (Framer `layoutId="nav-indicator"`)
- Стиль: `backdrop-blur-md bg-white/90 border-t border-gray-100`
- Padding bottom: `env(safe-area-inset-bottom)` для iPhone

---

### `PageTransition.tsx`

**Назначение:** Обёртка для анимации входа страницы.

```typescript
// Использование:
export default function GroupsPage() {
  return (
    <PageTransition>
      {/* контент */}
    </PageTransition>
  )
}
```

---

## Компоненты groups/

### `GroupCard.tsx`

**Назначение:** Карточка поездки в списке. Ключевой визуальный компонент.

```typescript
interface GroupCardProps {
  group: Group & { memberCount: number; photoCount: number; hasNew?: boolean }
  onClick: () => void
}
```

**Структура:**
```
<motion.div whileTap={{ scale: 0.97 }}>       // Framer tap feedback
  <div className="relative aspect-[4/3]">     // Фото контейнер
    <Image fill ... />                         // Обложка
    <div className="gradient-overlay" />       // from-transparent to-black/70
    <div className="absolute bottom-0 p-4">   // Контент поверх фото
      <h3>НАЗВАНИЕ ПОЕЗДКИ</h3>
      <p>📍 Локация</p>
      <div>
        <AvatarGroup users={members} />
        {hasNew && <Badge variant="accent">🔥 новое</Badge>}
        <span>{photoCount} фото</span>
      </div>
    </div>
  </div>
</motion.div>
```

---

### `PhotoGallery.tsx`

**Назначение:** Masonry-сетка фотографий с infinite scroll.

```typescript
interface PhotoGalleryProps {
  groupId: string
}
```

**Детали:**
- 2 колонки на mobile, 3 на tablet+
- `useInfiniteQuery` для пагинации
- `IntersectionObserver` для infinite scroll (загрузка следующей страницы)
- При клике — открывает `PhotoLightbox`
- Skeleton при загрузке: 6 заглушек разной высоты

---

### `CreateGroupModal/index.tsx`

**Назначение:** Модал создания группы (3 шага).

```typescript
// Открывается из ui.store:
const { openModal } = useUIStore()
openModal('create-group')
```

**Логика шагов:**
```typescript
const [step, setStep] = useState<1 | 2 | 3>(1)
const [formData, setFormData] = useState<CreateGroupFormData>({
  name: '',
  coverKey: null,
  lat: null,
  lng: null,
  address: '',
  memberIds: [],
})
```

- На mobile: `Sheet` (Vaul, появляется снизу)
- На desktop (≥768px): `Dialog`
- Переключение шагов: `AnimatePresence` с горизонтальным слайдом

---

## Компоненты map/

### `YandexMap.tsx`

**Назначение:** Обёртка вокруг Яндекс.Карт JS API v3.

```typescript
interface YandexMapProps {
  groups: Array<{ id: string; lat: number; lng: number; name: string; coverUrl: string | null }>
  onMarkerClick: (groupId: string) => void
  center?: [number, number]
  zoom?: number
}
```

**⚠️ Критично:**
- Импортируется только через `dynamic(..., { ssr: false })`
- Не размонтируется при переходах — родитель скрывает через CSS
- Карта инициализируется один раз после загрузки скрипта Яндекса

---

## Правила создания нового компонента

1. **Определи**: Server или Client Component?
2. **Файл**: `PascalCase.tsx` в соответствующей папке
3. **Экспорт**: именованный экспорт (не default, кроме страниц)
4. **Пропсы**: TypeScript interface, типы из `@yasme/shared`
5. **Состояние**: через TanStack Query (server) или Zustand (UI)
6. **Стили**: только Tailwind utility classes + shadcn/ui компоненты
7. **Loading state**: всегда `Skeleton`, никогда спиннер для контента
8. **Empty state**: всегда показывать иллюстрацию + CTA при пустом списке

### Шаблон нового компонента

```typescript
'use client'  // только если нужен

import type { Group } from '@yasme/shared'
// shadcn/ui импорты
// Framer Motion если нужны анимации

interface MyComponentProps {
  // ...
}

export function MyComponent({ ... }: MyComponentProps) {
  // hooks
  // handlers

  return (
    // JSX
  )
}
```
