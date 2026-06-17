import type { SupabaseClient } from '@supabase/supabase-js'
import { computeBetSummary } from '../bet-logic'
import type { Bet, CreateLineInput, InviteLink, Line, LineWithBets, User } from '@/types'

function mapUser(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    username: row.username as string,
    inviteToken: (row.invite_token as string) ?? null,
  }
}

function mapLine(row: Record<string, unknown>): Line {
  return {
    id: row.id as string,
    title: row.title as string,
    description: (row.description as string) ?? '',
    overUnderValue: Number(row.over_under_value),
    timerDurationMs: Number(row.timer_duration_ms),
    createdBy: row.created_by as string,
    createdAt: new Date(row.created_at as string),
    closesAt: new Date(row.closes_at as string),
    status: row.status as Line['status'],
    resolvedOutcome: (row.resolved_outcome as Line['resolvedOutcome']) ?? null,
    resolvedBy: (row.resolved_by as string) ?? null,
    resolvedAt: row.resolved_at ? new Date(row.resolved_at as string) : null,
  }
}

function mapBet(row: Record<string, unknown>): Bet {
  const usersRow = row.users as Record<string, unknown> | null
  return {
    id: row.id as string,
    lineId: row.line_id as string,
    userId: row.user_id as string,
    username: (usersRow?.username as string) ?? '',
    side: row.side as Bet['side'],
    placedAt: new Date(row.placed_at as string),
  }
}

function mapInviteLink(row: Record<string, unknown>): InviteLink {
  return {
    id: row.id as string,
    token: row.token as string,
    createdBy: row.created_by as string,
    createdAt: new Date(row.created_at as string),
    expiresAt: row.expires_at ? new Date(row.expires_at as string) : null,
    usedCount: row.used_count as number,
  }
}

export async function getUserById(supabase: SupabaseClient, id: string): Promise<User | null> {
  const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
  if (error || !data) return null
  return mapUser(data)
}

export async function getUserByUsername(supabase: SupabaseClient, username: string): Promise<User | null> {
  const { data } = await supabase.from('users').select('*').eq('username', username).maybeSingle()
  if (!data) return null
  return mapUser(data)
}

export async function getInviteLinkByToken(supabase: SupabaseClient, token: string): Promise<InviteLink | null> {
  const { data } = await supabase.from('invite_links').select('*').eq('token', token).maybeSingle()
  if (!data) return null
  return mapInviteLink(data)
}

export async function createUser(supabase: SupabaseClient, username: string, inviteToken: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .insert({ username, invite_token: inviteToken })
    .select()
    .single()
  if (error) throw new Error(`Failed to create user: ${error.message}`)
  return mapUser(data)
}

export async function getLines(supabase: SupabaseClient, currentUserId: string): Promise<LineWithBets[]> {
  try { await supabase.rpc('refresh_line_statuses') } catch {}

  const { data: linesData, error: linesError } = await supabase
    .from('lines')
    .select('*')
    .neq('status', 'resolved')
    .order('created_at', { ascending: false })

  if (linesError) throw new Error(`Failed to fetch lines: ${linesError.message}`)

  const { data: betsData, error: betsError } = await supabase
    .from('bets')
    .select('*, users(username)')

  if (betsError) throw new Error(`Failed to fetch bets: ${betsError.message}`)

  const bets: Bet[] = (betsData ?? []).map(mapBet)

  const lines: LineWithBets[] = (linesData ?? []).map((row) => {
    const line = mapLine(row)
    const lineBets = bets.filter((b) => b.lineId === line.id)
    const summary = computeBetSummary(line, lineBets, currentUserId)
    return { ...line, bets: lineBets, summary }
  })

  return lines.sort((a, b) => {
    if (a.status === 'open' && b.status !== 'open') return -1
    if (a.status !== 'open' && b.status === 'open') return 1
    return 0
  })
}

export async function createLine(supabase: SupabaseClient, data: CreateLineInput, userId: string): Promise<Line> {
  const timerMs = data.overUnderValue * 60 * 1000
  const closesAt = new Date(Date.now() + timerMs).toISOString()
  const { data: row, error } = await supabase
    .from('lines')
    .insert({
      title: data.title,
      description: data.description ?? null,
      over_under_value: data.overUnderValue,
      timer_duration_ms: timerMs,
      created_by: userId,
      closes_at: closesAt,
    })
    .select()
    .single()
  if (error) throw new Error(`Failed to create line: ${error.message}`)
  return mapLine(row)
}

export async function placeBet(supabase: SupabaseClient, lineId: string, userId: string, side: string): Promise<Bet> {
  const { data: userRow } = await supabase.from('users').select('username').eq('id', userId).single()
  const { data: row, error } = await supabase
    .from('bets')
    .insert({ line_id: lineId, user_id: userId, side })
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('You already placed a bet on this line.')
    throw new Error(`Failed to place bet: ${error.message}`)
  }
  return { ...mapBet(row), username: userRow?.username ?? '' }
}

