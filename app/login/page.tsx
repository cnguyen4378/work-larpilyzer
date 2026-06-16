'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { loginByUsername } from '@/app/actions'

export default function LoginPage() {
  const router = useRouter()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username.trim()) return
    setError('')
    setSubmitting(true)
    try {
      await loginByUsername(username.trim())
      router.push('/')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed.')
      setSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-4">
      <Card className="w-full max-w-sm border-zinc-800 bg-zinc-900">
        <CardHeader>
          <h1 className="text-xl font-bold text-white">Welcome back</h1>
          <p className="text-sm text-zinc-400">Enter your username to rejoin.</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label className="text-zinc-300">Username</Label>
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
              {submitting ? 'Logging in...' : 'Log in'}
            </Button>
            <p className="text-center text-xs text-zinc-600">
              New?{' '}
              <Link href="/" className="text-zinc-400 hover:text-white">
                Get an invite link
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
