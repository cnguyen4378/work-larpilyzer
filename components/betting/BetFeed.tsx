'use client'

import { useCallback } from 'react'
import { useLineUpdates } from '@/lib/supabase/realtime'
import type { BetSide, LineWithBets, User } from '@/types'
import { BetLineCard } from './BetLineCard'

interface BetFeedProps {
  lines: LineWithBets[]
  currentUser: User | null
  onBet: (lineId: string, side: BetSide) => Promise<void>
  onResolve: (lineId: string, outcome: BetSide) => Promise<void>
  onLinesUpdate: (lines: LineWithBets[]) => void
}

export function BetFeed({ lines, currentUser, onBet, onResolve, onLinesUpdate }: BetFeedProps) {
  const handleUpdate = useCallback((updated: LineWithBets[]) => onLinesUpdate(updated), [onLinesUpdate])
  useLineUpdates(handleUpdate)

  const refresh = useCallback(async () => {
    const res = await fetch('/api/lines')
    if (res.ok) onLinesUpdate(await res.json())
  }, [onLinesUpdate])

  if (lines.length === 0) {
    return (
      <div className="py-20 text-center text-zinc-600">
        No lines yet — create one!
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {lines.map((line) => (
        <BetLineCard
          key={line.id}
          line={line}
          currentUser={currentUser}
          onBet={onBet}
          onResolve={onResolve}
          onRefresh={refresh}
        />
      ))}
    </div>
  )
}
