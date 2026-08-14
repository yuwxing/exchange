import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { SECTORS, assetOf } from '../data/assets'
import IndexPanel from '../components/IndexPanel'
import AssetCard from '../components/AssetCard'
import SentimentGauge from '../components/SentimentGauge'
import WhaleFeed from '../components/WhaleFeed'
import SectorHeat from '../components/SectorHeat'
import AiGdp from '../components/AiGdp'
import { fmtNumber } from '../utils/format'

export default function Market() {
  const quotes = useMarket((s) => s.quotes)
  const sectors = useMarket((s) => s.sectors)
  const news = useMarket((s) => s.news)
  const allAssets = useMarket((s) => s.allAssets)
  const dailyReport = useMarket((s) => s.dailyReport)
  const aiReports = useMarket((s) => s.aiReports)
  const sentiment = useMarket((s) => s.sentiment)
  const whaleFlows = useMarket((s) => s.whaleFlows)
  const capitalOs = useMarket((s) => s.capitalOs)
  const [activeSector, setActiveSector] = useState<string>('all')
  const navigate = useNavigate()

  const assets = allAssets()
  const hotAssets = assets
    .filter((a) => activeSector === 'all' || a.sectorId === activeSector)
    .sort((a, b) => Math.abs(quotes[b.symbol]?.changePct ?? 0) - Math.abs(quotes[a.symbol]?.changePct ?? 0))
    .slice(0, 8)

  const topNews = news.slice(0, 4)
  const researchReport = aiReports.research

  return (
    <div className="space-y-5">
      {/* 第一屏：品牌定位 + 显著免责声明 */}
      <section className="overflow-hidden rounded-xl bg-gradient-to-r from-market-primary via-market-primary to-market-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-3xl font-black tracking-tight">AI Exchange</span>
              <span className="rounded bg-white/20 px-2 py-0.5 text-xs font-bold text-white ring-1 ring-white/30">
                模拟
              </span>
            </div>
            <p className="mt-1.5 text-lg font-medium text-white/95">全球 AI 经济模拟交易市场</p>
            <p className="mt-1 max-w-2xl text-sm text-white/75">
              模型 · Agent · Skill · MCP · 应用 · 机器人 · 数据 · 算力 · 协议 —— 统一资产化、指数化、交易化的教育模拟平台
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/assets')}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-market-primary transition-colors hover:bg-white/90"
            >
              资产市场 →
            </button>
            <button
              onClick={() => navigate('/intelligence')}
              className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/25"
            >
              AI 智能
            </button>
          </div>
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-300">
          <span className="mt-0.5 text-lg">⚠️</span>
          <p>
            本平台为 <b>AI 产业经济模拟与教育研究平台</b>。所有资产、行情、交易、指数、合约及收益均为
            <b> 模拟数据</b>，不代表真实证券、金融产品或数字资产。
          </p>
        </div>
      </section>

      {/* AI Capital OS · 资本总入口 */}
      <section className="rounded-xl bg-gradient-to-r from-amber-500/10 via-amber-400/5 to-transparent p-4 ring-1 ring-amber-400/30">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-xl text-white shadow">
              💰
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-black text-market-text">AI Capital OS</span>
                <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 ring-1 ring-amber-400/40">
                  资本总入口
                </span>
                {capitalOs?.active && (
                  <span className="flex items-center gap-1 rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 ring-1 ring-emerald-400/30">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                    闭环运行中
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-market-sub">
                资本进入 → AI 理解 → 配置 → 机会 → 投资 AI 企业 → AI 劳动力 → 服务收入 → 利润回资本 → 再平衡
                {capitalOs?.active &&
                  ` · 净值 $${fmtNumber(capitalOs.nav)} · 服务收入 $${fmtNumber(capitalOs.serviceRevenue)} · 利润回流 $${fmtNumber(capitalOs.profitReturned)} · 再平衡 ${capitalOs.rebalances} 次`}
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/capital')}
            className="shrink-0 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-amber-600"
          >
            {capitalOs?.active ? '进入闭环驾驶舱 →' : '启动 AI Capital OS →'}
          </button>
        </div>
      </section>

      <IndexPanel />

      {/* AI GDP：全球 AI 经济总量（经济模拟器核心） */}
      <AiGdp />

      {/* 市场脉搏：AI 情绪指数 + 巨鲸动态 */}
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 lg:col-span-1">
          <div className="mb-1 flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">AI 情绪指数</h2>
            <span className="text-[11px] text-market-sub">恐惧-贪婪</span>
          </div>
          <SentimentGauge score={sentiment.score} level={sentiment.level} prev={sentiment.prev} history={sentiment.history} />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sentiment.drivers.map((d) => (
              <span key={d.label} className="rounded bg-market-bg px-2 py-0.5 text-[10px] text-market-sub">
                {d.label} {d.value} · 权重{d.weight}%
              </span>
            ))}
          </div>
        </div>
        <div className="lg:col-span-2">
          <WhaleFeed limit={7} />
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">十大市场</h2>
          <span className="text-xs text-market-sub">模型 / Agent / Skill / MCP / 应用 / 机器人 / 数据 / 算力 / 协议 / 指数</span>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          <button
            onClick={() => setActiveSector('all')}
            className={`rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
              activeSector === 'all'
                ? 'bg-market-primary text-white shadow'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            🌐 全部市场
          </button>
          {SECTORS.map((sec) => {
            const v = sectors[sec.id]
            const pct = v && v.prev > 0 ? ((v.value - v.prev) / v.prev) * 100 : 0
            const count = assets.filter((a) => a.sectorId === sec.id).length
            const secFlows = whaleFlows.filter((f) => assetOf(f.symbol)?.sectorId === sec.id)
            return (
              <button
                key={sec.id}
                onClick={() => setActiveSector(sec.id)}
                className={`rounded-xl px-3 py-2.5 text-left transition-colors ${
                  activeSector === sec.id
                    ? 'bg-market-primary text-white shadow'
                    : 'bg-white ring-1 ring-market-border/60 hover:text-market-text'
                }`}
              >
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>
                    {sec.symbol} {sec.code} {sec.name}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${
                      activeSector === sec.id ? 'text-white/80' : pct >= 0 ? 'text-market-up' : 'text-market-down'
                    }`}
                  >
                    {pct >= 0 ? '+' : ''}
                    {pct.toFixed(2)}%
                  </span>
                </div>
                <div className={`mt-0.5 flex items-center justify-between ${activeSector === sec.id ? '' : ''}`}>
                  <span className={`text-[10px] ${activeSector === sec.id ? 'text-white/70' : 'text-market-sub'}`}>
                    {count} 个标的 · {sec.prefix} 前缀
                  </span>
                  {activeSector !== sec.id && <SectorHeat pct={pct / 100} flows={secFlows} />}
                </div>
              </button>
            )
          })}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">
            {activeSector === 'all' ? '热门 AI 资产' : `热门 ${SECTORS.find((s) => s.id === activeSector)?.name ?? ''} 资产`}
          </h2>
          <button className="text-sm font-medium text-market-primary hover:underline" onClick={() => navigate('/assets')}>
            查看全部 →
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotAssets.map((a) => (
            <AssetCard key={a.symbol} asset={a} />
          ))}
        </div>
      </section>

      {researchReport && (
        <section
          className="cursor-pointer rounded-xl bg-gradient-to-r from-sky-600 to-market-primary p-5 text-white transition-transform hover:scale-[1.005]"
          onClick={() => navigate('/intelligence')}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold text-white/90">
                <span>🔭 AI Research Agent</span>
                <span className="rounded bg-white/15 px-1.5 py-0.5 text-[10px]">最新发现</span>
              </div>
              <h3 className="mt-1 text-lg font-bold">{researchReport.title}</h3>
              <p className="mt-1 text-sm text-white/85">{researchReport.summary}</p>
            </div>
            <button className="shrink-0 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-market-primary hover:bg-white/90">
              进入 AI 智能 →
            </button>
          </div>
        </section>
      )}

      {dailyReport && (
        <section
          className="cursor-pointer rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60"
          onClick={() => navigate('/intelligence')}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-market-primary">📋 AI 市场日报</div>
              <div className="mt-0.5 text-base font-bold text-market-text">{dailyReport.title}</div>
              <p className="mt-1 text-sm text-market-sub">{dailyReport.summary}</p>
            </div>
            <span className="text-xs text-market-sub">由 6 个 AI 智能体协同生成 · {dailyReport.generatedAt}</span>
          </div>
        </section>
      )}

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">AI 市场新闻</h2>
          <button className="text-sm font-medium text-market-primary hover:underline" onClick={() => navigate('/news')}>
            全部事件 →
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {topNews.map((n) => (
            <div
              key={n.id}
              className="flex cursor-pointer items-start justify-between gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60 transition-colors hover:ring-market-primary/40"
              onClick={() => navigate('/news')}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      n.importance === 3
                        ? 'bg-market-down/10 text-market-down'
                        : n.importance === 2
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-market-bg text-market-sub'
                    }`}
                  >
                    {n.importance === 3 ? '重要' : n.importance === 2 ? '关注' : '一般'}
                  </span>
                  {n.symbol && (
                    <span className="shrink-0 rounded bg-market-bg px-1.5 py-0.5 text-[10px] font-bold text-market-text">
                      {n.symbol}
                    </span>
                  )}
                </div>
                <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-market-text">{n.title}</h3>
                <p className="mt-1 line-clamp-1 text-xs text-market-sub">{n.summary}</p>
              </div>
              <div className="shrink-0 text-right text-[11px] text-market-sub">{n.time.slice(11)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-gradient-to-r from-market-primary to-market-primary-hover p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">AI 劳动力市场已上线</h3>
            <p className="mt-1 text-sm text-white/85">
              Agent 承接任务、调用 Skill 与 Model、消耗 Compute，完成任务创造 AI 劳动价值。
              研究、开发、贡献评价，都可以获得 WEG 贡献积分。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white/15 px-4 py-2 text-center">
              <div className="text-xs text-white/80">今日任务</div>
              <div className="text-xl font-bold tnum">12,482</div>
            </div>
            <button
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-market-primary hover:bg-white/90"
              onClick={() => navigate('/weg')}
            >
              进入 AI 劳动力市场
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
