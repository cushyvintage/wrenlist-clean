'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import { fetchApi } from '@/lib/api-utils'
import Link from 'next/link'

interface EngagementLog {
  id: string
  action_type: 'comment' | 'follow' | 'like'
  account_handle: string
  post_url: string | null
  post_content: string | null
  comment_text: string | null
  tier: 1 | 2 | 3
  source_account: string | null
  status: 'completed' | 'failed'
  error_reason: string | null
  created_at: string
}

interface MetricsData {
  total_comments: number
  total_follows: number
  total_likes: number
  tier_breakdown: { [key: number]: number }
  by_action_type: { comment: number; follow: number; like: number }
  success_rate: number
  top_accounts: Array<{ account: string; count: number }>
}

const ACTION_LABELS: Record<EngagementLog['action_type'], { icon: string; verb: string }> = {
  comment: { icon: '💬', verb: 'Commented on' },
  follow: { icon: '👤', verb: 'Followed' },
  like: { icon: '❤️', verb: 'Liked' },
}

export default function AdminInstagramPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [logs, setLogs] = useState<EngagementLog[]>([])
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Fetch recent logs
        const logsResult = await fetchApi<{ logs: EngagementLog[] }>(
          '/api/instagram/engagement-logs?limit=50',
        )
        setLogs(logsResult.logs || [])

        // Fetch metrics
        const metricsResult = await fetchApi<MetricsData>(
          '/api/instagram/engagement-metrics',
        )
        setMetrics(metricsResult)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load data')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  if (!user || !isAdmin(user.email)) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Instagram Engagement</h1>
          <p className="mt-1 text-sm text-gray-600">
            Track organic engagement across Tier 1/2/3 accounts
          </p>
        </div>
        <Link
          href="/admin/instagram/activity"
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          View Activity Log
        </Link>
      </div>

      {/* Tracking cutoff notice */}
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-medium text-amber-900">
          Tracking begins 1 May 2026
        </p>
        <p className="mt-1 text-sm text-amber-800">
          Earlier @wrenlistapp comments, follows, and likes aren&apos;t reflected here. The
          engagement-log API was cookie-only before this date, so scheduled scout runs
          using Bearer auth couldn&apos;t write rows. Treat counts below as authoritative
          from this date forward.
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Metrics Grid */}
      {!isLoading && metrics && (
        <div className="grid grid-cols-5 gap-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">Comments</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {metrics.total_comments}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">Follows</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {metrics.total_follows}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">Likes</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {metrics.total_likes}
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">Success Rate</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {(metrics.success_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-4">
            <p className="text-sm font-medium text-gray-600">Unique Accounts</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">
              {metrics.top_accounts.length}
            </p>
          </div>
        </div>
      )}

      {/* Tier Breakdown */}
      {!isLoading && metrics && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">By Tier</h2>
          <div className="mt-4 space-y-3">
            {[1, 2, 3].map((tier) => (
              <div key={tier} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">
                  Tier {tier}
                </span>
                <div className="flex items-center gap-4">
                  <div className="h-2 w-32 rounded-full bg-gray-100">
                    <div
                      className="h-2 rounded-full bg-blue-600"
                      style={{
                        width: `${((metrics.tier_breakdown[tier] || 0) / Math.max(1, metrics.total_comments + metrics.total_follows + metrics.total_likes)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 w-12 text-right">
                    {metrics.tier_breakdown[tier] || 0}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
        {isLoading ? (
          <p className="mt-4 text-center text-gray-600">Loading...</p>
        ) : logs.length === 0 ? (
          <p className="mt-4 text-center text-gray-600">No activity yet</p>
        ) : (
          <div className="mt-4 space-y-3">
            {logs.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="flex items-center justify-between border-b border-gray-100 py-3 last:border-b-0"
              >
                <div>
                  <p className="font-medium text-gray-900">
                    {ACTION_LABELS[log.action_type].icon}{' '}
                    {ACTION_LABELS[log.action_type].verb}{' '}
                    <span className="font-semibold">{log.account_handle}</span>
                  </p>
                  {log.comment_text && (
                    <p className="mt-1 text-sm text-gray-600">"{log.comment_text}"</p>
                  )}
                  <div className="mt-1 flex gap-2">
                    <span className="inline-block rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                      Tier {log.tier}
                    </span>
                    {log.source_account && (
                      <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                        via {log.source_account}
                      </span>
                    )}
                    {log.status === 'failed' && (
                      <span className="inline-block rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                        Failed
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right text-sm text-gray-600">
                  {new Date(log.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
