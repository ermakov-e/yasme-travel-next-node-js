import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { BottomNav } from '@/components/layout/BottomNav'
import { CreateGroupModal } from '@/components/groups/CreateGroupModal'

async function getServerUser() {
  const cookieStore = await cookies()
  const token = cookieStore.get('token')

  if (!token?.value) return null

  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ?? 'http://localhost:3001'}/api/v1/auth/me`,
      {
        headers: { Cookie: `token=${token.value}` },
        cache: 'no-store',
      }
    )

    if (!res.ok) return null

    return res.json()
  } catch {
    return null
  }
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // В mock-режиме пропускаем серверную проверку токена —
  // MSW на клиенте перехватит /auth/me и вернёт mock-пользователя
  const isMockMode = process.env.NEXT_PUBLIC_MOCK_MODE === 'true'

  if (!isMockMode) {
    const user = await getServerUser()
    if (!user) redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Main content with bottom padding for nav */}
      <main className="pb-20">{children}</main>

      {/* Bottom navigation */}
      <BottomNav />

      {/* Global create group modal (always mounted) */}
      <CreateGroupModal />
    </div>
  )
}
