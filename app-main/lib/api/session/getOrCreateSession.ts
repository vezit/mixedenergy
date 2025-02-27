// lib/api/session/getOrCreateSession.ts

import { parse } from 'cookie'
import { v4 as uuidv4 } from 'uuid'
import { supabaseAdmin } from '../supabaseAdmin'

/** Session-related interfaces */
export interface SessionRow {
  session_id: string
  basket_details?: BasketDetails
  allow_cookies?: boolean
  temporary_selections?: Record<string, any>
}

interface BasketDetails {
  items?: BasketItem[]
  customerDetails?: CustomerDetails
  deliveryDetails?: any
  paymentDetails?: any
}

interface BasketItem {
  slug: string
  quantity: number
}

interface CustomerDetails {
  fullName?: string | null
  mobileNumber?: string | null
}

/**
 * getOrCreateSession
 *   1) Read the 'session_id' cookie (if present).
 *   2) Check if it's used in orders; if yes => force a new session.
 *   3) If it's in sessions (and not in orders), reuse it.
 *   4) If not found, create a brand-new session_id that doesn't exist in sessions or orders.
 *   5) Return session (with basket details or without if noBasket=true).
 */
export async function getOrCreateSession(cookieHeader?: string, noBasket = false) {
  // 1) Parse the cookie
  const cookies = cookieHeader ? parse(cookieHeader) : {}
  let sessionIdFromCookie = cookies['session_id']
  let newlyCreated = false

  console.log('[getOrCreateSession] session_id from cookie:', sessionIdFromCookie)

  // ----------------------------------------------------------------------
  // A) If there is a session_id in the cookie, check if it’s in orders.
  // ----------------------------------------------------------------------
  if (sessionIdFromCookie) {
    const { data: inOrders, error: ordersErr } = await supabaseAdmin
      .from('orders')
      .select('session_id')
      .eq('session_id', sessionIdFromCookie)
      .maybeSingle()

    if (ordersErr) {
      console.error('[getOrCreateSession] Error checking orders table:', ordersErr)
      throw new Error(`Error checking orders for session_id: ${ordersErr.message}`)
    }

    if (inOrders) {
      // If it's used in orders, we do NOT reuse it => pretend there's no cookie
      console.warn('[getOrCreateSession] session_id is already used in orders. Generating new session.')
      sessionIdFromCookie = undefined
    }
  }

  // ----------------------------------------------------------------------
  // B) If sessionIdFromCookie is still set, check if it exists in sessions
  // ----------------------------------------------------------------------
  if (sessionIdFromCookie) {
    const { data: existingSession, error: sessionErr } = await supabaseAdmin
      .from('sessions')
      .select('*')
      .eq('session_id', sessionIdFromCookie)
      .maybeSingle<SessionRow>()

    if (sessionErr) {
      console.error('[getOrCreateSession] Error fetching session:', sessionErr)
      throw new Error(`Error fetching session: ${sessionErr.message}`)
    }

    // If found in sessions => reuse it
    if (existingSession) {
      console.log('[getOrCreateSession] Found existing session in DB:', existingSession.session_id)

      if (noBasket && existingSession.basket_details) {
        delete existingSession.basket_details
      }

      return {
        newlyCreated: false,
        session: existingSession,
        sessionId: existingSession.session_id,
      }
    }

    // If not found in sessions => proceed to create a new one
    console.warn(
      '[getOrCreateSession] Cookie with session_id exists, but no DB row found. Generating new session.'
    )
  }

  // ----------------------------------------------------------------------
  // C) Create a brand-new session_id that’s NOT in orders or sessions
  // ----------------------------------------------------------------------
  const sessionId = await generateUniqueSessionId()
  newlyCreated = true

  console.log('[getOrCreateSession] Creating NEW session:', sessionId)

  // Insert the new session row
  const { data: insertData, error: insertErr } = await supabaseAdmin
    .from('sessions')
    .insert([
      {
        session_id: sessionId,
        allow_cookies: false,
        basket_details: {
          items: [],
          customerDetails: { fullName: null, mobileNumber: null },
          deliveryDetails: {},
          paymentDetails: {},
        },
      },
    ])
    .select('*')
    .single()

  if (insertErr) {
    console.error('[getOrCreateSession] Error inserting new session row:', insertErr)
    throw new Error(`Error creating session row: ${insertErr.message}`)
  }

  if (!insertData) {
    throw new Error('[getOrCreateSession] Insert succeeded but no data returned.')
  }

  // D) Return the brand-new session
  return {
    newlyCreated,
    session: insertData,
    sessionId,
  }
}

/**
 * generateUniqueSessionId
 *   Creates a 20-char random session ID that does NOT exist
 *   in the 'sessions' or 'orders' tables. Retries up to 10 times.
 */
async function generateUniqueSessionId(): Promise<string> {
  let attempts = 0
  while (attempts < 10) {
    const candidate = uuidv4().slice(0, 20) // 20-char random ID

    // Check "sessions"
    const { data: inSessions, error: sesErr } = await supabaseAdmin
      .from('sessions')
      .select('session_id', { count: 'exact', head: true })
      .eq('session_id', candidate)

    if (sesErr) {
      console.error('[generateUniqueSessionId] Error checking sessions table:', sesErr)
      throw new Error(sesErr.message)
    }

    const sessionsCount = inSessions?.length ?? 0

    // Check "orders"
    const { data: inOrders, error: ordErr } = await supabaseAdmin
      .from('orders')
      .select('session_id', { count: 'exact', head: true })
      .eq('session_id', candidate)

    if (ordErr) {
      console.error('[generateUniqueSessionId] Error checking orders table:', ordErr)
      throw new Error(ordErr.message)
    }

    const ordersCount = inOrders?.length ?? 0

    // If neither table has this ID => success
    if (sessionsCount === 0 && ordersCount === 0) {
      return candidate
    }

    attempts++
  }

  // Extremely unlikely to happen with random 20-char IDs, but just in case:
  throw new Error('Unable to generate a unique session_id after 10 attempts!')
}
