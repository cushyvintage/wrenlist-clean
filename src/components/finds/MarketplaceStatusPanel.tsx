'use client'

import { friendlyError } from '@/lib/friendly-errors'

export type PublishErrorCode =
  | 'auth_expired'
  | 'captcha_required'
  | 'validation_error'
  | 'photo_upload_failed'
  | 'rate_limited'
  | 'server_error'
  | 'unknown'

export interface PublishErrorContext {
  code: PublishErrorCode
  summary: string
  actionUrl?: string
  fields?: Array<{ field: string; message: string }>
}

interface MarketplaceData {
  marketplace: string
  status: string
  platform_listing_url: string | null
  platform_listing_id: string | null
  error_message: string | null
  platform_listed_at: string | null
  fields?: Record<string, unknown> | null
}

interface MarketplaceStatusPanelProps {
  marketplaceData: MarketplaceData[]
  delistConfirm: string | null
  delistingPlatform: string | null
  retryingPlatform: string | null
  onDelistConfirm: (marketplace: string) => void
  onDelistCancel: () => void
  onDelistPlatform: (marketplace: string) => void
  onRetryPublish: (marketplace: string) => void
}

export function MarketplaceStatusPanel({
  marketplaceData,
  delistConfirm,
  delistingPlatform,
  retryingPlatform,
  onDelistConfirm,
  onDelistCancel,
  onDelistPlatform,
  onRetryPublish,
}: MarketplaceStatusPanelProps) {
  if (marketplaceData.length === 0) return null

  return (
    <div
      className="p-4 rounded"
      style={{
        backgroundColor: '#EDE8DE',
        borderWidth: '1px',
        borderColor: 'rgba(61,92,58,.14)',
      }}
    >
      <p className="text-xs uppercase tracking-wider font-medium mb-2" style={{ color: '#8A9E88' }}>
        Listed On
      </p>
      <div className="space-y-3">
        {marketplaceData.map((md) => (
          <div key={md.marketplace}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium capitalize" style={{ color: '#1E2E1C' }}>
                  {md.marketplace}
                </p>
                <span
                  className="text-xs flex items-center gap-1"
                  style={{
                    color: md.status === 'listed' ? '#3D5C3A'
                      : md.status === 'draft' ? '#B8860B'
                      : md.status === 'error' ? '#DC2626'
                      : md.status === 'needs_delist' ? '#C0392B'
                      : md.status === 'needs_publish' ? '#B8860B'
                      : '#8A9E88'
                  }}
                >
                  {(md.status === 'needs_delist' || md.status === 'needs_publish') && (
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  )}
                  {md.status === 'needs_delist' ? 'Delisting…'
                    : md.status === 'needs_publish' ? 'Publishing…'
                    : md.status === 'error' ? 'Error'
                    : md.status === 'draft' ? 'Draft'
                    : md.status === 'listed' ? 'Listed'
                    : md.status === 'delisted' ? 'Delisted'
                    : md.status}
                </span>
                {md.platform_listed_at && (
                  <span className="text-xs" style={{ color: '#8A9E88' }}>
                    Listed {new Date(md.platform_listed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {md.platform_listing_url && (
                  <a
                    href={md.platform_listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sage underline underline-offset-1 hover:text-sage-dk transition"
                  >
                    View →
                  </a>
                )}
                {(md.status === 'listed' || md.status === 'draft') && (
                  <>
                    {delistConfirm === md.marketplace ? (
                      <span className="flex items-center gap-1">
                        <button
                          onClick={() => onDelistPlatform(md.marketplace)}
                          disabled={delistingPlatform === md.marketplace}
                          className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                          style={{ backgroundColor: 'rgba(220,38,38,.12)', color: '#DC2626', borderWidth: '1px', borderColor: 'rgba(220,38,38,.3)' }}
                        >
                          {delistingPlatform === md.marketplace ? 'Delisting...' : 'Confirm'}
                        </button>
                        <button
                          onClick={onDelistCancel}
                          className="text-xs px-1.5 py-0.5 rounded transition-colors"
                          style={{ color: '#8A9E88' }}
                        >
                          Cancel
                        </button>
                      </span>
                    ) : (
                      <button
                        onClick={() => onDelistConfirm(md.marketplace)}
                        className="text-xs px-2 py-0.5 rounded transition-colors hover:bg-red-50"
                        style={{ color: '#8A9E88' }}
                      >
                        Delist
                      </button>
                    )}
                  </>
                )}
                {md.status === 'error' && (
                  <button
                    onClick={() => onRetryPublish(md.marketplace)}
                    disabled={retryingPlatform === md.marketplace}
                    className="text-xs px-2 py-0.5 rounded font-medium transition-colors"
                    style={{ backgroundColor: 'rgba(61,92,58,.1)', color: '#3D5C3A', borderWidth: '1px', borderColor: 'rgba(61,92,58,.3)' }}
                  >
                    {retryingPlatform === md.marketplace ? 'Retrying...' : 'Retry'}
                  </button>
                )}
              </div>
            </div>
            {(md.status === 'error' || md.status === 'needs_publish') && md.error_message && (
              <PublishErrorMessage
                marketplace={md.marketplace}
                status={md.status}
                errorMessage={md.error_message}
                fields={md.fields ?? null}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Renders a publish error with an action button when we've classified it
 * (auth/captcha/etc.). Falls back to the generic friendly message otherwise.
 * `fields` is the raw PMD fields JSON which contains `last_error_code` and
 * `last_error_context` written by the extension queue handler.
 */
function PublishErrorMessage({
  marketplace,
  status,
  errorMessage,
  fields,
}: {
  marketplace: string
  status: string
  errorMessage: string
  fields: Record<string, unknown> | null
}) {
  const context = fields?.last_error_context as PublishErrorContext | undefined
  const code = (fields?.last_error_code as PublishErrorCode | undefined) ?? context?.code
  const isRetrying = status === 'needs_publish'
  const palette = isRetrying
    ? { color: '#B45309', background: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.25)' }
    : { color: '#DC2626', background: 'rgba(220,38,38,.06)', border: 'rgba(220,38,38,.22)' }

  const summary = context?.summary ?? friendlyError(marketplace, errorMessage)
  const prefix = isRetrying ? 'Retrying — ' : ''

  return (
    <div
      className="text-xs mt-1 px-2 py-1.5 rounded space-y-1.5"
      style={{ color: palette.color, backgroundColor: palette.background, border: `1px solid ${palette.border}` }}
      role="status"
    >
      <p>{prefix}{summary}</p>

      {code === 'validation_error' && context?.fields && context.fields.length > 0 && (
        <ul className="pl-4 list-disc space-y-0.5">
          {context.fields.map((f) => (
            <li key={f.field}>
              <strong className="capitalize">{f.field}:</strong> {f.message}
            </li>
          ))}
        </ul>
      )}

      {code === 'captcha_required' && context?.actionUrl && (
        <a
          href={context.actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block mt-1 px-2 py-1 text-[11px] font-medium rounded"
          style={{ backgroundColor: palette.color, color: '#fff' }}
        >
          Open captcha →
        </a>
      )}

      {code === 'auth_expired' && (
        <a
          href="/platform-connect"
          className="inline-block mt-1 px-2 py-1 text-[11px] font-medium rounded"
          style={{ backgroundColor: palette.color, color: '#fff' }}
        >
          Reconnect {marketplace} →
        </a>
      )}
    </div>
  )
}
