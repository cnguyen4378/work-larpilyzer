'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { CreateLineInput, User } from '@/types'

interface CreateLineFormProps {
  currentUser: User
  onSubmit: (data: CreateLineInput) => Promise<void>
  onCancel?: () => void
}

export function CreateLineForm({ currentUser: _user, onSubmit, onCancel }: CreateLineFormProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [overUnderValue, setOverUnderValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const val = parseFloat(overUnderValue)
    if (!title.trim() || isNaN(val) || val <= 0) {
      setError('Title and a valid number of minutes are required.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        overUnderValue: val,
      })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create line.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <Label className="text-zinc-300">Line *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Will Carter finish the pizza?"
          className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
          required
        />
      </div>

      <div className="space-y-1">
        <Label className="text-zinc-300">Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional context..."
          className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
          rows={2}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-zinc-300">Minutes (O/U + timer) *</Label>
        <Input
          type="number"
          step="1"
          min="1"
          value={overUnderValue}
          onChange={(e) => setOverUnderValue(e.target.value)}
          placeholder="30"
          className="border-zinc-700 bg-zinc-800 text-white placeholder:text-zinc-500"
          required
        />
        <p className="text-xs text-zinc-500">
          Bet closes in this many minutes. Over = happens faster, Under = takes longer.
        </p>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex gap-2 pt-1">
        <Button
          type="submit"
          disabled={submitting}
          className="flex-1 bg-white text-black hover:bg-zinc-200"
        >
          {submitting ? 'Creating...' : 'Set Line'}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="border-zinc-700 text-zinc-400 hover:text-white"
          >
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
