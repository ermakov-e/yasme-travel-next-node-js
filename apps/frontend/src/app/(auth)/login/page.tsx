import Link from 'next/link'
import { MapPin, Camera, Users, FlaskConical } from 'lucide-react'

const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-500 via-orange-400 to-pink-500 flex flex-col">
      {/* Demo mode badge */}
      {isMockMode && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-sm rounded-full">
            <FlaskConical className="w-3.5 h-3.5 text-white/80" />
            <span className="text-white/80 text-xs font-medium">Демо-режим</span>
          </div>
        </div>
      )}

      {/* Hero section */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-16 pb-8 text-center">
        {/* App icon */}
        <div className="w-20 h-20 rounded-3xl bg-white/20 backdrop-blur-sm flex items-center justify-center mb-6 shadow-lg">
          <MapPin className="w-10 h-10 text-white" strokeWidth={2.5} />
        </div>

        <h1 className="text-4xl font-extrabold text-white tracking-tight mb-2">
          Yasme Travel
        </h1>
        <p className="text-white/80 text-lg font-medium mb-12">
          Фото из путешествий вместе с друзьями
        </p>

        {/* Feature highlights */}
        <div className="flex flex-col gap-4 w-full max-w-xs mb-12">
          {[
            { icon: Camera, text: 'Загружайте фото прямо с телефона' },
            { icon: MapPin, text: 'Все поездки на одной карте' },
            { icon: Users, text: 'Делитесь с друзьями моментально' },
          ].map(({ icon: Icon, text }) => (
            <div
              key={text}
              className="flex items-center gap-3 bg-white/15 backdrop-blur-sm rounded-2xl px-4 py-3"
            >
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
                <Icon className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-medium text-sm text-left">{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Login button section */}
      <div className="px-6 pb-12 safe-bottom flex flex-col items-center gap-3">
        {isMockMode ? (
          /* ─── DEMO MODE: кнопка без реального OAuth ─── */
          <>
            <Link
              href="/groups"
              className="w-full max-w-sm flex items-center justify-center gap-3 bg-white text-gray-900 rounded-2xl py-4 px-6 font-bold text-base shadow-lg active:scale-95 transition-transform"
            >
              <FlaskConical className="w-5 h-5 text-orange-500" />
              Войти в демо-режиме
            </Link>
            <p className="text-white/70 text-xs text-center max-w-xs">
              Данные ненастоящие — OAuth не требуется. Все запросы перехватываются Mock Service Worker.
            </p>
          </>
        ) : (
          /* ─── PROD MODE: реальный Yandex OAuth ─── */
          <>
            <a
              href="/api/v1/auth/yandex"
              className="w-full max-w-sm flex items-center justify-center gap-3 bg-white text-gray-900 rounded-2xl py-4 px-6 font-bold text-base shadow-lg active:scale-95 transition-transform"
            >
              {/* Yandex logo */}
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <rect width="24" height="24" rx="6" fill="#FC3F1D" />
                <path
                  d="M13.4 6H11.5C9.7 6 8.5 6.9 8.5 8.6C8.5 10.1 9.3 10.9 10.7 11.8L11.7 12.4L8.4 18H10.5L13.5 13L14.5 13.6C15.6 14.3 16.2 14.8 16.2 16.1C16.2 17.1 15.6 17.8 14.3 17.8V18C16.5 18 17.8 16.6 17.8 15.1C17.8 13.5 17 12.7 15.5 11.7L14.4 11.1C13.4 10.4 12.8 10 12.8 8.8C12.8 7.8 13.4 7.2 14.4 7.2H13.4V6Z"
                  fill="white"
                />
                <path
                  d="M13.4 6H14.4C16.1 6 17 7 17 8.5C17 9.8 16.4 10.6 15.5 11.1L14.4 11.7C13 10.8 12.8 10.4 12.8 8.8C12.8 7.2 13.4 6.8 13.4 6Z"
                  fill="white"
                />
              </svg>
              Войти через Яндекс
            </a>
            <p className="text-white/60 text-xs text-center">
              Продолжая, вы соглашаетесь с условиями использования
            </p>
          </>
        )}
      </div>
    </div>
  )
}
