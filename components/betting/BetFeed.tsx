'use client'

import { useCallback, useState } from 'react'
import { useLineUpdates } from '@/lib/supabase/realtime'
import type { BetSide, LineWithBets, User } from '@/types'
import { BetLineCard } from './BetLineCard'

interface BetFeedProps {
  initialLines: LineWithBets[]
  currentUser: User | null
  onBet: (lineId: string, side: BetSide) => Promise<void>
  onResolve: (lineId: string, outcome: BetSide) => Promise<void>
}

export function BetFeed({ initialLines, currentUser, onBet, onResolve }: BetFeedProps) {
  const [lines, setLines] = useState<LineWithBets[]>(initialLines)

  const handleUpdate = useCallback((updated: LineWithBets[]) => setLines(updated), [])
  useLineUpdates(handleUpdate)

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
        />
      ))}
    </div>
  )
}
