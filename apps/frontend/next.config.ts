import type { NextConfig } from 'next'

const withPWA = require('next-pwa')({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      // API calls — NetworkFirst
      urlPattern: /^https?:\/\/.*\/api\//,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'api-cache',
        networkTimeoutSeconds: 10,
        expiration: { maxEntries: 50, maxAgeSeconds: 5 * 60 },
      },
    },
    {
      // Yandex Object Storage images — StaleWhileRevalidate 7 days
      urlPattern: /^https:\/\/.*\.storage\.yandexcloud\.net\//,
      handler: 'StaleWhileRevalidate',
      options: {
        cacheName: 'yos-images',
        expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
      },
    },
    {
      // Static assets — CacheFirst
      urlPattern: /\.(png|jpg|jpeg|webp|svg|ico|woff2?)$/,
      handler: 'CacheFirst',
      options: {
        cacheName: 'static-assets',
        expiration: { maxEntries: 100, maxAgeSeconds: 30 * 24 * 60 * 60 },
      },
    },
  ],
})

const nextConfig: NextConfig = {
  // Proxy /api/* → backend (same-origin cookie fix for dev)
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001'}/api/:path*`,
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.storage.yandexcloud.net' },
      { protocol: 'https', hostname: 'avatars.yandex.net' },
      // Mock-режим: placeholder изображения
      { protocol: 'https', hostname: 'picsum.photos' },
      { protocol: 'https', hostname: 'i.pravatar.cc' },
    ],
  },
}

module.exports = withPWA(nextConfig)
