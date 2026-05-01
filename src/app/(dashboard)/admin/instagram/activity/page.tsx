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

export default function AdminInstagramActivityPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [logs, setLogs] = useState<EngagementLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState({
    actionType: '',
    tier: '',
    status: '',
  })

  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    const loadLogs = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchApi<{ logs: EngagementLog[] }>(
          '/api/instagram/engagement-logs?limit=500',
        )
        setLogs(result.logs || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load logs')
      } finally {
        setIsLoading(false)
      }
    }

    loadLogs()
  }, [])

  if (!user || !isAdmin(user.email)) {
    return null
  }

  // Filter logs
  let filtered = logs
  if (filters.actionType) {
    filtered = filtered.filter((l) => l.action_type === filters.actionType)
  }
  if (filters.tier) {
    filtered = filtered.filter((l) => l.tier === parseInt(filters.tier))
  }
  if (filters.status) {
    filtered = filtered.filter((l) => l.status === filters.status)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Activity Log</h1>
          <p className="mt-1 text-sm text-gray-600">
            Detailed engagement activity history
          </p>
        </div>
        <Link
          href="/admin/instagram"
          className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back to Dashboard
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Action</label>
          <select
            value={filters.actionType}
            onChange={(e) =>
              setFilters({ ...filters, actionType: e.target.value })
            }
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="comment">Comments</option>
            <option value="follow">Follows</option>
            <option value="like">Likes</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Tier</label>
          <select
            value={filters.tier}
            onChange={(e) =>
              setFilters({ ...filters, tier: e.target.value })
            }
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="1">Tier 1</option>
            <option value="2">Tier 2</option>
            <option value="3">Tier 3</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Status</label>
          <select
            value={filters.status}
            onChange={(e) =>
              setFilters({ ...filters, status: e.target.value })
            }
            className="mt-1 rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
        <div className="flex items-end">
          <span className="text-sm text-gray-600">
            {filtered.length} results
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Date
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Action
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Account
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Tier
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Source
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Details
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                  Loading...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                  No activity found
                </td>
              </tr>
            ) : (
              filtered.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(log.created_at).toLocaleDateString()}{' '}
                    {new Date(log.created_at).toLocaleTimeString()}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        log.action_type === 'comment'
                          ? 'bg-blue-50 text-blue-700'
                          : log.action_type === 'follow'
                            ? 'bg-green-50 text-green-700'
                            : 'bg-pink-50 text-pink-700'
                      }`}
                    >
                      {log.action_type === 'comment'
                        ? '💬 Comment'
                        : log.action_type === 'follow'
                          ? '👤 Follow'
                          : '❤️ Like'}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {log.account_handle}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700">
                      Tier {log.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {log.source_account ? (
                      <span className="text-xs">{log.source_account}</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {log.comment_text ? (
                      <span className="text-xs italic">"{log.comment_text}"</span>
                    ) : log.post_content ? (
                      <span className="text-xs italic">"{log.post_content}"</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {log.status === 'completed' ? (
                      <span className="inline-block rounded bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
                        ✓ Completed
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span className="block rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700">
                          ✗ Failed
                        </span>
                        {log.error_reason && (
                          <span className="block text-xs text-gray-600">
                            {log.error_reason}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
