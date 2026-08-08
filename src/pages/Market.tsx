import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { CATEGORIES, STOCKS } from '../data/stocks'
import IndexPanel from '../components/IndexPanel'
import StockCard from '../components/StockCard'
import { fmtNumber } from '../utils/format'

export default function Market() {
  const quotes = useMarket((s) => s.quotes)
  const news = useMarket((s) => s.news)
  const [activeCat, setActiveCat] = useState<string>('all')
  const navigate = useNavigate()

  const hotStocks = [...STOCKS]
    .filter((s) => activeCat === 'all' || s.categoryId === activeCat)
    .sort((a, b) => Math.abs((quotes[b.symbol]?.changePct ?? 0)) - Math.abs((quotes[a.symbol]?.changePct ?? 0)))
    .slice(0, 8)

  const topNews = news.slice(0, 4)

  return (
    <div className="space-y-5">
      <IndexPanel />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">市场分类</h2>
          <span className="text-xs text-market-sub">按 AI 生态板块分类</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveCat('all')}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              activeCat === 'all'
                ? 'bg-market-primary text-white'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            全部
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCat(cat.id)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                activeCat === cat.id
                  ? 'bg-market-primary text-white'
                  : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
              }`}
            >
              {cat.symbol} {cat.name}
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">热门 AI 股票</h2>
          <button
            className="text-sm font-medium text-market-primary hover:underline"
            onClick={() => navigate('/stocks')}
          >
            查看全部 →
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {hotStocks.map((s) => (
            <StockCard key={s.symbol} stock={s} />
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">AI 市场新闻</h2>
          <button
            className="text-sm font-medium text-market-primary hover:underline"
            onClick={() => navigate('/news')}
          >
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
                <h3 className="mt-1.5 line-clamp-1 text-sm font-semibold text-market-text">
                  {n.title}
                </h3>
                <p className="mt-1 line-clamp-1 text-xs text-market-sub">{n.summary}</p>
              </div>
              <div className="shrink-0 text-right text-[11px] text-market-sub">
                {n.time.slice(11)}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl bg-gradient-to-r from-market-primary to-market-primary-hover p-5 text-white">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold">AI 贡献系统已上线</h3>
            <p className="mt-1 text-sm text-white/85">
              学习、创作、开发，都可以获得 WEG 生态积分奖励。WEG 衡量 AI 生态贡献，不发行、不募资。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-white/15 px-4 py-2 text-center">
              <div className="text-xs text-white/80">WEG 现价</div>
              <div className="text-xl font-bold tnum">¥{fmtNumber(quotes.WEG?.price ?? 5.8)}</div>
            </div>
            <button
              className="rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-market-primary hover:bg-white/90"
              onClick={() => navigate('/weg')}
            >
              了解 WEG 生态
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
