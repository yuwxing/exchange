import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Quote, Stock } from '../types'
import { useMarket } from '../store/market'
import { CATEGORIES } from '../data/stocks'
import { fmtCompact, fmtNumber } from '../utils/format'
import { Sparkline } from './Sparkline'

type SortKey = 'symbol' | 'price' | 'changePct' | 'marketCap' | 'score'

export default function StockTable({ stocks }: { stocks: Stock[] }) {
  const quotes = useMarket((s) => s.quotes)
  const candles = useMarket((s) => s.candles)
  const [sortKey, setSortKey] = useState<SortKey>('marketCap')
  const [sortAsc, setSortAsc] = useState(false)
  const navigate = useNavigate()

  const rows = useMemo(() => {
    const list = stocks.map((stock) => {
      const q = quotes[stock.symbol]
      return { stock, q }
    })
    list.sort((a, b) => {
      const key = sortKey
      let av: number | string
      let bv: number | string
      if (key === 'symbol') {
        av = a.stock.symbol
        bv = b.stock.symbol
      } else if (key === 'price') {
        av = a.q?.price ?? 0
        bv = b.q?.price ?? 0
      } else if (key === 'changePct') {
        av = a.q?.changePct ?? 0
        bv = b.q?.changePct ?? 0
      } else if (key === 'score') {
        av = a.stock.score
        bv = b.stock.score
      } else {
        av = a.stock.marketCap
        bv = b.stock.marketCap
      }
      if (typeof av === 'string' || typeof bv === 'string') {
        return sortAsc ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
      }
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number)
    })
    return list
  }, [stocks, quotes, sortKey, sortAsc])

  const header = (key: SortKey, label: string, right = true) => (
    <th
      className={`cursor-pointer select-none px-3 py-2.5 text-xs font-semibold text-market-sub ${
        right ? 'text-right' : 'text-left'
      }`}
      onClick={() => {
        if (sortKey === key) setSortAsc(!sortAsc)
        else {
          setSortKey(key)
          setSortAsc(false)
        }
      }}
    >
      {label}
      {sortKey === key && <span className="ml-0.5 text-market-primary">{sortAsc ? '↑' : '↓'}</span>}
    </th>
  )

  return (
    <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-market-border bg-market-bg/50">
          <tr>
            {header('symbol', '标的', false)}
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-market-sub">名称</th>
            <th className="px-3 py-2.5 text-left text-xs font-semibold text-market-sub">板块</th>
            {header('price', '最新价')}
            {header('changePct', '涨跌幅')}
            <th className="px-3 py-2.5 text-right text-xs font-semibold text-market-sub">走势</th>
            {header('marketCap', '市值')}
            {header('score', 'AI评分')}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ stock, q }) => {
            if (!q) return null
            const up = q.change >= 0
            const cat = CATEGORIES.find((c) => c.id === stock.categoryId)
            const spark = candles[stock.symbol].slice(-20).map((c) => c.close)
            return (
              <tr
                key={stock.symbol}
                className="cursor-pointer border-b border-market-border/50 last:border-0 hover:bg-market-bg/60"
                onClick={() => navigate(`/stock/${stock.symbol}`)}
              >
                <td className="px-3 py-3">
                  <span className="font-bold text-market-text">{stock.symbol}</span>
                  {stock.isWeg && (
                    <span className="ml-1.5 rounded bg-market-primary/10 px-1 py-0.5 text-[10px] font-bold text-market-primary">
                      生态
                    </span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-market-sub">{stock.name}</td>
                <td className="px-3 py-3 text-sm text-market-sub">
                  {cat?.name} {cat?.symbol}
                </td>
                <td className="px-3 py-3 text-right font-semibold text-market-text tnum">
                  ¥{fmtNumber(q.price)}
                </td>
                <td
                  className={`px-3 py-3 text-right font-semibold tnum ${
                    up ? 'text-market-up' : 'text-market-down'
                  }`}
                >
                  {up ? '+' : ''}
                  {(q.changePct * 100).toFixed(2)}%
                </td>
                <td className="px-3 py-3">
                  <div className="ml-auto h-7 w-20">
                    <Sparkline data={spark} color={up ? '#16A34A' : '#DC2626'} />
                  </div>
                </td>
                <td className="px-3 py-3 text-right text-sm text-market-sub tnum">
                  {fmtCompact(stock.marketCap)}
                </td>
                <td className="px-3 py-3 text-right">
                  <span className="rounded bg-market-bg px-2 py-0.5 text-xs font-bold text-market-text tnum">
                    {stock.score}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export type { Quote }
