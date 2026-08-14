// ============================================================
// AI Exchange · AI GDP（AI 经济总量核算）
// 定位：把「交易所」升级为「AI 经济模拟器」的核心经济层指标。
// 口径：GDP 总量（万亿美元）+ 板块构成（按市场板块）+ 经济活动分解
//       （生产 / 服务 / Agent 劳动 / 算力 / 应用 / 机器人）
// 联动：生态指标（用户/Agent/调用/营收）驱动增速，情绪影响景气，
//       板块市值涨跌微调构成占比 —— 纯前端模拟，可替换为真实核算。
// ============================================================
import type { AiGdp, GdpCategory, GdpSector } from '../types'
import { clamp, round2, timeStr } from '../utils/format'

/** 初始 AI GDP 总量（万亿美元） */
export const GDP_INIT_TOTAL = 18.42
export const GDP_INIT_GROWTH = 3.8 // 同比 %

/** 板块构成基准（合计 100%） */
export const GDP_SECTOR_DEFS: Omit<GdpSector, 'value' | 'trend'>[] = [
  { id: 'model', name: 'Model Economy', label: '模型经济', icon: '🧠', share: 32, color: '#818cf8' },
  { id: 'agent', name: 'Agent Economy', label: '智能体经济', icon: '🤖', share: 21, color: '#34d399' },
  { id: 'app', name: 'Application Economy', label: '应用经济', icon: '📱', share: 18, color: '#60a5fa' },
  { id: 'infra', name: 'Infrastructure', label: '基础设施', icon: '🖥️', share: 16, color: '#f59e0b' },
  { id: 'robot', name: 'Robot Economy', label: '机器人经济', icon: '🦾', share: 7, color: '#f472b6' },
  { id: 'skill', name: 'Skill Economy', label: '技能经济', icon: '🧩', share: 6, color: '#a78bfa' },
]

/** 经济活动分解基准（合计 100%） */
export const GDP_CATEGORY_DEFS: Omit<GdpCategory, 'value'>[] = [
  { id: 'production', name: 'AI Production', label: 'AI 生产', icon: '🏭', share: 28, desc: '模型训练 / 数据生产 / 内容生成' },
  { id: 'services', name: 'AI Services', label: 'AI 服务', icon: '🧑‍💼', share: 22, desc: '企业服务 / 行业方案 / API 服务' },
  { id: 'agentLabor', name: 'AI Agent Labor', label: 'Agent 劳动', icon: '🛠️', share: 18, desc: '自主智能体执行的经济劳动' },
  { id: 'compute', name: 'AI Compute', label: 'AI 算力', icon: '⚡', share: 16, desc: '算力租赁 / 推理服务 / 数据中心' },
  { id: 'apps', name: 'AI Applications', label: 'AI 应用', icon: '🧰', share: 12, desc: '消费应用 / 行业软件 / 插件生态' },
  { id: 'robotics', name: 'AI Robotics', label: 'AI 机器人', icon: '🤖', share: 4, desc: '机器人制造 / 具身智能' },
]

type EcoShape = { users: number; agent: number; calls: number; revenue: number }

/** 初始化 AI GDP */
export function initAiGdp(): AiGdp {
  const sectors: GdpSector[] = GDP_SECTOR_DEFS.map((d) => ({
    ...d,
    value: round2((GDP_INIT_TOTAL * d.share) / 100),
    trend: round2((Math.random() * 5 - 1.5) * 100) / 100,
  }))
  const categories: GdpCategory[] = GDP_CATEGORY_DEFS.map((d) => ({
    ...d,
    value: round2((GDP_INIT_TOTAL * d.share) / 100),
  }))
  return {
    total: GDP_INIT_TOTAL,
    growth: GDP_INIT_GROWTH,
    prev: GDP_INIT_TOTAL,
    trend: 0.4,
    updatedAt: timeStr(),
    sectors,
    categories,
  }
}

/**
 * 每 tick 更新 AI GDP：
 * - 生态指数（用户/Agent/调用/营收）组合成基础增速
 * - 市场情绪（恐惧-贪婪）偏置景气
 * - 板块市值环比微调各板块产值占比（归一化）
 */
export function updateAiGdp(
  prev: AiGdp,
  eco: EcoShape,
  sentimentScore: number,
  sectors: Record<string, { value: number; prev: number }>,
  sectorIds: string[],
): AiGdp {
  // 生态活力：四大指数乘积的当前水平 → 折算成年化基础增速
  const vitality = (eco.users * eco.agent * eco.calls * eco.revenue) ** 0.25
  const baseGrowth = clamp((vitality - 1) * 1.2, -0.01, 0.035)
  // 情绪景气偏置：恐惧(-) → 贪婪(+)
  const sentimentBias = ((sentimentScore - 50) / 50) * 0.004
  const tickGrowth = clamp(baseGrowth + sentimentBias, -0.008, 0.04)

  const total = round2(prev.total * (1 + tickGrowth))
  const trend = round2(((total - prev.total) / prev.total) * 100)

  // 板块产值：基准占比 × 总量 × 板块景气微调，再归一化
  let raw = GDP_SECTOR_DEFS.map((d) => {
    const sec = sectors[d.id]
    const sectorPct = sec && sec.prev > 0 ? (sec.value - sec.prev) / sec.prev : 0
    const heat = clamp(sectorPct * 40, -0.06, 0.06)
    const value = (total * d.share * (1 + heat)) / 100
    return { d, value, heat }
  })
  const sum = raw.reduce((a, r) => a + r.value, 0) || 1
  const gdpSectors: GdpSector[] = raw.map((r) => ({
    ...r.d,
    share: round2((r.value / sum) * 100),
    value: round2(r.value),
    trend: round2(r.heat * 1000),
  }))
  void sectorIds

  // 经济活动分解：固定口径（share 恒定）
  const gdpCategories: GdpCategory[] = GDP_CATEGORY_DEFS.map((d) => ({
    ...d,
    value: round2((total * d.share) / 100),
  }))

  // 同比增速：总量环比折算（模拟），保持 1% ~ 8% 区间
  const growth = round2(clamp(prev.growth * 0.985 + tickGrowth * 120 + (sentimentScore - 50) * 0.012, 0.5, 8.5))

  return {
    total,
    growth,
    prev: prev.total,
    trend,
    updatedAt: timeStr(),
    sectors: gdpSectors,
    categories: gdpCategories,
  }
}
