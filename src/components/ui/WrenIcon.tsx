interface WrenIconProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  className?: string
}

const pxMap = { xs: 12, sm: 14, md: 20, lg: 28, xl: 40 }

/**
 * Wren brand motif.
 * md+ uses the illustrated logo PNG.
 * xs/sm uses a minimal SVG silhouette (PNG too detailed at tiny sizes).
 */
export default function WrenIcon({ size = 'md', className = '' }: WrenIconProps) {
  const px = pxMap[size]

  if (size === 'xs' || size === 'sm') {
    return (
      <svg
        width={px}
        height={px}
        viewBox="0 0 20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        <ellipse cx="10" cy="13.5" rx="5" ry="3.5" />
        <path d="M5.5 11.5 C4.5 9.5 3.5 7.5 3.5 6 C3.5 4.5 4.5 4 4.5 4" />
        <circle cx="14" cy="9" r="2.5" />
        <path d="M16.2 9 L18.2 8.5" />
        <circle cx="14.5" cy="8.5" r="0.5" fill="currentColor" stroke="none" />
        <path d="M6 12 C8 10.5 11.5 10.5 13.5 11.5" strokeWidth="1" />
      </svg>
    )
  }

  return (
    <img
      src="/wrenlist-logo.png"
      alt=""
      width={px}
      height={px}
      className={className}
      aria-hidden="true"
      style={{ objectFit: 'contain' }}
    />
  )
}
