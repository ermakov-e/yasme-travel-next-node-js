# Design System — Дизайн-система

**Стиль:** Яркий / Путешествия — насыщенные цвета, полноэкранные обложки, градиентные оверлеи, энергичная типографика. Референс: Airbnb, Polarsteps, TripAdvisor.

---

## Цветовая палитра

| Токен | Hex | Использование |
|---|---|---|
| `primary` | `#F97316` | Кнопки CTA, активный таб, акценты |
| `primary-dark` | `#EA580C` | Hover состояние primary |
| `primary-light` | `#FED7AA` | Фон под primary элементами |
| `accent` | `#EC4899` | Бейджи "новое", вторичный акцент |
| `accent-dark` | `#BE185D` | Hover для accent |
| `surface` | `#FAFAFA` | Фон приложения |
| `card` | `#FFFFFF` | Фон карточек |
| `text-primary` | `#111827` | Основной текст |
| `text-secondary` | `#6B7280` | Вторичный текст, метки |
| `border` | `#E5E7EB` | Границы элементов |

```css
/* globals.css */
:root {
  --color-primary:       #F97316;
  --color-primary-dark:  #EA580C;
  --color-primary-light: #FED7AA;
  --color-accent:        #EC4899;
  --color-surface:       #FAFAFA;
  --color-card:          #FFFFFF;
  --radius-card:         1rem;      /* 16px */
  --radius-full:         9999px;
}
```

---

## Типографика

**Шрифт:** Inter (системный стек как fallback)

```css
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

| Стиль | Size | Weight | Использование |
|---|---|---|---|
| Heading XL | 28px | 800 | Название поездки на обложке |
| Heading L | 22px | 700 | Заголовки страниц |
| Heading M | 18px | 600 | Заголовки секций |
| Body | 16px | 400 | Основной текст |
| Body Small | 14px | 400 | Метки, подписи |
| Caption | 12px | 500 | Бейджи, счётчики |
| Label | 11px | 600 UPPERCASE | Табы навигации |

---

## Spacing система

```
4px  → gap-1  (иконки рядом с текстом)
8px  → gap-2  (элементы внутри компонента)
12px → gap-3  (padding внутри карточки)
16px → gap-4  (стандартный отступ)
20px → gap-5  (отступ между секциями)
24px → gap-6  (padding страницы)
32px → gap-8  (крупные отступы)
```

**Горизонтальный padding страниц:** `px-4` (16px)

---

## Border Radius

```
rounded-sm  → 4px   (чипы, бейджи)
rounded-lg  → 8px   (кнопки, инпуты)
rounded-xl  → 12px  (карточки маленькие)
rounded-2xl → 16px  (карточки групп)
rounded-3xl → 24px  (bottom sheet handle)
rounded-full → 9999px (аватары, FAB)
```

---

## Ключевые компоненты (мокапы)

### GroupCard
```
┌─────────────────────────────────────┐
│                                     │
│   [FULL-BLEED COVER PHOTO]          │  ← aspect-ratio: 4/3
│   object-cover w-full               │
│                                     │
│   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░    │  ← затемнение для читаемости
│                                     │
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│  ← gradient: from-transparent to-black/70
│  🏔 АЛТАЙ, АВГУСТ 2024              │  ← text-white font-bold uppercase tracking-wide
│  📍 Республика Алтай                │  ← text-white/80 text-sm
│  [●][●][●] +2  •  23 фото  🔥 NEW  │  ← аватары + бейдж accent
└─────────────────────────────────────┘
  rounded-2xl overflow-hidden shadow-lg
  Framer: whileTap={{ scale: 0.97 }}
```

### BottomNav
```
┌─────────────────────────────────────┐
│  backdrop-blur-md bg-white/90        │
│  border-t border-gray-100           │
│  safe-area padding bottom           │
│                                     │
│  [🏠]     [🗺]     [👥]     [👤]  │
│ Группы   Карта  Друзья  Профиль    │
│  ──●                               │  ← активный: text-primary + dot indicator
│                                     │
└─────────────────────────────────────┘
  h-16 + safe-area-inset-bottom
```

### GroupDetail Header
```
┌─────────────────────────────────────┐
│   [← назад]     Алтай 2024    [···] │  ← sticky header, backdrop-blur
│─────────────────────────────────────│
│   [COVER IMAGE full-width]          │  ← aspect 16/9, object-cover
│   [●][●][●] 4 участника    [+]     │  ← avatars stack, кнопка пригласить
│─────────────────────────────────────│
│   [фото] [фото] | [фото]           │  ← masonry 2 cols
│   [фото] | [большое фото]          │
│   [фото] [фото] | [фото]           │
│─────────────────────────────────────│
│                              [📷]   │  ← FAB загрузки
└─────────────────────────────────────┘
```

### FAB (Floating Action Button)
```
                           ┌─────┐
                           │  +  │  ← bg-primary text-white
                           │     │  ← rounded-full w-14 h-14
                           └─────┘  ← shadow-lg shadow-primary/40
                                      fixed bottom-20 right-4
                                      Framer: whileHover={{ scale: 1.05 }}
                                              whileTap={{ scale: 0.95 }}
