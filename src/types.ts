// ============================================================
// AI Exchange · 全球人工智能资产交易与经济系统
// V1 数据模型：Asset / Sector / Index / AI Value / AI 智能体
// ============================================================

/** 资产大类（10 大市场中的 9 类资产 + 生态积分资产） */
export type AssetType =
  | 'model' // 01 MODEL  AI 模型
  | 'agent' // 02 AGENT  智能体
  | 'skill' // 03 SKILL  技能
  | 'mcp' //   04 MCP    工具协议
  | 'app' //   05 APP    AI 应用
  | 'robot' // 06 ROBOT  机器人
  | 'data' //  07 DATA   AI 数据
  | 'infra' // 08 INFRA  算力基础设施
  | 'protocol' // 09 PROTOCOL  AI 协议
  | 'economy' //  平台生态积分资产（WEG）

/** 板块定义（10 大板块） */
export type Sector = {
  id: string
  code: string // 序号 01-10
  name: string
  symbol: string // emoji
  type: AssetType
  prefix: string // 上市代码前缀
  desc: string
  weight: number // 板块权重（AI 综合指数）
}

/** 指标项 */
export type Metric = {
  label: string
  value: number
}

/**
 * AI 资产（模拟上市标的）
 * 兼容旧版 Stock 字段，新增 AI Value / 评级 / 标签 / 发行方 / 子分类
 */
export type Asset = {
  symbol: string // 上市代码，如 AI-OPENAI / AG-CODEX / SK-PPT / MCP-GITHUB
  name: string
  nameEn: string
  sectorId: string
  type: AssetType
  description: string
  basePrice: number // 虚拟发行价
  volatility: number // 波动率
  marketCap: number // 模拟市值（元）
  score: number // AI 综合评分 0-100
  aiValue: number // AI Economic Value（AI 市值公式输出）
  rating: string // S / A / B / C / D
  metrics: Metric[] // 11 维指标：模型能力/使用量/收入/用户/开发者/Agent活跃/Skill/API调用/增长/生态/可靠性
  tags: string[]
  issuer?: string // 所属公司/发行方
  isWeg?: boolean
}

/** 实时报价 */
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

/** K 线 */
export type Candle = {
  time: string
  open: number
  close: number
  low: number
  high: number
  volume: number
}

/** 指数定义（AI10 / AI50 / MODEL100 / AGENT100 / SKILL100 / APP100 / ROBOT50 / INFRA50） */
export type IndexDef = {
  id: string
  code: string
  name: string
  scope: 'top' | 'sector'
  count?: number // scope='top' 时取全市场市值 Top N
  sectorId?: string // scope='sector' 时取该板块成分
  base: number // 基期基点
  desc: string
}

/** 指数实时值 */
export type IndexValue = {
  value: number
  prev: number
  spark: number[]
}

/** 新闻事件 */
export type NewsEvent = {
  id: string
  title: string
  summary: string
  sectorId: string | null
  symbol: string | null
  time: string
  importance: 1 | 2 | 3
  effect: { index: string; delta: number }[]
  published: boolean
}

/** 持仓 */
export type Holding = {
  symbol: string
  name: string
  quantity: number
  avgCost: number
}

/** 委托记录 */
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

/** 贡献记录 */
export type ContributionRecord = {
  id: string
  action: string
  role: string
  reward: number
  time: string
}

/** 模拟账户 */
export type Account = {
  cash: number // 模拟 USDT 余额（初始 100,000）
  wegBalance: number // WEG 生态积分余额（初始 10,000）
  aiCredit: number // AI 信用分（初始 100）
  holdings: Holding[]
  orders: Order[]
  contributions: ContributionRecord[]
  totalEarned: number
  level: number
  experience: number
}

/** ============ AI Intelligence 层 ============ */

/** 六大 AI 智能体：Research / Valuation / Market / Risk / News / Portfolio */
export type AgentId =
  | 'research'
  | 'valuation'
  | 'market'
  | 'risk'
  | 'news'
  | 'portfolio'

/** 智能体输出报告 */
export type AgentReport = {
  agentId: AgentId
  agentName: string
  agentIcon: string
  agentRole: string
  title: string
  time: string
  summary: string
  points: string[]
  score?: number
  level?: string
  action?: string
  linkedSymbol?: string
}

/** AI 市场日报 */
export type DailyReport = {
  date: string
  title: string
  summary: string
  sections: { label: string; text: string }[]
  agentCount: number
  generatedAt: string
}

/** 候选资产（AI Research Agent 自动发现、可一键模拟上市） */
export type CandidateAsset = {
  symbol: string
  name: string
  nameEn: string
  type: AssetType
  sectorId: string
  description: string
  basePrice: number
  marketCap: number
  score: number
  tags: string[]
}

/** ============ V2 · 前沿化扩展 ============ */

/** AI 情绪指数（恐惧-贪婪） */
export type SentimentState = {
  score: number // 0-100，0 极度恐惧 / 100 极度贪婪
  level: '极度恐惧' | '恐惧' | '中性' | '贪婪' | '极度贪婪'
  prev: number
  history: number[]
  drivers: { label: string; value: number; weight: number }[]
}

