// ============================================================
// AI Company Engine — 模拟企业市场
// ============================================================
import type { AICompany, OrderBookEntry } from './types'
import { clamp, round2, mulberry32 } from '../utils/format'

const COMPANIES = [
  { id: 'dsk', name: 'DeepSeek Labs', symbol: 'DSK', industry: 'AI 模型', desc: '大模型研发与开源生态', basePrice: 12.84, supply: 50_000_000, circ: 28_000_000, growth: 18.4, risk: 2, users: 2_400_000, agents: 48_000, workers: 12_400 },
  { id: 'eduai', name: 'AI Education', symbol: 'EDUAI', industry: 'AI 教育', desc: '智能教学与个性化学习', basePrice: 8.42, supply: 80_000_000, circ: 42_000_000, growth: 15.2, risk: 3, users: 5_800_000, agents: 32_000, workers: 8_200 },
  { id: 'codeai', name: 'AI Coding', symbol: 'CODEAI', industry: 'AI 编程', desc: '代码生成与自动审查', basePrice: 15.28, supply: 40_000_000, circ: 22_000_000, growth: 22.1, risk: 2, users: 1_800_000, agents: 56_000, workers: 15_600 },
  { id: 'research', name: 'AI Research', symbol: 'RESEARCH', industry: 'AI 研究', desc: '自动化研究与报告生成', basePrice: 10.66, supply: 35_000_000, circ: 18_000_000, growth: 11.8, risk: 3, users: 920_000, agents: 24_000, workers: 6_800 },
  { id: 'mediaai', name: 'AI Media', symbol: 'MEDIAAI', industry: 'AI 媒体', desc: '内容生成与多模态创作', basePrice: 6.88, supply: 90_000_000, circ: 48_000_000, growth: 14.6, risk: 4, users: 4_200_000, agents: 38_000, workers: 9_400 },
  { id: 'agentai', name: 'AI Agent Factory', symbol: 'AGENTAI', industry: 'AI 智能体', desc: '智能体工厂与自动化工作流', basePrice: 18.42, supply: 30_000_000, circ: 16_000_000, growth: 28.5, risk: 3, users: 1_200_000, agents: 82_000, workers: 22_800 },
  { id: 'dataai', name: 'AI Data', symbol: 'DATAAI', industry: 'AI 数据', desc: '数据采集与标注服务', basePrice: 5.24, supply: 100_000_000, circ: 55_000_000, growth: 9.4, risk: 3, users: 680_000, agents: 18_000, workers: 28_400 },
  { id: 'infraai', name: 'AI Infra', symbol: 'INFRAAI', industry: '算力基础设施', desc: 'GPU 算力与推理服务', basePrice: 22.18, supply: 25_000_000, circ: 14_000_000, growth: 16.8, risk: 2, users: 420_000, agents: 12_000, workers: 4_200 },
  { id: 'robai', name: 'AI Robotics', symbol: 'ROBAI', industry: 'AI 机器人', desc: '具身智能与自动化机器人', basePrice: 28.64, supply: 20_000_000, circ: 10_000_000, growth: 20.3, risk: 4, users: 180_000, agents: 8_000, workers: 3_600 },
  { id: 'finai', name: 'AI Finance', symbol: 'FINAI', industry: 'AI 金融', desc: '智能投顾与风险分析', basePrice: 16.88, supply: 35_000_000, circ: 19_000_000, growth: 13.2, risk: 3, users: 1_500_000, agents: 28_000, workers: 7_200 },
]

export function initCompanies(): AICompany[] {
  return COMPANIES.map((c) => ({
    ...c,
    logo: c.symbol.charAt(0),
    description: c.desc,
    totalSupply: c.supply,
    circulatingSupply: c.circ,
    price: c.basePrice,
    prevPrice: c.basePrice,
    changePct: 0,
    marketCap: Math.round(c.basePrice * c.circ),
    dsuReserve: Math.round(c.basePrice * c.circ * 0.3),
    dailyRevenue: Math.round(c.basePrice * c.circ * 0.002),
    dailyProfit: Math.round(c.basePrice * c.circ * 0.0006),
    growthRate: c.growth,
    riskLevel: c.risk,
    history: Array.from({ length: 40 }, (_, i) => c.basePrice * (0.9 + i * 0.003 + Math.sin(i * 0.35) * 0.02)),
    orderBook: genOrderBook(c.basePrice),
  }))
}

