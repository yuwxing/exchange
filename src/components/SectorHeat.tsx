import type { WhaleFlow } from '../types'

/** 板块温度计：由板块涨跌 + 巨鲸净流入推算热度 0-100 */
export default function SectorHeat({ pct, flows }: { pct: number; flows: WhaleFlow[] }) {
  const netInflow = flows.reduce((a, f) => a + (f.direction === 'long' ? f.amount : -f.amount), 0)
  const v = Math.round(Math.min(95, Math.max(5, 50 + pct * 2600 + netInflow / 1e9)))
  const label = v >= 75 ? '过热' : v >= 55 ? '偏热' : v >= 45 ? '中性' : v >= 25 ? '偏冷' : '冰冷'
  const color =
    v >= 75 ? 'bg-market-down' : v >= 55 ? 'bg-orange-500' : v >= 45 ? 'bg-amber-400' : v >= 25 ? 'bg-sky-400' : 'bg-market-down/70'
  return (
    <div className="flex items-center gap-1.5" title={`板块温度 ${v} · ${label}（涨跌+巨鲸流入推算）`}>
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-market-bg">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${v}%` }} />
      </div>
      <span
        className={`text-[10px] font-bold ${
          v >= 75 ? 'text-market-down' : v >= 55 ? 'text-orange-600' : v >= 45 ? 'text-amber-600' : 'text-sky-600'
        }`}
      >
        {label}
      </span>
    </div>
  )
}
