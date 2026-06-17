import { createServiceRoleClient } from '@/lib/supabase/server'
import { getLeaderboard } from '@/lib/supabase/db'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default async function LeaderboardPage() {
  const supabase = createServiceRoleClient()
  const entries = await getLeaderboard(supabase)

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-20">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center px-4 py-3">
          <span className="text-lg font-black tracking-tight">LARPILYZER</span>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Leaderboard
        </h2>

        {entries.length === 0 ? (
          <div className="py-20 text-center text-zinc-600">
            No winners yet — resolve some lines first.
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry, index) => {
              const rank = index + 1
              const isTopThree = rank <= 3
              const rankColors: Record<number, string> = {
                1: 'text-yellow-400',
                2: 'text-zinc-300',
                3: 'text-amber-600',
              }
              const rankColor = rankColors[rank] ?? 'text-zinc-500'

              return (
                <Card key={entry.userId} className="border-zinc-800 bg-zinc-900">
                  <CardContent className="flex items-center gap-4 px-4 py-3">
                    <span
                      className={`w-8 text-center text-lg font-black tabular-nums ${rankColor}`}
                    >
                      {isTopThree ? ['🥇', '🥈', '🥉'][rank - 1] : rank}
                    </span>
                    <span className="flex-1 font-semibold text-white">{entry.username}</span>
                    <span className="text-sm font-bold text-zinc-300">
                      {entry.wins} {entry.wins === 1 ? 'win' : 'wins'}
                    </span>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {entries.length > 0 && (
          <Card className="border-zinc-800 bg-zinc-900/50">
            <CardHeader className="px-4 py-3">
              <CardTitle className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 pt-0">
              <p className="text-sm text-zinc-400">
                {entries.length} {entries.length === 1 ? 'player has' : 'players have'} won at
                least one bet.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
