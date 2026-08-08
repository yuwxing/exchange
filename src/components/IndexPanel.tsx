import { useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { fmtNumber, fmtCompact, isUp } from '../utils/format'
import { PriceText } from './PriceText'

export default function IndexPanel() {
  const ai100 = useMarket((s) => s.ai100)
  const sectors = useMarket((s) => s.sectors)
  const quotes = useMarket((s) => s.quotes)
  const eco = useMarket((s) => s.eco)
  const marketOpen = useMarket((s) => s.marketOpen)
  const navigate = useNavigate()

  const changePct = (ai100.value - ai100.prev) / ai100.prev
  const up = isUp(changePct)
  const totalVolume = Object.values(quotes).reduce((a, q) => a + q.volume, 0)
  const totalCap = Object.values(quotes).reduce(
    (a, q) => a + q.price * 1000000,
    0,
  )

  const sectorsList = [
    { id: 'foundation', name: '基础模型' },
    { id: 'agent', name: 'Agent生态' },
    { id: 'education', name: '教育AI' },
    { id: 'robot', name: '机器人' },
  ]

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-market-sub">
            <span className="font-medium">AI Exchange 行情</span>
            <span className="text-xs">模拟交易中</span>
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-market-up" />
          </div>
          <div className="mt-2 flex items-baseline gap-3">
            <span className="text-4xl font-bold text-market-text tnum">
              {fmtNumber(ai100.value)}
            </span>
            <span
              className={`text-xl font-semibold tnum ${
                up ? 'text-market-up' : 'text-market-down'
              }`}
            >
              {up ? '+' : ''}
              {(changePct * 100).toFixed(2)}%
            </span>
          </div>
          <div className="mt-1 text-sm text-market-sub">
            成分股 <span className="tnum">{Object.keys(quotes).length}</span> · 总市值 ¥
            <span className="tnum">{fmtCompact(totalCap)}</span> · 成交额 ¥
            <span className="tnum">{fmtCompact(totalVolume)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {sectorsList.map((sec) => {
            const v = sectors[sec.id]
            const pct = v ? (v.value - v.prev) / v.prev : 0
            return (
              <div
                key={sec.id}
                className="rounded-lg border border-market-border bg-market-bg px-3 py-2"
              >
                <div className="text-xs text-market-sub">{sec.name}</div>
                <div className="mt-0.5 text-sm font-bold text-market-text tnum">
                  {v ? fmtNumber(v.value, 1) : '--'}
                </div>
                <PriceText value={pct} className="text-xs" digits={2} />
              </div>
            )
          })}
          <div
            className="cursor-pointer rounded-lg border border-market-border bg-market-bg px-3 py-2"
            onClick={() => navigate('/weg')}
          >
            <div className="flex items-center gap-1.5 text-xs text-market-sub">
              <span>WEG</span>
              <span
                className={`inline-block h-1.5 w-1.5 rounded-full ${
                  marketOpen ? 'bg-market-up' : 'bg-market-bg'
                } ring-1 ring-market-border`}
                title={marketOpen ? '交易中' : '已收盘'}
              />
            </div>
            <div className="mt-0.5 text-sm font-bold text-market-text tnum">
              ¥{eco.wegPrice.toFixed(2)}
            </div>
            <PriceText
              value={(eco.wegPrice - eco.wegPrev) / eco.wegPrev}
              className="text-xs"
              digits={2}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
