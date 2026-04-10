'use client'

interface FindNotificationBannersProps {
  vintedListResult: { ok: boolean; message: string; url?: string } | null
  ebayListResult: { ok: boolean; message: string } | null
  crosslistResult: { ok: boolean; message: string } | null
  error: string | null
  saveSuccess: boolean
  photoError: string | null
  extensionDetected: boolean | null
  findStatus: string | undefined
  onDismissVinted: () => void
  onDismissEbay: () => void
  onDismissCrosslist: () => void
  onDismissPhotoError: () => void
}

export function FindNotificationBanners({
  vintedListResult,
  ebayListResult,
  crosslistResult,
  error,
  saveSuccess,
  photoError,
  extensionDetected,
  findStatus,
  onDismissVinted,
  onDismissEbay,
  onDismissCrosslist,
  onDismissPhotoError,
}: FindNotificationBannersProps) {
  return (
    <>
      {/* Vinted list result */}
      {vintedListResult && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: vintedListResult.ok ? 'rgba(61,92,58,.08)' : 'rgba(220,38,38,.08)',
            borderWidth: '1px',
            borderColor: vintedListResult.ok ? 'rgba(61,92,58,.2)' : 'rgba(220,38,38,.2)',
            color: vintedListResult.ok ? '#3D5C3A' : '#DC2626',
          }}
        >
          <span>{vintedListResult.ok ? '✓ ' : '✗ '}{vintedListResult.message}</span>
          {vintedListResult.ok && vintedListResult.url && (
            <a href={vintedListResult.url} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, textDecoration: 'underline', fontWeight: 600 }}>View on Vinted →</a>
          )}
          <button onClick={onDismissVinted} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* eBay list result */}
      {ebayListResult && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: ebayListResult.ok ? 'rgba(61,92,58,.08)' : 'rgba(220,38,38,.08)',
            borderWidth: '1px',
            borderColor: ebayListResult.ok ? 'rgba(61,92,58,.2)' : 'rgba(220,38,38,.2)',
            color: ebayListResult.ok ? '#3D5C3A' : '#DC2626',
          }}
        >
          <span>{ebayListResult.ok ? '✓ ' : '✗ '}{ebayListResult.message}</span>
          <button onClick={onDismissEbay} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Extension not detected warning */}
      {extensionDetected === false && findStatus !== 'sold' && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(234,179,8,.08)',
            borderWidth: '1px',
            borderColor: 'rgba(234,179,8,.3)',
            color: '#92400E',
          }}
        >
          <span>
            Wrenlist extension not detected — crosslisting requires the Chrome extension.{' '}
            <a
              href="https://chromewebstore.google.com/detail/wrenlist/nblnainobllgbjkdkpeodjpopkgnpfgb"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-medium"
            >
              Install extension
            </a>
          </span>
        </div>
      )}

      {/* Crosslist result */}
      {crosslistResult && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: crosslistResult.ok ? 'rgba(61,92,58,.08)' : 'rgba(220,38,38,.08)',
            borderWidth: '1px',
            borderColor: crosslistResult.ok ? 'rgba(61,92,58,.2)' : 'rgba(220,38,38,.2)',
            color: crosslistResult.ok ? '#3D5C3A' : '#DC2626',
          }}
        >
          <span>{crosslistResult.ok ? '✓ ' : '✗ '}{crosslistResult.message}</span>
          <button onClick={onDismissCrosslist} className="ml-4 opacity-60 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div
          className="p-4 rounded text-sm"
          style={{
            backgroundColor: 'rgba(220,38,38,.1)',
            borderWidth: '1px',
            borderColor: 'rgba(220,38,38,.3)',
            color: '#DC2626',
          }}
        >
          {error}
        </div>
      )}

      {/* Save success banner */}
      {saveSuccess && (
        <div
          className="p-3 rounded text-sm"
          style={{
            backgroundColor: 'rgba(61,92,58,.1)',
            borderWidth: '1px',
            borderColor: 'rgba(61,92,58,.3)',
            color: '#3D5C3A',
          }}
        >
          <span className="font-medium">Changes saved.</span>
          {findStatus === 'listed' && (
            <span className="ml-1" style={{ color: '#4A5E48' }}>
              Marketplace listings won&apos;t update automatically — relist or re-crosslist to push changes live.
            </span>
          )}
        </div>
      )}

      {/* Photo operation error banner */}
      {photoError && (
        <div
          className="p-3 rounded text-sm flex items-center justify-between"
          style={{
            backgroundColor: 'rgba(220,38,38,.1)',
            borderWidth: '1px',
            borderColor: 'rgba(220,38,38,.3)',
            color: '#DC2626',
          }}
        >
          <span>{photoError}</span>
          <button onClick={onDismissPhotoError} className="ml-4 opacity-60 hover:opacity-100">&#x2715;</button>
        </div>
      )}
    </>
  )
}
