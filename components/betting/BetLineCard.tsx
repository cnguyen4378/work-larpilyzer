'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { canPlaceBet, canResolve, getLineStatus, getWinners } from '@/lib/bet-logic'
import { closeLineEarly, deleteLine } from '@/app/actions'
import type { BetSide, LineWithBets, User } from '@/types'
import { CountdownTimer } from './CountdownTimer'

interface BetLineCardProps {
  line: LineWithBets
  currentUser: User | null
  onBet: (lineId: string, side: BetSide) => Promise<void>
  onResolve: (lineId: string, outcome: BetSide) => Promise<void>
  onRefresh: () => Promise<void>
}

export function BetLineCard({ line, currentUser, onBet, onResolve, onRefresh }: BetLineCardProps) {
  const [pending, setPending] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const status = getLineStatus(line)
  const { summary } = line
  const userBet = summary.userBet

  const betCheck = currentUser
    ? canPlaceBet(line, currentUser.id, line.bets)
    : { allowed: false, reason: 'Join to bet' }
  const resolveCheck = canResolve(line)

  const overPct = summary.totalBets === 0 ? 50 : Math.round((summary.overCount / summary.totalBets) * 100)
  const underPct = 100 - overPct

  const winners = line.status === 'resolved' ? getWinners(line, line.bets) : []

  const handleBet = async (side: BetSide) => {
    if (!betCheck.allowed) return
    setPending(side)
    setError(null)
    try { await onBet(line.id, side) } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to place bet.')
    } finally { setPending(null) }
  }

  const handleResolve = async (outcome: BetSide) => {
    if (!resolveCheck.allowed) return
    setPending(`resolve-${outcome}`)
    setError(null)
    try { await onResolve(line.id, outcome) } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resolve.')
    } finally { setPending(null) }
  }

  const handleCloseEarly = async () => {
    setPending('close-early')
    setError(null)
    try { await closeLineEarly(line.id); await onRefresh() } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close.')
    } finally { setPending(null) }
  }

  const handleDelete = async () => {
    if (!currentUser) return
    setPending('delete')
    setError(null)
    try { await deleteLine(line.id, currentUser.id); await onRefresh() } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete.')
    } finally { setPending(null) }
  }

  return (
    <Card className="border border-zinc-800 bg-zinc-900 text-white">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-semibold leading-tight">{line.title}</p>
            {line.description && (
              <p className="mt-0.5 text-sm text-zinc-400">{line.description}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-xs font-bold text-white">
              O/U {line.overUnderValue}
            </span>
            {status === 'resolved' ? (
              <Badge
                className={
                  line.resolvedOutcome === 'over'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-red-600 text-white'
                }
              >
                {line.resolvedOutcome?.toUpperCase()} WON
              </Badge>
            ) : (
              <CountdownTimer closesAt={line.closesAt} onExpire={onRefresh} />
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {summary.totalBets > 0 ? (
          <div className="space-y-1">
            <div className="flex h-2 overflow-hidden rounded-full bg-zinc-800">
              <div
                className="bg-emerald-500 transition-all duration-500"
                style={{ width: `${overPct}%` }}
              />
              <div
                className="bg-red-500 transition-all duration-500"
                style={{ width: `${underPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-zinc-400">
              <span className="text-emerald-400">OVER {summary.overCount}</span>
              <span className="text-zinc-500">{summary.totalBets} bets</span>
              <span className="text-red-400">UNDER {summary.underCount}</span>
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-zinc-600">No bets yet</p>
        )}

        {status === 'open' && (
          <div className="flex gap-2">
            <Button
              onClick={() => handleBet('over')}
              disabled={!betCheck.allowed || pending !== null}
              variant="outline"
              className={`flex-1 border-emerald-700 bg-emerald-950 text-emerald-400 hover:bg-emerald-900 hover:text-emerald-300 disabled:opacity-40 ${
                userBet?.side === 'over' ? 'ring-2 ring-emerald-500' : ''
              }`}
            >
              {pending === 'over' ? '...' : 'OVER ▲'}
            </Button>
            <Button
              onClick={() => handleBet('under')}
              disabled={!betCheck.allowed || pending !== null}
              variant="outline"
              className={`flex-1 border-red-700 bg-red-950 text-red-400 hover:bg-red-900 hover:text-red-300 disabled:opacity-40 ${
                userBet?.side === 'under' ? 'ring-2 ring-red-500' : ''
              }`}
            >
              {pending === 'under' ? '...' : 'UNDER ▼'}
            </Button>
          </div>
        )}

        {userBet && (
          <p className="text-center text-xs text-zinc-400">
            Your bet:{' '}
            <span className={userBet.side === 'over' ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>
              {userBet.side.toUpperCase()}
            </span>
          </p>
        )}

        {status === 'closed' && (
          <div className="space-y-1">
            <p className="text-center text-xs uppercase tracking-widest text-zinc-500">
              Who won?
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => handleResolve('over')}
                disabled={!resolveCheck.allowed || pending !== null}
                className="flex-1 bg-emerald-700 text-white hover:bg-emerald-600 disabled:opacity-40"
              >
                {pending === 'resolve-over' ? '...' : 'Over Won'}
              </Button>
              <Button
                onClick={() => handleResolve('under')}
                disabled={!resolveCheck.allowed || pending !== null}
                className="flex-1 bg-red-700 text-white hover:bg-red-600 disabled:opacity-40"
              >
                {pending === 'resolve-under' ? '...' : 'Under Won'}
              </Button>
            </div>
          </div>
        )}

        {error && <p className="text-center text-xs text-red-400">{error}</p>}

        {status === 'resolved' && winners.length > 0 && (
          <div className="rounded bg-zinc-800 p-2 text-center">
            <p className="text-xs text-zinc-400">
              Winners: {winners.map((w) => w.username).join(', ')}
            </p>
          </div>
        )}

        <div className="flex justify-between pt-1">
          {status === 'open' && (
            <Button
              onClick={handleCloseEarly}
              disabled={pending !== null}
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-500 hover:text-amber-400"
            >
              {pending === 'close-early' ? '...' : 'Close early'}
            </Button>
          )}
          <div className="ml-auto">
            <Button
              onClick={handleDelete}
              disabled={pending !== null}
              variant="ghost"
              size="sm"
              className="text-xs text-zinc-600 hover:text-red-400"
            >
              {pending === 'delete' ? '...' : 'Delete'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
