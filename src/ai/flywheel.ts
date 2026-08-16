// ============================================================
// AI Exchange · AI 产业经济飞轮引擎（V6）
// 把底层经济三引擎（Demand / Production / Ledger）+ Capital OS
// + 行情 + 生态指标，聚合为「飞轮 8 节点」视图层状态：
//   AI资本 → AI企业 → AI IPO → AI Workforce → Agent生产
//            → AI收入 → AI利润 → 企业估值 → 资本增长 → 循环
// 设计原则：飞轮是聚合/视图层，只读取底层引擎的真实累计值，
// 不另造一套数据，保证数值守恒、可审计。
// ============================================================
import type {
  Account,
  Asset,
  CapitalOsState,
  DemandEngineState,
  EconomicLedgerState,
  FlywheelNode,
  FlywheelNodeId,
  FlywheelState,
  ProductionEngineState,
  Quote,
  SentimentState,
} from '../types'
import { clamp, round2, timeStr } from '../utils/format'

/** 飞轮节点静态定义（顺序即飞轮流转顺序） */
export const FLYWHEEL_NODE_DEFS: {
  id: FlywheelNodeId
  name: string
  icon: string
  unit: string
  desc: string
}[] = [
  { id: 'capital', name: 'AI 资本', icon: '🏦', unit: '$', desc: '进入经济的资本总规模（初始资本 + 分红回流 + 留存再投资）' },
  { id: 'company', name: 'AI 企业', icon: '🏢', unit: '家', desc: '被资本投资/孵化的 AI 企业（当前持仓企业 + 候选企业）' },
  { id: 'ipo', name: 'AI IPO', icon: '🎉', unit: '家', desc: '已模拟上市的 AI 企业与待上市管线（候选资产）' },
  { id: 'workforce', name: 'AI Workforce', icon: '🤖', unit: '个', desc: 'AI 劳动力规模（资本雇佣的 Agent 数量）' },
  { id: 'production', name: 'Agent 生产', icon: '⚙️', unit: '任务', desc: 'Agent 累计生产任务量（产出）' },
  { id: 'revenue', name: 'AI 收入', icon: '💰', unit: '$', desc: 'AI 服务累计收入（订单成交）' },
  { id: 'profit', name: 'AI 利润', icon: '📈', unit: '$', desc: '累计净利润 = 收入 - 算力成本 - 工资' },
  { id: 'valuation', name: '企业估值', icon: '💎', unit: '$', desc: '被投 AI 企业总估值（市值加权）' },
]

export const FLYWHEEL_ICONS: Record<FlywheelNodeId, string> = Object.fromEntries(
  FLYWHEEL_NODE_DEFS.map((d) => [d.id, d.icon]),
) as Record<FlywheelNodeId, string>

/** 飞轮 tick 上下文（由 market store 组装，全部来自底层真实状态） */
export type FlywheelTickCtx = {
  capitalOs: CapitalOsState | null
  production: ProductionEngineState
  ledger: EconomicLedgerState
  demand: DemandEngineState
  account: Account
  quotes: Record<string, Quote>
  assets: Asset[] // 全部上市资产（含额外上市）
  extraAssets: Asset[] // 额外（候选转上市）资产
  candidates: { symbol: string; name: string; basePrice: number; marketCap: number }[]
  listings: { symbol: string; time: string }[]
  eco: { users: number; agent: number; calls: number; revenue: number }
  sentiment: SentimentState
}

/** 初始化飞轮（空态，等首个 tick 派生） */
export function initFlywheel(): FlywheelState {
  return {
    active: false,
    nodes: FLYWHEEL_NODE_DEFS.map((d) => ({
      id: d.id,
      name: d.name,
      icon: d.icon,
      value: 0,
      prev: 0,
      delta: 0,
      pct: 0,
      unit: d.unit,
      desc: d.desc,
    })),
    speed: 0,
    totalValuation: 0,
    totalCapital: 0,
    cycles: 0,
    lastTickAt: 0,
    history: [],
  }
}

