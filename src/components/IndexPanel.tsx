import { useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { fmtNumber, fmtCompact, isUp } from '../utils/format'
import { PriceText } from './PriceText'
import { SECTORS } from '../data/assets'

export default function IndexPanel() {
  const indices = useMarket((s) => s.indices)
  const sectors = useMarket((s) => s.sectors)
  const quotes = useMarket((s) => s.quotes)
  const allAssets = useMarket((s) => s.allAssets)
  const account = useMarket((s) => s.account)
  const navigate = useNavigate()

  const ai100 = indices.ai100
  const changePct = ai100 && ai100.prev > 0 ? (ai100.value - ai100.prev) / ai100.prev : 0
  const up = isUp(changePct)
  const totalVolume = Object.values(quotes).reduce((a, q) => a + q.volume, 0)
  const totalCap = allAssets().reduce((a, asset) => a + (quotes[asset.symbol]?.price ?? asset.basePrice) * 1000000, 0)

  // 展示权重最高的 5 个板块 + 指数入口
  const topSectors = [...SECTORS]
    .filter((s) => s.id !== 'index')
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 5)

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
              {fmtNumber(ai100?.value ?? 0)}
            </span>
            <span className={`text-xl font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
              {up ? '+' : ''}
              {(changePct * 100).toFixed(2)}%
            </span>
          </div>
          <div className="mt-1 text-sm text-market-sub">
            成分股 <span className="tnum">{allAssets().length}</span> · 总市值 $
            <span className="tnum">{fmtCompact(totalCap)}</span> · 成交额 $
            <span className="tnum">{fmtCompact(totalVolume)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {topSectors.map((sec) => {
            const v = sectors[sec.id]
            const pct = v && v.prev > 0 ? (v.value - v.prev) / v.prev : 0
            return (
              <div
                key={sec.id}
                className="cursor-pointer rounded-lg border border-market-border bg-market-bg px-3 py-2 transition-colors hover:border-market-primary/50"
                onClick={() => navigate(`/assets?sector=${sec.id}`)}
                title={sec.desc}
              >
                <div className="text-xs text-market-sub">
                  {sec.symbol} {sec.name}
                </div>
                <div className="mt-0.5 text-sm font-bold text-market-text tnum">
                  {v ? fmtNumber(v.value, 1) : '--'}
                </div>
                <PriceText value={pct} className="text-xs" digits={2} />
              </div>
            )
          })}
          <div
            className="cursor-pointer rounded-lg border border-market-border bg-market-bg px-3 py-2"
            onClick={() => navigate('/index')}
            title="指数中心"
          >
            <div className="text-xs text-market-sub">🧮 指数中心</div>
            <div className="mt-0.5 text-sm font-bold text-market-text">AI10 · AI50</div>
            <PriceText value={pctOf(indices.ai10)} className="text-xs" digits={2} />
          </div>
          <div
            className="cursor-pointer rounded-lg border border-market-border bg-market-bg px-3 py-2"
            onClick={() => navigate('/weg')}
            title="AI 劳动力市场 · WEG 贡献积分"
          >
            <div className="flex items-center gap-1.5 text-xs text-market-sub">
              <span>🧑‍💻 WEG 贡献积分</span>
            </div>
            <div className="mt-0.5 text-sm font-bold text-market-text tnum">
              {fmtNumber(account.wegBalance, 0)}
            </div>
            <div className="text-[11px] text-market-sub">AI 劳动力市场</div>
          </div>
        </div>
      </div>
    </div>
  )
}

function pctOf(v?: { value: number; prev: number }) {
  return v && v.prev > 0 ? (v.value - v.prev) / v.prev : 0
}
