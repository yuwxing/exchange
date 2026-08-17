import { useEconomy } from '../store/economy'
import { fmtNumber, fmtPct, isUp } from '../utils/format'

export default function EconomyRanking() {
  const { companies, workers } = useEconomy()
  const topCompanies = [...companies].sort((a, b) => b.changePct - a.changePct).slice(0, 5)
  const topWorkers = [...workers].sort((a, b) => b.roi - a.roi).slice(0, 5)

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-market-text">AI Economy Ranking</h2>
        <span className="text-xs text-market-sub">模拟排行榜</span>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 text-xs font-semibold text-market-sub">Top AI Companies</div>
          <div className="space-y-2">
            {topCompanies.map((c, i) => {
              const up = isUp(c.changePct)
              return (
                <div key={c.symbol} className="flex items-center justify-between rounded-lg bg-market-bg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] font-bold text-market-sub">
                      {i + 1}
                    </span>
                    <span className="text-sm font-medium text-market-text">{c.name}</span>
                  </div>
                  <span className={`text-sm font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
                    {fmtPct(c.changePct)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <div>
          <div className="mb-2 text-xs font-semibold text-market-sub">Top AI Workers</div>
          <div className="space-y-2">
            {topWorkers.map((w, i) => (
              <div key={w.id} className="flex items-center justify-between rounded-lg bg-market-bg px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-5 w-5 items-center justify-center rounded bg-white text-[10px] font-bold text-market-sub">
                    {i + 1}
                  </span>
                  <span className="text-sm font-medium text-market-text">{w.name}</span>
                </div>
                <span className="text-sm font-semibold tnum text-market-up">{fmtNumber(w.roi, 1)}% ROI</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