/** AI 巨鲸（模拟机构） */
export type Whale = {
  id: string
  name: string
  nameEn: string
  icon: string
  color: string
  focus: string // 关注板块描述
  focusSectorId: string
  capital: number // 模拟管理规模（元）
}

/** 机构对某资产的多空仓位 */
export type WhaleFlow = {
  whaleId: string
  symbol: string
  direction: 'long' | 'short'
  amount: number // 模拟净流入金额
  since: string
  updatedAt: string
}

/** 巨鲸大单动态 */
export type WhaleTrade = {
  id: string
  whaleId: string
  whaleName: string
  whaleIcon: string
  symbol: string
  direction: 'long' | 'short'
  amount: number
  time: string
}

/** AI 机会雷达结果 */
export type Opportunity = {
  symbol: string
  name: string
  sectorId: string
  type: AssetType
  score: number
  aiValue: number
  price: number
  changePct: number
  tag: '低估值' | '高增长' | '资金流入' | '强势突破'
  reason: string
}

/** 限价/条件挂单 */
export type OpenOrder = {
  id: string
  symbol: string
  name: string
  kind: 'limit' | 'stopLoss' | 'takeProfit'
  side: 'buy' | 'sell'
  price: number
  quantity: number
  status: 'pending' | 'filled' | 'cancelled'
  createdAt: string
}

/** 模拟合约仓位 */
export type ContractPosition = {
  id: string
  symbol: string
  name: string
  side: 'long' | 'short'
  leverage: number // 2/5/10
  quantity: number
  entryPrice: number
  margin: number
  openedAt: string
}

/** WEG 金库质押 */
export type Stake = {
  amount: number // 质押的 WEG 数量
  startedAt: string
  apr: number // 模拟年化 %
  accrued: number // 已累计收益 WEG
}

/** ============ V3 · AI Market Engine（AI 金融系统核心） ============ */

/** AI Market Engine 七阶段流水线 */
export type EngineStageId =
  | 'research'
  | 'valuation'
  | 'news'
  | 'sentiment'
  | 'market'
  | 'price'
  | 'index'

/** 引擎单阶段输出 */
export type EngineStageResult = {
  id: EngineStageId
  name: string
  icon: string
  title: string
  summary: string
  points: string[]
  value?: number
  valueLabel?: string
  level?: string
}

/** 引擎运行上下文（由市场 store 组装） */
export type EngineContext = {
  assets: Asset[]
  quotes: Record<string, Quote>
  sectors: Record<string, { value: number; prev: number }>
  sectorList: Sector[]
  indices: Record<string, IndexValue>
  sentiment: SentimentState
  whaleFlows: WhaleFlow[]
  news: NewsEvent[]
  candidates: CandidateAsset[]
  cyclePhase: number
  assetDynamics: Record<string, { usage: number; growth: number }>
  newsImpacts: Record<string, number>
}

/** 引擎一次运行结果 */
export type MarketEngineRun = {
  id: string
  time: string
  stages: EngineStageResult[]
  signal: { label: string; score: number; advice: string }
  indexForecast: { name: string; current: number; target: number; pct: number }[]
  riskNote: string
}

/** ============ V3 · AI Labor Market（AI 劳动力市场） ============ */

/** 劳动力任务（由 Agent 承接的 AI 经济工作） */
export type LaborTask = {
  id: string
  symbol: string // 关联资产代码，如 AG-CODEX
  title: string // 任务名
  description: string
  reward: number // 任务奖励（$ AI Value）
  agent: string // 执行 Agent
  skill: string // 调用 Skill
  model: string // 调用 Model
  compute: string // 消耗算力
  duration: string // 预计耗时
  successRate: number // 成功率 %
  demand: number // 需求热度 0-100
  category: '研发' | '运营' | '数据' | '内容' | '客服' | '研究'
}

/** 劳动力流转阶段（流水线） */
export type LaborFlowStage =
  | 'agent'
  | 'accept'
  | 'skill'
  | 'model'
  | 'compute'
  | 'done'
  | 'credit'

/** 劳动力流转节点 */
export const LABOR_FLOW: { id: LaborFlowStage; name: string; icon: string; en: string }[] = [
  { id: 'agent', name: 'Agent', icon: '🤖', en: 'Agent' },
  { id: 'accept', name: '接任务', icon: '📥', en: 'Accept' },
  { id: 'skill', name: '调用 Skill', icon: '🧩', en: 'Skill' },
  { id: 'model', name: '调用 Model', icon: '🧠', en: 'Model' },
  { id: 'compute', name: '消耗 Compute', icon: '⚡', en: 'Compute' },
  { id: 'done', name: '完成任务', icon: '✅', en: 'Done' },
  { id: 'credit', name: '获得 AI Credit', icon: '🏅', en: 'AI Credit' },
]

/** ============ V3 · AI GDP（AI 经济总量） ============ */

/** AI GDP 板块构成（按市场板块划分） */
export type GdpSector = {
  id: string
  name: string // Model Economy / Agent Economy ...
  label: string // 中文名
  icon: string
  share: number // 占 AI GDP %
  value: number // 产值 $T
  trend: number // 环比增速 %
  color: string
}

