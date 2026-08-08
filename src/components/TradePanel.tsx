import { useState } from 'react'
import type { Stock } from '../types'
import { useMarket } from '../store/market'
import { fmtNumber } from '../utils/format'

export default function TradePanel({ stock }: { stock: Stock }) {
  const q = useMarket((s) => s.quotes[stock.symbol])
  const account = useMarket((s) => s.account)
  const buy = useMarket((s) => s.buy)
  const sell = useMarket((s) => s.sell)
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [qty, setQty] = useState(100)
  const [message, setMessage] = useState('')

  const holding = account.holdings.find((h) => h.symbol === stock.symbol)
  const maxQty = side === 'buy' ? Math.floor(account.cash / (q?.price ?? 1)) : holding?.quantity ?? 0
  const amount = (q?.price ?? 0) * qty
  const isWeg = stock.isWeg

  const submit = () => {
    const res = side === 'buy' ? buy(stock.symbol, qty) : sell(stock.symbol, qty)
    setMessage(res.message)
    if (res.ok) setTimeout(() => setMessage(''), 2500)
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-market-bg p-1">
        <button
          className={`rounded-md py-2 text-sm font-semibold transition-colors ${
            side === 'buy' ? 'bg-market-up text-white' : 'text-market-sub'
          }`}
          onClick={() => setSide('buy')}
        >
          买入
        </button>
        <button
          className={`rounded-md py-2 text-sm font-semibold transition-colors ${
            side === 'sell' ? 'bg-market-down text-white' : 'text-market-sub'
          }`}
          onClick={() => setSide('sell')}
        >
          卖出
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-market-sub">
          <span>现价</span>
          <span className="font-bold text-market-text tnum">¥{fmtNumber(q?.price ?? 0)}</span>
        </div>
        <div className="flex justify-between text-market-sub">
          <span>可用资金</span>
          <span className="font-semibold text-market-text tnum">¥{fmtNumber(account.cash)}</span>
        </div>
        <div className="flex justify-between text-market-sub">
          <span>当前持仓</span>
          <span className="font-semibold text-market-text tnum">
            {holding?.quantity ?? 0} 股{holding ? `（成本 ¥${holding.avgCost.toFixed(2)}）` : ''}
          </span>
        </div>

        <div>
          <div className="mb-1 flex justify-between text-xs text-market-sub">
            <span>委托数量</span>
            <span>最多 {maxQty} 股</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-market-border px-3 py-2 text-market-text outline-none focus:border-market-primary tnum"
            />
            <button
              onClick={() => setQty(Math.max(1, Math.floor(maxQty / 4)))}
              className="shrink-0 rounded-lg bg-market-bg px-2 py-2 text-xs text-market-sub hover:text-market-text"
            >
              1/4
            </button>
            <button
              onClick={() => setQty(Math.max(1, maxQty))}
              className="shrink-0 rounded-lg bg-market-bg px-2 py-2 text-xs text-market-sub hover:text-market-text"
            >
              全仓
            </button>
          </div>
        </div>

        <div className="flex justify-between border-t border-market-border pt-3 text-market-sub">
          <span>预估金额</span>
          <span className="font-bold text-market-text tnum">¥{fmtNumber(amount)}</span>
        </div>

        <button
          onClick={submit}
          className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
            side === 'buy'
              ? 'bg-market-up hover:bg-market-up/90'
              : 'bg-market-down hover:bg-market-down/90'
          }`}
        >
          {side === 'buy' ? `买入 ${stock.symbol}` : `卖出 ${stock.symbol}`}
        </button>

        {isWeg && (
          <p className="text-xs leading-relaxed text-market-sub">
            提示：WEG 为生态积分资产，买卖仅用于模拟学习，不构成任何货币或证券交易。
          </p>
        )}

        {message && (
          <div className="rounded-lg bg-market-bg px-3 py-2 text-xs font-medium text-market-text">
            {message}
          </div>
        )}
      </div>
    </div>
  )
}
