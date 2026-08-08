import { Link, useParams } from 'react-router-dom'
import { STOCKS, CATEGORIES } from '../data/stocks'
import { useMarket } from '../store/market'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import KLine from '../components/KLine'
import TradePanel from '../components/TradePanel'

export default function StockDetail() {
  const { symbol = '' } = useParams()
  const stock = STOCKS.find((s) => s.symbol === symbol.toUpperCase())
  const q = useMarket((s) => s.quotes[symbol.toUpperCase()])
  const candles = useMarket((s) => s.candles[symbol.toUpperCase()])
  const news = useMarket((s) => s.news)

  if (!stock || !q || !candles) {
    return (
      <div className="py-20 text-center text-market-sub">
        未找到标的 {symbol}
        <div className="mt-4">
          <Link to="/" className="text-sm text-market-primary hover:underline">
            ← 返回行情大厅
          </Link>
        </div>
      </div>
    )
  }

  const up = isUp(q.change)
  const cat = CATEGORIES.find((c) => c.id === stock.categoryId)
  const relatedNews = news.filter((n) => n.symbol === stock.symbol || n.categoryId === stock.categoryId)

  return (
    <div className="space-y-5">
      <Link to="/stocks" className="text-sm text-market-sub hover:text-market-primary">
        ← 返回 AI 股票榜
      </Link>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-market-primary/10 text-lg font-bold text-market-primary">
              {stock.symbol.slice(0, 1)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-market-text">{stock.symbol}</h1>
                <span className="text-sm text-market-sub">
                  {stock.name} · {stock.nameEn}
                </span>
                {stock.isWeg && (
                  <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                    生态积分资产
                  </span>
                )}
              </div>
              <div className="mt-0.5 text-xs text-market-sub">
                {cat?.symbol} {cat?.name} · 市值 ¥{fmtCompact(stock.marketCap)} · AI评分 {stock.score}
              </div>
              <p className="mt-2 max-w-xl text-sm text-market-sub">{stock.description}</p>
            </div>
          </div>
          <div className="text-right">
            <div
              className={`text-4xl font-bold tnum ${up ? 'text-market-up' : 'text-market-down'}`}
            >
              ¥{fmtNumber(q.price)}
            </div>
            <div
              className={`mt-1 text-lg font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}
            >
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

        <TradePanel stock={stock} />
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-4 text-base font-bold text-market-text">公司指标</h2>
          <div className="space-y-4">
            {stock.metrics.map((m) => (
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
              style={{
                background: `conic-gradient(#1677FF ${stock.score}%, #F0F2F5 ${stock.score}%)`,
              }}
            >
              <div className="flex h-19 w-19 flex-col items-center justify-center rounded-full bg-white">
                <span className="text-2xl font-bold text-market-primary tnum">{stock.score}</span>
                <span className="text-[10px] text-market-sub">/ 100</span>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {stock.metrics.slice(0, 2).map((m) => (
                <div key={m.label} className="flex items-center gap-2 text-market-sub">
                  <span className="w-16">{m.label}</span>
                  <span className="font-bold text-market-text tnum">{m.value}</span>
                </div>
              ))}
              <div className="rounded bg-market-bg px-2 py-1 text-xs text-market-sub">
                评级：{scoreLevel(stock.score)}
              </div>
            </div>
          </div>
          <div className="mt-4 border-t border-market-border pt-3 text-xs leading-relaxed text-market-sub">
            综合评估该 AI 企业在模型能力、用户规模、开发者生态与商业化上的综合表现。评分仅用于模拟参考。
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
