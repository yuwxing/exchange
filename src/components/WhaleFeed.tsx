import { Link } from 'react-router-dom'
import { useMarket } from '../store/market'
import { fmtCompact } from '../utils/format'

/** AI 巨鲸动态：机构大单实时流 */
export default function WhaleFeed({ limit = 6 }: { limit?: number }) {
  const trades = useMarket((s) => s.whaleTrades)
  const list = trades.slice(0, limit)

  if (list.length === 0) {
    return (
      <div className="rounded-xl bg-white p-5 text-center text-sm text-market-sub shadow-sm ring-1 ring-market-border/60">
        巨鲸动态生成中，请稍候…
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-market-text">🐋 AI 巨鲸动态</h2>
        <span className="text-[11px] text-market-sub">模拟机构大单实时流</span>
      </div>
      <div className="space-y-2.5">
        {list.map((t) => (
          <div key={t.id} className="flex items-center justify-between gap-2 rounded-lg border border-market-border/60 px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <span className="text-base">{t.whaleIcon}</span>
              <div className="min-w-0">
                <div className="truncate text-xs font-semibold text-market-text">
                  {t.whaleName}
                  <span
                    className={`ml-1.5 rounded px-1 py-0.5 text-[9px] font-bold ${
                      t.direction === 'long' ? 'bg-market-up/10 text-market-up' : 'bg-market-down/10 text-market-down'
                    }`}
                  >
                    {t.direction === 'long' ? '建多' : '建空'}
                  </span>
                </div>
                <div className="text-[10px] text-market-sub">{t.time}</div>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <Link to={`/asset/${t.symbol}`} className="text-xs font-bold text-market-primary hover:underline">
                {t.symbol}
              </Link>
              <div className="text-[11px] text-market-sub tnum">
                {t.direction === 'long' ? '买入' : '卖出'} ${fmtCompact(t.amount)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
