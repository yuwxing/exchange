// ============================================================
// AI Exchange · AI Intelligence 层
// 六大 AI 智能体：Research / Valuation / Market / Risk / News / Portfolio
// V1 为纯前端模拟实现：基于当前市场状态 + 种子随机生成结构化报告
// V2 可替换为真实 LLM 调用（接入 DeepSeek API 等）
// ============================================================
import type {
  Account,
  AgentReport,
  Asset,
  CandidateAsset,
  DailyReport,
  IndexValue,
  Opportunity,
  Quote,
  Sector,
  WhaleFlow,
} from '../types'
import { AI_VALUE_DIMS } from '../data/assets'
import { round2, timeStr } from '../utils/format'

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const now = () => timeStr()

/** ================= 1. AI Research Agent 研究智能体 =================
 * 职责：扫描全球 AI 市场，自动发现新模型 / Agent / Skill / 应用 / 机器人，
 * 生成资产卡与上市建议。 */
export function runResearch(
  assets: Asset[],
  candidates: CandidateAsset[],
  quotes: Record<string, Quote>,
): AgentReport {
  const pool = candidates.length > 0 ? candidates : []
  const rand = mulberry32(Date.now() % 100000)
  const found = pool.length > 0 ? pool[Math.floor(rand() * pool.length)] : null
  const hot = [...assets]
    .sort((a, b) => (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0))
    .slice(0, 3)
  const points: string[] = []
  if (found) {
    points.push(`发现新资产：${found.symbol} ${found.name}（${found.description}），模拟发行价 $${found.basePrice}，初始 AI 评分 ${found.score}。`)
    points.push(`建议：可将「${found.name}」一键模拟上市，加入 ${sectorName(found.sectorId, assets)} 板块。`)
  }
  points.push(`市场热点：${hot.map((a) => a.symbol).join(' / ')} 领涨，资金关注度最高。`)
  points.push('扫描范围：模型 / Agent / Skill / MCP / 应用 / 机器人 / 数据 / 算力 / 协议 9 大资产类。')
  return {
    agentId: 'research',
    agentName: 'AI Research Agent',
    agentIcon: '🔭',
    agentRole: '市场扫描与资产发现',
    title: found ? `发现候选资产：${found.name}` : '全球 AI 市场扫描报告',
    time: now(),
    summary: `本轮扫描 ${assets.length} 个已上市资产与 ${pool.length} 个候选资产，${found ? `锁定「${found.name}」为高潜力标的。` : '未发现新的高优先级候选资产。'}`,
    points,
    score: found ? found.score : undefined,
    linkedSymbol: found?.symbol,
    action: found ? `list:${found.symbol}` : undefined,
  }
}

/** ================= 2. AI Valuation Agent 估值智能体 =================
 * 职责：按 AI Value 公式评估资产公允价值、目标价与评级。 */
export function runValuation(asset: Asset, quote?: Quote): AgentReport {
  const m = Object.fromEntries(asset.metrics.map((x) => [x.label, x.value]))
  const weighted = AI_VALUE_DIMS.reduce((acc, d) => acc + m[d.label] * d.w, 0)
  const fairValue = round2(asset.basePrice * (0.85 + weighted / 500))
  const target = round2(fairValue * (1 + (asset.score - 75) / 250))
  const upside = quote ? ((target - quote.price) / quote.price) * 100 : 0
  const level = asset.score >= 90 ? '强烈关注' : asset.score >= 80 ? '推荐关注' : asset.score >= 70 ? '中性' : '观察'
  return {
    agentId: 'valuation',
    agentName: 'AI Valuation Agent',
    agentIcon: '📐',
    agentRole: 'AI 市值与公允价值评估',
    title: `${asset.symbol} 估值报告`,
    time: now(),
    summary: `AI Value 加权得分 ${Math.round(weighted)}，公允价值 $${fairValue}，目标价 $${target}，评级：${level}。`,
    points: [
      `模型能力 ${m['模型能力']} · 使用量 ${m['使用量']} · 开发者 ${m['开发者']} · 收入 ${m['收入']}`,
      `Agent 活跃 ${m['Agent 活跃']} · 用户规模 ${m['用户规模']} · API 调用 ${m['API 调用']} · 增长 ${m['增长']}`,
      `当前价 $${quote ? quote.price : asset.basePrice}，相对目标价${upside >= 0 ? '上行空间' : '下行风险'} ${Math.abs(upside).toFixed(1)}%`,
      '估值公式：模型能力 × 使用量 × 开发者采纳 × Agent 活跃 × 收入 × 生态 × 增长 × 可靠性（加权）。',
    ],
    score: Math.round(weighted),
    level,
    linkedSymbol: asset.symbol,
  }
}

