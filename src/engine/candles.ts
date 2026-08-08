import type { Candle } from '../types'
import { mulberry32 } from '../utils/format'

const DAY = 24 * 60 * 60 * 1000

export function genCandles(
  symbol: string,
  basePrice: number,
  volatility: number,
  count: number,
  now = Date.now(),
): Candle[] {
  const rand = mulberry32(hash(symbol))
  const candles: Candle[] = []
  let price = basePrice * (0.82 + rand() * 0.25)

  for (let i = count - 1; i >= 0; i--) {
    const drift = (rand() - 0.48) * volatility
    const open = price * (1 + (rand() - 0.5) * volatility * 0.5)
    const close = open * (1 + drift + (rand() - 0.5) * volatility)
    const high = Math.max(open, close) * (1 + rand() * volatility * 0.6)
    const low = Math.min(open, close) * (1 - rand() * volatility * 0.6)
    const volume = Math.round(800000 + rand() * 4200000)
    const time = new Date(now - i * DAY)
    candles.push({
      time: fmtDay(time),
      open: round(open),
      close: round(close),
      low: round(low),
      high: round(high),
      volume,
    })
    price = close
  }
  return candles
}

export function genTicks(
  symbol: string,
  fromPrice: number,
  volatility: number,
  count: number,
): number[] {
  const rand = mulberry32(hash(symbol + 'tick'))
  const ticks: number[] = []
  let p = fromPrice
  for (let i = 0; i < count; i++) {
    p = p * (1 + (rand() - 0.5) * volatility)
    ticks.push(round(p))
  }
  return ticks
}

export function fmtDay(d: Date) {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function round(n: number) {
  return Math.round(n * 100) / 100
}
