import { Link } from 'react-router-dom'
import { useMarket } from '../store/market'
import { fmtNumber, isUp } from '../utils/format'

export default function Portfolio() {
  const account = useMarket((s) => s.account)
  const quotes = useMarket((s) => s.quotes)
  const allAssets = useMarket((s) => s.allAssets)
  const resetAccount = useMarket((s) => s.resetAccount)
  const contracts = useMarket((s) => s.contracts)
  const openOrders = useMarket((s) => s.openOrders)
  const closeContract = useMarket((s) => s.closeContract)
  const cancelOrder = useMarket((s) => s.cancelOrder)
  const assets = allAssets()

  const holdingsDetail = account.holdings.map((h) => {
    const q = quotes[h.symbol]
    const marketValue = q ? q.price * h.quantity : h.avgCost * h.quantity
    const cost = h.avgCost * h.quantity
    const pl = marketValue - cost
    const plPct = cost > 0 ? pl / cost : 0
    return { ...h, q, marketValue, cost, pl, plPct }
  })

  const stockValue = holdingsDetail.reduce((a, b) => a + b.marketValue, 0)
  const totalAssets = account.cash + stockValue
  const totalPl = stockValue - holdingsDetail.reduce((a, b) => a + b.cost, 0)
  const totalPlPct = totalAssets > 0 ? (totalAssets - 1000000) / 1000000 : 0
  const up = isUp(totalPl)

  const expNext = account.level * 500
  const expProgress = Math.min(100, (account.experience / expNext) * 100)

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-market-text">我的资产</h1>
            <p className="mt-0.5 text-sm text-market-sub">
              模拟账户 · USDT 100,000 · WEG 10,000 · AI 信用 100 · 数据保存在本地
            </p>
          </div>
          <button
            onClick={() => {
              if (confirm('确定要重置模拟账户吗？将清空持仓与历史记录。')) resetAccount()
            }}
            className="rounded-lg border border-market-border px-3 py-1.5 text-xs text-market-sub hover:border-market-down hover:text-market-down"
          >
            重置账户
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">总资产</div>
            <div className="mt-1 text-2xl font-bold text-market-text tnum">
              ${fmtNumber(totalAssets)}
            </div>
          </div>
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">可用资金</div>
            <div className="mt-1 text-2xl font-bold text-market-text tnum">
              ${fmtNumber(account.cash)}
            </div>
          </div>
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">持仓市值</div>
            <div className="mt-1 text-2xl font-bold text-market-text tnum">
              ${fmtNumber(stockValue)}
            </div>
          </div>
          <div className={`rounded-lg p-4 ${up ? 'bg-market-up/10' : 'bg-market-down/10'}`}>
            <div className="text-xs text-market-sub">总盈亏</div>
            <div
              className={`mt-1 text-2xl font-bold tnum ${up ? 'text-market-up' : 'text-market-down'}`}
            >
              {up ? '+' : ''}
              {fmtNumber(totalPl)}（{(totalPlPct * 100).toFixed(2)}%）
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">WEG 余额（生态积分）</div>
            <div className="mt-1 text-xl font-bold text-market-text tnum">{fmtNumber(account.wegBalance)} WEG</div>
          </div>
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">AI 信用</div>
            <div className="mt-1 text-xl font-bold text-market-primary tnum">{account.aiCredit}</div>
          </div>
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">贡献等级</div>
            <div className="mt-1 text-xl font-bold text-market-text tnum">Lv.{account.level}</div>
          </div>
          <div className="rounded-lg bg-market-bg p-4">
            <div className="text-xs text-market-sub">累计贡献</div>
            <div className="mt-1 text-xl font-bold text-market-text tnum">{fmtNumber(account.totalEarned)} WEG</div>
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg border border-market-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-market-primary text-sm font-bold text-white">
              {account.level}
            </div>
            <div>
              <div className="text-sm font-bold text-market-text">贡献等级 Lv.{account.level}</div>
              <div className="text-xs text-market-sub">
                经验 {account.experience}/{expNext} · 完成任务赚取 WEG 与 AI 信用
              </div>
            </div>
          </div>
          <div className="h-2 w-32 overflow-hidden rounded-full bg-market-bg">
            <div
              className="h-full rounded-full bg-gradient-to-r from-market-primary to-market-primary-hover"
              style={{ width: `${expProgress}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
        <div className="border-b border-market-border px-5 py-3">
          <h2 className="text-base font-bold text-market-text">我的持仓（{holdingsDetail.length}）</h2>
        </div>
        {holdingsDetail.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <div className="text-3xl">📭</div>
            <p className="mt-2 text-sm text-market-sub">暂无持仓</p>
            <Link
              to="/assets"
              className="mt-3 inline-block rounded-lg bg-market-primary px-4 py-2 text-sm font-medium text-white hover:bg-market-primary-hover"
            >
              去 AI 资产市场看看
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-market-bg/50 text-left text-xs text-market-sub">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">标的</th>
                  <th className="px-3 py-2.5 text-right font-semibold">持仓/成本</th>
                  <th className="px-3 py-2.5 text-right font-semibold">现价</th>
                  <th className="px-3 py-2.5 text-right font-semibold">市值</th>
                  <th className="px-5 py-2.5 text-right font-semibold">浮动盈亏</th>
                </tr>
              </thead>
              <tbody>
                {holdingsDetail.map((h) => {
                  const isWeg = assets.find((s) => s.symbol === h.symbol)?.isWeg
                  const up = isUp(h.pl)
                  return (
                    <tr key={h.symbol} className="border-t border-market-border/60">
                      <td className="px-5 py-3">
                        <Link
                          to={`/asset/${h.symbol}`}
                          className="text-sm font-bold text-market-text hover:text-market-primary"
                        >
                          {h.symbol}
                        </Link>
                        <div className="text-xs text-market-sub">
                          {h.name}
                          {isWeg && <span className="ml-1 text-market-primary">· 生态</span>}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-market-sub tnum">
                        {h.quantity} 股
                        <div className="text-xs">成本 ${h.avgCost.toFixed(2)}</div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-market-text tnum">
                        ${h.q ? h.q.price.toFixed(2) : '--'}
                      </td>
                      <td className="px-3 py-3 text-right text-sm font-semibold text-market-text tnum">
                        ${fmtNumber(h.marketValue)}
                      </td>
                      <td
                        className={`px-5 py-3 text-right text-sm font-semibold tnum ${
                          up ? 'text-market-up' : 'text-market-down'
                        }`}
                      >
                        {up ? '+' : ''}
                        {fmtNumber(h.pl)}（{(h.plPct * 100).toFixed(2)}%）
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 合约仓位 */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
        <div className="border-b border-market-border px-5 py-3">
          <h2 className="text-base font-bold text-market-text">合约仓位（{contracts.length}）· 模拟杠杆</h2>
        </div>
        {contracts.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-market-sub">
            暂无合约仓位，可在资产详情页选择「合约」模式开仓（2x / 5x / 10x）
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-market-bg/50 text-left text-xs text-market-sub">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">标的</th>
                  <th className="px-3 py-2.5 text-right font-semibold">方向/杠杆</th>
                  <th className="px-3 py-2.5 text-right font-semibold">开仓价</th>
                  <th className="px-3 py-2.5 text-right font-semibold">保证金</th>
                  <th className="px-3 py-2.5 text-right font-semibold">浮动盈亏</th>
                  <th className="px-5 py-2.5 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {contracts.map((c) => {
                  const q = quotes[c.symbol]
                  const pnl = q
                    ? c.side === 'long'
                      ? (q.price - c.entryPrice) * c.quantity
                      : (c.entryPrice - q.price) * c.quantity
                    : 0
                  const pnlPct = c.margin > 0 ? (pnl / c.margin) * 100 : 0
                  const up = isUp(pnl)
                  return (
                    <tr key={c.id} className="border-t border-market-border/60">
                      <td className="px-5 py-3">
                        <Link to={`/asset/${c.symbol}`} className="text-sm font-bold text-market-text hover:text-market-primary">
                          {c.symbol}
                        </Link>
                        <div className="text-xs text-market-sub">{c.name}</div>
                      </td>
                      <td className="px-3 py-3 text-right text-sm tnum">
                        <span className={`font-bold ${c.side === 'long' ? 'text-market-up' : 'text-market-down'}`}>
                          {c.side === 'long' ? '做多' : '做空'} {c.leverage}x
                        </span>
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-market-sub tnum">${c.entryPrice.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-sm text-market-sub tnum">${fmtNumber(c.margin)}</td>
                      <td className={`px-3 py-3 text-right text-sm font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
                        {up ? '+' : ''}
                        {fmtNumber(pnl)}（{pnlPct.toFixed(1)}%）
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => closeContract(c.id)}
                          className="rounded bg-market-down/10 px-2.5 py-1 text-xs font-semibold text-market-down hover:bg-market-down/20"
                        >
                          平仓
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 挂单 */}
      <div className="rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
        <div className="border-b border-market-border px-5 py-3">
          <h2 className="text-base font-bold text-market-text">挂单（{openOrders.filter((o) => o.status === 'pending').length}）· 限价 / 止损 / 止盈</h2>
        </div>
        {openOrders.filter((o) => o.status === 'pending').length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-market-sub">
            暂无挂单，可在资产详情页使用「限价 / 止损 / 止盈」挂单
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px]">
              <thead className="bg-market-bg/50 text-left text-xs text-market-sub">
                <tr>
                  <th className="px-5 py-2.5 font-semibold">标的</th>
                  <th className="px-3 py-2.5 font-semibold">类型</th>
                  <th className="px-3 py-2.5 text-right font-semibold">方向</th>
                  <th className="px-3 py-2.5 text-right font-semibold">触发价</th>
                  <th className="px-3 py-2.5 text-right font-semibold">数量</th>
                  <th className="px-5 py-2.5 text-right font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {openOrders
                  .filter((o) => o.status === 'pending')
                  .map((o) => (
                    <tr key={o.id} className="border-t border-market-border/60">
                      <td className="px-5 py-3">
                        <Link to={`/asset/${o.symbol}`} className="text-sm font-bold text-market-text hover:text-market-primary">
                          {o.symbol}
                        </Link>
                      </td>
                      <td className="px-3 py-3 text-sm text-market-sub">
                        {o.kind === 'limit' ? '限价' : o.kind === 'stopLoss' ? '止损' : '止盈'}
                      </td>
                      <td className={`px-3 py-3 text-right text-sm font-semibold ${o.side === 'buy' ? 'text-market-up' : 'text-market-down'}`}>
                        {o.side === 'buy' ? '买入' : '卖出'}
                      </td>
                      <td className="px-3 py-3 text-right text-sm text-market-sub tnum">${o.price.toFixed(2)}</td>
                      <td className="px-3 py-3 text-right text-sm text-market-sub tnum">{o.quantity} 股</td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => cancelOrder(o.id)}
                          className="rounded bg-market-bg px-2.5 py-1 text-xs font-semibold text-market-sub hover:text-market-down"
                        >
                          撤单
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
          <div className="border-b border-market-border px-5 py-3">
            <h2 className="text-base font-bold text-market-text">交易记录</h2>
          </div>
          {account.orders.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-market-sub">暂无交易记录</p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {account.orders.slice(0, 50).map((o) => (
                <div
                  key={o.id}
                  className="flex items-center justify-between border-b border-market-border/50 px-5 py-2.5 text-sm last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        o.side === 'buy'
                          ? 'bg-market-up/10 text-market-up'
                          : 'bg-market-down/10 text-market-down'
                      }`}
                    >
                      {o.side === 'buy' ? '买入' : '卖出'}
                    </span>
                    <span className="font-semibold text-market-text">{o.symbol}</span>
                    <span className="text-xs text-market-sub">
                      {o.quantity} 股 @ ${o.price.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-market-text tnum">${fmtNumber(o.amount)}</div>
                    <div className="text-[10px] text-market-sub">{o.time}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
          <div className="border-b border-market-border px-5 py-3">
            <h2 className="text-base font-bold text-market-text">AI 贡献记录</h2>
          </div>
          {account.contributions.length === 0 ? (
            <p className="px-5 py-8 text-center text-sm text-market-sub">
              尚未产生贡献记录，去
              <Link to="/weg" className="text-market-primary hover:underline"> WEG 生态 </Link>
              领取吧
            </p>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {account.contributions.slice(0, 50).map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between border-b border-market-border/50 px-5 py-2.5 text-sm last:border-0"
                >
                  <div>
                    <div className="text-market-text">{c.action}</div>
                    <div className="text-[10px] text-market-sub">{c.time}</div>
                  </div>
                  <span className="font-bold text-market-primary tnum">+{c.reward} WEG</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
