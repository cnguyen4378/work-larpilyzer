'use client'

import { useState, useCallback } from 'react'
import { BetFeed } from '@/components/betting/BetFeed'
import { CreateLineForm } from '@/components/betting/CreateLineForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { createLine, createInviteLink, getLines, placeBet, resolveLine } from '@/app/actions'
import type { BetSide, CreateLineInput, LineWithBets, User } from '@/types'

interface HomeClientProps {
  initialLines: LineWithBets[]
  currentUser: User | null
}

export function HomeClient({ initialLines, currentUser }: HomeClientProps) {
  const [showCreate, setShowCreate] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [lines, setLines] = useState<LineWithBets[]>(initialLines)

  const refreshLines = useCallback(async () => {
    const fresh = await getLines()
    setLines(fresh)
  }, [])

  const handleCreateLine = async (data: CreateLineInput) => {
    if (!currentUser) return
    await createLine(data, currentUser.id)
    setShowCreate(false)
    await refreshLines()
  }

  const handleBet = async (lineId: string, side: BetSide) => {
    if (!currentUser) return
    await placeBet(lineId, currentUser.id, side)
    await refreshLines()
  }

  const handleResolve = async (lineId: string, outcome: BetSide) => {
    if (!currentUser) return
    await resolveLine(lineId, outcome, currentUser.id)
    await refreshLines()
  }

  const handleCreateInvite = async () => {
    if (!currentUser) return
    const link = await createInviteLink(currentUser.id)
    const url = `${window.location.origin}/join?token=${link.token}`
    setInviteUrl(url)
    await navigator.clipboard.writeText(url).catch(() => {})
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <header className="sticky top-0 z-10 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
          <h1 className="text-lg font-black tracking-tight">LARPILYZER</h1>
          {currentUser ? (
            <span className="text-sm text-zinc-400">{currentUser.username}</span>
          ) : (
            <span className="text-sm text-zinc-600">Not joined</span>
          )}
        </div>
      </header>

      <div className="mx-auto max-w-lg space-y-4 px-4 py-4">
        {!currentUser ? (
          <div className="py-20 space-y-3 text-center">
            <p className="text-zinc-500">Need an invite link to join.</p>
            <p className="text-sm text-zinc-600">
              Already joined?{' '}
              <a href="/login" className="text-zinc-400 hover:text-white underline">
                Log in
              </a>
            </p>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowCreate(!showCreate)}
                className="flex-1 bg-white text-black hover:bg-zinc-200"
              >
                {showCreate ? 'Cancel' : '+ Set Line'}
              </Button>
              <Button
                onClick={handleCreateInvite}
                variant="outline"
                className="border-zinc-700 text-zinc-300 hover:text-white"
              >
                Invite
              </Button>
            </div>

            {inviteUrl && (
              <div className="rounded border border-zinc-700 bg-zinc-900 p-3">
                <p className="mb-1 text-xs text-zinc-400">Invite link (copied to clipboard):</p>
                <p className="break-all font-mono text-xs text-emerald-400">{inviteUrl}</p>
              </div>
            )}

            {showCreate && (
              <Card className="border-zinc-800 bg-zinc-900">
                <CardHeader className="pb-2">
                  <h2 className="font-semibold text-white">Set a line</h2>
                </CardHeader>
                <CardContent>
                  <CreateLineForm
                    currentUser={currentUser}
                    onSubmit={handleCreateLine}
                    onCancel={() => setShowCreate(false)}
                  />
                </CardContent>
              </Card>
            )}

            <BetFeed
              lines={lines}
              currentUser={currentUser}
              onBet={handleBet}
              onResolve={handleResolve}
              onLinesUpdate={setLines}
            />
          </>
        )}
      </div>
    </main>
  )
}
