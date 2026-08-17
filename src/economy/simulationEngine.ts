// ============================================================
// AI Economy Simulation Engine
// 统一调度：DSU / WEG / AI Company / AI Worker / Capital Flow
// tick() 每 2.5s 由 store/economy 调用，驱动整个 AI 经济循环
// ============================================================
import type { EconomyState, EconomyEvent, EconomyPortfolio, SimOrder, AICompany, AIWorker, WEGState } from './types'
import { initDSU, tickDSU } from './dsuEngine'
import { initWEG, tickWEG } from './wegEngine'
import { initCompanies, tickCompanies, matchOrder } from './companyEngine'
import { initWorkers, tickWorkers } from './workerEngine'
import { buildCapitalFlow } from './capitalFlowEngine'
import { tickMarket } from './marketEngine'
import { clamp, round2, timeStr } from '../utils/format'

const INITIAL_DSU = 10_000
const INITIAL_WEG = 1_000
const INITIAL_TOTAL_ASSETS = INITIAL_DSU + INITIAL_WEG * 0.05

const EVENT_POOL: EconomyEvent[] = [
  {
    id: 'ev-dsk-upgrade',
    time: '',
    title: 'DeepSeek Model Upgrade',
    description: 'DeepSeek 发布新一代推理模型，AI 生产力显著提升。',
    impact: { target: 'dsu', metric: 'deepSeekProduction', magnitude: 8, targetId: 'dsk' },
    active: false,
  },
  {
    id: 'ev-gpu-supply',
    time: '',
    title: 'GPU Supply Increase',
    description: '云端 GPU 供给增加，AI 算力成本下降。',
    impact: { target: 'dsu', metric: 'gpuCompute', magnitude: -12 },
    active: false,
  },
  {
    id: 'ev-edu-demand',
    time: '',
    title: 'AI Education Demand Increase',
    description: '全球 AI 教育市场需求激增，EDUAI 营收大涨。',
    impact: { target: 'company', metric: 'revenue', magnitude: 15, targetId: 'eduai' },
    active: false,
  },
  {
    id: 'ev-agent-adoption',
    time: '',
    title: 'AI Agent Adoption',
    description: '企业级 AI Agent 采购潮，劳动力需求全面上涨。',
    impact: { target: 'worker', metric: 'demand', magnitude: 21 },
    active: false,
  },
  {
    id: 'ev-code-productivity',
    time: '',
    title: 'Coding Agent Productivity Leap',
    description: '代码生成 Agent 效率提升，CODEAI 订单量创新高。',
    impact: { target: 'worker', metric: 'productivity', magnitude: 10, targetId: 'w_code' },
    active: false,
  },
  {
    id: 'ev-platform-users',
    time: '',
    title: 'Platform User Milestone',
    description: '平台活跃用户数突破新高，WEG 生态增长加速。',
    impact: { target: 'weg', metric: 'userGrowth', magnitude: 6 },
    active: false,
  },
  {
    id: 'ev-api-contracts',
    time: '',
    title: 'Enterprise API Contracts',
    description: '大型企业 API 服务签约增长，AI Infra 收入上升。',
    impact: { target: 'company', metric: 'revenue', magnitude: 10, targetId: 'infraai' },
    active: false,
  },
  {
    id: 'ev-regulation',
    time: '',
    title: 'AI Regulation Discussion',
    description: '监管讨论升温，市场短期风险偏好下降。',
    impact: { target: 'market', metric: 'risk', magnitude: -5 },
    active: false,
  },
]

function initEvents(): EconomyEvent[] {
  return EVENT_POOL.map((e) => ({ ...e, time: timeStr(), active: false, durationTicks: 0 }))
}

function initPortfolio(): EconomyPortfolio {
  return {
    dsuBalance: INITIAL_DSU,
    wegBalance: INITIAL_WEG,
    wegAvgCost: 0.05,
    companyPositions: {},
    workerRoster: [],
    totalAssets: INITIAL_TOTAL_ASSETS,
    todayPnl: 0,
    totalPnl: 0,
    workerIncome: 0,
    companyIncome: 0,
    investedDsu: 0,
  }
}

function computeAgg(companies: AICompany[], workers: AIWorker[], transactionCount: number) {
  const marketCap = companies.reduce((a, c) => a + c.marketCap, 0)
  const workersCount = workers.reduce((a, w) => a + w.productivity * 120, 0) + companies.reduce((a, c) => a + c.workers, 0)
  const companiesCount = 3_200 + companies.length * 60 // 模拟整体经济体企业数（10 家样本代表）
  const users = 1_200_000 + Math.round(marketCap / 1_000_000)
  return {
    marketCap,
    workers: Math.round(workersCount),
    companies: companiesCount,
    transactions: transactionCount + Math.round(users * 2.2),
    users,
  }
}