```

### Map Page
```
┌─────────────────────────────────────┐
│                                     │
│   [ЯНДЕКС.КАРТА - весь экран]       │
│   ○ маркер группы                   │  ← кастомный маркер с миниатюрой обложки
│        ○ маркер                     │
│   ○          ○                      │
│                                     │
│─────────────────────────────────────│
│ ┌─────────────────────────────────┐ │  ← BottomSheet (Vaul) при тапе на маркер
│ │  [cover image]                  │ │
│ │  🏔 Алтай, август 2024          │ │
│ │  📍 Республика Алтай            │ │
│ │         [Открыть поездку →]     │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Groups] [Map●] [Friends] [Profile] │  ← BottomNav поверх карты
└─────────────────────────────────────┘
```

### Empty State
```
┌─────────────────────────────────────┐
│                                     │
│           [иллюстрация]             │  ← SVG иллюстрация (путешественник)
│                                     │
│    Ещё нет поездок                  │  ← text-xl font-semibold
│    Создай первую группу             │  ← text-secondary
│    и пригласи друзей                │
│                                     │
│    [+ Создать поездку]              │  ← Button primary
│                                     │
└─────────────────────────────────────┘
```

---

## shadcn/ui компоненты

| Компонент | Использование |
|---|---|
| `Button` | Кнопки CTA, навигация в модале |
| `Card` | Обёртка для статичных блоков (профиль) |
| `Avatar` | Аватары пользователей |
| `Badge` | "🔥 новое", счётчики, роли |
| `Sheet` | Bottom Sheet на мобильных (создание группы, участники, маркер карты) |
| `Dialog` | Тот же контент для десктопа |
| `Skeleton` | Placeholder при загрузке (не спиннеры!) |
| `Input` | Поля ввода |
| `Toast / Sonner` | Уведомления (успех, ошибка) |
| `Separator` | Разделители секций |

---

## Framer Motion — анимации

### Page Transition (каждая страница)
```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  exit={{ opacity: 0, y: -10 }}
  transition={{ duration: 0.25, ease: 'easeOut' }}
>
```

### GroupCard — тактильный отклик
```tsx
<motion.div
  whileTap={{ scale: 0.97 }}
  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
>
```

### Stagger List (список карточек)
```tsx
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }
// variants={container} на ul, variants={item} на каждом li
```

### FAB
```tsx
whileHover={{ scale: 1.08 }}
whileTap={{ scale: 0.92 }}
transition={{ type: 'spring', stiffness: 500, damping: 20 }}
```

### Photo Lightbox (Shared Layout)
```tsx
// На фото в галерее:
<motion.img layoutId={`photo-${photo.id}`} />

// В lightbox:
<motion.img layoutId={`photo-${photo.id}`} />

// AnimatePresence оборачивает lightbox
```

### BottomNav Dot Indicator
```tsx
// Активная точка под иконкой:
<motion.div
  layoutId="nav-indicator"
  className="w-1 h-1 rounded-full bg-primary"
/>
// layoutId один на весь nav → плавно перемещается между табами
```

---

## Mobile-specific правила

### Safe Area Insets (iPhone notch / home indicator)
```css
/* В globals.css: */
.app-container {
  padding-bottom: env(safe-area-inset-bottom);
}

/* BottomNav: */
padding-bottom: calc(env(safe-area-inset-bottom) + 8px);
```

### Touch Targets
- Минимальный размер тапабельных элементов: **44×44px**
- Иконки навигации: зона тапа `p-3` вокруг иконки 24px

### Scroll Behavior
```css
/* Нативный скролл для галереи */
-webkit-overflow-scrolling: touch;
overscroll-behavior: contain;
```

---

## Правила загрузки изображений

```tsx
// Всегда через next/image для оптимизации:
<Image
  src={photoUrl}
  alt={caption}
  fill
  className="object-cover"
  sizes="(max-width: 640px) 50vw, 33vw"
  placeholder="blur"
  blurDataURL="data:image/jpeg;base64,..."  // ← tiny placeholder
/>
```

- `sizes` обязательно — помогает браузеру выбрать правильный srcset
- `placeholder="blur"` для плавного появления
- Аватары: `width={40} height={40}` (фиксированный размер)
