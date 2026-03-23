import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6">
      <div className="text-6xl mb-4">🗺️</div>
      <h1 className="text-2xl font-bold mb-2">Страница не найдена</h1>
      <p className="text-muted-foreground mb-8 text-sm">
        Кажется, вы заблудились в путешествии
      </p>
      <Link
        href="/groups"
        className="px-6 py-3 rounded-2xl bg-primary text-white font-semibold"
      >
        Вернуться домой
      </Link>
    </div>
  )
}