/** ================= 3. AI Market Agent 市场智能体 =================
 * 职责：全市场情绪、资金流向、板块轮动总结。 */
export function runMarket(
  assets: Asset[],
  quotes: Record<string, Quote>,
  sectors: Record<string, { value: number; prev: number }>,
  sectorList: Sector[],
): AgentReport {
  const upCount = assets.filter((a) => (quotes[a.symbol]?.changePct ?? 0) > 0).length
  const total = assets.length
  const avgPct = total ? assets.reduce((acc, a) => acc + (quotes[a.symbol]?.changePct ?? 0), 0) / total : 0
  const totalVolume = Object.values(quotes).reduce((a, q) => a + q.volume, 0)
  const strong = sectorList
    .map((s) => ({
      name: s.name,
      pct: sectors[s.id] ? (sectors[s.id].value - sectors[s.id].prev) / sectors[s.id].prev : 0,
    }))
    .sort((a, b) => b.pct - a.pct)
  const leader = strong[0]
  const laggard = strong[strong.length - 1]
  const sentiment = avgPct > 0.002 ? '偏多' : avgPct < -0.002 ? '偏空' : '中性'
  return {
    agentId: 'market',
    agentName: 'AI Market Agent',
    agentIcon: '📊',
    agentRole: '市场情绪与资金流向',
    title: 'AI 市场情绪日报',
    time: now(),
    summary: `全市场 ${upCount}/${total} 家上涨，平均涨跌 ${(avgPct * 100).toFixed(2)}%，市场情绪：${sentiment}。`,
    points: [
      `领涨板块：${leader.name}（${(leader.pct * 100).toFixed(2)}%）`,
      `领跌板块：${laggard.name}（${(laggard.pct * 100).toFixed(2)}%）`,
      `模拟成交额 $${(totalVolume / 1e4).toFixed(1)} 万，资金活跃度${totalVolume > 5e7 ? '较高' : '一般'}`,
      '建议：关注资金流入板块的龙头资产，规避情绪过热的短线标的。',
    ],
    score: Math.round(50 + avgPct * 5000),
    level: sentiment,
  }
}

/** ================= 4. AI Risk Agent 风险智能体 =================
 * 职责：单资产风险评级、波动预警、集中度检查。 */
export function runRisk(asset: Asset, quote?: Quote, account?: Account): AgentReport {
  const volScore = Math.round(Math.min(100, asset.volatility * 4000))
  const riskLevel = asset.volatility > 0.024 ? '高' : asset.volatility > 0.018 ? '中' : '低'
  const holding = account?.holdings.find((h) => h.symbol === asset.symbol)
  const points: string[] = [
    `波动率 ${(asset.volatility * 100).toFixed(1)}%，风险等级：${riskLevel}（模拟）。`,
    `AI 评分 ${asset.score}，评级 ${asset.rating} 级，基本面${asset.score >= 85 ? '稳健' : asset.score >= 75 ? '一般' : '偏弱'}。`,
  ]
  if (holding) {
    const mv = (quote?.price ?? 0) * holding.quantity
    const cost = holding.avgCost * holding.quantity
    const pct = cost > 0 ? ((mv - cost) / cost) * 100 : 0
    points.push(`当前持仓 ${holding.quantity} 股，浮动盈亏 ${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%。`)
    if (pct < -15) points.push('⚠️ 持仓浮亏超 15%，建议关注仓位风险。')
  } else {
    points.push('当前无持仓，无持仓风险敞口。')
  }
  return {
    agentId: 'risk',
    agentName: 'AI Risk Agent',
    agentIcon: '🛡️',
    agentRole: '风险监控与预警',
    title: `${asset.symbol} 风险评估`,
    time: now(),
    summary: `风险等级：${riskLevel}，波动风险 ${volScore}/100${asset.volatility > 0.024 ? '，触发波动预警' : ''}。`,
    points,
    score: 100 - volScore,
    level: riskLevel,
    linkedSymbol: asset.symbol,
  }
}

