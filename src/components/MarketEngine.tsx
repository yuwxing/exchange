import { useEffect, useRef, useState } from 'react'
import { useMarket } from '../store/market'
import { ENGINE_STAGES } from '../ai/marketEngine'
import type { EngineStageId } from '../types'

type Phase = 'idle' | 'running' | 'done'

const STAGE_DELAY = 480 // 每阶段点亮间隔 ms
const STAGE_RUN_MS = 380 // 阶段运行→完成 ms

/** AI Market Engine 控制台：七阶段端到端流水线 */
export default function MarketEngine() {
  const engineRun = useMarket((s) => s.engineRun)
  const runEngine = useMarket((s) => s.runEngine)
  const [phase, setPhase] = useState<Record<EngineStageId, Phase>>(
    () => Object.fromEntries(ENGINE_STAGES.map((s) => [s.id, 'idle'])) as Record<EngineStageId, Phase>,
  )
  const [running, setRunning] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), [])

  const run = () => {
    if (running) return
    setRunning(true)
    setPhase(Object.fromEntries(ENGINE_STAGES.map((s) => [s.id, 'idle'])) as Record<EngineStageId, Phase>)
    ENGINE_STAGES.forEach((stage, idx) => {
      timers.current.push(
        window.setTimeout(() => {
          setPhase((prev) => ({ ...prev, [stage.id]: 'running' }))
          timers.current.push(
            window.setTimeout(() => {
              setPhase((prev) => ({ ...prev, [stage.id]: 'done' }))
              if (idx === ENGINE_STAGES.length - 1) {
                runEngine()
                setRunning(false)
              }
            }, STAGE_RUN_MS),
          )
        }, idx * STAGE_DELAY),
      )
    })
  }

  const signal = engineRun?.signal
  const signalUp = (signal?.score ?? 50) >= 45

  return (
    <section className="overflow-hidden rounded-xl bg-gradient-to-br from-white via-sky-50/60 to-indigo-50/60 p-5 shadow-sm ring-1 ring-market-border/60">
      {/* 头部 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-100 text-xl ring-1 ring-sky-200">⚙️</span>
          <div>
            <h2 className="text-base font-bold leading-tight text-market-text">AI Market Engine</h2>
            <p className="text-[11px] text-market-sub">7-Stage Pipeline · AI 金融系统核心</p>
          </div>
        </div>
        <button
          onClick={run}
          disabled={running}
          className="rounded-lg bg-gradient-to-r from-sky-500 to-indigo-500 px-4 py-2 text-sm font-bold text-white shadow transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? '引擎运行中…' : '⚡ 运行引擎'}
        </button>
      </div>

      {/* 流水线 */}
      <div className="mt-4 flex flex-wrap items-center gap-y-2 rounded-xl bg-market-bg/60 px-3 py-3 ring-1 ring-market-border/60">
        {ENGINE_STAGES.map((stage, idx) => {
          const st = phase[stage.id]
          return (
            <div key={stage.id} className="flex items-center">
              <div
                className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 transition-all duration-300 ${
                  st === 'done'
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200'
                    : st === 'running'
                      ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 animate-pulse'
                      : 'bg-white text-market-sub ring-1 ring-market-border/60'
                }`}
              >
                <span className="text-base">{stage.icon}</span>
                <span className="flex flex-col leading-tight">
                  <span className="text-xs font-bold">{stage.en}</span>
                  <span className="text-[10px] opacity-70">{stage.name}</span>
                </span>
                {st === 'done' && <span className="text-[10px] text-emerald-600">✓</span>}
              </div>
              {idx < ENGINE_STAGES.length - 1 && (
                <span className={`mx-1.5 text-market-border ${st === 'done' ? 'text-emerald-500' : ''}`}>→</span>
              )}
            </div>
          )
        })}
      </div>

      {/* 未运行提示 */}
      {!engineRun && !running && (
        <p className="mt-4 rounded-lg bg-market-bg/60 px-3 py-2.5 text-xs text-market-sub ring-1 ring-market-border/60">
          引擎待机。点击「运行引擎」执行七阶段端到端流水线：研究 → 估值 → 新闻 → 情绪 → 市场 → 定价 → 指数，输出全市场信号。
        </p>
      )}

      {/* 阶段输出 */}
      {engineRun && (
        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-market-sub">本轮输出</h3>
            <span className="text-[10px] text-market-sub">#{engineRun.id.slice(-5)} · {engineRun.time}</span>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {engineRun.stages.map((s) => (
              <div key={s.id} className="rounded-lg bg-white p-3 ring-1 ring-market-border/60">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-sky-600">
                    <span>{s.icon}</span>
                    {s.name} · {s.title}
                  </span>
                  {s.level && (
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                        s.level === '利好' || s.level === '看多'
                          ? 'bg-emerald-100 text-emerald-700'
                          : s.level === '利空' || s.level === '看空'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-market-bg text-market-sub'
                      }`}
                    >
                      {s.level}
                    </span>
                  )}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-market-sub">{s.summary}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {s.points.map((p, i) => (
                    <li key={i} className="text-[11px] leading-snug text-market-sub">· {p}</li>
                  ))}
                </ul>
                {s.value !== undefined && (
                  <p className="mt-2 border-t border-market-border pt-1.5 font-mono text-sm font-bold text-market-text">
                    {s.valueLabel}: {s.value}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* 综合信号 */}
          {signal && (
            <div className="mt-3 rounded-xl bg-gradient-to-r from-sky-50 to-indigo-50 p-4 ring-1 ring-sky-200">
              <div className="flex flex-wrap items-center gap-4">
                <div className="min-w-[130px]">
                  <p className="text-[10px] uppercase tracking-wider text-market-sub">引擎综合信号</p>
                  <p className={`text-2xl font-black ${signalUp ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {signal.label}
                    <span className="ml-1.5 font-mono text-sm text-market-sub">{signal.score}/100</span>
                  </p>
                  <div className="mt-1.5 h-1.5 w-36 overflow-hidden rounded-full bg-market-bg">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${signalUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${signal.score}%` }}
                    />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-relaxed text-market-text">{signal.advice}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {engineRun.indexForecast.map((f) => (
                      <span
                        key={f.name}
                        className="rounded-md bg-market-bg px-2 py-1 font-mono text-xs text-market-sub ring-1 ring-market-border/60"
                      >
                        {f.name} 当前 {f.current.toFixed(2)} → 目标{' '}
                        <b className={f.pct >= 0 ? 'text-emerald-600' : 'text-rose-600'}>{f.target.toFixed(2)}</b>（
                        {f.pct >= 0 ? '+' : ''}
                        {(f.pct * 100).toFixed(2)}%）
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <p className="mt-3 border-t border-market-border pt-2 text-[11px] text-market-sub">{engineRun.riskNote}</p>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
