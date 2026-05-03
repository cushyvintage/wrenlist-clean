import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/with-auth'
import { getAdminClient } from '@/lib/supabase-admin'

interface LogBody {
  action: 'applied' | 'refined' | 'final'
  findId?: string | null
  suggestion: Record<string, unknown>
  fieldOutcomes?: Record<string, 'kept' | 'rejected' | 'overridden'>
  userFeedback?: string
  finalValues?: Record<string, unknown>
  promptVersion?: number
  model?: string
  confidence?: string
  photoCount?: number
}

/**
 * Fire-and-forget logger for AI suggestion outcomes. Stored in
 * `ai_corrections` and used to (a) measure model accuracy per field,
 * (b) build a per-user few-shot bank of past corrections, (c) replay as
 * an eval set when prompts change.
 *
 * Always returns 200 — we never want a logging failure to break the
 * add-find flow.
 */
export const POST = withAuth(async (request, user) => {
  try {
    const body = (await request.json()) as LogBody

    if (!body.action || !body.suggestion) {
      return NextResponse.json({ ok: false, reason: 'missing_required' }, { status: 200 })
    }

    const admin = getAdminClient()
    const { error } = await admin.from('ai_corrections').insert({
      user_id: user.id,
      find_id: body.findId ?? null,
      action: body.action,
      suggestion: body.suggestion,
      field_outcomes: body.fieldOutcomes ?? null,
      user_feedback: body.userFeedback ?? null,
      final_values: body.finalValues ?? null,
      prompt_version: body.promptVersion ?? null,
      model: body.model ?? null,
      confidence: body.confidence ?? null,
      photo_count: body.photoCount ?? null,
    })

    if (error) {
      console.error('Failed to log AI correction:', error)
      return NextResponse.json({ ok: false }, { status: 200 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('log-correction error:', error)
    return NextResponse.json({ ok: false }, { status: 200 })
  }
})
