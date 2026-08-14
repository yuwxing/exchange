// ============================================================
// AI Exchange · AI Asset Pricing Engine（AI 资产定价引擎）
// 价格变化 = 基础价值 + 市场情绪 + 使用量 + 增长率 + 新闻事件
//          + 巨鲸资金 + 板块热度 + AI Value + 市场周期 + 随机扰动
// 输出：单 tick 漂移 + 归因分解（供详情页/AI 顾问展示）
// ============================================================
import type { Asset, WhaleFlow } from '../types'

export type FactorContribution = {
  key: string
  label: string
  value: number // 该因子对涨跌幅的贡献（小数，如 0.0012 = +0.12%）
  sign: 1 | -1 | 0
}

export type PriceAttribution = {
  symbol: string
  time: string
  total: number
  factors: FactorContribution[]
}

export type PricingContext = {
  sentimentScore: number // 0-100
  cycleFactor: number // -1..1（市场周期相位）
  sectorHeat: number // 0-100（板块温度）
  whaleNetInflow: number // 归一化 -1..1（巨鲸净流入）
  newsImpact: number // -1..1（相关新闻累积影响）
  usageIndex: number // 0-100（动态使用量）
  growthIndex: number // 0-100（动态增长率）
}

/** 单 tick 定价：返回漂移与归因 */
export function computePriceDrift(
  asset: Asset,
  priceCurrent: number,
  ctx: PricingContext,
  noiseRand: number,
): { drift: number; factors: FactorContribution[] } {
  const factors: FactorContribution[] = []

  const push = (key: string, label: string, raw: number) => {
    if (Math.abs(raw) < 1e-6) return
    factors.push({ key, label, value: raw, sign: raw > 0 ? 1 : -1 })
  }

  // 1. 基础价值（均值回归到发行价：价格远离发行价时产生回拉）
  const baseRevert = 0.0012 * -1 // 回归系数符号：偏离为正 → 回拉为负
  const deviation = asset.basePrice > 0 ? (priceCurrent - asset.basePrice) / asset.basePrice : 0
  push('fundamental', '基础价值', clamp(deviation * baseRevert, -0.0012, 0.0012))

  // 2. AI Value（评分驱动的长期 alpha）
  const aiValueDrift = ((asset.aiValue - 75) / 25) * 0.0009
  push('aiValue', 'AI Value', aiValueDrift)

  // 3. 市场情绪
  const sentimentDrift = ((ctx.sentimentScore - 50) / 50) * 0.0022
  push('sentiment', '市场情绪', sentimentDrift)

  // 4. 使用量
  const usageDrift = ((ctx.usageIndex - 50) / 50) * 0.0018
  push('usage', '使用量', usageDrift)

  // 5. 增长率
  const growthDrift = ((ctx.growthIndex - 50) / 50) * 0.0014
  push('growth', '增长率', growthDrift)

  // 6. 新闻事件
  const newsDrift = ctx.newsImpact * 0.0024
  push('news', '新闻事件', newsDrift)

  // 7. 巨鲸资金
  const whaleDrift = ctx.whaleNetInflow * 0.0018
  push('whale', '巨鲸资金', whaleDrift)

  // 8. 板块热度
  const heatDrift = ((ctx.sectorHeat - 50) / 50) * 0.0015
  push('sectorHeat', '板块热度', heatDrift)

  // 9. 市场周期
  const cycleDrift = ctx.cycleFactor * 0.0012
  push('cycle', '市场周期', cycleDrift)

  // 10. 随机扰动（显著低于因子总和，不再是价格主因）
  const noiseDrift = noiseRand * 0.003
  push('noise', '随机扰动', noiseDrift)

  const drift = factors.reduce((a, f) => a + f.value, 0)
  return { drift: clamp(drift, -0.008, 0.008), factors }
}

/** 生成价格归因记录 */
export function buildAttribution(symbol: string, factors: FactorContribution[], total: number): PriceAttribution {
  return {
    symbol,
    time: new Date().toLocaleString('zh-CN', { hour12: false }),
    total,
    factors: [...factors].sort((a, b) => Math.abs(b.value) - Math.abs(a.value)),
  }
}

/** 归一化净流入到 -1..1（按模拟资金量级） */
export function normalizeWhaleFlow(netInflow: number): number {
  return clamp(netInflow / 2.5e8, -1, 1)
}

/** 市场周期因子：phase 0..1 的慢正弦 */
export function cycleFactorOf(phase: number): number {
  return Math.sin(2 * Math.PI * phase)
}

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

/** 供外部使用的类型导出 */
export type { WhaleFlow }
