/**
 * LoadingSpinner Component
 * Animated CSS spinner in sage colour
 *
 * @example
 * <LoadingSpinner size="md" />
 */

type SpinnerSize = 'sm' | 'md' | 'lg'

interface LoadingSpinnerProps {
  size?: SpinnerSize
}

const sizeConfig: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-8 h-8',
  lg: 'w-12 h-12',
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps) {
  return (
    <div
      className={`${sizeConfig[size]} border-4 border-sage-pale border-t-sage rounded-full animate-spin`}
      role="status"
      aria-label="Loading"
    />
  )
}
