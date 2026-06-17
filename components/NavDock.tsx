'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Live' },
  { href: '/results', label: 'Results' },
  { href: '/leaderboard', label: 'Leaderboard' },
]

export default function NavDock() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-zinc-800 bg-zinc-950/95 backdrop-blur">
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ href, label }) => {
          const isActive = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-3 text-xs font-semibold transition-colors ${
                isActive
                  ? 'text-white'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {isActive && (
                <span className="mb-0.5 h-0.5 w-6 rounded-full bg-white" />
              )}
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
