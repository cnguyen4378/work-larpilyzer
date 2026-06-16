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
      .channel('app-updates')
      .on('broadcast', { event: 'data-changed' }, handleChange)
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])
}