/** ================= 5. AI News Agent 新闻智能体 =================
 * 职责：基于市场状态自动生成新闻事件草稿。 */
export function runNews(assets: Asset[], quotes: Record<string, Quote>): AgentReport {
  const rand = mulberry32(Date.now() % 99991)
  const mover = [...assets].sort((a, b) => Math.abs(quotes[b.symbol]?.changePct ?? 0) - Math.abs(quotes[a.symbol]?.changePct ?? 0))[0]
  const pct = mover ? (quotes[mover.symbol]?.changePct ?? 0) * 100 : 0
  const headline =
    pct > 0
      ? `${mover.name} 模拟行情领涨，市场关注度骤升（+${pct.toFixed(2)}%）`
      : `${mover.name} 模拟行情回调（${pct.toFixed(2)}%），资金分歧加大`
  const templates = [
    `【AI 智能快讯】${mover?.name ?? 'AI 资产'} 成交额放大，AI Engine 监测到活跃度显著提升。`,
    `【生态动态】Agent OS 技能市场新增 Skill 上架，开发者生态持续扩张。`,
    `【指数观察】AI100 指数${rand() > 0.5 ? '创阶段新高' : '震荡整理'}，多空博弈加剧。`,
    `【产业跟踪】算力基础设施板块景气度上行，GPU 云资产受资金追捧。`,
  ]
  return {
    agentId: 'news',
    agentName: 'AI News Agent',
    agentIcon: '📰',
    agentRole: '资讯生成与事件监测',
    title: headline,
    time: now(),
    summary: 'AI Engine 自动监测到 1 条高关注事件，可一键发布并影响指数。',
    points: [templates[Math.floor(rand() * templates.length)], '新闻事件发布后将按板块/指数产生百分比影响。'],
    linkedSymbol: mover?.symbol,
    action: 'publish:auto',
  }
}

/** ================= 6. AI Portfolio Agent 资产组合智能体 =================
 * 职责：持仓诊断、再平衡建议、贡献联动。 */
export function runPortfolio(account: Account, quotes: Record<string, Quote>, assets: Asset[]): AgentReport {
  const holdings = account.holdings.map((h) => {
    const q = quotes[h.symbol]
    const mv = q ? q.price * h.quantity : h.avgCost * h.quantity
    const cost = h.avgCost * h.quantity
    return { ...h, mv, cost, plPct: cost > 0 ? ((mv - cost) / cost) * 100 : 0 }
  })
  const totalValue = account.cash + holdings.reduce((a, b) => a + b.mv, 0)
  const totalPl = holdings.reduce((a, b) => a + (b.mv - b.cost), 0)
  const totalPlPct = totalValue > 0 ? (totalPl / totalValue) * 100 : 0
  const best = [...holdings].sort((a, b) => b.plPct - a.plPct)[0]
  const worst = [...holdings].sort((a, b) => a.plPct - b.plPct)[0]
  const sectorMix = holdings.map((h) => assets.find((a) => a.symbol === h.symbol)).filter(Boolean) as Asset[]
  const diversity = sectorMix.length > 0 ? new Set(sectorMix.map((a) => a.sectorId)).size : 0
  const points: string[] = []
  if (holdings.length === 0) {
    points.push('当前为空仓状态，建议配置 3-5 个跨板块龙头资产分散风险。')
    points.push(`模拟可用资金 $${account.cash.toLocaleString('zh-CN')}，可通过「AI 贡献系统」赚取 WEG 生态积分与 AI 信用。`)
  } else {
    points.push(`总资产 $${round2(totalValue).toLocaleString('zh-CN')}，累计浮盈 ${totalPlPct >= 0 ? '+' : ''}${totalPlPct.toFixed(2)}%。`)
    if (best) points.push(`最优持仓：${best.symbol}（${best.plPct >= 0 ? '+' : ''}${best.plPct.toFixed(1)}%）`)
    if (worst) points.push(`需关注：${worst.symbol}（${worst.plPct >= 0 ? '+' : ''}${worst.plPct.toFixed(1)}%）`)
    points.push(`组合覆盖 ${diversity} 个板块${diversity >= 3 ? '，分散度良好' : '，建议增加板块分散'}。`)
  }
  return {
    agentId: 'portfolio',
    agentName: 'AI Portfolio Agent',
    agentIcon: '💼',
    agentRole: '组合诊断与配置建议',
    title: '我的组合诊断报告',
    time: now(),
    summary: holdings.length === 0 ? '组合为空，等待配置。' : `组合收益 ${totalPlPct >= 0 ? '+' : ''}${totalPlPct.toFixed(2)}%，持仓 ${holdings.length} 个标的。`,
    points,
    score: Math.round(50 + totalPlPct * 20),
  }
}