/** AI GDP 经济活动分解（生产/服务/劳动/算力/应用/机器人） */
export type GdpCategory = {
  id: string
  name: string // AI Production / AI Services ...
  label: string // 中文名
  icon: string
  share: number // 占 AI GDP %
  value: number // 产值 $T
  desc: string
}

/** AI GDP 总览 */
export type AiGdp = {
  total: number // 总 GDP（万亿美元）
  growth: number // 同比增速 %
  prev: number // 上期总量
  trend: number // 环比增速 %
  updatedAt: string
  sectors: GdpSector[]
  categories: GdpCategory[]
}

/** ============ V3 · AI Labor Market（AI 劳动力市场扩展） ============ */

/** Agent 技能项 */
export type AgentSkill = {
  name: string
  stars: number // 1-5
}

/** Agent 简历（AI Worker Profile） */
export type AgentProfile = {
  symbol: string
  name: string
  role: string // Coding Agent ...
  roleEn: string
  icon: string
  rating: number // 综合评分 0-100
  reputation: 'S' | 'A' | 'B' | 'C'
  completedTasks: number
  successRate: number // 成功率 %
  avgDuration: string // 平均耗时
  totalLaborValue: number // 总劳动价值 $
  status: 'available' | 'busy' | 'offline'
  pricing: {
    base: number // 基础报价 $ / Task
    complex: number // 复杂任务 $ / Task
    enterprise: number // 企业项目 $ / Hour
  }
  demandStars: number // 需求 1-5
  skills: AgentSkill[]
  reputationDetail: {
    completed: number
    success: number
    failed: number
    reworkRate: number // 返工率 %
    satisfaction: number // 用户满意度（5 分制）
    avgDelivery: string // 平均交付时间
    disputeRate: number // 争议率 %
  }
  productivity: number // $ / Agent Hour（单位时间劳动价值）
}

/** AI 职业工资（用于 AI LABOR INDEX） */
export type LaborOccupation = {
  id: string
  name: string // Coding Agent ...
  nameEn: string
  icon: string
  price: number // 劳动价格 $
  change24h: number // 24h 涨跌 %
}

/** 任务层级 L1-L4 */
export type TaskTier = {
  level: string // L1..L4
  name: string
  nameEn: string
  icon: string
  priceRange: string
  examples: string[]
  color: string
}

/** AI 职业阶梯 L1-L7 */
export type CareerLadderStep = {
  level: string
  name: string
  icon: string
  desc: string
}

/** AI 公司收入分成角色 */
export type AiCompanyRole = {
  name: string
  icon: string
  share: number // %
}

/** ============ V4 · AI Capital OS（资本入口） ============ */

/** 投资目标 */
export type CapitalGoalId =
  | 'preserve' // 保值
  | 'stable' // 稳定增长
  | 'beat' // 超越市场
  | 'aiGrowth' // AI 产业增长
  | 'aggressive' // 高风险高收益
  | 'aiManaged' // 让 AI 自己管理

export type CapitalGoal = {
  id: CapitalGoalId
  label: string
  icon: string
  desc: string
  risk: '低' | '中低' | '中' | '中高' | '高' | '动态'
  expectedMin: number // 预期年化下限 %
  expectedMax: number
}

/** AI Capital Plan · 资本配置方案 */
export type CapitalPlan = {
  id: string
  createdAt: string
  amount: number // 资本规模 $
  amountLabel: string
  goal: CapitalGoal
  riskLevel: string
  expectedAnnual: string // 预期年化区间文案
  allocation: { sectorId: string; name: string; icon: string; pct: number }[] // 板块配置
  topAssets: { symbol: string; name: string; pct: number; reason: string }[] // 推荐资产
  strategy: string[] // 策略要点
  rebalance: string // 再平衡计划
  lifecycle: { step: number; icon: string; name: string; en: string; desc: string }[] // 资金闭环
  note: string
}

/** AI Capital OS · 闭环运行态（资本进入 → 生产 → 收入 → 利润回流 → 再平衡） */
export type CapitalOsState = {
  active: boolean
  planId: string
  goalId: CapitalGoalId
  goalLabel: string
  goalIcon: string
  amount: number // 初始资本规模（USDT）
  invested: number // 已部署到 AI 企业的资本（持仓成本）
  laborUnits: number // AI 劳动力规模（Agent 数量）
  laborOutput: number // 累计劳动产出（任务单位）
  serviceRevenue: number // 累计服务收入（USDT）
  profitReturned: number // 累计利润回流（分红入账 USDT）
  retained: number // 留存再投资利润（USDT）
  rebalances: number // 再平衡次数
  lastRebalanceAt: string
  startedAt: string
  lastAccrualAt: number // 上次结算时间戳（ms）
  targets: { symbol: string; name: string; pct: number }[] // 目标配置（pct 占已部署资本）
  nav: number // 当前组合净值（现金 + 持仓市值）
  driftPct: number // 配置偏离度（%）
  history: { t: string; revenue: number; profit: number; nav: number }[] // 运行快照
}