export async function resolveLine(supabase: SupabaseClient, lineId: string, outcome: string, resolvedBy: string): Promise<Line> {
  const { data: row, error } = await supabase
    .from('lines')
    .update({
      status: 'resolved',
      resolved_outcome: outcome,
      resolved_by: resolvedBy,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', lineId)
    .eq('status', 'closed') // prevent resolving open or already-resolved lines
    .select()
    .single()
  if (error) throw new Error(`Failed to resolve line: ${error.message}`)
  if (!row) throw new Error('Line is not closed yet or was already resolved.')
  return mapLine(row)
}

export async function closeLineEarly(supabase: SupabaseClient, lineId: string): Promise<Line> {
  const { data: row, error } = await supabase
    .from('lines')
    .update({ status: 'closed', closes_at: new Date().toISOString() })
    .eq('id', lineId)
    .eq('status', 'open')
    .select()
    .single()
  if (error) throw new Error(`Failed to close line: ${error.message}`)
  if (!row) throw new Error('Line is not open or does not exist.')
  return mapLine(row)
}

export async function getResolvedLines(supabase: SupabaseClient): Promise<LineWithBets[]> {
  const { data: linesData, error: linesError } = await supabase
    .from('lines')
    .select('*')
    .eq('status', 'resolved')
    .order('resolved_at', { ascending: false })

  if (linesError) throw new Error(`Failed to fetch resolved lines: ${linesError.message}`)

  if (!linesData || linesData.length === 0) return []

  const lineIds = linesData.map((r) => r.id as string)

  const { data: betsData, error: betsError } = await supabase
    .from('bets')
    .select('*, users(username)')
    .in('line_id', lineIds)

  if (betsError) throw new Error(`Failed to fetch bets for resolved lines: ${betsError.message}`)

  const bets: Bet[] = (betsData ?? []).map(mapBet)

  return linesData.map((row) => {
    const line = mapLine(row)
    const lineBets = bets.filter((b) => b.lineId === line.id)
    const summary = computeBetSummary(line, lineBets, '')
    return { ...line, bets: lineBets, summary }
  })
}

export interface LeaderboardEntry {
  userId: string
  username: string
  wins: number
  totalBets: number
  winRatio: number
}

export async function getLeaderboard(supabase: SupabaseClient): Promise<LeaderboardEntry[]> {
  const { data: linesData, error: linesError } = await supabase
    .from('lines')
    .select('id, resolved_outcome')
    .eq('status', 'resolved')

  if (linesError) throw new Error(`Failed to fetch resolved lines: ${linesError.message}`)
  if (!linesData || linesData.length === 0) return []

  const lineIds = linesData.map((r) => r.id as string)
  const { data: betsData, error: betsError } = await supabase
    .from('bets')
    .select('user_id, side, line_id, users(username)')
    .in('line_id', lineIds)

  if (betsError) throw new Error(`Failed to fetch bets: ${betsError.message}`)

  const allBets = betsData ?? []

  // Group bets by line to filter out solo lines (< 2 bets)
  const betsByLine = new Map<string, typeof allBets>()
  for (const bet of allBets) {
    const lid = bet.line_id as string
    const arr = betsByLine.get(lid) ?? []
    arr.push(bet)
    betsByLine.set(lid, arr)
  }

  const outcomeByLine = new Map<string, string>(
    linesData.map((r) => [r.id as string, r.resolved_outcome as string])
  )

  const statsMap = new Map<string, { username: string; wins: number; totalBets: number }>()

  for (const [lineId, bets] of betsByLine) {
    if (bets.length < 2) continue // ponytail: solo lines don't count
    const outcome = outcomeByLine.get(lineId)
    if (!outcome) continue

    for (const bet of bets) {
      const userId = bet.user_id as string
      const usersRow = bet.users as unknown as Record<string, unknown> | null
      const username = (usersRow?.username as string) ?? ''
      const entry = statsMap.get(userId) ?? { username, wins: 0, totalBets: 0 }
      entry.totalBets += 1
      if (bet.side === outcome) entry.wins += 1
      statsMap.set(userId, entry)
    }
  }

  return Array.from(statsMap.entries())
    .map(([userId, { username, wins, totalBets }]) => ({
      userId,
      username,
      wins,
      totalBets,
      winRatio: totalBets > 0 ? wins / totalBets : 0,
    }))
    .sort((a, b) => b.winRatio - a.winRatio || b.wins - a.wins)
}

export async function deleteLine(supabase: SupabaseClient, lineId: string): Promise<void> {
  const { error } = await supabase.from('lines').delete().eq('id', lineId)
  if (error) throw new Error(`Failed to delete line: ${error.message}`)
}

export async function createInviteLink(supabase: SupabaseClient, userId: string): Promise<InviteLink> {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
  const { data: row, error } = await supabase
    .from('invite_links')
    .insert({ token, created_by: userId })
    .select()
    .single()
  if (error) throw new Error(`Failed to create invite link: ${error.message}`)
  return mapInviteLink(row)
}