/** ================= AI 市场日报 ================= */
export function generateDailyReport(
  assets: Asset[],
  quotes: Record<string, Quote>,
  sectors: Record<string, { value: number; prev: number }>,
  sectorList: Sector[],
  indices: Record<string, IndexValue>,
  account: Account,
): DailyReport {
  const market = runMarket(assets, quotes, sectors, sectorList)
  const top = [...assets].sort((a, b) => b.score - a.score).slice(0, 5)
  const ai100 = indices.ai100
  return {
    date: timeStr().slice(0, 10),
    title: `AI 市场日报 · ${timeStr().slice(0, 10)}`,
    summary: market.summary + (ai100 ? ` AI100 指数报 ${ai100.value.toFixed(2)}（${((ai100.value - ai100.prev) / ai100.prev * 100).toFixed(2)}%）。` : ''),
    sections: [
      { label: '市场情绪', text: market.summary },
      { label: 'Top 5 高评分资产', text: top.map((a) => `${a.symbol}(${a.score})`).join(' · ') },
      { label: '组合状态', text: `模拟资产 $${round2(account.cash).toLocaleString('zh-CN')}，持仓 ${account.holdings.length} 个，累计贡献 ${account.totalEarned} WEG` },
      { label: '免责声明', text: '本日报由 AI Engine 模拟生成，仅用于教育演示，不构成任何投资建议。' },
    ],
    agentCount: 6,
    generatedAt: timeStr(),
  }
}

function sectorName(sectorId: string, assets: Asset[]) {
  return assets.find((a) => a.sectorId === sectorId)?.name ?? sectorId
}

/** ================= 7. AI 机会雷达 =================
 * 职责：扫描全市场，找出低估值 / 高增长 / 巨鲸流入 / 强势突破的机会资产。 */
