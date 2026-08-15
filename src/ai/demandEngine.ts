// ============================================================
// AI Exchange · ① Demand Engine（需求引擎）
// 人类需求 → 市场订单 → 企业竞争
// 每个 tick 依据生态活力 + 情绪 + 部署资本，将「人类真实需求」转化为
// 一批市场订单，并让 AI 企业（上市资产）按 AI Value / 评分 / 板块匹配度
// 参与竞标，得分最高者中标成交 —— 成交额即本 tick 的服务收入。
// 纯前端模拟：订单金额与「AI 服务收入」同源，保证账本能对齐审计。
// ============================================================
import type {
  Asset,
  CapitalOsState,
  DemandCategory,
  DemandEngineState,
  DemandOrder,
  SentimentState,
} from '../types'
import { clamp, mulberry32, round2, timeStr } from '../utils/format'

/** 需求品类 */
export const DEMAND_CATEGORIES: DemandCategory[] = ['研发', '运营', '数据', '内容', '客服', '研究']

/** 品类 → 关联板块（企业竞争时优先从这些板块选企业） */
const CATEGORY_SECTORS: Record<DemandCategory, string[]> = {
  研发: ['agent', 'skill', 'model'],
  运营: ['app', 'mcp'],
  数据: ['data'],
  内容: ['model', 'app'],
  客服: ['agent', 'app'],
  研究: ['model', 'skill', 'data'],
}

/** 品类 → 需求文案（模拟人类真实工作需求） */
const ORDER_TITLES: Record<DemandCategory, string[]> = {
  研发: ['修复生产环境 React 状态 Bug', '开发智能风控新模块', '重构核心微服务架构'],
  运营: ['优化增长投放 ROI', '搭建自动化营销工作流', '提升注册转化漏斗'],
  数据: ['清洗标注 40 万条数据集', '构建实时数据管道', '生成季度经营看板'],
  内容: ['批量生成品牌营销文案', '制作产品演示视频脚本', '撰写行业洞察白皮书'],
  客服: ['搭建多语言智能客服', '优化问答知识库', '自动处理客户投诉工单'],
  研究: ['12 个多模态模型对比评测', 'AI 行业趋势深度研究', '企业技术选型分析'],
}

const CATEGORY_ICONS: Record<DemandCategory, string> = {
  研发: '🧑‍💻',
  运营: '📈',
  数据: '🗂️',
  内容: '✍️',
  客服: '🎧',
  研究: '🔭',
}

export const demandCategoryIcon = (c: DemandCategory) => CATEGORY_ICONS[c]

/** 初始化需求引擎 */
export function initDemandEngine(): DemandEngineState {
  return {
    active: false,
    totalDemand: 0,
    fulfilledValue: 0,
    orders: [],
    categoryHeat: {
      研发: 78,
      运营: 65,
      数据: 72,
      内容: 60,
      客服: 55,
      研究: 70,
    },
    lastOrderAt: '',
  }
}

/** 生成一个订单（含企业竞标结果） */
function buildOrder(
  category: DemandCategory,
  value: number,
  assets: Asset[],
  rand: () => number,
  now: string,
): DemandOrder {
  const titles = ORDER_TITLES[category]
  const title = titles[Math.floor(rand() * titles.length)]
  // 企业竞争：优先匹配板块，不足则全市场补齐
  const preferred = CATEGORY_SECTORS[category]
  const pool = assets.filter((a) => preferred.includes(a.sectorId))
  const fallback = assets.filter((a) => !preferred.includes(a.sectorId))
  const pick = (arr: Asset[]) => arr[Math.floor(rand() * arr.length)]
  const biddersSet = new Set<string>()
  const bidders: { symbol: string; name: string; score: number }[] = []
  const bidCount = 3
  for (let i = 0; i < bidCount; i++) {
    const arr = pool.length > 0 && rand() > 0.35 ? pool : fallback
    const a = pick(arr.length > 0 ? arr : assets)
    if (!a || biddersSet.has(a.symbol)) continue
    biddersSet.add(a.symbol)
    // 竞标评分 = AI 评分(50%) + AI 经济价值归一(30%) + 运气(20%)
    const aiValueScore = clamp((a.aiValue / 5000) * 100, 0, 100)
    const score = Math.round(a.score * 0.5 + aiValueScore * 0.3 + rand() * 20)
    bidders.push({ symbol: a.symbol, name: a.name, score })
  }
  bidders.sort((x, y) => y.score - x.score)
  const winner = bidders[0]
  return {
    id: `dmd-${Date.now()}-${Math.floor(rand() * 1e5)}`,
    category,
    title,
    value: round2(value),
    status: bidders.length > 0 ? 'competing' : 'open',
    bidders,
    winnerSymbol: winner?.symbol,
    winnerName: winner?.name,
    createdAt: now,
  }
}

