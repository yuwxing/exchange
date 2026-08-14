import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarket } from '../store/market'
import { INDEXES, SECTORS, assetOf, indexMembers } from '../data/assets'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import { Sparkline } from '../components/Sparkline'
import SentimentGauge from '../components/SentimentGauge'
import SectorHeat from '../components/SectorHeat'

export default function AIIndex() {
  const indices = useMarket((s) => s.indices)
  const sectors = useMarket((s) => s.sectors)
  const quotes = useMarket((s) => s.quotes)
  const candles = useMarket((s) => s.candles)
  const sentiment = useMarket((s) => s.sentiment)
  const whaleFlows = useMarket((s) => s.whaleFlows)
  const [active, setActive] = useState('ai100')

  const activeDef = INDEXES.find((i) => i.id === active) ?? INDEXES[0]
  const activeVal = indices[activeDef.id]
  const activePct = activeVal && activeVal.prev > 0 ? (activeVal.value - activeVal.prev) / activeVal.prev : 0
  const activeUp = isUp(activePct)

  const members = indexMembers(activeDef)
    .map((sym) => ({ asset: assetOf(sym), q: quotes[sym] }))
    .filter((x) => x.asset && x.q)
    .sort((a, b) => (b.q!.changePct ?? 0) - (a.q!.changePct ?? 0))

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-market-text">{activeDef.code} 指数</span>
              <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                {activeDef.name}
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-market-text tnum">{fmtNumber(activeVal?.value ?? 0)}</span>
              <span className={`text-xl font-semibold tnum ${activeUp ? 'text-market-up' : 'text-market-down'}`}>
                {activeUp ? '+' : ''}
                {(activePct * 100).toFixed(2)}%
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-market-sub">{activeDef.desc}</p>
          </div>
          <div className="h-28 w-56">
            <Sparkline
              data={(activeVal?.spark ?? []).slice(-28)}
              color={activeUp ? '#16A34A' : '#DC2626'}
              width={224}
              height={112}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h2 className="mb-3 text-base font-bold text-market-text">指数体系（{INDEXES.length}）</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {INDEXES.map((def) => {
            const v = indices[def.id]
            const pct = v && v.prev > 0 ? (v.value - v.prev) / v.prev : 0
            const activeNow = active === def.id
            return (
              <button
                key={def.id}
                onClick={() => setActive(def.id)}
                className={`rounded-xl p-3 text-left transition-colors ${
                  activeNow ? 'bg-market-primary text-white shadow' : 'bg-market-bg hover:bg-market-border/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-bold ${activeNow ? 'text-white' : 'text-market-text'}`}>
                    {def.code}
                  </span>
                  <span
                    className={`text-[10px] font-bold ${activeNow ? 'text-white/80' : isUp(pct) ? 'text-market-up' : 'text-market-down'}`}
                  >
                    {isUp(pct) ? '+' : ''}
                    {(pct * 100).toFixed(2)}%
                  </span>
                </div>
                <div className={`mt-0.5 text-[10px] ${activeNow ? 'text-white/70' : 'text-market-sub'}`}>
                  {def.name} · {def.base.toLocaleString('zh-CN')}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h2 className="mb-3 text-base font-bold text-market-text">板块指数（10 大市场）</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {SECTORS.map((sec) => {
            const v = sectors[sec.id]
            const pct = v && v.prev > 0 ? (v.value - v.prev) / v.prev : 0
            const spark = (members.length ? members : [])
              .filter((m) => m.asset!.sectorId === sec.id)
              .flatMap((m) => (candles[m.asset!.symbol] ?? []).slice(-10).map((c) => c.close))
            return (
              <div key={sec.id} className="rounded-lg border border-market-border p-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-medium text-market-sub">
                    {sec.symbol} {sec.code} {sec.name}
                  </div>
                  <SectorHeat pct={pct} flows={whaleFlows.filter((f) => assetOf(f.symbol)?.sectorId === sec.id)} />
                </div>
                <div className="mt-1 text-lg font-bold text-market-text tnum">{fmtNumber(v?.value ?? 0, 1)}</div>
                <div className={`mt-0.5 text-xs font-semibold tnum ${isUp(pct) ? 'text-market-up' : 'text-market-down'}`}>
                  {isUp(pct) ? '+' : ''}
                  {(pct * 100).toFixed(2)}%
                </div>
                <div className="mt-2 h-8 w-full">
                  <Sparkline data={spark.slice(-20)} color={isUp(pct) ? '#16A34A' : '#DC2626'} width={160} height={32} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h2 className="mb-2 text-base font-bold text-market-text">AI 市场情绪</h2>
        <div className="grid grid-cols-1 items-center gap-4 lg:grid-cols-2">
          <SentimentGauge score={sentiment.score} level={sentiment.level} prev={sentiment.prev} history={sentiment.history} height={170} />
          <div className="space-y-2">
            <p className="text-sm text-market-sub">
              当前市场情绪：<span className="font-bold text-market-text">{sentiment.level}</span>
              {sentiment.score >= 75 ? '，警惕过热回调' : sentiment.score <= 25 ? '，关注超跌机会' : '，多空相对均衡'}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {sentiment.drivers.map((d) => (
                <span key={d.label} className="rounded bg-market-bg px-2 py-1 text-[11px] text-market-sub">
                  {d.label} {d.value} · 权重{d.weight}%
                </span>
              ))}
            </div>
            <div className="rounded-lg bg-market-bg px-3 py-2 text-xs leading-relaxed text-market-sub">
              情绪指数由全市场涨跌家数、平均涨跌与成交活跃度加权模拟计算，每 2.5 秒刷新，用于教育演示。
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 lg:col-span-2">
          <h2 className="mb-3 text-base font-bold text-market-text">
            {activeDef.code} 成分股（{members.length}）
          </h2>
          <div className="space-y-3">
            {members.map(({ asset, q }) => {
              if (!asset || !q) return null
              return (
                <Link
                  key={asset.symbol}
                  to={`/asset/${asset.symbol}`}
                  className="flex items-center justify-between rounded-lg border border-market-border px-4 py-2.5 transition-colors hover:border-market-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-market-text">{asset.symbol}</span>
                    <span className="text-sm text-market-sub">{asset.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 text-right text-sm font-semibold text-market-text tnum">
                      ${fmtNumber(q.price)}
                    </span>
                    <span
                      className={`w-16 text-right text-sm font-semibold tnum ${isUp(q.change) ? 'text-market-up' : 'text-market-down'}`}
                    >
                      {isUp(q.change) ? '+' : ''}
                      {(q.changePct * 100).toFixed(2)}%
                    </span>
                    <span className="w-16 text-right text-sm text-market-sub tnum">
                      {fmtCompact(asset.marketCap)}
                    </span>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-3 text-base font-bold text-market-text">指数说明</h2>
          <div className="space-y-3 text-sm leading-relaxed text-market-sub">
            <p>
              <span className="font-semibold text-market-text">编制方法：</span>
              以板块代表资产价格按市值加权，剔除波动过大的新资产，模拟行情由 AI Engine 生成。
            </p>
            <p>
              <span className="font-semibold text-market-text">基期：</span>
              2026-01-01，基点 10,000.00（AI100 基点 12,580.35）。
            </p>
            <p>
              <span className="font-semibold text-market-text">更新频率：</span>
              实时（模拟），每 2.5 秒刷新一次。
            </p>
            <p>
              <span className="font-semibold text-market-text">板块权重：</span>
              模型 25% · 智能体 20% · 应用 12% · 技能 10% · 工具协议 8% · 机器人 8% · 算力 7% · 数据 5% · 协议 3% · 指数 2%。
            </p>
            <div className="rounded-lg bg-market-bg px-3 py-2 text-xs">
              覆盖 {Object.keys(quotes).length} 个模拟标的，AI 资产仅作教育模拟，不构成任何证券发行。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
