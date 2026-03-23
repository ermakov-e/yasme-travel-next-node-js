import { redirect } from 'next/navigation'

// Root → redirect to groups (auth guard in layout will handle unauth)
export default function RootPage() {
  redirect('/groups')
}
