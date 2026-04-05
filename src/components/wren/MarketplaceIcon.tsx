import type { Platform } from '@/types'

type IconSize = 'sm' | 'md' | 'lg'

interface MarketplaceIconProps {
  platform: Platform
  size?: IconSize
  className?: string
}

const SIZE_MAP: Record<IconSize, number> = {
  sm: 16,
  md: 24,
  lg: 40,
}

/**
 * Inline SVG marketplace logos at 3 standard sizes.
 * sm (16px) — sidebar, tags, table rows
 * md (24px) — cards, selectors (default)
 * lg (40px) — hero cards, onboarding
 */
export function MarketplaceIcon({ platform, size = 'md', className }: MarketplaceIconProps) {
  const px = SIZE_MAP[size]
  const svgProps = {
    width: px,
    height: px,
    viewBox: '0 0 24 24',
    fill: 'none',
    xmlns: 'http://www.w3.org/2000/svg',
    className,
    'aria-label': `${platform} logo`,
  } as const

  switch (platform) {
    case 'vinted':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#09B1BA" />
          <path
            d="M7.5 6.5L12 17.5L16.5 6.5"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )

    case 'ebay':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#F5F5F5" />
          <text x="3" y="16.5" fontSize="11" fontWeight="700" fontFamily="system-ui, sans-serif" letterSpacing="-0.5">
            <tspan fill="#E53238">e</tspan>
            <tspan fill="#0064D2">b</tspan>
            <tspan fill="#F5AF02">a</tspan>
            <tspan fill="#86B817">y</tspan>
          </text>
        </svg>
      )

    case 'etsy':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#F16521" />
          <text
            x="12"
            y="16.5"
            fontSize="13"
            fontWeight="700"
            fontFamily="Georgia, serif"
            fill="white"
            textAnchor="middle"
            fontStyle="italic"
          >
            E
          </text>
        </svg>
      )

    case 'shopify':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#95BF47" />
          <path
            d="M15 5C14.8 5.1 14.3 5.2 13.8 5.4C13.7 5.1 13.5 4.7 13.2 4.4C12.6 3.8 11.8 3.5 11.2 3.5C11.1 3.5 11 3.5 10.9 3.5C10.8 3.4 10.7 3.3 10.6 3.3C10 2.8 9.2 2.6 8.6 2.7C7.3 2.9 6.1 4 5.2 5.6C4.5 6.8 4 8.3 3.8 9.5L7.5 8.4C7.5 8.4 7.7 7.2 8.4 6.1C8.9 5.3 9.5 4.9 10 4.8C10.1 4.8 10.1 4.8 10.2 4.8C10.4 5.1 10.5 5.5 10.5 6.2C10.5 7.2 10.3 8.6 10 9.5L13.4 8.5C13.7 7.5 14.1 6 14.3 5.3C14.6 5.4 14.8 5.5 15 5.6L15 5Z"
            fill="white"
            transform="translate(1.5 2) scale(0.82)"
          />
          <path
            d="M16 7L15.5 18.5L20.5 19.5L18.5 7.5L16 7Z"
            fill="white"
            fillOpacity="0.6"
            transform="translate(-2.5 0) scale(0.82)"
          />
        </svg>
      )

    case 'depop':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#FF2300" />
          <text
            x="12"
            y="17"
            fontSize="14"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            fill="white"
            textAnchor="middle"
          >
            d
          </text>
        </svg>
      )

    case 'poshmark':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#7B2E8E" />
          <text
            x="12"
            y="17"
            fontSize="14"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            fill="white"
            textAnchor="middle"
          >
            P
          </text>
        </svg>
      )

    case 'mercari':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#4DC9F6" />
          <text
            x="12"
            y="17"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            fill="white"
            textAnchor="middle"
          >
            M
          </text>
        </svg>
      )

    case 'facebook':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#1877F2" />
          <path
            d="M16 12.5H14V18H11.5V12.5H10V10.5H11.5V9C11.5 7.1 12.4 6 14.5 6H16V8H15C14.3 8 14 8.3 14 9V10.5H16L16 12.5Z"
            fill="white"
          />
        </svg>
      )

    case 'whatnot':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#6E3FEA" />
          <text
            x="12"
            y="17"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            fill="white"
            textAnchor="middle"
          >
            W
          </text>
        </svg>
      )

    case 'grailed':
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#000000" />
          <text
            x="12"
            y="17"
            fontSize="13"
            fontWeight="700"
            fontFamily="system-ui, sans-serif"
            fill="white"
            textAnchor="middle"
          >
            G
          </text>
        </svg>
      )

    default:
      // Generic fallback — shopping bag outline
      return (
        <svg {...svgProps}>
          <rect width="24" height="24" rx="6" fill="#94A3B8" />
          <path
            d="M8 8V7C8 5.3 9.3 4 11 4H13C14.7 4 16 5.3 16 7V8M6 8H18L17 20H7L6 8Z"
            stroke="white"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
  }
}

/** Brand colours for each platform (useful for borders, backgrounds) */
export const PLATFORM_BRAND_COLORS: Record<Platform, string> = {
  vinted: '#09B1BA',
  ebay: '#0064D2',
  etsy: '#F16521',
  shopify: '#95BF47',
  depop: '#FF2300',
  poshmark: '#7B2E8E',
  mercari: '#4DC9F6',
  facebook: '#1877F2',
  whatnot: '#6E3FEA',
  grailed: '#000000',
}
