import { useEconomy } from '../store/economy'

export default function EconomicEvents() {
  const { events, triggerEvent } = useEconomy()
  const active = events.filter((e) => e.active)
  const recent = events.filter((e) => !e.active).slice(0, 4)

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-market-text">AI Economic Events</h2>
        <div className="flex items-center gap-2">
          <span className="hidden text-xs text-market-sub sm:inline">影响 AI 经济引擎的模拟事件</span>
          <button
            onClick={() => {
              const result = triggerEvent()
              if (!result.ok) window.alert(result.message)
            }}
            className="rounded-lg bg-market-primary px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-market-primary-hover"
          >
            触发事件
          </button>
        </div>
      </div>
      {active.length > 0 && (
        <div className="mb-3 flex items-center gap-2 text-xs text-market-sub">
          <span className="h-2 w-2 animate-pulse rounded-full bg-market-up" />
          当前有 {active.length} 个事件正在影响市场，剩余周期随行情 tick 衰减
        </div>
      )}
      {active.length === 0 && recent.length === 0 ? (
        <p className="text-sm text-market-sub">暂无事件</p>
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {active.map((e) => (
            <div key={e.id} className="rounded-lg border-l-4 border-market-up bg-emerald-50/50 p-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-market-up" />
                <span className="text-sm font-semibold text-market-text">{e.title}</span>
              </div>
              <p className="mt-1 text-xs text-market-sub">{e.description}</p>
              <div className="mt-1 text-[10px] text-market-sub">
                目标 {e.impact.target} · 指标 {e.impact.metric} · 影响 {e.impact.magnitude > 0 ? '+' : ''}
                {e.impact.magnitude}%
              </div>
            </div>
          ))}
          {recent.map((e) => (
            <div key={e.id} className="rounded-lg bg-market-bg p-3 opacity-70">
              <div className="text-sm font-medium text-market-text">{e.title}</div>
              <p className="text-xs text-market-sub">{e.description}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
