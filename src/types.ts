export type Category = {
  id: string
  name: string
  symbol: string
}

export type Metric = {
  label: string
  value: number
}

export type Stock = {
  symbol: string
  name: string
  nameEn: string
  categoryId: string
  description: string
  basePrice: number
  volatility: number
  marketCap: number
  score: number
  metrics: Metric[]
  isWeg: boolean
}

export type Quote = {
  symbol: string
  price: number
  prevClose: number
  change: number
  changePct: number
  high: number
  low: number
  volume: number
}

export type Candle = {
  time: string
  open: number
  close: number
  low: number
  high: number
  volume: number
}

export type NewsEvent = {
  id: string
  title: string
  summary: string
  categoryId: string | null
  symbol: string | null
  time: string
  importance: 1 | 2 | 3
  effect: { index: string; delta: number }[]
  published: boolean
}

export type Holding = {
  symbol: string
  name: string
  quantity: number
  avgCost: number
}

export type Order = {
  id: string
  symbol: string
  name: string
  side: 'buy' | 'sell'
  quantity: number
  price: number
  amount: number
  time: string
}

export type ContributionRecord = {
  id: string
  action: string
  role: string
  reward: number
  time: string
}

export type Account = {
  cash: number
  holdings: Holding[]
  orders: Order[]
  contributions: ContributionRecord[]
  totalEarned: number
  level: number
  experience: number
}
