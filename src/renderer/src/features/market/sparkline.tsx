import { cn } from '@/lib/utils'
import { minRangeFor, sparklinePoints } from './chart'

interface SparklineProps {
  values: readonly number[]
  className?: string
}

const WIDTH = 64
const HEIGHT = 24
// Keeps the 1.75px stroke inside the box at the highest and lowest points
const INSET = 1
// The full height represents at least ±10 % of the average price
const MIN_RANGE_SHARE = 0.2

/** Small trend line; decorative, the change badge next to it carries the information. */
export function Sparkline({ values, className }: SparklineProps): React.JSX.Element {
  const points = sparklinePoints(
    values,
    WIDTH,
    HEIGHT - 2 * INSET,
    minRangeFor(values, MIN_RANGE_SHARE)
  )
  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      viewBox={`0 ${String(-INSET)} ${String(WIDTH)} ${String(HEIGHT)}`}
      fill="none"
      aria-hidden="true"
      className={cn('shrink-0 overflow-visible', className)}
    >
      <polyline
        points={points}
        stroke="currentColor"
        strokeWidth={1.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
