import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useMarket } from '../store/market'
import { SECTORS, assetOf } from '../data/assets'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import KLine from '../components/KLine'
import TradePanel from '../components/TradePanel'
import { typeBadge, typeName } from '../utils/assetType'

export default function AssetDetail() {
  const { symbol = '' } = useParams()
  const upper = symbol.toUpperCase()
  const stock = assetOf(upper)
  const extra = useMarket((s) => s.extraAssets.find((a) => a.symbol === upper))
  const asset = stock ?? extra
  const q = useMarket((s) => s.quotes[upper])
  const candles = useMarket((s) => s.candles[upper])
  const news = useMarket((s) => s.news)
  const whaleFlows = useMarket((s) => s.whaleFlows)
  const lastAttribution = useMarket((s) => s.lastAttribution)
  const runAgent = useMarket((s) => s.runAgent)
  const valuationReport = useMarket((s) => s.aiReports.valuation)
  const riskReport = useMarket((s) => s.aiReports.risk)
  const [valuating, setValuating] = useState(false)
  const [risking, setRisking] = useState(false)

  if (!asset || !q || !candles) {
    return (
      <div className="py-20 text-center text-market-sub">
        未找到标的 {symbol}
        <div className="mt-4">
          <Link to="/assets" className="text-sm text-market-primary hover:underline">
            ← 返回资产市场
          </Link>
        </div>
      </div>
    )
  }

  const up = isUp(q.change)
  const sec = SECTORS.find((s) => s.id === asset.sectorId)
  const relatedNews = news.filter((n) => n.symbol === asset.symbol || n.sectorId === asset.sectorId)
  const whaleHere = whaleFlows.filter((f) => f.symbol === asset.symbol)

  const runValuation = () => {
    setValuating(true)
    setTimeout(() => {
      runAgent('valuation', asset.symbol)
      setValuating(false)
    }, 400)
  }

  const runRiskCheck = () => {
    setRisking(true)
    setTimeout(() => {
      runAgent('risk', asset.symbol)
      setRisking(false)
    }, 400)
  }

  return (
    <div className="space-y-5">
      <Link to="/assets" className="text-sm text-market-sub hover:text-market-primary">
        ← 返回资产市场
      </Link>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-market-primary/10 text-lg font-bold text-market-primary">
              {asset.symbol.slice(0, 1)}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold text-market-text">{asset.symbol}</h1>
                <span className="text-sm text-market-sub">
                  {asset.name} · {asset.nameEn}
                </span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${typeBadge(asset.type)}`}>
                  {typeName(asset.type)}
                </span>
                {asset.isWeg && (
                  <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                    生态积分资产
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-market-sub">
                <span>
                  {sec?.symbol} {sec?.code} {sec?.name}
                </span>
                <span>· 市值 ${fmtCompact(asset.marketCap)}</span>
                <span>· AI 评分 {asset.score}</span>
                <span>· AI 价值 {asset.aiValue}</span>
                {asset.issuer && <span>· {asset.issuer}</span>}
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {asset.tags.map((t) => (
                  <span key={t} className="rounded bg-market-bg px-1.5 py-0.5 text-[10px] font-medium text-market-sub">
                    #{t}
                  </span>
                ))}
              </div>
              <p className="mt-2 max-w-xl text-sm text-market-sub">{asset.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div className={`text-4xl font-bold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
              ${fmtNumber(q.price)}
            </div>
            <div className={`mt-1 text-lg font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
              {up ? '▲' : '▼'} {fmtNumber(q.change)}（{(q.changePct * 100).toFixed(2)}%）
            </div>
            <div className="mt-1 text-xs text-market-sub tnum">
              今开 {fmtNumber(q.prevClose)} · 最高 {fmtNumber(q.high)} · 最低 {fmtNumber(q.low)}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 lg:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">K 线走势</h2>
            <div className="flex items-center gap-3 text-xs text-market-sub">
              <span className="flex items-center gap-1">
                <i className="inline-block h-0.5 w-3 bg-market-primary" /> MA5
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-0.5 w-3 bg-amber-500" /> MA10
              </span>
              <span className="flex items-center gap-1">
                <i className="inline-block h-0.5 w-3 bg-violet-500" /> MA20
              </span>
            </div>
          </div>
          <KLine candles={candles} height={400} />
          <div className="mt-2 text-xs text-market-sub">
            成交量 {fmtCompact(q.volume)} 手 · 数据由 AI Engine 模拟生成
          </div>
        </div>

        <TradePanel asset={asset} />
      </div>

      {/* AI 智能体评估区 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">📐 AI Valuation Agent 估值</h2>
            <button
              onClick={runValuation}
              disabled={valuating}
              className="rounded-lg bg-market-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-market-primary-hover disabled:opacity-50"
            >
              {valuating ? '评估中…' : '运行估值'}
            </button>
          </div>
          {valuationReport ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-market-text">{valuationReport.title}</span>
                {valuationReport.level && (
                  <span className="rounded bg-market-primary/10 px-2 py-0.5 text-xs font-bold text-market-primary">
                    {valuationReport.level}
                  </span>
                )}
              </div>
              <p className="text-market-sub">{valuationReport.summary}</p>
              <ul className="space-y-1 text-xs text-market-sub">
                {valuationReport.points.map((p, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-market-primary">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-market-sub">
              AI Valuation Agent 将按「模型能力 × 使用量 × 开发者 × Agent 活跃 × 收入 × 生态 × 增长 × 可靠性」评估公允价值与目标价。
            </p>
          )}
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">🛡️ AI Risk Agent 风险</h2>
            <button
              onClick={runRiskCheck}
              disabled={risking}
              className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-amber-600 disabled:opacity-50"
            >
              {risking ? '评估中…' : '运行风险检查'}
            </button>
          </div>
          {riskReport ? (
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-market-text">{riskReport.title}</span>
                {riskReport.level && (
                  <span
                    className={`rounded px-2 py-0.5 text-xs font-bold ${
                      riskReport.level === '高'
                        ? 'bg-market-down/10 text-market-down'
                        : riskReport.level === '中'
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-market-up/10 text-market-up'
                    }`}
                  >
                    {riskReport.level}风险
                  </span>
                )}
              </div>
              <p className="text-market-sub">{riskReport.summary}</p>
              <ul className="space-y-1 text-xs text-market-sub">
                {riskReport.points.map((p, i) => (
                  <li key={i} className="flex gap-1.5">
                    <span className="text-market-primary">·</span>
                    {p}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-market-sub">
              AI Risk Agent 将评估波动率风险等级、基本面强弱与持仓风险敞口。
            </p>
          )}
        </div>
      </div>

      {/* AI 定价引擎：价格驱动分解 */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">⚙️ AI 定价引擎 · 价格驱动分解</h2>
          <span className="text-[11px] text-market-sub">基础价值 + 情绪 + 使用量 + 增长 + 新闻 + 巨鲸 + 板块热度 + AI Value + 周期 + 扰动</span>
        </div>
        {lastAttribution[asset.symbol] ? (
          <div>
            <div className="mb-3 flex items-baseline gap-3">
              <span className="text-sm text-market-sub">最近一次归因</span>
              <span className={`text-xl font-bold tnum ${lastAttribution[asset.symbol].total >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                {lastAttribution[asset.symbol].total >= 0 ? '+' : ''}
                {(lastAttribution[asset.symbol].total * 100).toFixed(3)}%
              </span>
              <span className="text-xs text-market-sub">{lastAttribution[asset.symbol].time}</span>
            </div>
            <div className="space-y-2">
              {lastAttribution[asset.symbol].factors.map((f) => {
                const pct = f.value * 100
                return (
                  <div key={f.key} className="flex items-center gap-3 text-sm">
                    <span className="w-20 shrink-0 text-market-sub">{f.label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-market-bg">
                      <div
                        className={`h-full rounded-full ${pct >= 0 ? 'bg-market-up' : 'bg-market-down'}`}
                        style={{ width: `${Math.min(100, Math.abs(pct) * 60)}%` }}
                      />
                    </div>
                    <span className={`w-20 shrink-0 text-right font-semibold tnum ${pct >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                      {pct >= 0 ? '+' : ''}
                      {pct.toFixed(3)}%
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="mt-3 text-[11px] leading-relaxed text-market-sub">
              价格由 AI 定价引擎按多因子模型模拟生成（非随机数）：新闻、巨鲸、情绪、板块热度等都会真实地影响价格与指数。
            </p>
          </div>
        ) : (
          <p className="text-sm text-market-sub">定价引擎归因生成中（约 40 秒内完成首次记录）…</p>
        )}
      </div>

      {/* AI 机构动向（巨鲸） */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">🐋 AI 机构动向</h2>
          <span className="text-[11px] text-market-sub">模拟机构持仓变动 · 教学演示</span>
        </div>
        {whaleHere.length === 0 ? (
          <p className="text-sm text-market-sub">当前暂无 AI 巨鲸公开持仓该资产（模拟）。</p>
        ) : (
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {whaleHere.map((f) => (
              <div key={`${f.whaleId}-${f.symbol}`} className="flex items-center justify-between rounded-lg border border-market-border/60 px-3 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">🐋</span>
                  <div>
                    <div className="text-sm font-semibold text-market-text">{whaleName(f.whaleId)}</div>
                    <div className="text-[10px] text-market-sub">更新于 {f.updatedAt}</div>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`text-sm font-bold tnum ${f.direction === 'long' ? 'text-market-up' : 'text-market-down'}`}>
                    {f.direction === 'long' ? '做多' : '做空'}
                  </span>
                  <div className="text-[11px] text-market-sub tnum">${fmtCompact(f.amount)}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-4 text-base font-bold text-market-text">AI 价值指标（11 维）</h2>
          <div className="space-y-4">
            {asset.metrics.map((m) => (
              <div key={m.label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-market-sub">{m.label}</span>
                  <span className="font-bold text-market-text tnum">{m.value}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-market-bg">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-market-primary to-market-primary-hover"
                    style={{ width: `${m.value}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">AI 评分</h2>
            <span className="text-xs text-market-sub">由模型能力 / 生态 / 增长综合计算</span>
          </div>
          <div className="mt-4 flex items-center gap-5">
            <div
              className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full"
              style={{ background: `conic-gradient(#1677FF ${asset.score}%, #F0F2F5 ${asset.score}%)` }}
            >
              <div className="flex h-19 w-19 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-bold text-market-primary tnum">{asset.score}</span>
                <span className="text-[10px] text-market-sub">/ 100</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {asset.metrics.slice(0, 2).map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-market-sub">
                  <span className="w-16">{m.label}</span>
                  <span className="font-bold text-market-text tnum">{m.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 text-market-sub">
                <span className="w-16">AI 价值</span>
                <span className="font-bold text-market-primary tnum">{asset.aiValue}</span>
              </div>
              <div className="rounded bg-market-bg px-2 py-1 text-xs text-market-sub">
                评级：{asset.rating} 级 · {scoreLevel(asset.score)}
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-market-border pt-3 text-xs leading-relaxed text-market-sub">
            AI 价值 = 模型能力 × 使用量 × 开发者采纳 × Agent 活跃 × 收入 × 生态 × 增长 × 可靠性（加权）。
            综合评估该 AI 资产的生态表现，评分仅用于模拟参考。
          </div>
        </div>
      </div>

      {relatedNews.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-3 text-base font-bold text-market-text">相关新闻事件</h2>
          <div className="space-y-3">
            {relatedNews.map((n) => (
              <div key={n.id} className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-medium text-market-text">{n.title}</div>
                  <div className="mt-0.5 text-xs text-market-sub">{n.summary}</div>
                </div>
                <span className="shrink-0 text-xs text-market-sub">{n.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function scoreLevel(score: number) {
  if (score >= 90) return 'S 级 · 行业龙头'
  if (score >= 85) return 'A 级 · 头部玩家'
  if (score >= 80) return 'B 级 · 稳健成长'
  if (score >= 75) return 'C 级 · 潜力股'
  return 'D 级 · 观察中'
}

function whaleName(id: string) {
  const map: Record<string, string> = {
    'wh-openai-cap': 'OpenAI Capital',
    'wh-gdm-fund': 'DeepMind 基金',
    'wh-msft-ai': '微软 AI 基金',
    'wh-nvda-ventures': 'NVIDIA Ventures',
    'wh-alibaba-ai': '阿里 AI 资本',
    'wh-tencent-ai': '腾讯 AI 资本',
    'wh-xai-cap': 'xAI Capital',
    'wh-sb-vision': '软银 AI 愿景',
  }
  return map[id] ?? id
}
