'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthContext } from '@/contexts/AuthContext'
import { isAdmin } from '@/lib/admin'
import { fetchApi } from '@/lib/api-utils'

interface WaitlistSignup {
  id: string
  email: string
  name: string
  platforms: string[]
  pain_point: string | null
  business_stage: string | null
  scale: string | null
  blocker: string | null
  referral_code: string
  referral_count: number
  source: 'landing' | 'referral'
  created_at: string
  ip_address: string | null
}

interface WaitlistResponse {
  signups: WaitlistSignup[]
  total: number
  page: number
  limit: number
}

export default function AdminWaitlistPage() {
  const router = useRouter()
  const { user } = useAuthContext()
  const [data, setData] = useState<WaitlistResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [error, setError] = useState<string | null>(null)

  // Admin gate
  useEffect(() => {
    if (user && !isAdmin(user.email)) {
      router.replace('/dashboard')
    }
  }, [user, router])

  // Fetch waitlist data
  useEffect(() => {
    const loadWaitlist = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const result = await fetchApi<WaitlistResponse>(
          `/api/admin/waitlist?page=${page}&limit=50`,
        )
        setData(result)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load waitlist')
      } finally {
        setIsLoading(false)
      }
    }

    loadWaitlist()
  }, [page])

  if (!user || !isAdmin(user.email)) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Waitlist</h1>
          <p className="mt-1 text-sm text-gray-600">
            {data?.total ?? '—'} total signups
          </p>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-50 p-4">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full divide-y divide-gray-200 text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Name
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Email
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Platforms
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Stage
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Referrals
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Source
              </th>
              <th className="px-6 py-3 text-left font-semibold text-gray-900">
                Signed Up
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
            ) : !data?.signups?.length ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-600">
                  No signups yet
                </td>
              </tr>
            ) : (
              data.signups.map((signup) => (
                <tr key={signup.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {signup.name}
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    <a
                      href={`mailto:${signup.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {signup.email}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    {signup.platforms?.length ? (
                      <div className="flex flex-wrap gap-1">
                        {signup.platforms.map((p) => (
                          <span
                            key={p}
                            className="inline-block rounded bg-gray-100 px-2 py-1 text-xs font-medium text-gray-700"
                          >
                            {p}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {signup.business_stage ? (
                      <span className="inline-block rounded bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {signup.business_stage.replace(/_/g, ' ')}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center font-semibold text-gray-900">
                    {signup.referral_count}
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-block rounded px-2 py-1 text-xs font-medium ${
                        signup.source === 'referral'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {signup.source}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {new Date(signup.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {data && data.total > 50 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Page {page} of {Math.ceil(data.total / data.limit)}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPage(Math.min(Math.ceil(data.total / data.limit), page + 1))
              }
              disabled={page >= Math.ceil(data.total / data.limit)}
              className="rounded border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
