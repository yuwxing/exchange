// ============================================================
// AI Exchange · AI Capital OS（资本入口 · 计划生成）
// 资本进入 → AI 理解资本 → AI 配置资本 → AI 寻找机会
//        → AI 投资 AI 企业 → AI 劳动力生产 → AI 服务产生收入
//        → 利润回到资本 → AI 再平衡
// 纯前端模拟：根据「资本规模 + 投资目标」生成个性化 AI Capital Plan
// ============================================================
import type { Asset, CapitalGoal, CapitalGoalId, CapitalPlan } from '../types'
import { ASSETS, SECTORS } from '../data/assets'

/** 六种投资目标定义 */
export const CAPITAL_GOALS: CapitalGoal[] = [
  { id: 'preserve', label: '保值', icon: '🛡️', desc: '跑赢通胀，守住本金，低波动优先', risk: '低', expectedMin: 3, expectedMax: 6 },
  { id: 'stable', label: '稳定增长', icon: '🌱', desc: '稳健复利，平衡收益与风险', risk: '中低', expectedMin: 6, expectedMax: 10 },
  { id: 'beat', label: '超越市场', icon: '⚔️', desc: '跑赢 AI100 指数，捕捉结构性机会', risk: '中', expectedMin: 10, expectedMax: 18 },
  { id: 'aiGrowth', label: 'AI 产业增长', icon: '🚀', desc: '重仓 AI 核心产业链，共享产业红利', risk: '中高', expectedMin: 12, expectedMax: 22 },
  { id: 'aggressive', label: '高风险高收益', icon: '🔥', desc: '追逐高波动板块，博取超额回报', risk: '高', expectedMin: 20, expectedMax: 40 },
  { id: 'aiManaged', label: '让 AI 自己管理', icon: '🤖', desc: '全权委托 AI Capital Agent 动态配置', risk: '动态', expectedMin: 8, expectedMax: 18 },
]

export const capitalGoalOf = (id: CapitalGoalId) => CAPITAL_GOALS.find((g) => g.id === id) ?? CAPITAL_GOALS[1]

/** 资本规模快捷档位 */
export const CAPITAL_TIERS = [
  { label: '$1,000', value: 1000 },
  { label: '$10,000', value: 10000 },
  { label: '$100,000', value: 100000 },
  { label: '$1M', value: 1_000_000 },
  { label: '$10M', value: 10_000_000 },
  { label: '$100M', value: 100_000_000 },
]

