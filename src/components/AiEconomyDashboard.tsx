import { useEconomy } from '../store/economy'
import { fmtNumber, fmtPct, isUp } from '../utils/format'
import { Sparkline } from './Sparkline'

function MetricCard({
  label,
  value,
  change,
  sub,
  prefix = '',
  suffix = '',
  fixed = 2,
  compact = false,
  data,
}: {
  label: string
  value: number
  change?: number
  sub?: string
  prefix?: string
  suffix?: string
  fixed?: number
  compact?: boolean
  data?: number[]
}) {
  const vText = compact ? fmtNumber(value, 0) : fmtNumber(value, fixed)
  const up = change !== undefined ? isUp(change) : true
  return (
    <div className="rounded-lg border border-market-border bg-market-bg p-3 transition-colors hover:border-market-primary/30">
      <div className="text-xs text-market-sub">{label}</div>
      <div className="mt-1 text-lg font-bold text-market-text tnum sm:text-xl">
        {prefix}
        {vText}
        {suffix}
      </div>
      {change !== undefined && (
        <div className={`text-xs font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
          {fmtPct(change)}
        </div>
      )}
      {sub && <div className="text-[10px] text-market-sub">{sub}</div>}
      {data && data.length > 1 && (
        <div className="mt-2 h-8">
          <Sparkline data={data} color={up ? '#16a34a' : '#dc2626'} />
        </div>
      )}
    </div>
  )
}

export default function AiEconomyDashboard() {
  const { economyIndex, prevEconomyIndex, dsu, weg, agg } = useEconomy()
  const idxChange = prevEconomyIndex > 0 ? (economyIndex - prevEconomyIndex) / prevEconomyIndex : 0

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-bold text-market-text">AI Economy Dashboard</h2>
        <span className="text-xs text-market-sub">模拟经济实时指标 · 每 2.5s 更新</span>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="AI Economy Index" value={economyIndex} change={idxChange} />
        <MetricCard label="DSU Index" value={dsu.price} sub={`AI Production ${dsu.aiProductionIndex}`} fixed={4} />
        <MetricCard label="WEG" value={weg.price} change={weg.changePct} prefix="$" data={weg.history} />
        <MetricCard label="AI Market Cap" value={agg.marketCap / 1e9} prefix="$" suffix="B" fixed={2} />
        <MetricCard label="AI Workers" value={agg.workers} compact />
        <MetricCard label="AI Companies" value={agg.companies} compact />
        <MetricCard label="AI Transactions" value={agg.transactions} compact />
        <MetricCard label="Platform Users" value={agg.users} compact />
      </div>
    </section>
  )
}
