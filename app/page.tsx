import { getCurrentUser, getLines } from '@/app/actions'
import { HomeClient } from '@/components/HomeClient'

export default async function HomePage() {
  const user = await getCurrentUser()
  const lines = user ? await getLines() : []
  return <HomeClient initialLines={lines} currentUser={user} />
}
