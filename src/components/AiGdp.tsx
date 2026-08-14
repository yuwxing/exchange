import { useMarket } from '../store/market'
import { fmtNumber } from '../utils/format'

/** AI GDP 总览卡：经济总量 + 板块构成 + 经济活动分解（浅色系） */
export default function AiGdp() {
  const gdp = useMarket((s) => s.gdp)

  if (!gdp) return null

  const up = gdp.growth >= 0
  const trendUp = gdp.trend >= 0
  const maxShare = Math.max(...gdp.sectors.map((s) => s.share))

  return (
    <section className="overflow-hidden rounded-xl bg-gradient-to-br from-white via-white to-sky-50 p-5 shadow-sm ring-1 ring-market-border/60">
      {/* 头部：总量 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-indigo-100 text-xl ring-1 ring-indigo-200">🏦</span>
            <div>
              <h2 className="text-base font-bold leading-tight text-market-text">AI GDP · 全球 AI 经济总量</h2>
              <p className="text-[11px] text-market-sub">AI Economy · 模拟核算</p>
            </div>
          </div>
          <div className="mt-3 flex items-end gap-3">
            <span className="font-mono text-4xl font-black tracking-tight text-slate-900">
              ${fmtNumber(gdp.total, 2)}T
            </span>
            <span
              className={`mb-1 rounded-md px-2 py-0.5 font-mono text-sm font-bold ${
                up ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200' : 'bg-rose-100 text-rose-700 ring-1 ring-rose-200'
              }`}
            >
              {up ? '▲' : '▼'} {up ? '+' : ''}
              {gdp.growth.toFixed(1)}%
            </span>
            <span className="mb-1 text-[11px] text-market-sub">同比增速</span>
          </div>
          <p className="mt-1.5 text-xs text-market-sub">
            环比 <span className={`font-mono ${trendUp ? 'text-emerald-600' : 'text-rose-500'}`}>{trendUp ? '+' : ''}{gdp.trend.toFixed(2)}%</span>
            {' · '}更新于 {gdp.updatedAt}
          </p>
        </div>
        <div className="hidden max-w-[240px] text-right sm:block">
          <p className="text-[11px] leading-relaxed text-market-sub">
            模型 / 智能体 / 应用 / 算力 / 机器人 / 技能 ——
            六大 AI 产业共同创造的经济总量。
          </p>
          <p className="mt-1.5 text-[10px] text-slate-400">模拟数据，仅用于教育演示</p>
        </div>
      </div>

      {/* 板块构成：堆叠条 + 明细 */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">GDP 板块构成</h3>
          <span className="text-[10px] text-slate-400">按市场板块核算</span>
        </div>
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/60">
          {gdp.sectors.map((s) => (
            <div
              key={s.id}
              title={`${s.label} ${s.share}%`}
              className="h-full transition-all duration-700"
              style={{ width: `${(s.share / maxShare) * 100}%`, backgroundColor: s.color, opacity: 0.75 + (s.share / 100) * 1.5 }}
            />
          ))}
        </div>
        <div className="mt-3 space-y-1.5">
          {gdp.sectors.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 text-sm">
              <span className="w-5 text-center">{s.icon}</span>
              <span className="w-36 shrink-0 truncate text-slate-700">{s.name}</span>
              <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${(s.share / 100) * 100}%`, backgroundColor: s.color }} />
              </div>
              <span className="w-14 text-right font-mono text-slate-600">{s.share.toFixed(1)}%</span>
              <span className="w-20 text-right font-mono text-slate-500">${fmtNumber(s.value, 2)}T</span>
              <span className={`w-14 text-right font-mono text-xs ${s.trend >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
                {s.trend >= 0 ? '+' : ''}
                {s.trend.toFixed(1)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 经济活动分解：AI GDP 分支 */}
      <div className="mt-5 rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200/70">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-600">AI GDP 经济活动分解</h3>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {gdp.categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200/60">
              <span className="text-lg">{c.icon}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-slate-800">
                    {c.label}
                    <span className="ml-1.5 text-[10px] font-normal text-slate-400">{c.name}</span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-600">
                    ${fmtNumber(c.value, 2)}T · {c.share}%
                  </span>
                </div>
                <p className="truncate text-[11px] text-slate-400">{c.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
