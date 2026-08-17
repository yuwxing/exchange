import { useMemo, useState } from 'react'
import { useEconomy } from '../store/economy'
import { fmtNumber, fmtPct, isUp } from '../utils/format'
import { Sparkline } from '../components/Sparkline'

type SortKey = 'price' | 'changePct' | 'marketCap' | 'dailyRevenue' | 'growthRate' | 'riskLevel'

export default function CompaniesPage() {
  const { companies, portfolio, buyCompany, sellCompany } = useEconomy()
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('all')
  const [sort, setSort] = useState<SortKey>('marketCap')
  const [desc, setDesc] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)
  const [qty, setQty] = useState(10)
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [orderPrice, setOrderPrice] = useState(0)

  const industries = useMemo(() => Array.from(new Set(companies.map((c) => c.industry))), [companies])

  const filtered = useMemo(() => {
    let list = companies.filter(
      (c) =>
        (industry === 'all' || c.industry === industry) &&
        (c.name.toLowerCase().includes(search.toLowerCase()) || c.symbol.toLowerCase().includes(search.toLowerCase())),
    )
    list = [...list].sort((a, b) => {
      const av = a[sort]
      const bv = b[sort]
      const diff = (typeof av === 'number' && typeof bv === 'number' ? av - bv : 0)
      return desc ? -diff : diff
    })
    return list
  }, [companies, industry, search, sort, desc])

  const selectedCompany = companies.find((c) => c.symbol === selected)

  function submit(side: 'buy' | 'sell') {
    if (!selectedCompany) return
    const price = orderType === 'market' ? undefined : orderPrice
    const res = side === 'buy' ? buyCompany(selectedCompany.symbol, qty, orderType, price) : sellCompany(selectedCompany.symbol, qty, orderType, price)
    alert(res.message)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h1 className="text-xl font-black text-market-text">AI Company Market</h1>
        <p className="mt-1 text-sm text-market-sub">模拟 AI 企业资产市场。所有企业均为虚构模拟标的。</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          placeholder="搜索企业 / 代码"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-48 rounded-lg border border-market-border px-3 py-2 text-sm outline-none focus:border-market-primary"
        />
        <select
          value={industry}
          onChange={(e) => setIndustry(e.target.value)}
          className="rounded-lg border border-market-border px-3 py-2 text-sm outline-none focus:border-market-primary"
        >
          <option value="all">全部行业</option>
          {industries.map((i) => (
            <option key={i} value={i}>
              {i}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className="rounded-lg border border-market-border px-3 py-2 text-sm outline-none focus:border-market-primary"
        >
          <option value="marketCap">市值</option>
          <option value="price">价格</option>
          <option value="changePct">24H</option>
          <option value="dailyRevenue">营收</option>
          <option value="growthRate">增长</option>
          <option value="riskLevel">风险</option>
        </select>
        <button
          onClick={() => setDesc((d) => !d)}
          className="rounded-lg bg-white px-3 py-2 text-sm font-medium text-market-text ring-1 ring-market-border hover:bg-market-bg"
        >
          {desc ? '降序' : '升序'}
        </button>
        <div className="ml-auto text-xs text-market-sub">可用 DSU {fmtNumber(portfolio.dsuBalance, 2)}</div>
      </div>

      <div className="overflow-x-auto rounded-xl bg-white shadow-sm ring-1 ring-market-border/60">
        <table className="w-full text-sm">
          <thead className="bg-market-bg text-xs uppercase text-market-sub">
            <tr>
              <th className="px-4 py-3 text-left">企业</th>
              <th className="px-4 py-3 text-left">代码</th>
              <th className="px-4 py-3 text-right">价格</th>
              <th className="px-4 py-3 text-right">24H</th>
              <th className="px-4 py-3 text-right">市值</th>
              <th className="px-4 py-3 text-right">营收</th>
              <th className="px-4 py-3 text-right">增长</th>
              <th className="px-4 py-3 text-right">风险</th>
              <th className="px-4 py-3 text-center">趋势</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((c) => {
              const up = isUp(c.changePct)
              return (
                <tr
                  key={c.symbol}
                  onClick={() => {
                    setSelected(c.symbol)
                    setOrderPrice(c.price)
                  }}
                  className={`cursor-pointer border-t border-market-border/60 transition-colors hover:bg-market-bg ${selected === c.symbol ? 'bg-market-primary/5' : ''}`}
                >
                  <td className="px-4 py-3 font-medium text-market-text">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded bg-market-bg text-xs font-bold">
                        {c.logo}
                      </span>
                      {c.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-market-sub">{c.symbol}</td>
                  <td className="px-4 py-3 text-right font-semibold tnum">{fmtNumber(c.price, 2)}</td>
                  <td className={`px-4 py-3 text-right font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
                    {fmtPct(c.changePct)}
                  </td>
                  <td className="px-4 py-3 text-right tnum">${fmtNumber(c.marketCap / 1e9, 2)}B</td>
                  <td className="px-4 py-3 text-right tnum">${fmtNumber(c.dailyRevenue / 1e6, 2)}M</td>
                  <td className="px-4 py-3 text-right tnum text-market-up">+{c.growthRate}%</td>
                  <td className="px-4 py-3 text-right tnum">{'★'.repeat(c.riskLevel)}{'☆'.repeat(5 - c.riskLevel)}</td>
                  <td className="px-4 py-3">
                    <div className="h-8 w-20">
                      <Sparkline data={c.history} color={up ? '#16a34a' : '#dc2626'} />
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {selectedCompany && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-market-text">
                {selectedCompany.logo} {selectedCompany.name} ({selectedCompany.symbol})
              </h3>
              <p className="text-xs text-market-sub">{selectedCompany.industry} · {selectedCompany.description}</p>
              <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
                <div className="rounded bg-market-bg p-2">
                  <div className="text-[10px] text-market-sub">市值</div>
                  <div className="font-semibold tnum">${fmtNumber(selectedCompany.marketCap / 1e9, 2)}B</div>
                </div>
                <div className="rounded bg-market-bg p-2">
                  <div className="text-[10px] text-market-sub">DSU 储备</div>
                  <div className="font-semibold tnum">{fmtNumber(selectedCompany.dsuReserve, 0)}</div>
                </div>
                <div className="rounded bg-market-bg p-2">
                  <div className="text-[10px] text-market-sub">日利润</div>
                  <div className="font-semibold tnum">${fmtNumber(selectedCompany.dailyProfit, 0)}</div>
                </div>
              </div>
            </div>
            <div className="w-full max-w-sm rounded-lg bg-market-bg p-4">
              <div className="mb-2 text-xs font-semibold text-market-text">模拟交易</div>
              <div className="mb-2 flex gap-2">
                <input
                  type="number"
                  value={qty}
                  onChange={(e) => setQty(Number(e.target.value))}
                  className="w-20 rounded border border-market-border px-2 py-1 text-sm"
                  min={1}
                />
                <select
                  value={orderType}
                  onChange={(e) => setOrderType(e.target.value as 'market' | 'limit')}
                  className="rounded border border-market-border px-2 py-1 text-sm"
                >
                  <option value="market">市价</option>
                  <option value="limit">限价</option>
                </select>
                {orderType === 'limit' && (
                  <input
                    type="number"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(Number(e.target.value))}
                    className="w-24 rounded border border-market-border px-2 py-1 text-sm"
                    placeholder="价格"
                  />
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => submit('buy')}
                  className="flex-1 rounded bg-market-up py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  买入
                </button>
                <button
                  onClick={() => submit('sell')}
                  className="flex-1 rounded bg-market-down py-2 text-sm font-semibold text-white hover:opacity-90"
                >
                  卖出
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
