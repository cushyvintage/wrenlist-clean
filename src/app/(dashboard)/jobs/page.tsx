'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { MarketplaceIcon } from '@/components/wren/MarketplaceIcon'
import { useExtensionHeartbeat } from '@/hooks/useExtensionHeartbeat'
import { fetchApi } from '@/lib/api-utils'
import type { PublishJob, Platform, JobStatus } from '@/types'

type TabFilter = 'all' | 'pending' | 'scheduled' | 'running' | 'completed' | 'failed'

const TAB_FILTERS: { id: TabFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'pending', label: 'Pending' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'running', label: 'Running' },
  { id: 'completed', label: 'Completed' },
  { id: 'failed', label: 'Failed' },
]

function statusToQuery(tab: TabFilter): string | undefined {
  switch (tab) {
    case 'all': return undefined
    case 'pending': return 'pending,claimed'
    case 'scheduled': return 'pending' // filtered client-side for scheduled_for
    case 'running': return 'running'
    case 'completed': return 'completed'
    case 'failed': return 'failed,cancelled'
  }
}

function StatusBadge({ status }: { status: JobStatus }) {
  const styles: Record<string, string> = {
    pending: 'bg-amber-100 text-amber-800',
    claimed: 'bg-blue-100 text-blue-800',
    running: 'bg-blue-100 text-blue-800',
    completed: 'bg-sage-pale text-sage',
    failed: 'bg-red-50 text-red',
    cancelled: 'bg-gray-100 text-gray-600',
  }
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function ActionBadge({ action }: { action: string }) {
  const label = action === 'publish' ? '↗ Publish' : action === 'delist' ? '↙ Delist' : action
  return <span className="text-xs text-ink-lt">{label}</span>
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function formatSchedule(iso: string | null): string {
  if (!iso) return 'ASAP'
  const d = new Date(iso)
  const now = new Date()
  if (d <= now) return 'Now (was scheduled)'
  return d.toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function JobsPage() {
  const heartbeat = useExtensionHeartbeat()
  const [jobs, setJobs] = useState<(PublishJob & { finds?: { name: string; photos: string[]; sku: string } })[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabFilter>('all')
  const [expandedError, setExpandedError] = useState<string | null>(null)
  const refreshRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadJobs = useCallback(async () => {
    try {
      const statusQ = statusToQuery(activeTab)
      const url = statusQ ? `/api/jobs?status=${statusQ}&limit=100` : '/api/jobs?limit=100'
      const data = await fetchApi<(PublishJob & { finds?: { name: string; photos: string[]; sku: string } })[]>(url)
      // Client-side filter for "scheduled" tab
      if (activeTab === 'scheduled') {
        setJobs(data.filter((j) => j.scheduled_for && j.status === 'pending'))
      } else {
        setJobs(data)
      }
    } catch {
      // silently fail, keep existing data
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  useEffect(() => {
    setLoading(true)
    loadJobs()

    // Auto-refresh every 10s for active tabs
    if (['all', 'pending', 'scheduled', 'running'].includes(activeTab)) {
      refreshRef.current = setInterval(loadJobs, 10_000)
    }
    return () => {
      if (refreshRef.current) clearInterval(refreshRef.current)
    }
  }, [loadJobs, activeTab])

  const hasHistory = jobs.some((j) => ['completed', 'failed', 'cancelled'].includes(j.status))

  const handleClearHistory = async () => {
    try {
      await fetch('/api/jobs', { method: 'DELETE' })
      loadJobs()
    } catch { /* ignore */ }
  }

  const handleCancel = async (jobId: string) => {
    try {
      await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      })
      loadJobs()
    } catch { /* ignore */ }
  }

  const handleRetry = async (job: PublishJob) => {
    try {
      await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          find_id: job.find_id,
          platform: job.platform,
          action: job.action,
          payload: job.payload,
        }),
      })
      loadJobs()
    } catch { /* ignore */ }
  }

  return (
    <div className="space-y-6">
      {/* Extension status banner */}
      <div className={`flex items-center gap-3 p-3 rounded border ${
        heartbeat.online
          ? 'bg-sage-pale border-sage'
          : heartbeat.online === false
            ? 'bg-amber-50 border-amber-200'
            : 'bg-cream border-border'
      }`}>
        <div className={`w-2 h-2 rounded-full ${
          heartbeat.online ? 'bg-sage' : heartbeat.online === false ? 'bg-amber-500' : 'bg-ink-lt animate-pulse'
        }`} />
        <span className="text-sm text-ink">
          {heartbeat.loading
            ? 'Checking extension status...'
            : heartbeat.online
              ? `Desktop extension online${heartbeat.version ? ` (v${heartbeat.version})` : ''}`
              : 'Desktop extension offline — queued jobs will run when your computer is back'}
        </span>
        {heartbeat.lastSeenAt && !heartbeat.online && (
          <span className="text-xs text-ink-lt ml-auto">Last seen {timeAgo(heartbeat.lastSeenAt)}</span>
        )}
      </div>

      {/* Tab filters + clear history */}
      <div className="flex items-center border-b border-border">
        <div className="flex gap-1 flex-1">
          {TAB_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-sage text-sage'
                  : 'border-transparent text-ink-lt hover:text-ink'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {hasHistory && (
          <button
            onClick={handleClearHistory}
            className="px-3 py-1.5 text-xs font-medium text-ink-lt hover:text-red transition-colors"
          >
            Clear history
          </button>
        )}
      </div>

      {/* Jobs table */}
      {loading ? (
        <div className="text-center py-12 text-ink-lt text-sm">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-ink-lt text-sm">No jobs found</div>
          <div className="text-ink-lt text-xs mt-1">Jobs are created when you crosslist or delist items</div>
        </div>
      ) : (
        <div className="border border-border rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-cream text-left text-xs text-ink-lt uppercase tracking-wide">
                <th className="px-4 py-2">Item</th>
                <th className="px-4 py-2">Platform</th>
                <th className="px-4 py-2">Action</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Schedule</th>
                <th className="px-4 py-2">Created</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {jobs.map((job) => (
                <tr key={job.id} className="hover:bg-cream/50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-ink truncate max-w-[200px]">
                      {job.finds?.name || job.find_id.slice(0, 8)}
                    </div>
                    {job.finds?.sku && (
                      <div className="text-xs text-ink-lt">{job.finds.sku}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <MarketplaceIcon platform={job.platform as Platform} size="sm" />
                      <span className="capitalize text-ink">{job.platform}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <ActionBadge action={job.action} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={job.status} />
                    {job.attempts > 0 && job.status !== 'completed' && (
                      <span className="text-xs text-ink-lt ml-1">({job.attempts}/{job.max_attempts})</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-lt">
                    {formatSchedule(job.scheduled_for)}
                    {job.stale_policy === 'skip_if_late' && job.scheduled_for && (
                      <div className="text-[10px] text-amber-600">skip if late</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-ink-lt">
                    {timeAgo(job.created_at)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {job.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(job.id)}
                          className="text-xs text-red hover:underline"
                        >
                          Cancel
                        </button>
                      )}
                      {(job.status === 'failed' || job.status === 'cancelled') && (
                        <button
                          onClick={() => handleRetry(job)}
                          className="text-xs text-sage hover:underline"
                        >
                          Retry
                        </button>
                      )}
                      {job.error_message && (
                        <button
                          onClick={() => setExpandedError(expandedError === job.id ? null : job.id)}
                          className="text-xs text-ink-lt hover:text-ink"
                        >
                          {expandedError === job.id ? 'Hide error' : 'Error'}
                        </button>
                      )}
                    </div>
                    {expandedError === job.id && job.error_message && (
                      <div className="mt-2 p-2 bg-red-50 border border-red/20 rounded text-xs text-red max-w-[300px]">
                        {job.error_message}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
