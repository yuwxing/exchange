import { useState } from 'react'
import type { Asset } from '../types'
import { useMarket } from '../store/market'
import { fmtNumber } from '../utils/format'

type OrderKind = 'market' | 'limit' | 'stopLoss' | 'takeProfit'

export default function TradePanel({ asset }: { asset: Asset }) {
  const q = useMarket((s) => s.quotes[asset.symbol])
  const account = useMarket((s) => s.account)
  const buy = useMarket((s) => s.buy)
  const sell = useMarket((s) => s.sell)
  const placeOrder = useMarket((s) => s.placeOrder)
  const openContract = useMarket((s) => s.openContract)
  const closeContract = useMarket((s) => s.closeContract)
  const contracts = useMarket((s) => s.contracts)

  const [mode, setMode] = useState<'spot' | 'contract'>('spot')
  const [side, setSide] = useState<'buy' | 'sell'>('buy')
  const [orderType, setOrderType] = useState<OrderKind>('market')
  const [qty, setQty] = useState(100)
  const [price, setPrice] = useState(q?.price ?? 0)
  const [cSide, setCSide] = useState<'long' | 'short'>('long')
  const [leverage, setLeverage] = useState(5)
  const [message, setMessage] = useState('')

  const holding = account.holdings.find((h) => h.symbol === asset.symbol)
  const spotMax = side === 'buy' ? Math.floor(account.cash / (q?.price ?? 1)) : holding?.quantity ?? 0
  const contractMargin = (q?.price ?? 0) * qty / leverage
  const myContracts = contracts.filter((c) => c.symbol === asset.symbol)

  const flash = (msg: string) => {
    setMessage(msg)
    if (msg.includes('成功') || msg.includes('已')) setTimeout(() => setMessage(''), 3000)
  }

  const submitSpot = () => {
    if (orderType === 'market') {
      const res = side === 'buy' ? buy(asset.symbol, qty) : sell(asset.symbol, qty)
      flash(res.message)
    } else {
      const res = placeOrder({ symbol: asset.symbol, kind: orderType, side, price, quantity: qty })
      flash(res.message)
    }
  }

  const submitContract = () => {
    const res = openContract({ symbol: asset.symbol, side: cSide, leverage, quantity: qty })
    flash(res.message)
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-market-bg p-1">
        <button
          className={`rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === 'spot' ? 'bg-market-primary text-white' : 'text-market-sub'
          }`}
          onClick={() => setMode('spot')}
        >
          现货
        </button>
        <button
          className={`rounded-md py-2 text-sm font-semibold transition-colors ${
            mode === 'contract' ? 'bg-market-primary text-white' : 'text-market-sub'
          }`}
          onClick={() => setMode('contract')}
        >
          合约（模拟杠杆）
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div className="flex justify-between text-market-sub">
          <span>现价</span>
          <span className="font-bold text-market-text tnum">${fmtNumber(q?.price ?? 0)}</span>
        </div>
        <div className="flex justify-between text-market-sub">
          <span>可用资金</span>
          <span className="font-semibold text-market-text tnum">${fmtNumber(account.cash)}</span>
        </div>

        {mode === 'spot' ? (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  side === 'buy' ? 'bg-market-up text-white' : 'bg-market-bg text-market-sub'
                }`}
                onClick={() => setSide('buy')}
              >
                买入
              </button>
              <button
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  side === 'sell' ? 'bg-market-down text-white' : 'bg-market-bg text-market-sub'
                }`}
                onClick={() => setSide('sell')}
              >
                卖出
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {(
                [
                  ['market', '市价'],
                  ['limit', '限价'],
                  ['stopLoss', '止损'],
                  ['takeProfit', '止盈'],
                ] as [OrderKind, string][]
              ).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setOrderType(k)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    orderType === k ? 'bg-market-text text-white' : 'bg-market-bg text-market-sub hover:text-market-text'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {orderType !== 'market' && (
              <div>
                <div className="mb-1 text-xs text-market-sub">
                  {orderType === 'limit' ? '委托价格' : orderType === 'stopLoss' ? '止损触发价' : '止盈触发价'}
                </div>
                <input
                  type="number"
                  min={0.01}
                  step={0.01}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value) || 0)}
                  className="w-full rounded-lg border border-market-border px-3 py-2 text-market-text outline-none focus:border-market-primary tnum"
                />
              </div>
            )}
            <div>
              <div className="mb-1 flex justify-between text-xs text-market-sub">
                <span>委托数量</span>
                <span>最多 {spotMax} 股</span>
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
                  onClick={() => setQty(Math.max(1, Math.floor(spotMax / 4)))}
                  className="shrink-0 rounded-lg bg-market-bg px-2 py-2 text-xs text-market-sub hover:text-market-text"
                >
                  1/4
                </button>
                <button
                  onClick={() => setQty(Math.max(1, spotMax))}
                  className="shrink-0 rounded-lg bg-market-bg px-2 py-2 text-xs text-market-sub hover:text-market-text"
                >
                  全仓
                </button>
              </div>
            </div>
            <div className="flex justify-between border-t border-market-border pt-3 text-market-sub">
              <span>{orderType === 'market' ? '预估金额' : '触发后金额'}</span>
              <span className="font-bold text-market-text tnum">
                ${fmtNumber((orderType === 'market' ? q?.price ?? 0 : price) * qty)}
              </span>
            </div>
            <button
              onClick={submitSpot}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
                side === 'buy' ? 'bg-market-up hover:bg-market-up/90' : 'bg-market-down hover:bg-market-down/90'
              }`}
            >
              {orderType === 'market' ? (side === 'buy' ? `买入 ${asset.symbol}` : `卖出 ${asset.symbol}`) : `挂${orderType === 'limit' ? '限价' : orderType === 'stopLoss' ? '止损' : '止盈'}单`}
            </button>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-1">
              <button
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  cSide === 'long' ? 'bg-market-up text-white' : 'bg-market-bg text-market-sub'
                }`}
                onClick={() => setCSide('long')}
              >
                做多
              </button>
              <button
                className={`rounded-md py-2 text-sm font-semibold transition-colors ${
                  cSide === 'short' ? 'bg-market-down text-white' : 'bg-market-bg text-market-sub'
                }`}
                onClick={() => setCSide('short')}
              >
                做空
              </button>
            </div>
            <div>
              <div className="mb-1 text-xs text-market-sub">杠杆</div>
              <div className="flex gap-1">
                {[2, 5, 10].map((l) => (
                  <button
                    key={l}
                    onClick={() => setLeverage(l)}
                    className={`flex-1 rounded-md py-2 text-sm font-semibold transition-colors ${
                      leverage === l ? 'bg-market-primary text-white' : 'bg-market-bg text-market-sub'
                    }`}
                  >
                    {l}x
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-xs text-market-sub">数量（股）</div>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                className="w-full rounded-lg border border-market-border px-3 py-2 text-market-text outline-none focus:border-market-primary tnum"
              />
            </div>
            <div className="space-y-1.5 border-t border-market-border pt-3 text-market-sub">
              <div className="flex justify-between">
                <span>名义价值</span>
                <span className="font-semibold text-market-text tnum">${fmtNumber((q?.price ?? 0) * qty)}</span>
              </div>
              <div className="flex justify-between">
                <span>保证金</span>
                <span className="font-semibold text-market-text tnum">${fmtNumber(contractMargin)}</span>
              </div>
              <div className="text-[11px] leading-relaxed">
                亏损达保证金将强平（模拟），杠杆越高风险越大，仅作教育演示。
              </div>
            </div>
            <button
              onClick={submitContract}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${
                cSide === 'long' ? 'bg-market-up hover:bg-market-up/90' : 'bg-market-down hover:bg-market-down/90'
              }`}
            >
              开 {leverage}x {cSide === 'long' ? '做多' : '做空'} {asset.symbol}
            </button>

            {myContracts.length > 0 && (
              <div className="rounded-lg bg-market-bg p-3">
                <div className="mb-2 text-xs font-bold text-market-text">我的合约仓位</div>
                <div className="space-y-2">
                  {myContracts.map((c) => {
                    const pnl = c.side === 'long' ? ((q?.price ?? 0) - c.entryPrice) * c.quantity : (c.entryPrice - (q?.price ?? 0)) * c.quantity
                    const pnlPct = c.margin > 0 ? (pnl / c.margin) * 100 : 0
                    return (
                      <div key={c.id} className="rounded-md bg-white p-2 ring-1 ring-market-border/60">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-market-text">
                            {c.leverage}x {c.side === 'long' ? '多' : '空'} {c.symbol}
                          </span>
                          <span className={`font-bold tnum ${pnl >= 0 ? 'text-market-up' : 'text-market-down'}`}>
                            {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}（{pnlPct.toFixed(0)}%）
                          </span>
                        </div>
                        <div className="mt-1 flex items-center justify-between text-[10px] text-market-sub">
                          <span>开仓 ${c.entryPrice.toFixed(2)} · 保证金 ${c.margin.toLocaleString('zh-CN')}</span>
                          <button
                            onClick={() => flash(closeContract(c.id).message)}
                            className="rounded bg-market-down/10 px-2 py-0.5 font-semibold text-market-down hover:bg-market-down/20"
                          >
                            平仓
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        <p className="text-xs leading-relaxed text-market-sub">
          提示：本平台为教育模拟产品，现货与合约均为模拟交易，不构成任何货币或证券交易。
        </p>

        {message && (
          <div className="rounded-lg bg-market-bg px-3 py-2 text-xs font-medium text-market-text">{message}</div>
        )}
      </div>
    </div>
  )
}
