import type { SupabaseClient } from '@supabase/supabase-js'

export type StashActivityAction = 'added' | 'removed' | 'moved' | 'merged'

interface StashActivityRow {
  user_id: string
  stash_id: string | null
  find_id: string | null
  action: StashActivityAction
  note?: string | null
}

/**
 * Best-effort write to stash_activity. Never throws; logs errors in dev.
 * Callers should use this instead of direct `.insert()` so a failed audit log
 * never silently breaks the activity history.
 */
export async function logStashActivity(
  supabase: SupabaseClient,
  rows: StashActivityRow | StashActivityRow[]
): Promise<void> {
  const payload = Array.isArray(rows) ? rows : [rows]
  if (payload.length === 0) return
  const { error } = await supabase.from('stash_activity').insert(payload)
  if (error && process.env.NODE_ENV !== 'production') {
    console.error('[stash_activity] insert failed:', error.message, 'rows:', payload.length)
  }
}