function buildActiveImpacts(events: EconomyEvent[]): { impactTarget: string; magnitude: number; targetId?: string }[] {
  const impacts: { impactTarget: string; magnitude: number; targetId?: string }[] = []
  for (const e of events) {
    if (!e.active) continue
    if (e.impact.target === 'market') {
      // 市场级事件：影响所有企业
      impacts.push({ impactTarget: 'company', magnitude: e.impact.magnitude })
    } else {
      impacts.push({ impactTarget: e.impact.target, magnitude: e.impact.magnitude, targetId: e.impact.targetId })
    }
  }
  return impacts
}

function updatePortfolio(
  pf: EconomyPortfolio,
  companies: AICompany[],
  workers: AIWorker[],
  weg: WEGState,
): EconomyPortfolio {
  const companyValue = Object.values(pf.companyPositions).reduce((a, pos) => {
    const c = companies.find((x) => x.symbol === pos.symbol)
    return a + pos.shares * (c?.price ?? pos.avgCost)
  }, 0)
  const wegValue = pf.wegBalance * weg.price
  // Worker 每日产出计入 DSU 收入
  const workerIncome = pf.workerRoster.reduce((a, wid) => {
    const w = workers.find((x) => x.id === wid)
    return a + (w?.dailyOutput ?? 0)
  }, 0)

  // 企业分红收入（按持股比例分享利润）
  const companyIncome = Object.values(pf.companyPositions).reduce((a, pos) => {
    const c = companies.find((x) => x.symbol === pos.symbol)
    if (!c || c.circulatingSupply <= 0) return a
    return a + c.dailyProfit * (pos.shares / c.circulatingSupply)
  }, 0)

  const dsuBalance = pf.dsuBalance + workerIncome + companyIncome
  const totalAssets = dsuBalance + wegValue + companyValue

  return {
    ...pf,
    dsuBalance,
    workerIncome,
    companyIncome,
    totalAssets,
    todayPnl: totalAssets - INITIAL_TOTAL_ASSETS,
    totalPnl: totalAssets - INITIAL_TOTAL_ASSETS,
  }
}

function processOrders(
  state: EconomyState,
): Pick<EconomyState, 'orders' | 'transactions' | 'portfolio' | 'companies'> {
  let companies = state.companies
  let portfolio = { ...state.portfolio }
  const transactions = [...state.transactions]
  const orders: SimOrder[] = []

  for (const o of state.orders) {
    if (o.status !== 'pending') {
      orders.push(o)
      continue
    }
    const cIndex = companies.findIndex((x) => x.symbol === o.companySymbol)
    if (cIndex === -1) {
      orders.push(o)
      continue
    }
    const c = companies[cIndex]
    const remaining = o.quantity - o.filled
    const res = matchOrder(c, o.side, o.type, o.price, remaining)
    if (res.filled <= 0) {
      orders.push(o)
      continue
    }

    const cost = res.avgPrice * res.filled
    const nextFilled = o.filled + res.filled
    const filled = nextFilled >= o.quantity

    if (o.side === 'buy') {
      if (portfolio.dsuBalance < cost) {
        orders.push(o)
        continue
      }
      portfolio.dsuBalance = round2(portfolio.dsuBalance - cost)
      const pos = portfolio.companyPositions[o.companySymbol]
      portfolio.companyPositions = {
        ...portfolio.companyPositions,
        [o.companySymbol]: pos
          ? {
              symbol: o.companySymbol,
              shares: pos.shares + res.filled,
              avgCost: round2((pos.avgCost * pos.shares + cost) / (pos.shares + res.filled)),
            }
          : { symbol: o.companySymbol, shares: res.filled, avgCost: res.avgPrice },
      }
      portfolio.investedDsu = round2(portfolio.investedDsu + cost)
    } else {
      const pos = portfolio.companyPositions[o.companySymbol]
      if (!pos || pos.shares < res.filled) {
        orders.push(o)
        continue
      }
      portfolio.dsuBalance = round2(portfolio.dsuBalance + cost)
      const remainingShares = pos.shares - res.filled
      portfolio.companyPositions = { ...portfolio.companyPositions }
      if (remainingShares > 0) {
        portfolio.companyPositions[o.companySymbol] = { ...pos, shares: remainingShares }
      } else {
        delete portfolio.companyPositions[o.companySymbol]
      }
      portfolio.investedDsu = round2(Math.max(0, portfolio.investedDsu - pos.avgCost * res.filled))
    }

    transactions.push({
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
      companySymbol: o.companySymbol,
      side: o.side,
      price: res.avgPrice,
      quantity: res.filled,
      time: timeStr(),
    })

    orders.push({ ...o, filled: nextFilled, status: filled ? 'filled' : 'pending' })
  }

  return { orders, transactions, portfolio, companies }
}

