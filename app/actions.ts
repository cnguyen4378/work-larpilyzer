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
  return dbCreateLine(createServiceRoleClient(), data, authedId)
}

export async function placeBet(lineId: string, userId: string, side: BetSide): Promise<Bet> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  return dbPlaceBet(createServiceRoleClient(), lineId, authedId, side)
}

export async function resolveLine(lineId: string, outcome: BetSide, resolvedBy: string): Promise<Line> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== resolvedBy) throw new Error('Not authenticated.')
  return dbResolveLine(createServiceRoleClient(), lineId, outcome, authedId)
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
  return dbCloseLineEarly(createServiceRoleClient(), lineId)
}

export async function deleteLine(lineId: string, userId: string): Promise<void> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  return dbDeleteLine(createServiceRoleClient(), lineId)
}

export async function createInviteLink(userId: string): Promise<InviteLink> {
  const authedId = await getAuthenticatedUserId()
  if (authedId !== userId) throw new Error('Not authenticated.')
  return dbCreateInviteLink(createServiceRoleClient(), authedId)
}
