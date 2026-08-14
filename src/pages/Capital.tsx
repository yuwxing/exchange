import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { CAPITAL_GOALS, CAPITAL_LIFECYCLE, CAPITAL_TIERS, generateCapitalPlan, fmtCapital } from '../ai/capital'
import { annualizedReturn } from '../ai/capitalOs'
import type { CapitalGoalId, CapitalOsState, CapitalPlan } from '../types'
import { fmtNumber } from '../utils/format'
import { Sparkline } from '../components/Sparkline'

type Step = 1 | 2 | 3

export default function Capital() {
  const extraAssets = useMarket((s) => s.extraAssets)
  const applyCapital = useMarket((s) => s.applyCapitalPlan)
  const deactivateCapitalOs = useMarket((s) => s.deactivateCapitalOs)
  const capitalOs = useMarket((s) => s.capitalOs)
  const radar = useMarket((s) => s.radar)
  const runRadar = useMarket((s) => s.runRadar)

  const [step, setStep] = useState<Step>(1)
  const [amount, setAmount] = useState(100000)
  const [custom, setCustom] = useState('100000')
  const [goalId, setGoalId] = useState<CapitalGoalId | null>(null)
  const [plan, setPlan] = useState<CapitalPlan | null>(null)
  const [generating, setGenerating] = useState(false)
  const [toast, setToast] = useState('')

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3200)
  }

  // 闭环运行中：自动刷新机会雷达，让「AI 寻找机会」环节保持实时
  useEffect(() => {
    if (capitalOs?.active && radar.length === 0) runRadar()
  }, [capitalOs?.active, radar.length, runRadar])

  const pickAmount = (v: number) => {
    setAmount(v)
    setCustom(String(v))
    setStep(2)
  }

  const pickGoal = (id: CapitalGoalId) => {
    setGoalId(id)
    setGenerating(true)
    setStep(3)
    setTimeout(() => {
      setPlan(generateCapitalPlan(amount, id, extraAssets))
      setGenerating(false)
    }, 1400)
  }

  const reset = () => {
    setPlan(null)
    setGoalId(null)
    setStep(1)
  }

  const apply = () => {
    if (!plan) return
    const res = applyCapital(plan.amount, plan)
    flash(res.message)
    if (res.ok) window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const stopAndReconfigure = () => {
    deactivateCapitalOs()
    reset()
    flash('已停止闭环运行，账户与持仓保留；可重新配置新的资本方案')
  }

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <section className="overflow-hidden rounded-xl bg-gradient-to-r from-slate-800 via-slate-900 to-market-primary-hover p-6 text-white shadow-md">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="text-2xl font-black tracking-tight">💰 AI Capital OS</span>
              <span className="rounded bg-amber-400/20 px-2 py-0.5 text-xs font-bold text-amber-300 ring-1 ring-amber-300/40">
                资本入口 · 总入口
              </span>
              {capitalOs?.active && (
                <span className="flex items-center gap-1.5 rounded bg-emerald-400/20 px-2 py-0.5 text-xs font-bold text-emerald-300 ring-1 ring-emerald-300/40">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-300" />
                  闭环运行中
                </span>
              )}
            </div>
            <p className="mt-1.5 text-sm text-white/85">
              不是「自己研究 136 个资产买来买去」——而是：资本进入 → AI 理解资本 → AI 配置资本 → AI 寻找机会 → AI 投资 AI 企业 → AI 劳动力生产 → AI 服务产生收入 → 利润回到资本 → AI 再平衡。
            </p>
          </div>
          <div className="flex shrink-0 gap-2">
            {capitalOs?.active && (
              <Link to="/portfolio" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25">
                查看持仓 💼
              </Link>
            )}
            <Link to="/assets" className="rounded-lg bg-white/15 px-4 py-2 text-sm font-semibold text-white ring-1 ring-white/30 hover:bg-white/25">
              资产市场 →
            </Link>
          </div>
        </div>
      </section>

      {capitalOs?.active ? (
        <LoopDashboard cap={capitalOs} onStop={stopAndReconfigure} />
      ) : (
        <>
          {/* Step 指示 */}
          <div className="flex items-center gap-2 text-xs text-market-sub">
            {(['你的资本', '你的目标', 'AI Capital Plan'] as const).map((label, i) => {
              const s = (i + 1) as Step
              const active = step === s
              const done = step > s
              return (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold ${
                      done ? 'bg-market-up text-white' : active ? 'bg-market-primary text-white' : 'bg-market-bg text-market-sub'
                    }`}
                  >
                    {done ? '✓' : s}
                  </span>
                  <span className={active ? 'font-semibold text-market-text' : 'text-market-sub'}>{label}</span>
                  {s < 3 && <span className="text-market-border">→</span>}
                </div>
              )
            })}
          </div>

          {/* Step 1 · 资本规模 */}
          {step === 1 && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
              <h2 className="text-lg font-bold text-market-text">你有多少资本？</h2>
              <p className="mt-1 text-sm text-market-sub">选择你的模拟初始资本（USDT），AI 将据此定制配置方案</p>
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {CAPITAL_TIERS.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => pickAmount(t.value)}
                    className={`rounded-xl border-2 px-4 py-4 text-center transition-all hover:-translate-y-0.5 ${
                      amount === t.value ? 'border-market-primary bg-market-primary/5 shadow' : 'border-market-border bg-white hover:border-market-primary/40'
                    }`}
                  >
                    <div className={`text-xl font-black tnum ${amount === t.value ? 'text-market-primary' : 'text-market-text'}`}>{t.label}</div>
                    <div className="mt-0.5 text-[11px] text-market-sub">模拟资本</div>
                  </button>
                ))}
                <div className="rounded-xl border-2 border-dashed border-market-border px-4 py-3">
                  <div className="text-xs font-semibold text-market-sub">自定义</div>
                  <div className="mt-1 flex items-center gap-1">
                    <span className="text-sm font-bold text-market-text">$</span>
                    <input
                      type="number"
                      min={100}
                      value={custom}
                      onChange={(e) => setCustom(e.target.value)}
                      className="w-full rounded border border-market-border px-2 py-1 text-sm text-market-text outline-none focus:border-market-primary tnum"
                    />
                  </div>
                  <button
                    onClick={() => pickAmount(Math.max(100, Number(custom) || 1000))}
                    className="mt-2 w-full rounded-lg bg-market-primary/10 py-1.5 text-xs font-bold text-market-primary hover:bg-market-primary/20"
                  >
                    确认 →
                  </button>
                </div>
              </div>
              <p className="mt-4 text-[11px] text-market-sub">当前选择：{fmtCapital(amount)} USDT（模拟资金，无真实价值）</p>
            </div>
          )}

          {/* Step 2 · 投资目标 */}
          {step === 2 && (
            <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
              <h2 className="text-lg font-bold text-market-text">你的目标是什么？</h2>
              <p className="mt-1 text-sm text-market-sub">选择投资目标，AI Capital Agent 将生成对应风险等级与配置策略</p>
              <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {CAPITAL_GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => pickGoal(g.id)}
                    className={`rounded-xl border-2 p-4 text-left transition-all hover:-translate-y-0.5 ${
                      goalId === g.id ? 'border-market-primary bg-market-primary/5 shadow' : 'border-market-border bg-white hover:border-market-primary/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl">{g.icon}</span>
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          g.risk === '低' || g.risk === '中低'
                            ? 'bg-market-up/10 text-market-up'
                            : g.risk === '高'
                              ? 'bg-market-down/10 text-market-down'
                              : 'bg-amber-500/10 text-amber-600'
                        }`}
                      >
                        风险 {g.risk}
                      </span>
                    </div>
                    <div className="mt-2 text-base font-bold text-market-text">{g.label}</div>
                    <div className="mt-0.5 text-xs leading-relaxed text-market-sub">{g.desc}</div>
                    <div className="mt-2 text-[11px] font-semibold text-market-primary tnum">预期年化 {g.expectedMin}%–{g.expectedMax}%</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 3 · AI Capital Plan */}
          {step === 3 && (
            <div className="space-y-5">
              {generating || !plan ? (
                <div className="flex flex-col items-center justify-center rounded-xl bg-white p-14 shadow-sm ring-1 ring-market-border/60">
                  <div className="flex items-center gap-2">
                    <span className="h-3 w-3 animate-bounce rounded-full bg-market-primary" />
                    <span className="h-3 w-3 animate-bounce rounded-full bg-market-primary [animation-delay:0.15s]" />
                    <span className="h-3 w-3 animate-bounce rounded-full bg-market-primary [animation-delay:0.3s]" />
                  </div>
                  <div className="mt-4 text-base font-bold text-market-text">AI Capital Agent 正在生成你的资本计划…</div>
                  <div className="mt-1 text-xs text-market-sub">理解资本 → 评估目标 → 配置资产 → 规划闭环</div>
                </div>
              ) : (
                <>
                  {/* 计划总览 */}
                  <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xl font-black text-market-text">📋 AI Capital Plan</span>
                          <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">AI 生成</span>
                        </div>
                        <p className="mt-1 text-sm text-market-sub">
                          资本 <b className="text-market-text">{plan.amountLabel}</b> USDT · 目标「{plan.goal.icon} {plan.goal.label}」 · 生成于 {plan.createdAt}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={reset} className="rounded-lg border border-market-border px-3 py-1.5 text-xs text-market-sub hover:text-market-text">
                          重新配置
                        </button>
                        <button
                          onClick={apply}
                          className="rounded-lg bg-market-primary px-4 py-1.5 text-xs font-bold text-white hover:bg-market-primary-hover"
                        >
                          启动 AI Capital OS 闭环 →
                        </button>
                      </div>
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
                      <PlanStat label="模拟资本" value={plan.amountLabel} sub="USDT" />
                      <PlanStat label="投资目标" value={plan.goal.label} sub={plan.goal.desc} />
                      <PlanStat label="风险等级" value={plan.riskLevel} sub="AI 评估" />
                      <PlanStat label="预期年化（模拟）" value={plan.expectedAnnual} sub="不构成收益承诺" />
                    </div>
                  </div>

                  {/* 板块配置 */}
                  <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
                    <h2 className="mb-3 text-base font-bold text-market-text">AI 资产配置（板块）</h2>
                    <div className="flex h-5 w-full overflow-hidden rounded-full">
                      {plan.allocation.map((a) => (
                        <div
                          key={a.sectorId}
                          style={{ width: `${a.pct}%` }}
                          className="h-full"
                          title={`${a.name} ${a.pct}%`}
                          data-name={a.name}
                        />
                      ))}
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-market-sub">
                      {plan.allocation.map((a) => (
                        <span key={a.sectorId} className="flex items-center gap-1">
                          {a.icon} {a.name} <b className="text-market-text">{a.pct}%</b>
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 推荐资产 */}
                  <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
                    <h2 className="mb-3 text-base font-bold text-market-text">AI 推荐资产（应用方案后自动买入）Top {plan.topAssets.length}</h2>
                    <div className="space-y-2.5">
                      {plan.topAssets.map((t, i) => (
                        <Link
                          key={t.symbol}
                          to={`/asset/${t.symbol}`}
                          className="flex items-center justify-between gap-3 rounded-lg border border-market-border/70 px-4 py-2.5 transition-colors hover:border-market-primary/50"
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className="text-xs font-bold text-market-sub">#{i + 1}</span>
                            <span className="font-bold text-market-text">{t.symbol}</span>
                            <span className="text-sm text-market-sub">{t.name}</span>
                          </div>
                          <div className="hidden min-w-0 flex-1 truncate text-xs text-market-sub sm:block">{t.reason}</div>
                          <span className="shrink-0 text-xs font-bold text-market-primary tnum">{t.pct}%</span>
                        </Link>
                      ))}
                    </div>
                  </div>

                  {/* 策略 + 再平衡 */}
                  <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
                      <h2 className="mb-3 text-base font-bold text-market-text">AI 策略要点</h2>
                      <ul className="space-y-2 text-sm text-market-sub">
                        {plan.strategy.map((s, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-market-primary">•</span>
                            {s}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
                      <h2 className="mb-3 text-base font-bold text-market-text">🔄 AI 再平衡计划</h2>
                      <p className="text-sm leading-relaxed text-market-sub">{plan.rebalance}</p>
                      <div className="mt-3 rounded-lg bg-market-bg/60 px-3 py-2 text-xs text-market-sub">
                        由 AI Portfolio Agent 监测组合偏离度与市场信号，触发自动再平衡（模拟）。
                      </div>
                    </div>
                  </div>

                  {/* 资金闭环生命周期 */}
                  <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
                    <h2 className="mb-1 text-base font-bold text-market-text">🔁 AI 资本闭环</h2>
                    <p className="mb-4 text-xs text-market-sub">资本进入 AI 经济，AI 劳动力生产、服务创收、利润回资本、AI 再平衡</p>
                    <div className="flex flex-wrap gap-2">
                      {plan.lifecycle.map((l) => (
                        <div key={l.step} className="flex w-[calc(33%-0.5rem)] min-w-[150px] items-start gap-2 rounded-lg border border-market-border/60 bg-market-bg/40 p-3 sm:w-[calc(20%-0.5rem)]">
                          <span className="text-lg">{l.icon}</span>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-market-text">
                              {l.step}. {l.name}
                            </div>
                            <div className="text-[10px] text-market-primary">{l.en}</div>
                            <div className="mt-0.5 text-[10px] leading-relaxed text-market-sub">{l.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm leading-relaxed text-amber-900 ring-1 ring-amber-300">
                    ⚠️ {plan.note}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-market-text px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

/** 闭环运行驾驶舱：9 环节实时状态 + 运行指标 + 净值曲线 */
function LoopDashboard({ cap, onStop }: { cap: CapitalOsState; onStop: () => void }) {
  const account = useMarket((s) => s.account)
  const quotes = useMarket((s) => s.quotes)
  const radar = useMarket((s) => s.radar)
  const sentiment = useMarket((s) => s.sentiment)
  const navigate = useNavigate()

  const holdValue = account.holdings.reduce((s, h) => s + h.quantity * (quotes[h.symbol]?.price ?? h.avgCost), 0)
  const navDelta = cap.nav - cap.amount
  const ann = annualizedReturn(cap)
  const topOpp = radar[0]
  const elapsedMin = Math.max(1, Math.round((Date.now() - new Date(cap.startedAt.replace(' ', 'T')).getTime()) / 60000))
  const navHistory = cap.history.map((h) => h.nav)
  const profitHistory = cap.history.map((h) => h.profit)

  const stages = [
    { ...CAPITAL_LIFECYCLE[0], value: fmtCapital(cap.amount), sub: '初始资本进入 AI 经济' },
    { ...CAPITAL_LIFECYCLE[1], value: cap.goalLabel, sub: 'AI 解析目标与风险偏好' },
    { ...CAPITAL_LIFECYCLE[2], value: `${cap.targets.length} 项配置`, sub: `${fmtCapital(cap.invested)} 已部署 · 现金储备 ${fmtCapital(Math.max(0, cap.amount - cap.invested))}` },
    { ...CAPITAL_LIFECYCLE[3], value: topOpp ? topOpp.symbol : '扫描中…', sub: topOpp ? `${topOpp.tag} · ${topOpp.name}` : 'AI 机会雷达实时扫描' },
    { ...CAPITAL_LIFECYCLE[4], value: `${account.holdings.length} 家 AI 企业`, sub: `市值 ${fmtCapital(holdValue)}` },
    { ...CAPITAL_LIFECYCLE[5], value: `${fmtNumber(cap.laborUnits, 0)} Agent`, sub: `累计产出 ${fmtNumber(cap.laborOutput, 0)} 任务量` },
    { ...CAPITAL_LIFECYCLE[6], value: `$${fmtNumber(cap.serviceRevenue)}`, sub: 'AI 服务与产品收入' },
    { ...CAPITAL_LIFECYCLE[7], value: `$${fmtNumber(cap.profitReturned)}`, sub: '分红已回流账户现金' },
    { ...CAPITAL_LIFECYCLE[8], value: `${cap.rebalances} 次`, sub: cap.lastRebalanceAt || '偏离 >10% 或情绪极端时触发' },
  ]

  return (
    <div className="space-y-5">
      {/* 运行指标 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="组合净值 NAV" value={`$${fmtNumber(cap.nav)}`} sub={`${navDelta >= 0 ? '+' : ''}${fmtNumber(navDelta)} vs 初始`} tone={navDelta >= 0 ? 'up' : 'down'} />
        <StatCard label="AI 劳动力" value={`${fmtNumber(cap.laborUnits, 0)}`} sub="Agent 正在生产" />
        <StatCard label="累计服务收入" value={`$${fmtNumber(cap.serviceRevenue)}`} sub="AI 服务创收" />
        <StatCard label="利润回流" value={`$${fmtNumber(cap.profitReturned)}`} sub="已回到你的资本" />
        <StatCard label="运行年化（模拟）" value={`${ann}%`} sub="按真实运行时间折算" tone={ann >= 0 ? 'up' : 'down'} />
        <StatCard label="配置偏离度" value={`${cap.driftPct}%`} sub=">10% 触发 AI 再平衡" tone={cap.driftPct > 10 ? 'down' : 'up'} />
        <StatCard label="再平衡" value={`${cap.rebalances} 次`} sub={cap.lastRebalanceAt || '尚未触发'} />
        <StatCard label="运行时长" value={`${elapsedMin} 分钟`} sub={`情绪 ${sentiment.score}（${sentiment.level}）`} />
      </div>

      {/* 九环节闭环 */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-market-text">🔁 资本闭环 · 实时运行</h2>
          <span className="text-[11px] text-market-sub">每 2.5 秒由 AI Capital OS 引擎驱动 · 数据随行情实时变化</span>
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {stages.map((s, i) => (
            <div key={s.step} className="flex items-stretch gap-2">
              <div
                className={`flex min-w-0 flex-1 items-center gap-3 rounded-xl border p-3 transition-colors ${
                  i === 5 || i === 6 || i === 7
                    ? 'border-amber-300/70 bg-amber-50/60'
                    : 'border-market-border/70 bg-market-bg/40'
                }`}
              >
                <span className="text-xl">{s.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-market-text">
                      {s.step}. {s.name}
                    </span>
                    <span className="hidden text-[10px] text-market-primary sm:inline">{s.en}</span>
                  </div>
                  <div className="truncate text-[11px] text-market-sub">{s.sub}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-black tnum ${s.step === 8 ? 'text-market-up' : s.step === 7 ? 'text-amber-600' : 'text-market-text'}`}>
                    {s.value}
                  </div>
                </div>
              </div>
              {i < stages.length - 1 && (
                <div className="hidden flex-col items-center justify-center px-0.5 sm:flex">
                  <span className="text-market-border">↓</span>
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-market-sub">
          利润分配：服务收入 × 30% 利润率 → 60% 分红回流账户现金（利润回到资本），40% 留存企业再投资；AI 再平衡按目标配置自动调仓。
        </p>
      </div>

      {/* 曲线 */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-2 text-base font-bold text-market-text">组合净值 NAV 曲线</h2>
          <div className="h-28">
            <Sparkline data={navHistory} color="#1677FF" width={480} height={100} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-market-sub">
            <span>启动 {cap.startedAt}</span>
            <span>当前 ${fmtNumber(cap.nav)}</span>
          </div>
        </div>
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-2 text-base font-bold text-market-text">利润回流累计曲线</h2>
          <div className="h-28">
            <Sparkline data={profitHistory} color="#10b981" width={480} height={100} />
          </div>
          <div className="mt-1 flex justify-between text-[10px] text-market-sub">
            <span>累计回流 ${fmtNumber(cap.profitReturned)}</span>
            <span>留存再投资 ${fmtNumber(cap.retained)}</span>
          </div>
        </div>
      </div>

      {/* 目标配置 */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h2 className="mb-3 text-base font-bold text-market-text">🎯 目标配置（AI 再平衡基准）</h2>
        <div className="flex h-4 w-full overflow-hidden rounded-full">
          {cap.targets.map((t) => (
            <div key={t.symbol} style={{ width: `${t.pct}%` }} className="h-full bg-market-primary" title={`${t.symbol} ${t.pct}%`} />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-market-sub">
          {cap.targets.map((t) => (
            <span key={t.symbol} className="flex items-center gap-1">
              <span className="font-bold text-market-text">{t.symbol}</span> {t.name} <b className="tnum">{t.pct}%</b>
            </span>
          ))}
        </div>
      </div>

      {/* 操作 */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigate('/portfolio')}
          className="rounded-lg bg-market-primary px-5 py-2.5 text-sm font-bold text-white hover:bg-market-primary-hover"
        >
          💼 查看我的资产
        </button>
        <button
          onClick={() => navigate('/intelligence')}
          className="rounded-lg border border-market-border bg-white px-5 py-2.5 text-sm font-semibold text-market-sub hover:text-market-text"
        >
          🤖 AI 智能与机会雷达
        </button>
        <button
          onClick={() => navigate('/weg')}
          className="rounded-lg border border-market-border bg-white px-5 py-2.5 text-sm font-semibold text-market-sub hover:text-market-text"
        >
          🧑‍💻 AI 劳动力市场
        </button>
        <button
          onClick={onStop}
          className="rounded-lg border border-market-down/40 bg-market-down/5 px-5 py-2.5 text-sm font-semibold text-market-down hover:bg-market-down/10"
        >
          ⏹ 停止闭环 · 重新配置
        </button>
      </div>
    </div>
  )
}

function StatCard({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'up' | 'down' }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60">
      <div className="text-xs text-market-sub">{label}</div>
      <div className={`mt-1 text-xl font-black tnum ${tone === 'up' ? 'text-market-up' : tone === 'down' ? 'text-market-down' : 'text-market-text'}`}>
        {value}
      </div>
      {sub && <div className="mt-0.5 truncate text-[10px] text-market-sub">{sub}</div>}
    </div>
  )
}

function PlanStat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg bg-market-bg p-3.5">
      <div className="text-xs text-market-sub">{label}</div>
      <div className="mt-1 text-lg font-bold text-market-text tnum">{value}</div>
      {sub && <div className="mt-0.5 text-[10px] leading-snug text-market-sub">{sub}</div>}
    </div>
  )
}
