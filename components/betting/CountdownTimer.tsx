'use client'

import { useEffect, useRef, useState } from 'react'

function formatMs(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0) {
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  }
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export function CountdownTimer({ closesAt, onExpire }: { closesAt: Date; onExpire?: () => void }) {
  const [remaining, setRemaining] = useState(() => closesAt.getTime() - Date.now())
  const onExpireRef = useRef(onExpire)
  onExpireRef.current = onExpire
  const firedRef = useRef(false)

  useEffect(() => {
    firedRef.current = false
    const interval = setInterval(() => {
      const r = closesAt.getTime() - Date.now()
      setRemaining(r)
      if (r <= 0 && !firedRef.current) {
        firedRef.current = true
        onExpireRef.current?.()
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [closesAt])

  if (remaining <= 0) {
    return (
      <span className="text-xs font-bold uppercase tracking-widest text-red-500">
        BETTING CLOSED
      </span>
    )
  }

  const urgent = remaining < 60_000

  return (
    <span
      className={`font-mono text-sm font-bold tabular-nums ${
        urgent ? 'animate-pulse text-red-400' : 'text-amber-400'
      }`}
    >
      {formatMs(remaining)}
    </span>
  )
}
