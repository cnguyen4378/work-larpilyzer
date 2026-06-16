import { NextResponse } from 'next/server'
import { getLines } from '@/app/actions'

export async function GET() {
  try {
    const lines = await getLines()
    return NextResponse.json(lines)
  } catch {
    return NextResponse.json({ error: 'Failed to fetch lines' }, { status: 500 })
  }
}
