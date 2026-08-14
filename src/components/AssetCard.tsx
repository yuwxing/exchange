import { useNavigate } from 'react-router-dom'
import type { Asset } from '../types'
import { useMarket } from '../store/market'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import { SECTORS } from '../data/assets'
import { Sparkline } from './Sparkline'
import { typeBadge, typeName } from '../utils/assetType'

export default function AssetCard({ asset }: { asset: Asset }) {
  const q = useMarket((s) => s.quotes[asset.symbol])
  const candles = useMarket((s) => s.candles[asset.symbol])
  const navigate = useNavigate()
  if (!q) return null

  const up = isUp(q.change)
  const sec = SECTORS.find((s) => s.id === asset.sectorId)
  const data = (candles ?? []).slice(-20).map((c) => c.close)

  return (
    <div
      className="group cursor-pointer rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60 transition-all hover:-translate-y-0.5 hover:shadow-md"
      onClick={() => navigate(`/asset/${asset.symbol}`)}
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-market-text">{asset.symbol}</span>
            {asset.isWeg && (
              <span className="rounded bg-market-primary/10 px-1 py-0.5 text-[10px] font-bold text-market-primary">
                生态积分资产
              </span>
            )}
          </div>
          <div className="mt-0.5 text-xs text-market-sub">
            {asset.name}
            <span className="ml-1">{sec?.symbol}</span>
          </div>
        </div>
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-market-bg text-[11px] font-bold text-market-sub">
          {asset.symbol.slice(0, 1)}
        </div>
      </div>

      <div className="mt-3 flex items-end justify-between">
        <div>
          <div className={`text-xl font-bold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
            ${fmtNumber(q.price)}
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
        <div className="flex items-center gap-1.5">
          <span className={`rounded px-1 py-0.5 text-[9px] font-bold ${typeBadge(asset.type)}`}>
            {typeName(asset.type)}
          </span>
          <span>市值 ${fmtCompact(asset.marketCap)}</span>
        </div>
        <span className="rounded bg-market-primary/10 px-1.5 py-0.5 font-semibold text-market-primary">
          AI {asset.aiValue}
        </span>
      </div>
    </div>
  )
}
