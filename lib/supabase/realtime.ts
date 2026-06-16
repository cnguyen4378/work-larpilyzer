'use client'

import { useEffect, useRef } from 'react'
import { getLines } from '@/app/actions'
import { createClient } from './client'
import type { LineWithBets } from '@/types'

export function useLineUpdates(onUpdate: (lines: LineWithBets[]) => void): void {
  const onUpdateRef = useRef(onUpdate)
  onUpdateRef.current = onUpdate

  useEffect(() => {
    const supabase = createClient()

    const handleChange = async () => {
      const lines = await getLines()
      onUpdateRef.current(lines)
    }

    const channel = supabase
      .channel('db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lines' }, handleChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bets' }, handleChange)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