export function runRadar(
  assets: Asset[],
  quotes: Record<string, Quote>,
  whaleFlows: WhaleFlow[],
): Opportunity[] {
  const flowMap: Record<string, { long: number; short: number }> = {}
  for (const f of whaleFlows) {
    const m = flowMap[f.symbol] ?? { long: 0, short: 0 }
    if (f.direction === 'long') m.long += f.amount
    else m.short += f.amount
    flowMap[f.symbol] = m
  }

  const ops: Opportunity[] = []
  for (const a of assets) {
    const q = quotes[a.symbol]
    if (!q) continue
    const m = Object.fromEntries(a.metrics.map((x) => [x.label, x.value]))
    const undervalueGap = a.aiValue - a.score // 基本面强于当前评分
    const flow = flowMap[a.symbol]
    const netInflow = flow ? flow.long - flow.short : 0

    // 低估值：AI Value 明显高于评分且价格回撤
    if (undervalueGap >= 4 && q.changePct < 0.005) {
      ops.push({
        symbol: a.symbol,
        name: a.name,
        sectorId: a.sectorId,
        type: a.type,
        score: a.score,
        aiValue: a.aiValue,
        price: q.price,
        changePct: q.changePct,
        tag: '低估值',
        reason: `AI Value ${a.aiValue} 高于评分 ${a.score}，模拟价格相对基本面低估`,
      })
    }
    // 高增长：增长指标高 + 上涨
    if ((m['增长'] ?? 0) >= 85 && q.changePct > 0.008) {
      ops.push({
        symbol: a.symbol,
        name: a.name,
        sectorId: a.sectorId,
        type: a.type,
        score: a.score,
        aiValue: a.aiValue,
        price: q.price,
        changePct: q.changePct,
        tag: '高增长',
        reason: `增长指标 ${m['增长']}，模拟行情持续上行`,
      })
    }
    // 巨鲸流入
    if (netInflow > 0 && q.changePct > -0.01) {
      ops.push({
        symbol: a.symbol,
        name: a.name,
        sectorId: a.sectorId,
        type: a.type,
        score: a.score,
        aiValue: a.aiValue,
        price: q.price,
        changePct: q.changePct,
        tag: '资金流入',
        reason: `AI 巨鲸净流入 $${(netInflow / 1e8).toFixed(1)} 亿（模拟）`,
      })
    }
    // 强势突破：涨幅 + 高评分
    if (q.changePct > 0.03 && a.score >= 85) {
      ops.push({
        symbol: a.symbol,
        name: a.name,
        sectorId: a.sectorId,
        type: a.type,
        score: a.score,
        aiValue: a.aiValue,
        price: q.price,
        changePct: q.changePct,
        tag: '强势突破',
        reason: `单日模拟涨幅 ${(q.changePct * 100).toFixed(1)}% + 高评分 ${a.score}`,
      })
    }
  }

  // 去重（同资产保留最高优先级 tag）
  const seen = new Set<string>()
  const prio: Record<string, number> = { 强势突破: 0, 资金流入: 1, 高增长: 2, 低估值: 3 }
  const out: Opportunity[] = []
  for (const o of ops.sort((a, b) => (prio[a.tag] ?? 9) - (prio[b.tag] ?? 9))) {
    if (seen.has(o.symbol)) continue
    seen.add(o.symbol)
    out.push(o)
    if (out.length >= 6) break
  }
  return out
}

/** 智能体元信息（供 UI 展示） */
export const AGENT_META: { id: AgentReport['agentId']; name: string; icon: string; role: string; desc: string; color: string }[] = [
  { id: 'research', name: 'AI Research Agent', icon: '🔭', role: '市场扫描与资产发现', desc: '自动发现新模型 / Agent / Skill / 应用 / 机器人，生成资产卡与上市建议。', color: 'from-sky-500 to-blue-600' },
  { id: 'valuation', name: 'AI Valuation Agent', icon: '📐', role: 'AI 市值评估', desc: '按 AI Value 公式评估公允价值、目标价与评级。', color: 'from-violet-500 to-purple-600' },
  { id: 'market', name: 'AI Market Agent', icon: '📊', role: '市场情绪与资金流向', desc: '全市场涨跌、板块轮动与资金活跃度总结。', color: 'from-emerald-500 to-teal-600' },
  { id: 'risk', name: 'AI Risk Agent', icon: '🛡️', role: '风险监控与预警', desc: '波动率风险评级、持仓风险提示。', color: 'from-amber-500 to-orange-600' },
  { id: 'news', name: 'AI News Agent', icon: '📰', role: '资讯生成与事件监测', desc: '自动生成新闻事件草稿，一键发布影响指数。', color: 'from-rose-500 to-pink-600' },
  { id: 'portfolio', name: 'AI Portfolio Agent', icon: '💼', role: '组合诊断与配置建议', desc: '持仓盈亏诊断、分散度检查与配置建议。', color: 'from-indigo-500 to-blue-600' },
]
