import Link from 'next/link'
import { getCurrentUser, getResolvedLines } from '@/app/actions'
import { getWinners } from '@/lib/bet-logic'
import type { LineWithBets } from '@/types'

function ResolvedLineCard({ line }: { line: LineWithBets }) {
  const winners = getWinners(line, line.bets)
  const { summary } = line

  const overPct =
    summary.totalBets === 0 ? 50 : Math.round((summary.overCount / summary.totalBets) * 100)
  const underPct = 100 - overPct

  const resolvedDate = line.resolvedAt
    ? new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }).format(line.resolvedAt)
    : null

  return (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold leading-tight text-white">{line.title}</p>
          {line.description && (
            <p className="mt-0.5 text-sm text-zinc-400">{line.description}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold text-white">
            O/U {line.overUnderValue}
          </span>
          <span
            className={`rounded px-2 py-0.5 text-xs font-bold ${
              line.resolvedOutcome === 'over'
                ? 'bg-emerald-900 text-emerald-300'
                : 'bg-red-900 text-red-300'
            }`}
          >
            {line.resolvedOutcome?.toUpperCase()} WON
          </span>
        </div>
      </div>

      {summary.totalBets > 0 && (
        <div className="space-y-1">
          <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="bg-emerald-500"
              style={{ width: `${overPct}%` }}
            />
            <div
              className="bg-red-500"
              style={{ width: `${underPct}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-zinc-400">
            <span className="text-emerald-400">OVER {summary.overCount}</span>
            <span className="text-zinc-500">{summary.totalBets} bets</span>
            <span className="text-red-400">UNDER {summary.underCount}</span>
          </div>
        </div>
      )}

      {winners.length > 0 ? (
        <div className="rounded bg-zinc-800 px-3 py-2">
          <p className="text-xs text-zinc-400">
            <span className="font-semibold text-zinc-200">Winners: </span>
            {winners.map((w) => w.username).join(', ')}
          </p>
        </div>
      ) : (
        <p className="text-xs text-zinc-600">No winners — nobody bet on the right side.</p>
      )}

      {resolvedDate && (
        <p className="text-xs text-zinc-600">Resolved {resolvedDate}</p>
      )}
    </div>
  )
}

export default async function ResultsPage() {
  const [user, lines] = await Promise.all([getCurrentUser(), getResolvedLines()])

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <Link href="/" className="text-lg font-black tracking-tight hover:text-zinc-300 transition-colors">
            LARPILYZER
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <span className="text-sm text-zinc-400">{user.username}</span>
            ) : (
              <span className="text-sm text-zinc-600">Not joined</span>
            )}
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Live
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-lg px-4 py-4 space-y-4">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-zinc-500">
          Results
        </h2>

        {lines.length === 0 ? (
          <div className="py-20 text-center text-zinc-600">
            No resolved lines yet.
          </div>
        ) : (
          <div className="space-y-3">
            {lines.map((line) => (
              <ResolvedLineCard key={line.id} line={line} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
