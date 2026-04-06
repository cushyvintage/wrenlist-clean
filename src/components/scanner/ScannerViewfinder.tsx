'use client'

/**
 * Animated scanner viewfinder with sweep line and corner brackets.
 * Matches the design from wrenlistredesignstatic.vercel.app.
 *
 * Used in CameraScanner (overlay on live feed) and the idle "tap to scan" state.
 */

interface ScannerViewfinderProps {
  label?: string
  sublabel?: string
}

export function ScannerViewfinder({
  label = 'Point camera at barcode or ISBN',
  sublabel,
}: ScannerViewfinderProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3">
      {/* Viewfinder frame with animated scan line */}
      <div className="relative w-48 h-32 rounded">
        {/* Corner brackets */}
        <Corner position="tl" />
        <Corner position="tr" />
        <Corner position="bl" />
        <Corner position="br" />

        {/* Animated sweep line */}
        <div
          className="absolute left-1 right-1 h-[2px] opacity-80"
          style={{
            background: 'rgb(90, 122, 87)',
            animation: 'scanSweep 2s ease-in-out infinite',
          }}
        />
      </div>

      {/* Labels */}
      <p className="text-[12px] tracking-[0.04em]" style={{ color: 'rgb(122, 154, 120)' }}>
        {label}
      </p>
      {sublabel && (
        <p className="text-white/40 text-xs">
          {sublabel}
        </p>
      )}

      {/* Keyframes injected via style tag (only once) */}
      <style>{`
        @keyframes scanSweep {
          0%, 100% { top: 8px; }
          50% { top: calc(100% - 10px); }
        }
      `}</style>
    </div>
  )
}

function Corner({ position }: { position: 'tl' | 'tr' | 'bl' | 'br' }) {
  const base = 'absolute w-4 h-4'
  const color = 'rgb(90, 122, 87)'

  const styles: Record<string, React.CSSProperties> = {
    tl: { top: -1, left: -1, borderTop: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
    tr: { top: -1, right: -1, borderTop: `3px solid ${color}`, borderRight: `3px solid ${color}` },
    bl: { bottom: -1, left: -1, borderBottom: `3px solid ${color}`, borderLeft: `3px solid ${color}` },
    br: { bottom: -1, right: -1, borderBottom: `3px solid ${color}`, borderRight: `3px solid ${color}` },
  }

  return <div className={base} style={styles[position]} />
}
