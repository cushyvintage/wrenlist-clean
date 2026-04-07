import { Panel } from '@/components/wren/Panel'

interface RecommendationCardProps {
  suggestedPrice: number
  bestPlatform: string
  reasoning: string
}

export default function RecommendationCard({ suggestedPrice, bestPlatform, reasoning }: RecommendationCardProps) {
  return (
    <Panel className="bg-sage/5 border border-sage/20">
      <div className="flex gap-4">
        <div className="text-2xl">💡</div>
        <div>
          <h3 className="font-medium text-ink mb-2">Recommendation</h3>
          <p className="text-sm text-ink-lt">
            List at{' '}
            <span className="font-semibold text-ink">£{suggestedPrice}</span>{' '}
            on{' '}
            <span className="font-semibold text-ink">{bestPlatform}</span>{' '}
            — {reasoning}
          </p>
        </div>
      </div>
    </Panel>
  )
}
