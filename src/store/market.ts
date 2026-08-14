// ============================================================
// AI Exchange · 市场引擎（V2）
// 多板块 / 多指数 / AI 市值驱动 / AI 智能体运行 / 候选资产上市
// ============================================================
import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  Account,
  AgentReport,
  Asset,
  Candle,
  ContractPosition,
  DailyReport,
  IndexValue,
  NewsEvent,
  OpenOrder,
  Opportunity,
  Quote,
  SentimentState,
  Stake,
  WhaleFlow,
  WhaleTrade,
} from '../types'
import {
  ASSETS,
  CANDIDATES,
  INDEXES,
  NEWS_POOL,
  SECTORS,
  assetOf,
  computeAiValue,
  indexMembers,
} from '../data/assets'
import { WHALES } from '../data/whales'
import { genCandles, fmtDay } from '../engine/candles'
import { clamp, mulberry32, round2 } from '../utils/format'
import {
  buildAttribution,
  clamp as pClamp,
  computePriceDrift,
  cycleFactorOf,
  normalizeWhaleFlow,
  type PriceAttribution,
  type PricingContext,
} from '../engine/pricing'
import { marketStorage, ACCOUNT_STORAGE_KEY } from './dataSource'
import {
  generateDailyReport,
  runMarket,
  runNews,
  runPortfolio,
  runRadar,
  runResearch,
  runRisk,
  runValuation,
} from '../ai/intelligence'

export const INITIAL_CASH = 100000
export const INITIAL_WEG = 10000
export const INITIAL_CREDIT = 100
const WEG_BASE = 5.8

// ---- 真实日期交易循环 ----
const OPEN_HOUR = 9
const SETTLE_HOUR = 23
const SETTLE_MINUTE = 0
const REVERT = 0.02
const NOISE = 0.012
const IDX_MIN = 0.5
const IDX_MAX = 2.5

type EcoIndex = { users: number; agent: number; calls: number; revenue: number }

type MarketState = {
  quotes: Record<string, Quote>
  candles: Record<string, Candle[]>
  sectors: Record<string, { value: number; prev: number }>
  indices: Record<string, IndexValue>
  eco: {
    users: number
    dailyActive: number
    totalSupply: number
    circulating: number
    indices: EcoIndex
    wegPrice: number
    wegPrev: number
  }
  extraAssets: Asset[]
  candidates: typeof CANDIDATES
  listings: { symbol: string; time: string }[]
  simDay: number
  lastSettle: number
  lastSettleDate: string
  dailySettles: number[]
  marketOpen: boolean
  tradeDate: string
  news: NewsEvent[]
  account: Account
  aiReports: Partial<Record<string, AgentReport>>
  dailyReport: DailyReport | null
  sentiment: SentimentState
  whaleFlows: WhaleFlow[]
  whaleTrades: WhaleTrade[]
  radar: Opportunity[]
  openOrders: OpenOrder[]
  contracts: ContractPosition[]
  stake: Stake | null
  cyclePhase: number
  assetDynamics: Record<string, { usage: number; growth: number }>
  newsImpacts: Record<string, number>
  lastAttribution: Record<string, PriceAttribution>
  attributionTick: number
  tick: () => void
  fireNews: () => NewsEvent | null
  publishNews: (id: string) => void
  buy: (symbol: string, quantity: number) => { ok: boolean; message: string }
  sell: (symbol: string, quantity: number) => { ok: boolean; message: string }
  placeOrder: (o: { symbol: string; kind: OpenOrder['kind']; side: 'buy' | 'sell'; price: number; quantity: number }) => { ok: boolean; message: string }
  cancelOrder: (id: string) => void
  openContract: (o: { symbol: string; side: 'long' | 'short'; leverage: number; quantity: number }) => { ok: boolean; message: string }
  closeContract: (id: string) => { ok: boolean; message: string }
  stakeWeg: (amount: number) => { ok: boolean; message: string }
  unstakeWeg: () => { ok: boolean; message: string }
  addContribution: (action: string, reward: number) => void
  resetAccount: () => void
  runAgent: (agentId: string, symbol?: string) => AgentReport | null
  generateReport: () => DailyReport
  listCandidate: (symbol: string) => { ok: boolean; message: string }
  runRadar: () => Opportunity[]
  allAssets: () => Asset[]
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
    volume: Math.round(200000 + rand() * 6000000),
  }
}

function defaultAccount(): Account {
  return {
    cash: INITIAL_CASH,
    wegBalance: INITIAL_WEG,
    aiCredit: INITIAL_CREDIT,
    holdings: [],
    orders: [],
    contributions: [],
    totalEarned: 0,
    level: 1,
    experience: 0,
  }
}

