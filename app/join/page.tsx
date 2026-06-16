'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useState, Suspense } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { joinViaInvite } from '@/app/actions'

function JoinForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const token = searchParams.get('token')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!token) {
    return <p className="text-center text-zinc-400">You need an invite link to join.</p>
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await joinViaInvite(token, username.trim())
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to join.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-zinc-300">Pick a username</Label>
        <Input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="your-name"
          className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
          required
          autoFocus
        />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <Button
        type="submit"
        disabled={submitting}
        className="w-full bg-white text-black hover:bg-zinc-200"
      >
        {submitting ? 'Joining...' : 'Join Larpilyzer'}
      </Button>
    </form>
  )
}

export default function JoinPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900">
        <CardHeader>
          <h1 className="text-xl font-bold text-white">Join the group</h1>
          <p className="text-sm text-zinc-400">{"You've been invited to Larpilyzer."}</p>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<p className="text-zinc-400">Loading...</p>}>
            <JoinForm />
          </Suspense>
        </CardContent>
      </Card>
    </main>
  )
}
