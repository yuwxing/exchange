// ============================================================
// AI Exchange · AI Market Engine（AI 金融系统核心）
// 七阶段端到端流水线：
//   Research → Valuation → News → Sentiment → Market → Price → Index
// 每一阶段基于当前市场状态 + 定价引擎因子，输出结构化结果，
// 最终合成全市场信号与指数预测。纯前端模拟（可替换为真实 LLM）。
// ============================================================
import type {
  EngineContext,
  EngineStageResult,
  MarketEngineRun,
} from '../types'
import { AI_VALUE_DIMS } from '../data/assets'
import {
  computePriceDrift,
  cycleFactorOf,
  normalizeWhaleFlow,
  type PricingContext,
} from '../engine/pricing'
import { clamp, fmtPct, mulberry32, round2, timeStr } from '../utils/format'

/** 阶段元信息（顺序即流水线顺序） */
export const ENGINE_STAGES: { id: EngineStageResult['id']; name: string; icon: string; en: string }[] = [
  { id: 'research', name: '研究', icon: '🔭', en: 'Research' },
  { id: 'valuation', name: '估值', icon: '📐', en: 'Valuation' },
  { id: 'news', name: '新闻', icon: '📰', en: 'News' },
  { id: 'sentiment', name: '情绪', icon: '🧠', en: 'Sentiment' },
  { id: 'market', name: '市场', icon: '📊', en: 'Market' },
  { id: 'price', name: '定价', icon: '⚡', en: 'Price' },
  { id: 'index', name: '指数', icon: '🧭', en: 'Index' },
]

/** 板块温度（0-100），与 store / SectorHeat 口径一致 */
function sectorHeatOf(sec: { value: number; prev: number } | undefined): number {
  if (!sec || sec.prev <= 0) return 50
  const pct = (sec.value - sec.prev) / sec.prev
  return Math.round(Math.min(95, Math.max(5, 50 + pct * 2600)))
}

