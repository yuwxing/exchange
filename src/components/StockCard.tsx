import { useNavigate } from 'react-router-dom'
import type { Stock } from '../types'
import { useMarket } from '../store/market'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import { CATEGORIES } from '../data/stocks'
import { Sparkline } from './Sparkline'

export default function StockCard({ stock }: { stock: Stock }) {
  const q = useMarket((s) => s.quotes[stock.symbol])
  const candles = useMarket((s) => s.candles[stock.symbol])
  const navigate = useNavigate()
  if (!q) return null

  const up = isUp(q.change)
  const cat = CATEGORIES.find((c) => c.id === stock.categoryId)
  const data = candles.slice(-20).map((c) => c.close)

  return (
    <div
      className="group cursor-pointer rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60 transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => navigate(`/stock/${stock.symbol}`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-market-text">{stock.symbol}</span>
            {stock.isWeg && (
              <span className="rounded bg-market-primary/10 px-1 py-0.5 text-[10px] font-bold text-market-primary">
                生态积分资产
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-market-sub">
            {stock.name}
            <span className="ml-1">{cat?.symbol}</span>
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-market-bg text-[11px] font-bold text-market-sub">
          {stock.symbol.slice(0, 1)}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className={`text-xl font-bold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
            ¥{fmtNumber(q.price)}
          </div>
          <div className={`mt-1 text-sm font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
            {up ? '▲' : '▼'} {Math.abs(q.changePct * 100).toFixed(2)}%
          </div>
        </div>
        <div className="h-9 w-24">
          <Sparkline data={data} color={up ? '#16A34A' : '#DC2626'} />
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-market-border pt-2 text-[11px] text-market-sub">
        <span>
          市值 ¥{fmtCompact(stock.marketCap)}
        </span>
        <span className="rounded bg-market-bg px-1.5 py-0.5 font-semibold text-market-text">
          评分 {stock.score}
        </span>
      </div>
    </div>
  )
}
