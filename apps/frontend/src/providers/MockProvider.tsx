'use client'

import { useEffect, useState, type ReactNode } from 'react'

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

interface MockProviderProps {
  children: ReactNode
}

export function MockProvider({ children }: MockProviderProps) {
  // В обычном режиме — сразу готовы, без задержки
  const [ready, setReady] = useState(!isMockMode)

  useEffect(() => {
    if (!isMockMode) return

    // Динамически импортируем MSW только в mock-режиме
    import('../mocks/browser')
      .then(async ({ worker }) => {
        await worker.start({
          onUnhandledRequest: 'bypass', // не блокируем внешние запросы (picsum, шрифты...)
          serviceWorker: {
            url: '/mockServiceWorker.js',
          },
        })
        console.info(
          '%c[MSW] Mock режим активен — все API запросы перехватываются',
          'color: #F97316; font-weight: bold; font-size: 12px'
        )
        setReady(true)
      })
      .catch((err) => {
        console.error('[MSW] Ошибка запуска:', err)
        // Даже при ошибке рендерим приложение
        setReady(true)
      })
  }, [])

  // Пока MSW не готов — показываем заглушку вместо приложения
  // (иначе первые запросы уйдут мимо моков)
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="text-white text-lg">✈️</span>
          </div>
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-muted-foreground">Запуск демо-режима…</span>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