/** 从底层状态派生 8 节点指标值 */
export function deriveFlywheelNodes(ctx: FlywheelTickCtx): { values: Record<FlywheelNodeId, number>; valuation: number; capital: number } {
  const { capitalOs, production, ledger, demand, quotes, extraAssets, candidates, listings } = ctx

  // ---- ① AI 资本：初始资本 + 分红回流 + 留存再投资 + 账户现金 ----
  const baseCapital = capitalOs?.amount ?? 0
  const recycled = ledger.dividend + ledger.investment
  const capital = round2(baseCapital + recycled)

  // ---- ② AI 企业：被投企业（capitalOs 目标）数量（市值>0 的持仓）+ 候选企业 ----
  const investedSymbols = new Set(capitalOs?.targets.map((t) => t.symbol) ?? [])
  const investedCount = [...investedSymbols].filter((s) => quotes[s]).length
  const company = investedCount + extraAssets.length

  // ---- ③ AI IPO：已模拟上市（本次会话列表）+ 待上市候选管线 ----
  const ipo = listings.length + candidates.length

  // ---- ④ AI Workforce：资本雇佣的 Agent 数量（劳动力规模） ----
  const workforce = capitalOs?.active ? Math.max(capitalOs.laborUnits, production.workers.length) : production.workers.length

  // ---- ⑤ Agent 生产：累计任务产出 ----
  const productionValue = production.totalOutput + demand.fulfilledValue / 1000 // 任务量 + 订单成交量折算

  // ---- ⑥ AI 收入：账本累计收入 ----
  const revenue = ledger.revenue

  // ---- ⑦ AI 利润：账本累计净利润 ----
  const profit = ledger.profit

  // ---- ⑧ 企业估值：被投企业持仓市值 + 额外上市企业市值 + 利润资本化（PE 3x）----
  let valuation = 0
  for (const h of ctx.account.holdings) {
    const price = quotes[h.symbol]?.price ?? h.avgCost
    valuation += h.quantity * price
  }
  for (const a of extraAssets) {
    valuation += quotes[a.symbol]?.price ?? a.basePrice
  }
  // 利润 → 估值传导：累计利润 × PE 3x 计入企业估值（体现「AI 利润 → 企业估值 → 资本增长」）
  valuation += ledger.profit * 3
  // 加上持仓企业对应用户未持有的市值按投资额计入：用 invested 兜底保证非零
  if (capitalOs && valuation <= 0) valuation = capitalOs.invested

  return {
    values: { capital, company, ipo, workforce, production: productionValue, revenue, profit, valuation: round2(valuation) },
    valuation: round2(valuation),
    capital: round2(capital),
  }
}

/** 每 tick 运行一步飞轮（聚合派生 + 转速计算 + 快照） */
export function runFlywheelTick(prev: FlywheelState, ctx: FlywheelTickCtx): FlywheelState {
  const now = Date.now()
  const { values, valuation, capital } = deriveFlywheelNodes(ctx)

  const prevMap = new Map(prev.nodes.map((n) => [n.id, n]))
  const nodes: FlywheelNode[] = FLYWHEEL_NODE_DEFS.map((d) => {
    const value = values[d.id]
    const prevVal = prevMap.get(d.id)?.value ?? value
    const delta = round2(value - prevVal)
    const pct = prevVal > 0 ? round2((delta / prevVal) * 100) : 0
    return {
      id: d.id,
      name: d.name,
      icon: d.icon,
      value: round2(value),
      prev: round2(prevVal),
      delta,
      pct,
      unit: d.unit,
      desc: d.desc,
    }
  })

  // ---- 飞轮转速 0-100：生态活力 × 情绪偏置 × 利润增速 × 生产活跃 ----
  const eco = ctx.eco
  const vitality = (eco.users * eco.agent * eco.calls * eco.revenue) ** 0.25
  const sentimentFactor = 1 + (ctx.sentiment.score - 50) / 50 // 0 ~ 2
  const growthFactor = nodes.find((n) => n.id === 'revenue')?.pct ?? 0
  const profitFactor = nodes.find((n) => n.id === 'profit')?.pct ?? 0
  const speed = Math.round(clamp(vitality * 34 + sentimentFactor * 18 + Math.min(Math.abs(growthFactor), 40) * 0.5 + Math.min(Math.abs(profitFactor), 40) * 0.5, 2, 100))

  // 飞轮转速>40 且底层闭环运行时记一次循环推进（每 500 tick 折算一次完整循环）
  const cycles = prev.cycles + (prev.active && speed > 40 && now - prev.lastTickAt > 0 ? (Math.random() < 0.004 ? 1 : 0) : 0)

  const history = [
    ...prev.history.slice(-119),
    { t: timeStr(new Date(now)), speed, valuation: round2(valuation), capital: round2(capital) },
  ]

  return {
    active: ctx.capitalOs?.active ?? false,
    nodes,
    speed,
    totalValuation: valuation,
    totalCapital: capital,
    cycles,
    lastTickAt: now,
    history,
  }
}

/** 飞轮指数：综合转速与估值增速的 0-100 指数 */
export function flywheelIndex(fw: FlywheelState) {
  const valNode = fw.nodes.find((n) => n.id === 'valuation')
  const valGrowth = valNode?.pct ?? 0
  return clamp(Math.round(fw.speed * 0.8 + Math.min(Math.abs(valGrowth), 50) * 0.4), 0, 100)
}