/** 现货成交（市价/挂单撮合共用）：返回新账户 */
function executeSpot(account: Account, symbol: string, name: string, side: 'buy' | 'sell', quantity: number, price: number): Account {
  const amount = round2(price * quantity)
  if (side === 'buy') {
    const holding = account.holdings.find((h) => h.symbol === symbol)
    return {
      ...account,
      cash: round2(account.cash - amount),
      holdings: holding
        ? account.holdings.map((h) =>
            h.symbol === symbol
              ? { ...h, quantity: h.quantity + quantity, avgCost: round2((h.avgCost * h.quantity + amount) / (h.quantity + quantity)) }
              : h,
          )
        : [...account.holdings, { symbol, name, quantity, avgCost: price }],
      orders: [
        { id: `o-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, symbol, name, side, quantity, price, amount, time: new Date().toLocaleString('zh-CN', { hour12: false }) },
        ...account.orders,
      ],
    }
  }
  return {
    ...account,
    cash: round2(account.cash + amount),
    holdings: account.holdings
      .map((h) => (h.symbol === symbol ? { ...h, quantity: h.quantity - quantity } : h))
      .filter((h) => h.quantity > 0),
    orders: [
      { id: `o-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, symbol, name, side, quantity, price, amount, time: new Date().toLocaleString('zh-CN', { hour12: false }) },
      ...account.orders,
    ],
  }
}

function computeWegPrice(indices: EcoIndex) {
  return round2(WEG_BASE * indices.users * indices.agent * indices.calls * indices.revenue)
}

function meanRevert(idx: number, noise: number) {
  const pulled = idx + (1 - idx) * REVERT
  return round2(clamp(pulled * (1 + (Math.random() - 0.5) * noise), IDX_MIN, IDX_MAX))
}

function scoreLevel(score: number) {
  if (score >= 90) return 'S'
  if (score >= 85) return 'A'
  if (score >= 80) return 'B'
  if (score >= 75) return 'C'
  return 'D'
}

/** 初始巨鲸仓位：每家机构 1-2 个持仓，偏好其关注板块 */
function initWhaleFlows(): WhaleFlow[] {  const flows: WhaleFlow[] = []
  const nowStr = timeStr()
  for (const w of WHALES) {
    const rand = mulberry32(hash(w.id + 'flow'))
    const pool = ASSETS.filter((a) => a.sectorId === w.focusSectorId)
    const anyPool = ASSETS
    const pick = (arr: Asset[]) => arr[Math.floor(rand() * arr.length)]
    const count = 1 + Math.floor(rand() * 2)
    for (let i = 0; i < count; i++) {
      const asset = pool.length > 0 && rand() > 0.3 ? pick(pool) : pick(anyPool)
      const direction: 'long' | 'short' = rand() > 0.22 ? 'long' : 'short'
      flows.push({
        whaleId: w.id,
        symbol: asset.symbol,
        direction,
        amount: Math.round((2 + rand() * 18) * 1e7),
        since: nowStr,
        updatedAt: nowStr,
      })
    }
  }
  return flows
}

/** 动态使用量/增长率：从资产静态指标初始化，供定价引擎驱动 */
function initDynamics(): Record<string, { usage: number; growth: number }> {
  const dyn: Record<string, { usage: number; growth: number }> = {}
  for (const a of ASSETS) {
    const m = Object.fromEntries(a.metrics.map((x) => [x.label, x.value]))
    dyn[a.symbol] = { usage: m['使用量'] ?? 60, growth: m['增长'] ?? 60 }
  }
  return dyn
}

/** 板块温度（0-100），与 SectorHeat 组件口径一致 */
function sectorHeatOf(sec: { value: number; prev: number } | undefined): number {
  if (!sec || sec.prev <= 0) return 50
  const pct = (sec.value - sec.prev) / sec.prev
  return Math.round(Math.min(95, Math.max(5, 50 + pct * 2600)))
}

function timeStr(d = new Date()) {
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

/** 情绪等级映射 */
function sentimentLevel(score: number): SentimentState['level'] {
  if (score < 25) return '极度恐惧'
  if (score < 45) return '恐惧'
  if (score <= 55) return '中性'
  if (score <= 75) return '贪婪'
  return '极度贪婪'
}

function buildExtraAsset(cand: (typeof CANDIDATES)[number]): Asset {
  const rand = mulberry32(hash(cand.symbol + 'm'))
  const metrics = [
    { label: '模型能力', value: clamp(Math.round(cand.score + (rand() - 0.5) * 10), 45, 100) },
    { label: '使用量', value: clamp(Math.round(cand.score + (rand() - 0.5) * 12), 45, 100) },
    { label: '收入', value: clamp(Math.round(cand.score + (rand() - 0.5) * 12), 45, 100) },
    { label: '用户规模', value: clamp(Math.round(cand.score + (rand() - 0.5) * 14), 45, 100) },
    { label: '开发者', value: clamp(Math.round(cand.score + (rand() - 0.5) * 10), 45, 100) },
    { label: 'Agent 活跃', value: clamp(Math.round(cand.score + (rand() - 0.5) * 12), 45, 100) },
    { label: 'Skills 生态', value: clamp(Math.round(cand.score + (rand() - 0.5) * 14), 45, 100) },
    { label: 'API 调用', value: clamp(Math.round(cand.score + (rand() - 0.5) * 12), 45, 100) },
    { label: '增长', value: clamp(Math.round(cand.score + (rand() - 0.5) * 8), 45, 100) },
    { label: '生态', value: clamp(Math.round(cand.score + (rand() - 0.5) * 14), 45, 100) },
    { label: '可靠性', value: clamp(Math.round(cand.score + (rand() - 0.5) * 10), 45, 100) },
  ]
  const aiValue = computeAiValue(cand.score, cand.symbol)
  return {
    symbol: cand.symbol,
    name: cand.name,
    nameEn: cand.nameEn,
    sectorId: cand.sectorId,
    type: cand.type,
    description: cand.description,
    basePrice: cand.basePrice,
    volatility: 0.02,
    marketCap: cand.marketCap,
    score: cand.score,
    aiValue,
    rating: scoreLevel(aiValue),
    metrics,
    tags: cand.tags,
  }
}

export const useMarket = create<MarketState>()(
  persist(
    (set, get) => {
      const quotes: Record<string, Quote> = {}
      const candles: Record<string, Candle[]> = {}
      for (const a of ASSETS) {
        quotes[a.symbol] = initQuote(a.symbol, a.basePrice)
        candles[a.symbol] = genCandles(a.symbol, a.basePrice, a.volatility, 60)
      }

      const sectors: Record<string, { value: number; prev: number }> = {}
      for (const s of SECTORS) sectors[s.id] = { value: 1000, prev: 1000 }

      const indices: Record<string, IndexValue> = {}
      for (const def of INDEXES) indices[def.id] = { value: def.base, prev: def.base, spark: [] }

      const ecoIndices: EcoIndex = { users: 1, agent: 1, calls: 1, revenue: 1 }
      const yesterday = fmtDay(new Date(Date.now() - 24 * 60 * 60 * 1000))

      return {
        quotes,
        candles,
        sectors,
        indices,
        eco: {
          users: 1200000,
          dailyActive: 200000,
          totalSupply: 1_000_000_000,
          circulating: 200_000_000,
          indices: ecoIndices,
          wegPrice: computeWegPrice(ecoIndices),
          wegPrev: computeWegPrice(ecoIndices),
        },
        extraAssets: [],
        candidates: CANDIDATES,
        listings: [],
        simDay: 1,
        lastSettle: computeWegPrice(ecoIndices),
        lastSettleDate: yesterday,
        dailySettles: [],
        marketOpen: true,
        tradeDate: fmtDay(new Date()),
        news: NEWS_POOL,
        account: defaultAccount(),
        aiReports: {},
        dailyReport: null,
        sentiment: { score: 50, level: '中性', prev: 50, history: [50], drivers: [] },
        whaleFlows: initWhaleFlows(),
        whaleTrades: [],
        radar: [],
        openOrders: [],
        contracts: [],
        stake: null,
        cyclePhase: 0,
        assetDynamics: initDynamics(),
        newsImpacts: {},
        lastAttribution: {},
        attributionTick: 0,

        allAssets: () => [...ASSETS, ...get().extraAssets],

        tick: () => {
          const st = get()
          const all = [...ASSETS, ...st.extraAssets]
          const nextQuotes = { ...st.quotes }
          const nextSectors: Record<string, { value: number; prev: number }> = {}
          for (const s of SECTORS) nextSectors[s.id] = { ...st.sectors[s.id] }

          // ---- 资产价格：AI Asset Pricing Engine（因子定价）----
          // 价格变化 = 基础价值 + 市场情绪 + 使用量 + 增长率 + 新闻事件
          //          + 巨鲸资金 + 板块热度 + AI Value + 市场周期 + 随机扰动
          // 指数仍采用「价格比编制法」：指数 = 基期 × Σ(市值×价/发行价) / Σ市值（数学上有界）
          const sectorAgg: Record<string, { ratio: number; cap: number }> = {}

          // 市场周期推进（慢正弦，约 5.8 天一个周期）
          const cyclePhase = (st.cyclePhase + 1 / 200000) % 1
          const cycleFactor = cycleFactorOf(cyclePhase)

          // 动态使用量/增长率演化（均值回归 + 微噪）
          const nextDynamics: Record<string, { usage: number; growth: number }> = {}
          // 新闻影响衰减（每 tick 衰减 1.5%，约 6 小时减半）
          const nextNewsImpacts: Record<string, number> = {}
          for (const [sym, v] of Object.entries(st.newsImpacts)) {
            const nv = v * 0.985
            if (Math.abs(nv) > 0.005) nextNewsImpacts[sym] = nv
          }

          // 巨鲸净流入聚合（本轮）
          const whaleNetMap: Record<string, number> = {}
          for (const f of st.whaleFlows) {
            whaleNetMap[f.symbol] = (whaleNetMap[f.symbol] ?? 0) + (f.direction === 'long' ? f.amount : -f.amount)
          }

          const nextAttribution: Record<string, PriceAttribution> = {}
          const attTick = st.attributionTick + 1
          const recordAtt = attTick % 15 === 0 // 每 15 tick（约 37 秒）记录一次归因

          for (const a of all) {
            const q = nextQuotes[a.symbol]
            const sec = nextSectors[a.sectorId]
            const dyn = st.assetDynamics[a.symbol] ?? { usage: 60, growth: 60 }
            nextDynamics[a.symbol] = {
              usage: Math.round(pClamp(dyn.usage + (60 - dyn.usage) * 0.002 + (Math.random() - 0.5) * 2, 20, 95)),
              growth: Math.round(pClamp(dyn.growth + (60 - dyn.growth) * 0.002 + (Math.random() - 0.5) * 2, 20, 95)),
            }

            const ctx: PricingContext = {
              sentimentScore: st.sentiment.score,
              cycleFactor,
              sectorHeat: sectorHeatOf(sec),
              whaleNetInflow: normalizeWhaleFlow(whaleNetMap[a.symbol] ?? 0),
              newsImpact: st.newsImpacts[a.symbol] ?? 0,
              usageIndex: dyn.usage,
              growthIndex: dyn.growth,
            }
            const { drift, factors } = computePriceDrift(a, q.price, ctx, Math.random() - 0.5)
            const newPrice = round2(clamp(q.price * (1 + drift), q.price * 0.97, q.price * 1.03))
            const change = round2(newPrice - q.prevClose)
            nextQuotes[a.symbol] = {
              ...q,
              price: newPrice,
              change,
              changePct: q.prevClose > 0 ? change / q.prevClose : 0,
              high: Math.max(q.high, newPrice),
              low: Math.min(q.low, newPrice),
              volume: q.volume + Math.round(Math.random() * 20000),
            }
            if (recordAtt) {
              nextAttribution[a.symbol] = buildAttribution(a.symbol, factors, drift)
            }
            const ratio = a.basePrice > 0 ? newPrice / a.basePrice : 1
            const agg = sectorAgg[a.sectorId] ?? { ratio: 0, cap: 0 }
            agg.ratio += ratio * a.marketCap
            agg.cap += a.marketCap
            sectorAgg[a.sectorId] = agg
          }

          // ---- 板块指数：基期 1000 × 市值加权价格比 ----
          for (const s of SECTORS) {
            const agg = sectorAgg[s.id]
            if (agg && agg.cap > 0) {
              nextSectors[s.id].value = round2(1000 * (agg.ratio / agg.cap))
            }
          }

          // ---- 综合指数：基期 × 成分股市值加权价格比 ----
          const nextIndices: Record<string, IndexValue> = {}
          for (const def of INDEXES) {
            const members = indexMembers(def).filter((sym) => nextQuotes[sym])
            let wsum = 0
            let ratioSum = 0
            for (const sym of members) {
              const a = assetOf(sym) ?? st.extraAssets.find((x) => x.symbol === sym)
              const q = nextQuotes[sym]
              if (!a || !q) continue
              const ratio = a.basePrice > 0 ? q.price / a.basePrice : 1
              wsum += a.marketCap
              ratioSum += ratio * a.marketCap
            }
            const prev = st.indices[def.id]?.prev ?? def.base
            const cur = wsum > 0 ? def.base * (ratioSum / wsum) : prev
            const spark = [...(st.indices[def.id]?.spark ?? []), cur].slice(-120)
            nextIndices[def.id] = { value: round2(cur), prev, spark }
          }

          // ---- WEG 生态：真实日期循环 ----
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
          let indicesEco = st.eco.indices
          const settledToday = lastSettleDate === today

          if (!settledToday && nowMin >= settleMin) {
            lastSettle = st.eco.wegPrice
            dailySettles = [...st.dailySettles.slice(-119), lastSettle]
            simDay += 1
            lastSettleDate = today
            wegPrev = st.eco.wegPrice
            users = Math.round(st.eco.users * 1.001)
            dailyActive = Math.round(st.eco.dailyActive * 1.001)
            indicesEco = { users: 1, agent: 1, calls: 1, revenue: 1 }
            // 每日收盘：板块指数与综合指数 prev 更新为当日收盘点位（次日涨幅以此为基准）
            for (const s of SECTORS) {
              if (nextSectors[s.id]) nextSectors[s.id].prev = nextSectors[s.id].value
            }
            for (const def of INDEXES) {
              if (nextIndices[def.id]) nextIndices[def.id].prev = nextIndices[def.id].value
            }
          } else if (inOpenWindow) {
            indicesEco = {
              users: meanRevert(st.eco.indices.users, NOISE),
              agent: meanRevert(st.eco.indices.agent, NOISE),
              calls: meanRevert(st.eco.indices.calls, NOISE),
              revenue: meanRevert(st.eco.indices.revenue, NOISE),
            }
          }

          const wegPrice = computeWegPrice(indicesEco)
          const marketOpen = inOpenWindow && !settledToday

          // ---- AI 情绪指数（恐惧-贪婪）----
          const quotesArr = Object.values(nextQuotes)
          const upCount = quotesArr.filter((q) => q.changePct > 0).length
          const upRatio = quotesArr.length ? upCount / quotesArr.length : 0.5
          const avgPct = quotesArr.length ? quotesArr.reduce((a, q) => a + q.changePct, 0) / quotesArr.length : 0
          const totalVol = quotesArr.reduce((a, q) => a + q.volume, 0)
          const volFactor = clamp((totalVol / 5e7 - 1) * 15, -8, 8)
          let score = Math.round(clamp(50 + (upRatio - 0.5) * 90 + avgPct * 2500 + volFactor, 3, 97))
          score = Math.round(clamp(st.sentiment.score * 0.4 + score * 0.6, 0, 100))
          const sentiment: SentimentState = {
            score,
            level: sentimentLevel(score),
            prev: st.sentiment.score,
            history: [...st.sentiment.history.slice(-119), score],
            drivers: [
              { label: '涨跌家数', value: Math.round(upRatio * 100), weight: 45 },
              { label: '平均涨跌', value: Math.round(clamp(50 + avgPct * 2500, 0, 100)), weight: 30 },
              { label: '成交活跃', value: Math.round(clamp(50 + volFactor * 3, 0, 100)), weight: 25 },
            ],
          }

          // ---- AI 巨鲸换仓漂移 ----
          let whaleFlows = st.whaleFlows
          let whaleTrades = st.whaleTrades
          if (Math.random() < 0.1) {
            const whale = WHALES[Math.floor(Math.random() * WHALES.length)]
            const pool = all.filter((a) => a.sectorId === whale.focusSectorId)
            const pickPool = pool.length > 0 && Math.random() > 0.3 ? pool : all
            const asset = pickPool[Math.floor(Math.random() * pickPool.length)]
            const direction: 'long' | 'short' = Math.random() > 0.25 ? 'long' : 'short'
            const amount = Math.round((2 + Math.random() * 25) * 1e7)
            const updatedAt = timeStr()
            whaleFlows = [...whaleFlows.filter((f) => f.whaleId !== whale.id), { whaleId: whale.id, symbol: asset.symbol, direction, amount, since: updatedAt, updatedAt }]
            whaleTrades = [
              {
                id: `wt-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
                whaleId: whale.id,
                whaleName: whale.name,
                whaleIcon: whale.icon,
                symbol: asset.symbol,
                direction,
                amount,
                time: updatedAt,
              },
              ...st.whaleTrades,
            ].slice(0, 24)
          }

          // ---- 挂单撮合（限价/止损/止盈）----
          let openOrders = st.openOrders
          let account = st.account
          for (const o of openOrders) {
            if (o.status !== 'pending') continue
            const q = nextQuotes[o.symbol]
            if (!q) continue
            let hit = false
            if (o.kind === 'limit') hit = o.side === 'buy' ? q.price <= o.price : q.price >= o.price
            else if (o.kind === 'stopLoss') hit = o.side === 'sell' ? q.price <= o.price : q.price >= o.price
            else if (o.kind === 'takeProfit') hit = o.side === 'sell' ? q.price >= o.price : q.price <= o.price
            if (hit) {
              if (o.side === 'buy' && q.price * o.quantity > account.cash) continue // 资金不足则保持挂单
              const asset = assetOf(o.symbol) ?? st.extraAssets.find((x) => x.symbol === o.symbol)
              account = executeSpot(account, o.symbol, asset?.name ?? o.symbol, o.side, o.quantity, q.price)
              openOrders = openOrders.map((x) => (x.id === o.id ? { ...x, status: 'filled' as const } : x))
            }
          }

          // ---- 合约强平检查 ----
          let contracts = st.contracts
          for (const c of contracts) {
            const q = nextQuotes[c.symbol]
            if (!q) continue
            const pnl = c.side === 'long' ? (q.price - c.entryPrice) * c.quantity : (c.entryPrice - q.price) * c.quantity
            if (pnl <= -c.margin) {
              contracts = contracts.filter((x) => x.id !== c.id)
              account = {
                ...account,
                cash: round2(account.cash + 0),
                orders: [
                  {
                    id: `o-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
                    symbol: c.symbol,
                    name: c.name,
                    side: c.side === 'long' ? 'sell' : 'buy',
                    quantity: c.quantity,
                    price: q.price,
                    amount: 0,
                    time: new Date().toLocaleString('zh-CN', { hour12: false }),
                  },
                  ...account.orders,
                ],
              }
            }
          }

          // ---- WEG 金库质押收益累积 ----
          let stake = st.stake
          if (stake) {
            const start = new Date(stake.startedAt.replace(' ', 'T')).getTime()
            const elapsedDays = (Date.now() - start) / 86400000
            const accrued = stake.amount * (stake.apr / 100) * elapsedDays
            stake = { ...stake, accrued: round2(accrued) }
          }

          set({
            quotes: nextQuotes,
            sectors: nextSectors,
            indices: nextIndices,
            eco: { ...st.eco, indices: indicesEco, wegPrice, wegPrev, users, dailyActive },
            simDay,
            lastSettle,
            lastSettleDate,
            dailySettles,
            marketOpen,
            tradeDate: today,
            sentiment,
            whaleFlows,
            whaleTrades,
            openOrders,
            contracts,
            stake,
            account,
            cyclePhase,
            assetDynamics: nextDynamics,
            newsImpacts: nextNewsImpacts,
            lastAttribution: recordAtt ? { ...st.lastAttribution, ...nextAttribution } : st.lastAttribution,
            attributionTick: attTick,
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
          for (const s of Object.keys(sectors)) sectors[s] = { ...sectors[s] }
          const ecoIndices = { ...st.eco.indices }
          const nextQuotes = { ...st.quotes }

          for (const e of event.effect) {
            const name = e.index
            if (name === 'users') ecoIndices.users = round2(clamp(ecoIndices.users * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'agent') ecoIndices.agent = round2(clamp(ecoIndices.agent * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'calls') ecoIndices.calls = round2(clamp(ecoIndices.calls * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'revenue') ecoIndices.revenue = round2(clamp(ecoIndices.revenue * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'developers') ecoIndices.agent = round2(clamp(ecoIndices.agent * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'ecosystem') ecoIndices.users = round2(clamp(ecoIndices.users * (1 + e.delta), IDX_MIN, IDX_MAX))
            else if (name === 'market') ecoIndices.revenue = round2(clamp(ecoIndices.revenue * (1 + e.delta), IDX_MIN, IDX_MAX))
            const sectorId = SECTORS.find((s) => s.id === name) ? name : event.symbol ? assetOf(event.symbol)?.sectorId ?? null : null
            if (sectorId && sectors[sectorId]) {
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
            // 新闻持续影响：进入定价引擎 newsImpacts，随时间衰减驱动价格
            newsImpacts: (() => {
              const next = { ...st.newsImpacts }
              const totalDelta = event.effect.reduce((a, e) => a + Math.abs(e.delta), 0)
              if (event.symbol) {
                next[event.symbol] = pClamp((next[event.symbol] ?? 0) + totalDelta * 2.5, -1, 1)
              }
              if (event.sectorId) {
                for (const a of [...ASSETS, ...st.extraAssets]) {
                  if (a.sectorId === event.sectorId) {
                    next[a.symbol] = pClamp((next[a.symbol] ?? 0) + totalDelta * 0.8, -1, 1)
                  }
                }
              }
              return next
            })(),
          })
        },

        buy: (symbol, quantity) => {
          const st = get()
          const q = st.quotes[symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          const amount = round2(q.price * quantity)
          if (amount <= 0 || quantity <= 0) return { ok: false, message: '数量不合法' }
          if (amount > st.account.cash) return { ok: false, message: '资金不足' }
          const asset = assetOf(symbol) ?? st.extraAssets.find((x) => x.symbol === symbol)
          set({ account: executeSpot(st.account, symbol, asset?.name ?? symbol, 'buy', quantity, q.price) })
          return { ok: true, message: `已买入 ${quantity} 股 ${symbol}` }
        },

        sell: (symbol, quantity) => {
          const st = get()
          const q = st.quotes[symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          const holding = st.account.holdings.find((h) => h.symbol === symbol)
          if (!holding || holding.quantity < quantity) return { ok: false, message: '持仓不足' }
          const asset = assetOf(symbol) ?? st.extraAssets.find((x) => x.symbol === symbol)
          set({ account: executeSpot(st.account, symbol, asset?.name ?? symbol, 'sell', quantity, q.price) })
          return { ok: true, message: `已卖出 ${quantity} 股 ${symbol}` }
        },

        addContribution: (action, reward) => {
          const st = get()
          const level = 1 + Math.floor(st.account.experience / 500)
          const account: Account = {
            ...st.account,
            wegBalance: round2(st.account.wegBalance + reward),
            aiCredit: Math.min(1000, Math.round(st.account.aiCredit + 1)),
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

        // ---- AI 智能体运行 ----
        runAgent: (agentId, symbol) => {
          const st = get()
          const all = [...ASSETS, ...st.extraAssets]
          const report =
            agentId === 'research'
              ? runResearch(all, st.candidates, st.quotes)
              : agentId === 'valuation'
                ? (() => {
                    const target = symbol ? assetOf(symbol) ?? st.extraAssets.find((x) => x.symbol === symbol) : null
                    return target ? runValuation(target, st.quotes[target.symbol]) : null
                  })()
                : agentId === 'market'
                  ? runMarket(all, st.quotes, st.sectors, SECTORS)
                  : agentId === 'risk'
                    ? (() => {
                        const target = symbol ? assetOf(symbol) ?? st.extraAssets.find((x) => x.symbol === symbol) : all[0]
                        return target ? runRisk(target, st.quotes[target.symbol], st.account) : null
                      })()
                    : agentId === 'news'
                      ? runNews(all, st.quotes)
                      : agentId === 'portfolio'
                        ? runPortfolio(st.account, st.quotes, all)
                        : null
          if (!report) return null
          set({ aiReports: { ...st.aiReports, [agentId]: report } })
          return report
        },

        generateReport: () => {
          const st = get()
          const all = [...ASSETS, ...st.extraAssets]
          const report = generateDailyReport(all, st.quotes, st.sectors, SECTORS, st.indices, st.account)
          set({ dailyReport: report })
          return report
        },

        // ---- AI Research Agent 发现的候选资产一键模拟上市 ----
        listCandidate: (symbol) => {
          const st = get()
          const cand = st.candidates.find((c) => c.symbol === symbol)
          if (!cand) return { ok: false, message: '候选资产不存在或已上市' }
          // 防重复上市：已上市（含持久化的历史上市）则直接剔除候选并提示
          if (ASSETS.some((a) => a.symbol === symbol) || st.extraAssets.some((a) => a.symbol === symbol)) {
            set({ candidates: st.candidates.filter((c) => c.symbol !== symbol) })
            return { ok: false, message: `${symbol} 已在本会话或历史会话中上市` }
          }
          const asset = buildExtraAsset(cand)
          const quote = initQuote(asset.symbol, asset.basePrice)
          const cs = genCandles(asset.symbol, asset.basePrice, asset.volatility, 60)
          const sec = st.sectors[asset.sectorId]
          set({
            extraAssets: [...st.extraAssets, asset],
            candidates: st.candidates.filter((c) => c.symbol !== symbol),
            listings: [{ symbol, time: new Date().toLocaleString('zh-CN', { hour12: false }) }, ...st.listings].slice(0, 50),
            quotes: { ...st.quotes, [quote.symbol]: quote },
            candles: { ...st.candles, [asset.symbol]: cs },
            sectors: sec ? { ...st.sectors, [asset.sectorId]: { ...sec, value: round2(sec.value * 1.002) } } : st.sectors,
          })
          return { ok: true, message: `${asset.symbol} ${asset.name} 已模拟上市（本次会话有效）` }
        },

        // ---- AI 机会雷达 ----
        runRadar: () => {
          const st = get()
          const all = [...ASSETS, ...st.extraAssets]
          const ops = runRadar(all, st.quotes, st.whaleFlows)
          set({ radar: ops })
          return ops
        },

        // ---- Pro Trade：挂单（限价/止损/止盈）----
        placeOrder: (o) => {
          const st = get()
          const q = st.quotes[o.symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          if (o.quantity <= 0 || o.price <= 0) return { ok: false, message: '价格或数量不合法' }
          const asset = assetOf(o.symbol) ?? st.extraAssets.find((x) => x.symbol === o.symbol)
          const order: OpenOrder = {
            id: `od-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
            symbol: o.symbol,
            name: asset?.name ?? o.symbol,
            kind: o.kind,
            side: o.side,
            price: round2(o.price),
            quantity: o.quantity,
            status: 'pending',
            createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
          }
          set({ openOrders: [...st.openOrders, order] })
          const kindLabel = o.kind === 'limit' ? '限价' : o.kind === 'stopLoss' ? '止损' : '止盈'
          return { ok: true, message: `${kindLabel}${o.side === 'buy' ? '买入' : '卖出'}挂单成功：${o.symbol} @ $${round2(o.price)}` }
        },

        cancelOrder: (id) => {
          const st = get()
          set({ openOrders: st.openOrders.filter((o) => o.id !== id) })
        },

        // ---- Pro Trade：模拟杠杆合约 ----
        openContract: (o) => {
          const st = get()
          const q = st.quotes[o.symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          if (![2, 5, 10].includes(o.leverage)) return { ok: false, message: '杠杆仅支持 2x / 5x / 10x' }
          if (o.quantity <= 0) return { ok: false, message: '数量不合法' }
          const notional = q.price * o.quantity
          const margin = round2(notional / o.leverage)
          if (margin > st.account.cash) return { ok: false, message: `保证金不足（需 $${margin.toLocaleString('zh-CN')}）` }
          const asset = assetOf(o.symbol) ?? st.extraAssets.find((x) => x.symbol === o.symbol)
          const id = `ct-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
          set({
            account: {
              ...st.account,
              cash: round2(st.account.cash - margin),
              orders: [
                {
                  id,
                  symbol: o.symbol,
                  name: asset?.name ?? o.symbol,
                  side: o.side === 'long' ? 'buy' : 'sell',
                  quantity: o.quantity,
                  price: q.price,
                  amount: margin,
                  time: new Date().toLocaleString('zh-CN', { hour12: false }),
                },
                ...st.account.orders,
              ],
            },
            contracts: [
              ...st.contracts,
              { id, symbol: o.symbol, name: asset?.name ?? o.symbol, side: o.side, leverage: o.leverage, quantity: o.quantity, entryPrice: q.price, margin, openedAt: new Date().toLocaleString('zh-CN', { hour12: false }) },
            ],
          })
          return { ok: true, message: `已开 ${o.leverage}x ${o.side === 'long' ? '做多' : '做空'} ${o.symbol}，保证金 $${margin.toLocaleString('zh-CN')}` }
        },

        closeContract: (id) => {
          const st = get()
          const c = st.contracts.find((x) => x.id === id)
          if (!c) return { ok: false, message: '合约不存在' }
          const q = st.quotes[c.symbol]
          if (!q) return { ok: false, message: '标的不存在' }
          const pnl = c.side === 'long' ? (q.price - c.entryPrice) * c.quantity : (c.entryPrice - q.price) * c.quantity
          const refund = round2(c.margin + pnl)
          set({
            account: {
              ...st.account,
              cash: round2(st.account.cash + refund),
              orders: [
                {
                  id: `o-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
                  symbol: c.symbol,
                  name: c.name,
                  side: c.side === 'long' ? 'sell' : 'buy',
                  quantity: c.quantity,
                  price: q.price,
                  amount: refund,
                  time: new Date().toLocaleString('zh-CN', { hour12: false }),
                },
                ...st.account.orders,
              ],
            },
            contracts: st.contracts.filter((x) => x.id !== id),
          })
          return { ok: true, message: `已平仓 ${c.symbol}，盈亏 ${pnl >= 0 ? '+' : ''}$${pnl.toFixed(2)}` }
        },

        // ---- WEG 金库质押（用 WEG 余额质押，非现金）----
        stakeWeg: (amount) => {
          const st = get()
          if (amount <= 0) return { ok: false, message: '质押数量不合法' }
          if (amount > st.account.wegBalance) return { ok: false, message: `WEG 余额不足（当前 ${st.account.wegBalance.toFixed(2)} WEG）` }
          if (st.stake) return { ok: false, message: '已有进行中的质押，请先解除' }
          set({
            account: { ...st.account, wegBalance: round2(st.account.wegBalance - amount) },
            stake: { amount, startedAt: new Date().toLocaleString('zh-CN', { hour12: false }), apr: 8, accrued: 0 },
          })
          return { ok: true, message: `已质押 ${amount} WEG，模拟年化 8%` }
        },

        unstakeWeg: () => {
          const st = get()
          if (!st.stake) return { ok: false, message: '当前无质押' }
          set({
            account: { ...st.account, wegBalance: round2(st.account.wegBalance + st.stake.amount + st.stake.accrued) },
            stake: null,
          })
          return { ok: true, message: `已解除质押，本金 + 收益共 ${round2(st.stake.amount + st.stake.accrued).toFixed(2)} WEG 已回到余额` }
        },
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
        extraAssets: state.extraAssets,
        listings: state.listings,
        candidates: state.candidates,
        openOrders: state.openOrders,
        contracts: state.contracts,
        stake: state.stake,
      }),
      // 旧版/缺字段数据兼容：水合时补齐账户默认字段，避免缺失字段崩溃
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<MarketState>
        const oldAccount = (p.account ?? {}) as Partial<Account>
        return {
          ...current,
          ...p,
          account: {
            ...current.account,
            ...oldAccount,
            cash: typeof oldAccount.cash === 'number' ? oldAccount.cash : current.account.cash,
            wegBalance: typeof oldAccount.wegBalance === 'number' ? oldAccount.wegBalance : current.account.wegBalance,
            aiCredit: typeof oldAccount.aiCredit === 'number' ? oldAccount.aiCredit : current.account.aiCredit,
            holdings: oldAccount.holdings ?? current.account.holdings,
            orders: oldAccount.orders ?? current.account.orders,
            contributions: oldAccount.contributions ?? current.account.contributions,
            totalEarned: typeof oldAccount.totalEarned === 'number' ? oldAccount.totalEarned : 0,
            level: typeof oldAccount.level === 'number' ? oldAccount.level : 1,
            experience: typeof oldAccount.experience === 'number' ? oldAccount.experience : 0,
          },
        }
      },
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
