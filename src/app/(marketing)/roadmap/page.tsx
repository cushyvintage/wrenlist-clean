'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { MarketingNav } from '@/components/layout/MarketingNav'
import { MarketingFooter } from '@/components/layout/MarketingFooter'
import { Reveal } from '@/components/motion'
import { fetchApi, unwrapApiResponse } from '@/lib/api-utils'
import { useApiCall } from '@/hooks/useApiCall'
import { useAuthContext } from '@/contexts/AuthContext'
import type { RoadmapItemDTO, RoadmapStatus } from '@/types'

// Visible columns — rejected items are hidden both here and server-side.
const STATUS_ORDER: RoadmapStatus[] = [
  'under_consideration',
  'planned',
  'in_progress',
  'released',
]
const STATUS_LABEL: Record<RoadmapStatus, string> = {
  under_consideration: 'Under consideration',
  planned: 'Planned',
  in_progress: 'In progress',
  released: 'Released',
  rejected: 'Rejected',
}
const STATUS_COLOUR: Record<RoadmapStatus, string> = {
  under_consideration: 'text-purple-600',
  planned: 'text-blue-600',
  in_progress: 'text-amber-600',
  released: 'text-green-600',
  rejected: 'text-red-600',
}

export default function RoadmapPage() {
  const { user, isLoading: authLoading } = useAuthContext()
  const {
    data: items,
    isLoading: loading,
    error,
    call,
    setData,
  } = useApiCall<RoadmapItemDTO[]>([])

  const [pendingVote, setPendingVote] = useState<string | null>(null)

  // Submit-idea form
  const [formOpen, setFormOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [tag, setTag] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    call(() => fetchApi<RoadmapItemDTO[]>('/api/roadmap', { cache: 'no-store' }))
  }, [call])

  const grouped = useMemo(() => {
    const by: Record<RoadmapStatus, RoadmapItemDTO[]> = {
      under_consideration: [],
      planned: [],
      in_progress: [],
      released: [],
      rejected: [],
    }
    for (const item of items || []) {
      by[item.status].push(item)
    }
    for (const status of STATUS_ORDER) {
      by[status].sort((a, b) => {
        if (b.vote_count !== a.vote_count) return b.vote_count - a.vote_count
        return b.created_at.localeCompare(a.created_at)
      })
    }
    return by
  }, [items])

  async function handleVote(item: RoadmapItemDTO) {
    if (!user) {
      toast.info('Sign in to vote', {
        description: 'Create a free account to upvote ideas.',
        action: {
          label: 'Sign in',
          onClick: () => (window.location.href = '/login?next=/roadmap'),
        },
      })
      return
    }
    if (item.status === 'released') return

    setPendingVote(item.id)
    const previous = items || []
    // Optimistic update
    setData(
      previous.map((it) =>
        it.id === item.id
          ? {
              ...it,
              voted_by_me: !it.voted_by_me,
              vote_count: it.vote_count + (it.voted_by_me ? -1 : 1),
            }
          : it
      )
    )

    try {
      const res = await fetch(`/api/roadmap/${item.id}/vote`, { method: 'POST' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Vote failed')
      }
      const result = unwrapApiResponse<{ voted: boolean; vote_count: number }>(
        await res.json()
      )
      setData(
        previous.map((it) =>
          it.id === item.id
            ? { ...it, voted_by_me: result.voted, vote_count: result.vote_count }
            : it
        )
      )
    } catch (err) {
      setData(previous)
      toast.error(err instanceof Error ? err.message : 'Vote failed')
    } finally {
      setPendingVote(null)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!user) {
      toast.info('Sign in to submit ideas')
      return
    }
    if (title.trim().length < 3) {
      toast.error('Title must be at least 3 characters')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/roadmap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          tag: tag.trim() || 'general',
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Submission failed')
      }
      const created = unwrapApiResponse<RoadmapItemDTO>(await res.json())
      setData([...(items || []), created])
      setTitle('')
      setDescription('')
      setTag('')
      setFormOpen(false)
      toast.success('Idea submitted — thanks!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f0e8]">
      <MarketingNav />

      {/* HEADER */}
      <div className="bg-white border-b border-[rgba(61,92,58,0.14)] px-5 sm:px-10 py-12">
        <div className="max-w-5xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-5 mb-6">
            <div>
              <h1 className="hero-fade-1 font-serif text-3xl font-normal text-[#1e2e1c] mb-1">
                What we&apos;re <em className="italic">building.</em>
              </h1>
              <p className="hero-fade-2 text-sm font-normal text-[#4a6147]">
                See what&apos;s shipped, what&apos;s in progress, and what&apos;s coming next.
                {user
                  ? ' Upvote the ideas you want most, or suggest your own.'
                  : ' Sign in to upvote and submit ideas.'}
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              {user ? (
                <button
                  onClick={() => setFormOpen((v) => !v)}
                  className="text-xs font-medium px-3 py-2 rounded-md bg-[#5a7a57] text-white hover:bg-[#4a6147] transition-colors"
                >
                  {formOpen ? 'Cancel' : '+ Suggest an idea'}
                </button>
              ) : (
                <Link
                  href="/login?next=/roadmap"
                  className="text-xs font-medium px-3 py-2 rounded-md bg-[#5a7a57] text-white hover:bg-[#4a6147] transition-colors"
                >
                  Sign in to vote
                </Link>
              )}
            </div>
          </div>

          {formOpen && user && (
            <form
              onSubmit={handleSubmit}
              className="bg-[#f5f0e8] border border-[rgba(61,92,58,0.14)] rounded-md p-4 mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-medium text-[#4a6147] mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  placeholder="What should we build?"
                  className="w-full text-sm px-3 py-2 rounded-md border border-[rgba(61,92,58,0.14)] bg-white focus:outline-none focus:ring-2 focus:ring-[#5a7a57]/30"
                  disabled={submitting}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a6147] mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={600}
                  rows={3}
                  placeholder="Why would this matter? Any context helps us prioritise."
                  className="w-full text-sm px-3 py-2 rounded-md border border-[rgba(61,92,58,0.14)] bg-white focus:outline-none focus:ring-2 focus:ring-[#5a7a57]/30 resize-y"
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#4a6147] mb-1">
                  Tag (optional)
                </label>
                <input
                  type="text"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  maxLength={30}
                  placeholder="e.g. marketplace, ai, mobile"
                  className="w-full text-sm px-3 py-2 rounded-md border border-[rgba(61,92,58,0.14)] bg-white focus:outline-none focus:ring-2 focus:ring-[#5a7a57]/30"
                  disabled={submitting}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={submitting || title.trim().length < 3}
                  className="text-xs font-medium px-3 py-2 rounded-md bg-[#5a7a57] text-white hover:bg-[#4a6147] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Submitting…' : 'Submit idea'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* COLUMN HEADERS */}
      <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-4 px-5 sm:px-10 py-7 max-w-5xl mx-auto">
        {STATUS_ORDER.map((status) => (
          <div
            key={status}
            className={`text-xs font-medium uppercase ${STATUS_COLOUR[status]} flex items-center gap-1`}
          >
            {STATUS_LABEL[status]} <strong>{grouped[status].length}</strong>
          </div>
        ))}
      </Reveal>

      {/* CONTENT */}
      {loading || authLoading ? (
        <div className="max-w-5xl mx-auto px-5 sm:px-10 py-8 text-sm text-[#4a6147]">
          Loading roadmap…
        </div>
      ) : error ? (
        <div className="max-w-5xl mx-auto px-5 sm:px-10 py-8 text-sm text-red-600">
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-5 sm:px-10 py-8 max-w-5xl mx-auto">
          {STATUS_ORDER.map((status) => (
            <div key={status}>
              {grouped[status].length === 0 && (
                <p className="text-xs text-[#4a6147]/70 italic">No items yet.</p>
              )}
              {grouped[status].map((item) => (
                <RoadmapCard
                  key={item.id}
                  item={item}
                  pending={pendingVote === item.id}
                  onVote={() => handleVote(item)}
                />
              ))}
            </div>
          ))}
        </div>
      )}

      <MarketingFooter />
    </div>
  )
}

function RoadmapCard({
  item,
  pending,
  onVote,
}: {
  item: RoadmapItemDTO
  pending: boolean
  onVote: () => void
}) {
  const isReleased = item.status === 'released'
  const voteLabel = `${item.voted_by_me ? 'Remove upvote for' : 'Upvote'} ${item.title}. ${item.vote_count} ${item.vote_count === 1 ? 'vote' : 'votes'}.`

  return (
    <div
      className={`rounded-md p-4 mb-2.5 border transition-all ${
        item.featured
          ? 'border-[#5a7a57] bg-[#5a7a57]/5'
          : 'border-[rgba(61,92,58,0.14)] bg-white'
      }`}
    >
      <div className="text-sm font-medium text-[#1e2e1c] mb-1 leading-tight">
        {item.title}
      </div>
      {item.description && (
        <p className="text-xs font-normal text-[#4a6147] leading-relaxed mb-2.5">
          {item.description}
        </p>
      )}
      <div className="flex items-center justify-between mt-2.5">
        {isReleased ? (
          <span className="text-xs font-medium text-[#5a7a57]">✓ Released</span>
        ) : (
          <button
            onClick={onVote}
            disabled={pending}
            aria-label={voteLabel}
            aria-pressed={item.voted_by_me}
            className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded border transition-colors disabled:opacity-60 ${
              item.voted_by_me
                ? 'bg-[#5a7a57] border-[#5a7a57] text-white hover:bg-[#4a6147]'
                : 'bg-[#ede8de] border-[rgba(61,92,58,0.14)] text-[#4a6147] hover:bg-[#ded8c8]'
            }`}
          >
            <span aria-hidden>▲</span>
            <span>{item.vote_count}</span>
          </button>
        )}
        <span className="text-xs text-[#4a6147] bg-[#ede8de] px-2 py-1 rounded">
          {item.tag}
        </span>
      </div>
    </div>
  )
}
