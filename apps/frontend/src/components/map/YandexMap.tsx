'use client'

import { useEffect, useRef, useState } from 'react'
import Script from 'next/script'
import { Group } from '@/hooks/useGroups'

interface YandexMapProps {
  groups: Group[]
  onGroupClick?: (groupId: string) => void
  center?: [number, number]
  zoom?: number
}

declare global {
  interface Window {
    ymaps3?: any
    __ymaps3Loaded?: boolean
    __ymaps3Callbacks?: Array<() => void>
  }
}

export function YandexMap({
  groups,
  onGroupClick,
  center = [55.7558, 37.6173],
  zoom = 5,
}: YandexMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<any>(null)
  const markersRef = useRef<any[]>([])
  const [ready, setReady] = useState(false)

  function initMap() {
    if (!window.ymaps3 || !containerRef.current || mapRef.current) return

    const { YMap, YMapDefaultSchemeLayer, YMapDefaultFeaturesLayer, YMapMarker } = window.ymaps3

    const map = new YMap(containerRef.current, {
      location: {
        center: [center[1], center[0]], // [lng, lat] for Yandex
        zoom,
      },
    })

    map.addChild(new YMapDefaultSchemeLayer({}))
    map.addChild(new YMapDefaultFeaturesLayer({}))

    mapRef.current = map
    setReady(true)
  }

  // Add/update markers when groups change
  useEffect(() => {
    if (!ready || !mapRef.current) return

    const { YMapMarker } = window.ymaps3

    // Clear old markers
    markersRef.current.forEach((marker) => {
      try { mapRef.current.removeChild(marker) } catch {}
    })
    markersRef.current = []

    // Add new markers
    groups.forEach((group) => {
      const el = document.createElement('div')
      el.className = 'yandex-marker'
      el.innerHTML = `
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          background: linear-gradient(135deg, #F97316, #EC4899);
          border: 2px solid white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <div style="transform: rotate(45deg); color: white; font-size: 16px;">📸</div>
        </div>
      `

      el.addEventListener('click', () => onGroupClick?.(group.id))

      const marker = new YMapMarker(
        {
          coordinates: [group.lng, group.lat],
          anchor: [0.5, 1],
        },
        el
      )

      mapRef.current.addChild(marker)
      markersRef.current.push(marker)
    })
  }, [ready, groups, onGroupClick])

  return (
    <div className="relative w-full h-full">
      <Script
        src={`https://api-maps.yandex.ru/v3/?apikey=${process.env.NEXT_PUBLIC_YANDEX_MAPS_API_KEY}&lang=ru_RU`}
        strategy="lazyOnload"
        onLoad={() => {
          window.ymaps3.ready.then(() => {
            initMap()
          })
        }}
      />
      <div ref={containerRef} className="w-full h-full" />
      {!ready && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm">Загружаем карту…</span>
          </div>
        </div>
      )}
    </div>
  )
}