/** 运行一次 AI Market Engine 七阶段流水线 */
export function runMarketEngine(ctx: EngineContext): MarketEngineRun {
  const rand = mulberry32(Date.now() % 1000000)
  const { assets, quotes, sectors, sectorList, indices, sentiment, whaleFlows, news, candidates, cyclePhase, assetDynamics, newsImpacts } = ctx

  // ---------- Stage 1 · Research：全市场扫描 + 候选发现 ----------
  const hot = [...assets]
    .sort((a, b) => (quotes[b.symbol]?.changePct ?? 0) - (quotes[a.symbol]?.changePct ?? 0))
    .slice(0, 3)
  const cand = candidates.length > 0 ? candidates[Math.floor(rand() * candidates.length)] : null
  const research: EngineStageResult = {
    id: 'research',
    name: '研究',
    icon: '🔭',
    title: cand ? `发现候选：${cand.symbol} ${cand.name}` : '全市场热点扫描',
    summary: `扫描 ${assets.length} 个模拟资产${cand ? `，锁定候选「${cand.name}」（AI 评分 ${cand.score}）` : '，本轮无新增候选'}。`,
    points: [
      `热点：${hot.map((a) => `${a.symbol} ${fmtPct(quotes[a.symbol]?.changePct ?? 0)}`).join(' · ')}`,
      cand ? `候选 ${cand.symbol} 建议发行价 $${cand.basePrice}，可一键模拟上市` : '候选池为空，等待新一轮扫描',
      '扫描范围：MODEL / AGENT / SKILL / MCP / APP / ROBOT / DATA / INFRA / PROTOCOL',
    ],
  }

  // ---------- Stage 2 · Valuation：AI Value 11 维加权估值 ----------
  const topScore = [...assets].sort((a, b) => b.score - a.score).slice(0, 3)
  const vals = topScore.map((a) => {
    const m = Object.fromEntries(a.metrics.map((x) => [x.label, x.value]))
    const weighted = AI_VALUE_DIMS.reduce((acc, d) => acc + (m[d.label] ?? 0) * d.w, 0)
    const fair = round2(a.basePrice * (0.85 + weighted / 500))
    const target = round2(fair * (1 + (a.score - 75) / 250))
    return { a, fair, target, score: Math.round(weighted) }
  })
  const valuation: EngineStageResult = {
    id: 'valuation',
    name: '估值',
    icon: '📐',
    title: '核心资产估值模型',
    summary: `对 ${vals.length} 个高评分资产完成 AI Value 估值（11 维加权）。`,
    points: vals.map((v) => `${v.a.symbol} 公允 $${v.fair} · 目标 $${v.target} · AI Value ${v.score}`),
    value: vals.length ? Math.round(vals.reduce((a, v) => a + v.score, 0) / vals.length) : 0,
    valueLabel: 'AI Value 均值',
  }

  // ---------- Stage 3 · News：新闻事件解析与方向判断 ----------
  const pending = news.filter((n) => !n.published)
  const focusEvent = [...news].sort((a, b) => b.importance - a.importance)[0]
  const newsDelta = focusEvent ? focusEvent.effect.reduce((a, e) => a + e.delta, 0) : 0
  const positive = newsDelta >= 0
  const newsStage: EngineStageResult = {
    id: 'news',
    name: '新闻',
    icon: '📰',
    title: focusEvent ? focusEvent.title : '暂无新闻事件',
    summary: `已发布 ${news.filter((n) => n.published).length} 条事件${pending.length ? `、${pending.length} 条待发布` : ''}，主导方向：${positive ? '利好' : '利空'}。`,
    points: [
      focusEvent ? `焦点事件：${focusEvent.title}` : '暂无事件',
      pending.length ? `待发布：${pending.slice(0, 3).map((n) => n.title.slice(0, 20)).join(' / ')}` : '无待发布事件',
      '新闻影响已进入定价引擎 newsImpacts（逐 tick 衰减 1.5%）',
    ].filter(Boolean),
    value: Math.round(((focusEvent?.importance ?? 0) / 3) * 100),
    valueLabel: '事件强度',
    level: positive ? '利好' : '利空',
  }

  // ---------- Stage 4 · Sentiment：恐惧-贪婪情绪 ----------
  const sentimentStage: EngineStageResult = {
    id: 'sentiment',
    name: '情绪',
    icon: '🧠',
    title: `市场情绪：${sentiment.level}`,
    summary: `AI 情绪指数 ${sentiment.score}/100（恐惧-贪婪），较上轮 ${sentiment.score - sentiment.prev >= 0 ? '+' : ''}${sentiment.score - sentiment.prev}。`,
    points: sentiment.drivers.map((d) => `${d.label} ${d.value}（权重 ${d.weight}%）`),
    value: sentiment.score,
    valueLabel: '情绪指数',
    level: sentiment.level,
  }

  // ---------- Stage 5 · Market：资金流向与板块轮动 ----------
  const quotesArr = Object.values(quotes)
  const upCount = quotesArr.filter((q) => q.changePct > 0).length
  const avgPct = quotesArr.length ? quotesArr.reduce((a, q) => a + q.changePct, 0) / quotesArr.length : 0
  const totalVol = quotesArr.reduce((a, q) => a + q.volume, 0)
  const whaleNet = whaleFlows.reduce((acc, f) => acc + (f.direction === 'long' ? f.amount : -f.amount), 0)
  const strong = sectorList
    .map((s) => ({ name: s.name, pct: sectors[s.id] ? (sectors[s.id].value - sectors[s.id].prev) / sectors[s.id].prev : 0 }))
    .sort((a, b) => b.pct - a.pct)
  const marketStage: EngineStageResult = {
    id: 'market',
    name: '市场',
    icon: '📊',
    title: '资金流向与板块轮动',
    summary: `${upCount}/${quotesArr.length} 家上涨，平均 ${fmtPct(avgPct)}，巨鲸净${whaleNet >= 0 ? '流入' : '流出'} $${(Math.abs(whaleNet) / 1e8).toFixed(1)} 亿（模拟）。`,
    points: [
      `领涨板块：${strong[0]?.name} ${fmtPct(strong[0]?.pct ?? 0)}`,
      `领跌板块：${strong[strong.length - 1]?.name} ${fmtPct(strong[strong.length - 1]?.pct ?? 0)}`,
      `模拟成交额 $${(totalVol / 1e4).toFixed(1)} 万`,
    ],
  }

  // ---------- Stage 6 · Price：定价引擎因子归因 ----------
  const focus = hot[0] ?? assets[0]
  const focusQuote = quotes[focus.symbol]
  const whaleNetMap: Record<string, number> = {}
  for (const f of whaleFlows) whaleNetMap[f.symbol] = (whaleNetMap[f.symbol] ?? 0) + (f.direction === 'long' ? f.amount : -f.amount)
  const dyn = assetDynamics[focus.symbol] ?? { usage: 60, growth: 60 }
  const pricingCtx: PricingContext = {
    sentimentScore: sentiment.score,
    cycleFactor: cycleFactorOf(cyclePhase),
    sectorHeat: sectorHeatOf(sectors[focus.sectorId]),
    whaleNetInflow: normalizeWhaleFlow(whaleNetMap[focus.symbol] ?? 0),
    newsImpact: clamp(newsImpacts[focus.symbol] ?? 0, -1, 1),
    usageIndex: dyn.usage,
    growthIndex: dyn.growth,
  }
  const { drift, factors } = computePriceDrift(focus, focusQuote.price, pricingCtx, rand() - 0.5)
  const targetPrice = round2(focusQuote.price * (1 + drift))
  const priceStage: EngineStageResult = {
    id: 'price',
    name: '定价',
    icon: '⚡',
    title: `焦点资产 ${focus.symbol} 定价`,
    summary: `定价引擎输出单期预期漂移 ${fmtPct(drift)}，目标 $${targetPrice}（当前 $${focusQuote.price}）。`,
    points: factors.slice(0, 5).map((f) => `${f.label} ${fmtPct(f.value)}`),
    value: targetPrice,
    valueLabel: `${focus.symbol} 目标价`,
  }

  // ---------- Stage 7 · Index：综合指数预测 ----------
  const ai100 = indices.ai100
  const forecastPct = clamp((clamp(sentiment.score / 50 - 1, -0.6, 0.6) * 0.02 + avgPct * 0.5 + drift * 0.5), -0.05, 0.05)
  const target100 = ai100 ? round2(ai100.value * (1 + forecastPct)) : 0
  const indexStage: EngineStageResult = {
    id: 'index',
    name: '指数',
    icon: '🧭',
    title: 'AI 指数预测',
    summary: ai100
      ? `AI100 当前 ${ai100.value.toFixed(2)}，引擎预测目标 ${target100.toFixed(2)}（${fmtPct(forecastPct)}）`
      : '指数数据缺失',
    points: [
      `预测因子：情绪 ${sentiment.score} · 平均涨跌 ${fmtPct(avgPct)} · 焦点漂移 ${fmtPct(drift)}`,
      '指数编制：市值加权价格比法（基期 × Σ市值×价/发行价 ÷ Σ市值）',
    ],
    value: target100,
    valueLabel: 'AI100 目标',
  }

  // ---------- 综合信号 ----------
  const signalScore = Math.round(clamp(50 + (sentiment.score - 50) * 0.6 + avgPct * 2500 + forecastPct * 800, 0, 100))
  let label = '中性'
  let advice = '引擎信号中性：维持当前仓位，等待方向确认。'
  if (signalScore >= 75) {
    label = '强烈看多'
    advice = '引擎信号强烈看多：关注热点龙头与高 AI Value 资产，分批建仓、控制仓位。'
  } else if (signalScore >= 60) {
    label = '看多'
    advice = '引擎信号偏多：可适度加仓高评分资产，留意板块轮动节奏。'
  } else if (signalScore >= 45) {
    label = '中性'
    advice = '引擎信号中性：维持当前仓位，等待方向确认。'
  } else if (signalScore >= 30) {
    label = '看空'
    advice = '引擎信号偏空：建议降低仓位、规避高波动标的。'
  } else {
    label = '强烈看空'
    advice = '引擎信号强烈看空：优先防守，可关注 WEG 金库等避险配置。'
  }

  const riskNote =
    sentiment.score >= 75
      ? '⚠️ 情绪过热（贪婪区），警惕高位回调，注意杠杆风险。'
      : sentiment.score <= 25
        ? '⚠️ 市场极度恐惧，关注超跌龙头的中长期价值。'
        : '本引擎为模拟数据驱动，仅用于教育演示，不构成任何投资建议。'

  return {
    id: `eng-${Date.now()}`,
    time: timeStr(),
    stages: [research, valuation, newsStage, sentimentStage, marketStage, priceStage, indexStage],
    signal: { label, score: signalScore, advice },
    indexForecast: ai100 ? [{ name: 'AI100', current: ai100.value, target: target100, pct: forecastPct }] : [],
    riskNote,
  }
}
