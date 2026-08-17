// ============================================================
// AI Exchange · AI Economy Types
// 四层资产：DSU / WEG / AI Company / AI Worker
// ============================================================

/** DSU — DeepSeek Stable Unit（AI 生产力计价单位） */
export type DSUState = {
  price: number // 始终 1.0000 DSU（内部计价单位）
  aiProductionIndex: number // AI 生产力指数（基期 100）
  prevIndex: number
  components: {
    deepSeek: number // DeepSeek AI Production Power 权重 50%
    gpuCompute: number // GPU Compute 权重 20%
    agentWork: number // AI Agent Work 权重 20%
    apiService: number // AI API Service 权重 10%
  }
  circulation: number
  reserve: number
  dailyConsumption: number
  dailyMint: number
  dailyBurn: number
  history: number[] // AI Production Index 历史
}

/** WEG — 平台生态增长资产 */
export type WEGState = {
  price: number
  prevPrice: number
  changePct: number
  marketCap: number
  totalSupply: number
  circulatingSupply: number
  history: number[]
  factors: {
    platformGrowth: number
    userGrowth: number
    transactionGrowth: number
    agentGrowth: number
  }
}

/** AI 企业 */
export type AICompany = {
  id: string
  name: string
  symbol: string
  logo: string
  industry: string
  description: string
  totalSupply: number
  circulatingSupply: number
  price: number
  prevPrice: number
  changePct: number
  marketCap: number
  dsuReserve: number
  dailyRevenue: number
  dailyProfit: number
  users: number
  agents: number
  workers: number
  growthRate: number
  riskLevel: number // 1-5
  history: number[]
  orderBook: {
    bids: OrderBookEntry[]
    asks: OrderBookEntry[]
  }
}

export type OrderBookEntry = {
  price: number
  volume: number
}

/** AI 劳动力 */
export type AIWorker = {
  id: string
  name: string
  skill: string
  level: number
  productivity: number
  salary: number // DSU/day
  dailyOutput: number // DSU/day
  owner: string // company id or 'free'
  status: 'idle' | 'working' | 'training'
  demandIndex: number
  hireCost: number // DSU
  roi: number
  history: number[]
}

/** 资本流动节点 */
export type CapitalFlowNode = {
  id: string
  label: string
  value: number
  icon: string
}

/** 资本流动连接 */
export type CapitalFlowLink = {
  from: string
  to: string
  value: number
  label: string
}

/** 资本流动状态 */
export type CapitalFlowState = {
  nodes: CapitalFlowNode[]
  links: CapitalFlowLink[]
  totalFlow: number
}

/** 经济事件 */
export type EconomyEvent = {
  id: string
  time: string
  title: string
  description: string
  impact: {
    target: 'dsu' | 'weg' | 'company' | 'worker' | 'market'
    metric: string
    magnitude: number // 百分比影响
    targetId?: string // 指定企业/工人类别
  }
  active: boolean
  durationTicks?: number // 剩余生效 tick 数
}

/** 模拟订单 */
export type SimOrder = {
  id: string
  companySymbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  price: number
  quantity: number
  filled: number
  status: 'pending' | 'filled' | 'cancelled'
  time: string
}

/** 用户经济资产 */
export type EconomyPortfolio = {
  dsuBalance: number
  wegBalance: number
  wegAvgCost: number
  companyPositions: Record<string, { symbol: string; shares: number; avgCost: number }>
  workerRoster: string[] // worker ids
  totalAssets: number
  todayPnl: number
  totalPnl: number
  workerIncome: number
  companyIncome: number
  investedDsu: number
}

/** 经济聚合指标（AI 经济整体规模，模拟） */
export type EconomyAgg = {
  marketCap: number // AI 总市值（$，除以 1e9 为 $B）
  workers: number // AI 劳动力总数
  companies: number // AI 企业总数
  transactions: number // AI 交易总数
  users: number // 平台用户数
}

/** 统一经济状态 */
export type EconomyState = {
  dsu: DSUState
  weg: WEGState
  companies: AICompany[]
  workers: AIWorker[]
  capitalFlow: CapitalFlowState
  economyIndex: number
  prevEconomyIndex: number
  transactions: { id: string; companySymbol: string; side: 'buy' | 'sell'; price: number; quantity: number; time: string }[]
  orders: SimOrder[]
  events: EconomyEvent[]
  agg: EconomyAgg
  portfolio: EconomyPortfolio
  tickCount: number
}
