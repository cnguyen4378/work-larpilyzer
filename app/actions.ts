'use server'

import { cookies } from 'next/headers'
import { createServerSupabaseClient, createServiceRoleClient } from '@/lib/supabase/server'
import {
  closeLineEarly as dbCloseLineEarly,
  createInviteLink as dbCreateInviteLink,
  createLine as dbCreateLine,
  createUser,
  deleteLine as dbDeleteLine,
  getInviteLinkByToken,
  getLines as dbGetLines,
  getUserById,
  getUserByUsername,
  placeBet as dbPlaceBet,
  resolveLine as dbResolveLine,
} from '@/lib/supabase/db'
import type { Bet, BetSide, CreateLineInput, InviteLink, Line, LineWithBets, User } from '@/types'

async function broadcastUpdate(): Promise<void> {
  await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: process.env.SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
    },
    body: JSON.stringify({
      messages: [{ topic: 'realtime:app-updates', event: 'data-changed', payload: {} }],
    }),
  })
}

async function getAuthenticatedUserId(): Promise<string> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  if (!userId) throw new Error('Not authenticated.')
  return userId
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value
  if (!userId) return null
  const supabase = createServiceRoleClient()
  return getUserById(supabase, userId)
}

export async function joinViaInvite(token: string, username: string): Promise<User> {
  const supabase = createServiceRoleClient()

  const existingUser = await getUserByUsername(supabase, username)
  if (existingUser) throw new Error('Username already taken.')

  const inviteLink = await getInviteLinkByToken(supabase, token)
  if (!inviteLink) throw new Error('Invalid invite link.')
  if (inviteLink.expiresAt && new Date() > inviteLink.expiresAt) throw new Error('Invite link has expired.')

  const user = await createUser(supabase, username, token)

  await supabase
    .from('invite_links')
    .update({ used_count: inviteLink.usedCount + 1 })
    .eq('id', inviteLink.id)

  const cookieStore = await cookies()
  cookieStore.set('user_id', user.id, { httpOnly: true, sameSite: 'lax', path: '/' })

  return user
}

export async function createLine(data: CreateLineInput, userId: string): Promise<Line> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  const line = await dbCreateLine(createServiceRoleClient(), data, authedId)
  void broadcastUpdate()
  return line
}

export async function placeBet(lineId: string, userId: string, side: BetSide): Promise<Bet> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  const bet = await dbPlaceBet(createServiceRoleClient(), lineId, authedId, side)
  void broadcastUpdate()
  return bet
}

export async function resolveLine(lineId: string, outcome: BetSide, resolvedBy: string): Promise<Line> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== resolvedBy) throw new Error('Not authenticated.')
  const line = await dbResolveLine(createServiceRoleClient(), lineId, outcome, authedId)
  void broadcastUpdate()
  return line
}

export async function getLines(): Promise<LineWithBets[]> {
  const cookieStore = await cookies()
  const userId = cookieStore.get('user_id')?.value ?? ''
  return dbGetLines(createServiceRoleClient(), userId)
}

export async function loginByUsername(username: string): Promise<User> {
  const supabase = createServiceRoleClient()
  const user = await getUserByUsername(supabase, username)
  if (!user) throw new Error('Username not found.')
  const cookieStore = await cookies()
  cookieStore.set('user_id', user.id, { httpOnly: true, sameSite: 'lax', path: '/' })
  return user
}

export async function closeLineEarly(lineId: string): Promise<Line> {
  await getAuthenticatedUserId()
  const line = await dbCloseLineEarly(createServiceRoleClient(), lineId)
  void broadcastUpdate()
  return line
}

export async function deleteLine(lineId: string, userId: string): Promise<void> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  await dbDeleteLine(createServiceRoleClient(), lineId)
  void broadcastUpdate()
}

export async function createInviteLink(userId: string): Promise<InviteLink> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  return dbCreateInviteLink(createServiceRoleClient(), authedId)
}
