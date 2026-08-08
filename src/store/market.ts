import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Account, Candle, NewsEvent, Quote } from '../types'
import { STOCKS, AI100_WEIGHTS, NEWS_POOL } from '../data/stocks'
import { genCandles, fmtDay } from '../engine/candles'
import { clamp, mulberry32, round2 } from '../utils/format'
import { marketStorage, ACCOUNT_STORAGE_KEY } from './dataSource'

export const INITIAL_CASH = 1000000
const AI100_BASE = 12580.35
const WEG_BASE = 5.8

// ---- 真实日期交易循环 ----
// 每日 SETTLE_HOUR:SETTLE_MINUTE 收盘自动结算，次日 OPEN_HOUR 开盘重置
const OPEN_HOUR = 9
const SETTLE_HOUR = 23
const SETTLE_MINUTE = 0
// 指数均值回归强度与噪声幅度
const REVERT = 0.02
const NOISE = 0.012
const IDX_MIN = 0.5
const IDX_MAX = 2.5

type EcoIndex = {
  users: number
  agent: number
  calls: number
  revenue: number
}

type MarketState = {
  quotes: Record<string, Quote>
  candles: Record<string, Candle[]>
  ai100: { value: number; prev: number }
  sectors: Record<string, { value: number; prev: number }>
  eco: {
    users: number
    dailyActive: number
    totalSupply: number
    circulating: number
    indices: EcoIndex
    wegPrice: number
    wegPrev: number
  }
  simDay: number
  lastSettle: number
  lastSettleDate: string
  dailySettles: number[]
  marketOpen: boolean
  tradeDate: string
  news: NewsEvent[]
  account: Account
  tick: () => void
  fireNews: () => NewsEvent | null
  publishNews: (id: string) => void
  buy: (symbol: string, quantity: number) => { ok: boolean; message: string }
  sell: (symbol: string, quantity: number) => { ok: boolean; message: string }
  addContribution: (action: string, reward: number) => void
  resetAccount: () => void
}

function initQuote(symbol: string, basePrice: number): Quote {
  const rand = mulberry32(hash(symbol))
  const changePct = (rand() - 0.46) * 0.06
  const price = round2(basePrice * (1 + changePct))
  const prevClose = round2(basePrice)
  return {
    symbol,
    price,
    prevClose,
    change: round2(price - prevClose),
    changePct: round2(changePct) / 100,
    high: round2(Math.max(price, prevClose) * (1 + rand() * 0.02)),
    low: round2(Math.min(price, prevClose) * (1 - rand() * 0.02)),
    volume: Math.round(500000 + rand() * 8000000),
  }
}

const sectorBase: Record<string, number> = {
  foundation: 1000,
  agent: 1000,
  education: 1000,
  robot: 1000,
}

function defaultAccount(): Account {
  return {
    cash: INITIAL_CASH,
    holdings: [],
    orders: [],
    contributions: [],
    totalEarned: 0,
    level: 1,
    experience: 0,
  }
}

function computeWegPrice(indices: EcoIndex) {
  const price = WEG_BASE * indices.users * indices.agent * indices.calls * indices.revenue
  return round2(price)
}