export function initEconomy(): EconomyState {
  const dsu = initDSU()
  const weg = initWEG()
  const companies = initCompanies()
  const workers = initWorkers()
  const agg = computeAgg(companies, workers, 0)
  const capitalFlow = buildCapitalFlow(
    1_000_000_000,
    dsu.circulation,
    agg.marketCap,
    workers.reduce((a, w) => a + w.dailyOutput, 0),
    companies.reduce((a, c) => a + c.dailyRevenue, 0),
    companies.reduce((a, c) => a + c.dailyProfit, 0),
  )
  const portfolio = initPortfolio()

  return {
    dsu,
    weg,
    companies,
    workers,
    capitalFlow,
    economyIndex: 1284.62,
    prevEconomyIndex: 1284.62,
    transactions: [],
    orders: [],
    events: initEvents(),
    agg,
    portfolio,
    tickCount: 0,
  }
}

export function tickEconomy(state: EconomyState): EconomyState {
  // ---- 事件生命周期 ----
  let events = state.events.map((e) => {
    if (!e.active) return e
    const next = (e.durationTicks ?? 1) - 1
    return next <= 0 ? { ...e, active: false, durationTicks: 0 } : { ...e, durationTicks: next }
  })

  // 每 12 tick（约 30s）触发一个随机事件
  if (state.tickCount > 0 && state.tickCount % 12 === 0) {
    const inactive = events.filter((e) => !e.active)
    if (inactive.length > 0) {
      const e = inactive[Math.floor(Math.random() * inactive.length)]
      events = events.map((x) => (x.id === e.id ? { ...x, active: true, durationTicks: 4, time: timeStr() } : x))
    }
  }

  const activeImpacts = buildActiveImpacts(events)

  // ---- 子引擎 tick ----
  const dsu = tickDSU(state.dsu, activeImpacts)

  // 需求指数由 Worker 平均需求推导
  const avgWorkerDemand = state.workers.reduce((a, w) => a + w.demandIndex, 0) / (state.workers.length || 1)
  const demandIndex = clamp(avgWorkerDemand, 0.5, 2.0)

  const companies = tickCompanies(state.companies, dsu.aiProductionIndex, demandIndex, activeImpacts)
  const workers = tickWorkers(state.workers, demandIndex, activeImpacts)

  // WEG 生态因子
  const agg = computeAgg(companies, workers, state.transactions.length)
  const weg = tickWEG(
    state.weg,
    { users: agg.users, agents: agg.workers, transactions: agg.transactions, companies: agg.companies },
    activeImpacts,
  )

  // 订单撮合
  const { orders, transactions, portfolio: portfolioAfterOrders } = processOrders({ ...state, companies, workers })

  // 更新投资组合（ Worker 产出 + 企业分红 + 资产重估）
  const portfolio = updatePortfolio(portfolioAfterOrders, companies, workers, weg)

  // ---- AI Economy Index ----
  const prevTotalCap = state.agg.marketCap || 1
  const capChange = (agg.marketCap - prevTotalCap) / prevTotalCap
  const wegChange = weg.changePct
  const dsuChange = dsu.prevIndex > 0 ? (dsu.aiProductionIndex - dsu.prevIndex) / dsu.prevIndex : 0
  const growthBlended = (wegChange + capChange + dsuChange) / 3
  const economyIndex = round2(clamp(state.economyIndex * (1 + growthBlended * 0.5), 800, 3000))

  // ---- Capital Flow ----
  const workerOutput = workers.reduce((a, w) => a + w.dailyOutput, 0)
  const serviceRevenue = companies.reduce((a, c) => a + c.dailyRevenue, 0)
  const profit = companies.reduce((a, c) => a + c.dailyProfit, 0)
  const capital = 1_000_000_000 * (1 + state.tickCount * 0.0001)
  const capitalFlow = buildCapitalFlow(capital, dsu.circulation, agg.marketCap, workerOutput, serviceRevenue, profit)

  const nextState: EconomyState = {
    ...state,
    dsu,
    weg,
    companies,
    workers,
    capitalFlow,
    economyIndex,
    prevEconomyIndex: state.economyIndex,
    transactions,
    orders,
    events,
    agg,
    portfolio,
    tickCount: state.tickCount + 1,
  }

  // 订单簿维护与超时撤单作为统一 EconomyState 的最后一道管线。
  return tickMarket(nextState)
}
