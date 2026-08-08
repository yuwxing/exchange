import { Link } from 'react-router-dom'
import { useMarket } from '../store/market'
import { STOCKS, AI100_WEIGHTS, CATEGORIES } from '../data/stocks'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import { Sparkline } from '../components/Sparkline'

export default function AIIndex() {
  const ai100 = useMarket((s) => s.ai100)
  const sectors = useMarket((s) => s.sectors)
  const quotes = useMarket((s) => s.quotes)
  const candles = useMarket((s) => s.candles)

  const aiPct = (ai100.value - ai100.prev) / ai100.prev
  const up = isUp(aiPct)

  const sectorRows = CATEGORIES.map((c) => {
    const v = sectors[c.id]
    const spark = STOCKS.filter((s) => s.categoryId === c.id)
      .flatMap((s) => candles[s.symbol].slice(-10).map((x) => x.close))
    return { cat: c, value: v, pct: v ? (v.value - v.prev) / v.prev : 0, spark }
  })

  const weights = Object.entries(AI100_WEIGHTS).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-market-text">AI100 指数</span>
              <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                全球人工智能生态综合指数
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-3">
              <span className="text-4xl font-bold text-market-text tnum">
                {fmtNumber(ai100.value)}
              </span>
              <span className={`text-xl font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
                {up ? '+' : ''}
                {(aiPct * 100).toFixed(2)}%
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-market-sub">
              AI100 指数由 AI Exchange 全市场代表标的按市值加权模拟编制，反映 AI 生态整体景气度，
              每 2.5 秒依据 AI Engine 模拟行情刷新。
            </p>
          </div>
          <div className="h-28 w-56">
            <Sparkline
              data={candles.DSK.slice(-28).map((c) => c.close)}
              color={up ? '#16A34A' : '#DC2626'}
              width={224}
              height={112}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h2 className="mb-4 text-base font-bold text-market-text">板块指数</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {sectorRows.map(({ cat, value, pct, spark }) => (
            <div key={cat.id} className="rounded-lg border border-market-border p-4">
              <div className="text-sm font-medium text-market-sub">
                {cat.symbol} {cat.name}
              </div>
              <div className="mt-1 text-xl font-bold text-market-text tnum">
                {fmtNumber(value?.value ?? 0, 1)}
              </div>
              <div className="mt-0.5 flex items-center justify-between">
                <span className={`text-xs font-semibold tnum ${isUp(pct) ? 'text-market-up' : 'text-market-down'}`}>
                  {isUp(pct) ? '+' : ''}
                  {(pct * 100).toFixed(2)}%
                </span>
                <span className="text-[10px] text-market-sub">较昨收</span>
              </div>
              <div className="mt-2 h-8 w-full">
                <Sparkline data={spark.slice(-20)} color={isUp(pct) ? '#16A34A' : '#DC2626'} width={160} height={32} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 lg:col-span-2">
          <h2 className="mb-3 text-base font-bold text-market-text">指数权重股</h2>
          <div className="space-y-3">
            {weights.map(([symbol, w]) => {
              const stock = STOCKS.find((s) => s.symbol === symbol)
              const q = quotes[symbol]
              if (!stock || !q) return null
              return (
                <Link
                  key={symbol}
                  to={`/stock/${symbol}`}
                  className="flex items-center justify-between rounded-lg border border-market-border px-4 py-2.5 transition-colors hover:border-market-primary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-market-text">{symbol}</span>
                    <span className="text-sm text-market-sub">{stock.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="w-16 text-right text-sm font-semibold text-market-text tnum">
                      ¥{fmtNumber(q.price)}
                    </span>
                    <span className={`w-16 text-right text-sm font-semibold tnum ${isUp(q.change) ? 'text-market-up' : 'text-market-down'}`}>
                      {isUp(q.change) ? '+' : ''}
                      {(q.changePct * 100).toFixed(2)}%
                    </span>
                    <span className="w-16 text-right text-sm text-market-sub tnum">
                      {Math.round(w * 100)}%
                    </span>
                    <div className="h-1 w-24 overflow-hidden rounded-full bg-market-bg">
                      <div
                        className="h-full rounded-full bg-market-primary"
                        style={{ width: `${w * 100}%` }}
                      />
                    </div>
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
              以各板块代表标的价格按市值加权，剔除波动过大的新股，模拟行情数据由 AI Engine 生成。
            </p>
            <p>
              <span className="font-semibold text-market-text">基准日：</span>
              2026-01-01 基点 10,000.00。
            </p>
            <p>
              <span className="font-semibold text-market-text">更新频率：</span>
              实时（模拟），每 2.5 秒刷新一次。
            </p>
            <p>
              <span className="font-semibold text-market-text">板块权重：</span>
              基础模型 42% · Agent 生态 31% · 教育 AI 5% · 机器人 12% · 其他 10%。
            </p>
            <div className="rounded-lg bg-market-bg px-3 py-2 text-xs">
              总市值约 ¥{fmtCompact(Object.values(quotes).reduce((a, q) => a + q.price * 1000000, 0))}，
              覆盖 {Object.keys(quotes).length} 个模拟标的。
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