// 均值回归：向 1.0 拉回 + 零均值噪声，保证指数长期围绕 1.0 波动、不漂移
function meanRevert(idx: number, noise: number) {
  const pulled = idx + (1 - idx) * REVERT
  return round2(clamp(pulled * (1 + (Math.random() - 0.5) * noise), IDX_MIN, IDX_MAX))
}

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => {
      const quotes: Record<string, Quote> = {}
      const candles: Record<string, Candle[]> = {}
      for (const s of STOCKS) {
        quotes[s.symbol] = initQuote(s.symbol, s.basePrice)
        candles[s.symbol] = genCandles(s.symbol, s.basePrice, s.volatility, 60)
      }

      const sectors: Record<string, { value: number; prev: number }> = {}
      for (const id of Object.keys(sectorBase)) {
        sectors[id] = { value: sectorBase[id], prev: sectorBase[id] }
      }

      const ecoIndices: EcoIndex = { users: 1, agent: 1, calls: 1, revenue: 1 }
      const yesterday = fmtDay(new Date(Date.now() - 24 * 60 * 60 * 1000))

      return {
        quotes,
        candles,
        ai100: { value: AI100_BASE, prev: AI100_BASE / 1.0325 },
        sectors,
        eco: {
          users: 1200000,
          dailyActive: 200000,
          totalSupply: 1_000_000_000,
          circulating: 200_000_000,
          indices: ecoIndices,
          wegPrice: computeWegPrice(ecoIndices),
          wegPrev: computeWegPrice(ecoIndices),
        },
        simDay: 1,
        lastSettle: computeWegPrice(ecoIndices),
        lastSettleDate: yesterday,
        dailySettles: [],
        marketOpen: true,
        tradeDate: fmtDay(new Date()),
        news: NEWS_POOL,
        account: defaultAccount(),

        tick: () => {
          const st = get()
          const nextQuotes = { ...st.quotes }
          let aiChange = 0
          let aiWeight = 0
          const nextSectors: Record<string, { value: number; prev: number }> = {}

          for (const id of Object.keys(sectorBase)) {
            nextSectors[id] = { ...st.sectors[id] }
          }

          for (const s of STOCKS) {
            const q = nextQuotes[s.symbol]
            const drift = (Math.random() - 0.5) * s.volatility
            const newPrice = round2(clamp(q.price * (1 + drift), q.price * 0.98, q.price * 1.02))
            const change = round2(newPrice - q.prevClose)
            nextQuotes[s.symbol] = {
              ...q,
              price: newPrice,
              change,
              changePct: change / q.prevClose,
              high: Math.max(q.high, newPrice),
              low: Math.min(q.low, newPrice),
              volume: q.volume + Math.round(Math.random() * 30000),
            }
            const sector = nextSectors[s.categoryId]
            sector.value = round2(sector.value * (1 + (Math.random() - 0.5) * 0.004))
            sector.prev = st.sectors[s.categoryId].prev

            const w = AI100_WEIGHTS[s.symbol] ?? 0
            if (w > 0) {
              aiChange += w * (newPrice / q.price - 1)
              aiWeight += w
            }
          }

          let ai100Value = st.ai100.value * (1 + aiChange)
          const sectorBoost = Object.values(nextSectors).reduce((a, b) => a + b.value / b.prev, 0) / 4 - 1
          ai100Value = round2(ai100Value * (1 + sectorBoost * 0.05))
          const aiPrev = st.ai100.prev

          // ---- WEG 生态：真实日期循环，每日 SETTLE_HOUR 收盘自动结算，次日开盘重置 ----
          const now = new Date()
          const today = fmtDay(now)
          const nowMin = now.getHours() * 60 + now.getMinutes()
          const openMin = OPEN_HOUR * 60
          const settleMin = SETTLE_HOUR * 60 + SETTLE_MINUTE
          const inOpenWindow = nowMin >= openMin && nowMin < settleMin

          let simDay = st.simDay
          let lastSettle = st.lastSettle
          let lastSettleDate = st.lastSettleDate
          let dailySettles = st.dailySettles
          let wegPrev = st.eco.wegPrev
          let users = st.eco.users
          let dailyActive = st.eco.dailyActive
          let indices = st.eco.indices
          let settledToday = lastSettleDate === today

          // 到达收盘时间且当日未结算 → 自动结算，并重置指数开启新的交易日
          if (!settledToday && nowMin >= settleMin) {
            lastSettle = st.eco.wegPrice
            dailySettles = [...st.dailySettles.slice(-119), lastSettle]
            simDay += 1
            lastSettleDate = today
            wegPrev = st.eco.wegPrice
            users = Math.round(st.eco.users * 1.001)
            dailyActive = Math.round(st.eco.dailyActive * 1.001)
            indices = { users: 1, agent: 1, calls: 1, revenue: 1 }
            settledToday = true
          } else if (inOpenWindow) {
            // 交易时段：均值回归 + 零均值噪声，围绕 1.0 波动
            indices = {
              users: meanRevert(st.eco.indices.users, NOISE),
              agent: meanRevert(st.eco.indices.agent, NOISE),
              calls: meanRevert(st.eco.indices.calls, NOISE),
              revenue: meanRevert(st.eco.indices.revenue, NOISE),
            }
          }
          // 收盘后 ~ 次日开盘前：指数保持上一日重置的 1.0，不产生波动

          const wegPrice = computeWegPrice(indices)
          const marketOpen = inOpenWindow && !settledToday

          set({
            quotes: nextQuotes,
            ai100: { value: ai100Value, prev: aiPrev },
            sectors: nextSectors,
            eco: {
              ...st.eco,
              indices,
              wegPrice,
              wegPrev,
              users,
              dailyActive,
            },
            simDay,
            lastSettle,
            lastSettleDate,
            dailySettles,
            marketOpen,
            tradeDate: today,
          })
        },

        fireNews: () => {
          const st = get()
          if (st.news.length === 0) return null
          const pool = st.news.filter((n) => !n.published)
          const event = pool[Math.floor(Math.random() * pool.length)] ?? st.news[0]
          return event
        },

        publishNews: (id) => {
          const st = get()
          const event = st.news.find((n) => n.id === id)
          if (!event || event.published) return
          const sectors = { ...st.sectors }
          for (const id of Object.keys(sectors)) sectors[id] = { ...sectors[id] }
          const ecoIndices = { ...st.eco.indices }
          const nextQuotes = { ...st.quotes }

          for (const e of event.effect) {
            const name = e.index
            if (name === 'users') ecoIndices.users = round2(clamp(ecoIndices.users * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'agent') ecoIndices.agent = round2(clamp(ecoIndices.agent * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'calls') ecoIndices.calls = round2(clamp(ecoIndices.calls * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'revenue') ecoIndices.revenue = round2(clamp(ecoIndices.revenue * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'developers') {
              ecoIndices.agent = round2(clamp(ecoIndices.agent * (1 + e.delta), IDX_MIN, IDX_MAX))
            } else if (name === 'ecosystem') {
              ecoIndices.users = round2(clamp(ecoIndices.users * (1 + e.delta), IDX_MIN, IDX_MAX))
            } else if (name === 'market') {
              ecoIndices.revenue = round2(clamp(ecoIndices.revenue * (1 + e.delta), IDX_MIN, IDX_MAX))
            }
            const sectorId = Object.keys(sectorBase).includes(name) ? name : event.symbol ? sectorOf(event.symbol) : null
            if (sectorId) {
              sectors[sectorId].value = round2(sectors[sectorId].value * (1 + e.delta))
            }
            if (event.symbol) {
              const q = nextQuotes[event.symbol]
              if (q) {
                const boost = 1 + e.delta
                nextQuotes[event.symbol] = {
                  ...q,
                  price: round2(q.price * boost),
                  change: round2(q.price * boost - q.prevClose),
                  changePct: round2((q.price * boost - q.prevClose) / q.prevClose),
                  high: Math.max(q.high, q.price * boost),
                }
              }
            }
          }

          const wegPrice = computeWegPrice(ecoIndices)
          const usersDelta = ecoIndices.users / st.eco.indices.users
          set({
            sectors,
            quotes: nextQuotes,
            eco: {
              ...st.eco,
              indices: ecoIndices,
              wegPrice,
              wegPrev: st.eco.wegPrice,
              users: Math.round(st.eco.users * usersDelta),
              dailyActive: Math.round(st.eco.dailyActive * usersDelta),
            },
            news: st.news.map((n) => (n.id === id ? { ...n, published: true } : n)),
          })
        },

        buy: (symbol, quantity) => {
          const st = get()
          const q = st.quotes[symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          const amount = round2(q.price * quantity)
          if (amount <= 0 || quantity <= 0) return { ok: false, message: '数量不合法' }
          if (amount > st.account.cash) return { ok: false, message: '资金不足' }

          const stock = STOCKS.find((s) => s.symbol === symbol)
          const holding = st.account.holdings.find((h) => h.symbol === symbol)
          const account: Account = {
            ...st.account,
            cash: round2(st.account.cash - amount),
            holdings: holding
              ? st.account.holdings.map((h) =>
                  h.symbol === symbol
                    ? {
                        ...h,
                        quantity: h.quantity + quantity,
                        avgCost: round2((h.avgCost * h.quantity + amount) / (h.quantity + quantity)),
                      }
                    : h,
                )
              : [
                  ...st.account.holdings,
                  {
                    symbol,
                    name: stock?.name ?? symbol,
                    quantity,
                    avgCost: q.price,
                  },
                ],
            orders: [
              {
                id: `o-${Date.now()}`,
                symbol,
                name: stock?.name ?? symbol,
                side: 'buy',
                quantity,
                price: q.price,
                amount,
                time: new Date().toLocaleString('zh-CN', { hour12: false }),
              },
              ...st.account.orders,
            ],
          }
          set({ account })
          return { ok: true, message: `已买入 ${quantity} 股 ${symbol}` }
        },

        sell: (symbol, quantity) => {
          const st = get()
          const q = st.quotes[symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          const holding = st.account.holdings.find((h) => h.symbol === symbol)
          if (!holding || holding.quantity < quantity) return { ok: false, message: '持仓不足' }

          const amount = round2(q.price * quantity)
          const stock = STOCKS.find((s) => s.symbol === symbol)
          const account: Account = {
            ...st.account,
            cash: round2(st.account.cash + amount),
            holdings: st.account.holdings
              .map((h) =>
                h.symbol === symbol
                  ? { ...h, quantity: h.quantity - quantity }
                  : h,
              )
              .filter((h) => h.quantity > 0),
            orders: [
              {
                id: `o-${Date.now()}`,
                symbol,
                name: stock?.name ?? symbol,
                side: 'sell',
                quantity,
                price: q.price,
                amount,
                time: new Date().toLocaleString('zh-CN', { hour12: false }),
              },
              ...st.account.orders,
            ],
          }
          set({ account })
          return { ok: true, message: `已卖出 ${quantity} 股 ${symbol}` }
        },

        addContribution: (action, reward) => {
          const st = get()
          const level = 1 + Math.floor(st.account.experience / 500)
          const account: Account = {
            ...st.account,
            cash: round2(st.account.cash + reward * 20),
            totalEarned: round2(st.account.totalEarned + reward),
            experience: st.account.experience + reward,
            level,
            contributions: [
              {
                id: `c-${Date.now()}`,
                action,
                role: '模拟用户',
                reward,
                time: new Date().toLocaleString('zh-CN', { hour12: false }),
              },
              ...st.account.contributions,
            ],
          }
          set({ account })
        },

        resetAccount: () => set({ account: defaultAccount() }),
      }
    },
    {
      name: ACCOUNT_STORAGE_KEY,
      storage: marketStorage,
      partialize: (state) => ({
        account: state.account,
        simDay: state.simDay,
        lastSettle: state.lastSettle,
        lastSettleDate: state.lastSettleDate,
        dailySettles: state.dailySettles,
      }),
    },
  ),
)

function hash(s: string) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function sectorOf(symbol: string): string | null {
  const s = STOCKS.find((x) => x.symbol === symbol)
  return s ? s.categoryId : null
}