export type DemandTickCtx = {
  assets: Asset[]
  cap: CapitalOsState
  revenueTick: number // 本 tick 服务收入（$，与 AI 服务收入同源）
  vitality: number // 生态活力（几何平均）
  sentiment: SentimentState
}

export type DemandTickResult = {
  demand: DemandEngineState
  fulfilledValue: number // 本 tick 成交额（收入）
}

/** 每 tick 运行一步需求引擎 */
export function runDemandTick(demand: DemandEngineState, ctx: DemandTickCtx): DemandTickResult {
  const now = new Date()
  const nowStr = timeStr(now)
  const rand = mulberry32(now.getTime() % 1000000)

  // ---- 1 · 结算上一轮 competing 订单 → fulfilled（收入确认）----
  let fulfilledValue = 0
  let orders = demand.orders.map((o) => {
    if (o.status === 'competing') {
      fulfilledValue += o.value
      return { ...o, status: 'fulfilled' as const, fulfilledAt: nowStr }
    }
    return o
  })

  // ---- 2 · 生成新订单：把本 tick 收入拆成 0-2 个需求订单 ----
  const revenue = Math.max(0, ctx.revenueTick)
  let newValue = 0
  let lastOrderAt = demand.lastOrderAt
  if (revenue > 0.001 && ctx.cap.active) {
    const count = rand() > 0.4 ? 2 : 1
    const per = revenue / count
    const newOrders: DemandOrder[] = []
    for (let i = 0; i < count; i++) {
      // 品类按热度加权抽取
      const cats = DEMAND_CATEGORIES
      const weights = cats.map((c) => demand.categoryHeat[c])
      const totalW = weights.reduce((a, b) => a + b, 0)
      let r = rand() * totalW
      let category: DemandCategory = cats[cats.length - 1]
      for (let j = 0; j < cats.length; j++) {
        r -= weights[j]
        if (r <= 0) {
          category = cats[j]
          break
        }
      }
      const order = buildOrder(category, per, ctx.assets, rand, nowStr)
      newOrders.push(order)
      newValue += order.value
    }
    orders = [...newOrders, ...orders].slice(0, 30)
    lastOrderAt = nowStr
  }

  // ---- 3 · 品类热度演化（均值回归 + 情绪微扰）----
  const nextHeat = { ...demand.categoryHeat }
  const bias = (ctx.sentiment.score - 50) / 50
  for (const c of DEMAND_CATEGORIES) {
    const base = c === '研发' || c === '研究' ? 75 : c === '数据' ? 70 : 60
    nextHeat[c] = Math.round(clamp(nextHeat[c] + (base - nextHeat[c]) * 0.01 + (rand() - 0.5) * 4 + bias * 3, 20, 98))
  }

  return {
    demand: {
      ...demand,
      active: ctx.cap.active,
      totalDemand: round2(demand.totalDemand + newValue),
      fulfilledValue: round2(demand.fulfilledValue + fulfilledValue),
      orders,
      categoryHeat: nextHeat,
      lastOrderAt,
    },
    fulfilledValue: round2(fulfilledValue),
  }
}