export function fmtCapital(n: number) {
  if (n >= 1e8) return `$${(n / 1e8).toFixed(0)}M`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3)}K`
  return `$${Math.round(n)}`
}

/** 目标 → 板块配置偏好（百分比，合计 100） */
const GOAL_ALLOCATION: Record<CapitalGoalId, { sectorId: string; pct: number }[]> = {
  preserve: [
    { sectorId: 'infra', pct: 28 },
    { sectorId: 'data', pct: 18 },
    { sectorId: 'mcp', pct: 15 },
    { sectorId: 'model', pct: 15 },
    { sectorId: 'protocol', pct: 10 },
    { sectorId: 'app', pct: 8 },
    { sectorId: 'skill', pct: 6 },
  ],
  stable: [
    { sectorId: 'infra', pct: 24 },
    { sectorId: 'model', pct: 24 },
    { sectorId: 'app', pct: 18 },
    { sectorId: 'agent', pct: 14 },
    { sectorId: 'data', pct: 10 },
    { sectorId: 'mcp', pct: 10 },
  ],
  beat: [
    { sectorId: 'model', pct: 28 },
    { sectorId: 'agent', pct: 24 },
    { sectorId: 'app', pct: 18 },
    { sectorId: 'infra', pct: 15 },
    { sectorId: 'robot', pct: 10 },
    { sectorId: 'skill', pct: 5 },
  ],
  aiGrowth: [
    { sectorId: 'model', pct: 28 },
    { sectorId: 'agent', pct: 24 },
    { sectorId: 'app', pct: 18 },
    { sectorId: 'robot', pct: 14 },
    { sectorId: 'skill', pct: 8 },
    { sectorId: 'infra', pct: 8 },
  ],
  aggressive: [
    { sectorId: 'robot', pct: 28 },
    { sectorId: 'protocol', pct: 20 },
    { sectorId: 'agent', pct: 18 },
    { sectorId: 'mcp', pct: 14 },
    { sectorId: 'skill', pct: 12 },
    { sectorId: 'model', pct: 8 },
  ],
  aiManaged: [
    { sectorId: 'model', pct: 22 },
    { sectorId: 'agent', pct: 20 },
    { sectorId: 'app', pct: 16 },
    { sectorId: 'infra', pct: 14 },
    { sectorId: 'robot', pct: 10 },
    { sectorId: 'skill', pct: 8 },
    { sectorId: 'data', pct: 6 },
    { sectorId: 'protocol', pct: 4 },
  ],
}

/** 目标 → 策略要点 */
const GOAL_STRATEGY: Record<CapitalGoalId, string[]> = {
  preserve: ['以算力基础设施与数据资产为压舱石，波动率最低', '配置 MCP/协议等低 beta 工具层', '限制单板块敞口 ≤ 30%，保留 WEG 金库避险仓位'],
  stable: ['基础设施 + 头部模型双引擎，攻守兼备', '应用层精选龙头，获取稳定现金流叙事', '月度再平衡，止损线 -8% 自动触发'],
  beat: ['超配头部模型与 Agent 龙头，跑赢 AI100 基准', '板块轮动：跟随情绪与巨鲸资金动态调仓', '组合 β 控制在 1.1-1.3，配合指数基金对冲'],
  aiGrowth: ['重仓模型-应用-机器人 AI 产业链核心环节', '跟随 AI GDP 板块景气度配置（模型 32% / Agent 21% 口径）', '把握新资产上市首日机会（AI Research Agent 发现）'],
  aggressive: ['聚焦机器人/协议等高波动板块，博取弹性', '使用 2x 模拟杠杆提升敞口，严格止损', '单标的仓位 ≤ 15%，触发强平线即止损离场'],
  aiManaged: ['全权委托 AI Capital Agent，动态感知市场', '基于情绪/巨鲸/机会雷达自动再平衡', 'AI 自主决策：机会 > 风险时加仓，反之防守'],
}

/** 资金闭环生命周期（9 步） */
export const CAPITAL_LIFECYCLE = [
  { step: 1, icon: '💰', name: '资本进入', en: 'Capital Inflow', desc: '你的资本进入 AI 经济系统，成为 AI 经济的股权资本' },
  { step: 2, icon: '🧠', name: 'AI 理解资本', en: 'AI Understands', desc: 'AI Capital Agent 解析资本规模、目标与风险偏好' },
  { step: 3, icon: '⚙️', name: 'AI 配置资本', en: 'AI Allocates', desc: '按板块配置模型自动分配到模型/Agent/应用/算力等市场' },
  { step: 4, icon: '🔭', name: 'AI 寻找机会', en: 'AI Discovers', desc: '机会雷达扫描低估值/高增长/巨鲸流入标的' },
  { step: 5, icon: '🏭', name: 'AI 投资 AI 企业', en: 'AI Invests', desc: '资本投向 136 个模拟 AI 上市公司' },
  { step: 6, icon: '🛠️', name: 'AI 劳动力生产', en: 'AI Labor Works', desc: 'AI 企业雇佣 Agent 劳动力：接任务、调 Skill/Model/Compute 生产' },
  { step: 7, icon: '📈', name: 'AI 服务产生收入', en: 'AI Services Earn', desc: 'AI 服务与产品产生收入，企业利润增长' },
  { step: 8, icon: '💸', name: '利润回到资本', en: 'Profit Returns', desc: '利润以分红/增值形式回到你的资本' },
  { step: 9, icon: '🔄', name: 'AI 再平衡', en: 'AI Rebalances', desc: 'AI 按周期自动再平衡仓位，循环往复' },
]

/** 生成 AI Capital Plan */
export function generateCapitalPlan(amount: number, goalId: CapitalGoalId, extraAssets: Asset[] = []): CapitalPlan {
  const goal = capitalGoalOf(goalId)
  const alloc = GOAL_ALLOCATION[goalId]
  const all = [...ASSETS, ...extraAssets]

  // 板块配置
  const allocation = alloc.map((a) => {
    const sec = SECTORS.find((s) => s.id === a.sectorId)
    return { sectorId: a.sectorId, name: sec?.name ?? a.sectorId, icon: sec?.symbol ?? '📦', pct: a.pct }
  })

  // 推荐资产：每个偏好板块内按 score 选取（覆盖全部配置板块，应用方案后即形成真实持仓）
  const topAssets: CapitalPlan['topAssets'] = []
  const used = new Set<string>()
  for (const a of alloc) {
    const candidates = all
      .filter((x) => x.sectorId === a.sectorId && !used.has(x.symbol) && !x.isWeg)
      .sort((x, y) => y.score - x.score)
    const pick = candidates[0]
    if (pick) {
      used.add(pick.symbol)
      topAssets.push({
        symbol: pick.symbol,
        name: pick.name,
        pct: a.pct,
        reason: `${pick.name}：${pick.description.slice(0, 24)}${pick.description.length > 24 ? '…' : ''}（AI 评分 ${pick.score}）`,
      })
    }
  }

  const expected = `${goal.expectedMin}% – ${goal.expectedMax}%`
  return {
    id: `plan-${Date.now()}`,
    createdAt: new Date().toLocaleString('zh-CN', { hour12: false }),
    amount,
    amountLabel: fmtCapital(amount),
    goal,
    riskLevel: goal.risk,
    expectedAnnual: expected,
    allocation,
    topAssets,
    strategy: GOAL_STRATEGY[goalId],
    rebalance:
      goalId === 'aiManaged'
        ? 'AI 全自动再平衡：每 2.5 秒感知市场，每日收盘评估一次，动态调仓'
        : goalId === 'aggressive'
          ? '高频再平衡：每周一次 + 触发式（情绪过热 / 板块异动）即时调整'
          : goalId === 'beat'
            ? '月度再平衡 + 季度 AI 经济复盘，偏离目标 ±5% 触发调整'
            : '季度再平衡，偏离目标 ±8% 触发调整',
    lifecycle: CAPITAL_LIFECYCLE,
    note: '本计划由 AI Capital OS 模拟生成，仅用于教育演示，不构成任何投资建议；预期收益为模拟区间。',
  }
}
