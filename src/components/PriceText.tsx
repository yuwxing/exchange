import { isUp } from '../utils/format'

export function PriceText({
  value,
  className = '',
  digits = 2,
}: {
  value: number
  className?: string
  digits?: number
}) {
  const up = isUp(value)
  return (
    <span className={`tnum ${up ? 'text-market-up' : 'text-market-down'} ${className}`}>
      {up ? '+' : ''}
      {value.toFixed(digits)}
    </span>
  )
}

export function ChangeTag({ changePct }: { changePct: number }) {
  const up = isUp(changePct)
  return (
    <span
      className={`inline-block rounded px-1.5 py-0.5 text-xs font-bold tnum ${
        up ? 'bg-market-up/10 text-market-up' : 'bg-market-down/10 text-market-down'
      }`}
    >
      {up ? '▲' : '▼'} {Math.abs(changePct * 100).toFixed(2)}%
    </span>
  )
}
