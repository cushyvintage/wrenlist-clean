import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#f5f0e8',
          padding: '72px 80px',
          fontFamily: 'serif',
        }}
      >
        {/* Top accent bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 4,
              backgroundColor: '#3d5c3a',
            }}
          />
          <div
            style={{
              fontSize: 20,
              color: '#5a7a57',
              textTransform: 'uppercase',
              letterSpacing: '0.22em',
              fontFamily: 'sans-serif',
              fontWeight: 500,
            }}
          >
            Wrenlist · Free Tool
          </div>
        </div>

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 28,
          }}
        >
          <div
            style={{
              fontSize: 84,
              lineHeight: 1.02,
              color: '#1e2e1c',
              fontFamily: 'serif',
              fontWeight: 400,
              letterSpacing: '-0.015em',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div>UK Reseller Tax</div>
            <div>Estimator 2025/26</div>
          </div>
          <div
            style={{
              fontSize: 36,
              color: '#5a7a57',
              fontFamily: 'serif',
              fontStyle: 'italic',
              fontWeight: 400,
              lineHeight: 1.25,
            }}
          >
            Am I over the £1,000 trading allowance?
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            borderTop: '1px solid rgba(61, 92, 58, 0.18)',
            paddingTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 26,
              color: '#1e2e1c',
              fontFamily: 'serif',
              fontWeight: 500,
              letterSpacing: '-0.01em',
            }}
          >
            WRENlist
          </div>
          <div
            style={{
              fontSize: 22,
              color: '#5a7a57',
              fontFamily: 'sans-serif',
              letterSpacing: '0.05em',
            }}
          >
            wrenlist.com/tax-estimator
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  )
}