function genOrderBook(price: number): { bids: OrderBookEntry[]; asks: OrderBookEntry[] } {
  const bids: OrderBookEntry[] = []
  const asks: OrderBookEntry[] = []
  for (let i = 0; i < 6; i++) {
    bids.push({ price: round2(price * (1 - 0.001 - i * 0.003)), volume: Math.round(500 + Math.random() * 5000) })
    asks.push({ price: round2(price * (1 + 0.001 + i * 0.003)), volume: Math.round(500 + Math.random() * 5000) })
  }
  return { bids, asks }
}

let coRng = mulberry32(123456)

export function tickCompanies(
  companies: AICompany[],
  dsuIndex: number,
  demandIndex: number,
  events: { impactTarget: string; magnitude: number; targetId?: string }[],
): AICompany[] {
  const dsuFactor = dsuIndex / 128.42

  return companies.map((c) => {
    const r = coRng()
    // 基础漂移
    const growth = c.growthRate / 100 * 0.002 // 每 tick 微增长
    const noise = (r - 0.5) * c.price * 0.015
    const demandEffect = (demandIndex - 1) * c.price * 0.01

    let delta = growth + noise + demandEffect

    // DSU 生产力影响
    delta += (dsuFactor - 1) * c.price * 0.005

    // 事件影响
    for (const e of events) {
      if (e.impactTarget === 'company' && (!e.targetId || e.targetId === c.id)) {
        delta += c.price * (e.magnitude / 100)
      }
    }

    const newPrice = clamp(c.price + delta, 0.5, 200)
    const changePct = (newPrice - c.prevPrice) / c.prevPrice
    const newRevenue = Math.round(c.dailyRevenue * (1 + (r - 0.45) * 0.02))
    const newProfit = Math.round(newRevenue * (0.25 + r * 0.1))

    return {
      ...c,
      prevPrice: c.price,
      price: round2(newPrice),
      changePct,
      marketCap: Math.round(newPrice * c.circulatingSupply),
      dsuReserve: Math.round(c.dsuReserve * (1 + growth)),
      dailyRevenue: newRevenue,
      dailyProfit: newProfit,
      users: Math.round(c.users * (1 + growth * 0.5)),
      agents: Math.round(c.agents * (1 + growth * 0.3)),
      workers: Math.round(c.workers * (1 + growth * 0.2)),
      history: [...c.history.slice(-39), round2(newPrice)],
      orderBook: genOrderBook(newPrice),
    }
  })
}

export function matchOrder(
  company: AICompany,
  side: 'buy' | 'sell',
  type: 'market' | 'limit',
  price: number,
  quantity: number,
): { avgPrice: number; filled: number; status: string } {
  if (type === 'market') {
    const book = side === 'buy' ? company.orderBook.asks : company.orderBook.bids
    let remaining = quantity
    let totalCost = 0
    for (const entry of book) {
      if (remaining <= 0) break
      const fill = Math.min(remaining, entry.volume)
      totalCost += fill * entry.price
      remaining -= fill
    }
    const filled = quantity - remaining
    return {
      avgPrice: filled > 0 ? round2(totalCost / filled) : price,
      filled,
      status: filled === quantity ? 'filled' : 'partial',
    }
  }
  // Limit order
  const canFill = side === 'buy' ? price >= company.orderBook.asks[0]?.price : price <= company.orderBook.bids[0]?.price
  if (canFill) {
    return { avgPrice: price, filled: quantity, status: 'filled' }
  }
  return { avgPrice: price, filled: 0, status: 'pending' }
}
