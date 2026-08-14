import { useEffect, useMemo, useRef, useState } from 'react'
import { useMarket } from '../store/market'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import { Sparkline } from '../components/Sparkline'
import {
  LABOR_MARKET_STATS,
  LABOR_TASKS,
  CONTRIBUTION_POINTS,
  CONTRIBUTION_FLOW,
  TASK_TIERS,
  AGENT_PROFILES,
  LABOR_OCCUPATIONS,
  CAREER_LADDER,
  AI_COMPANY_ROLES,
  AI_LABOR_INDEX,
  LABOR_PRODUCTIVITY,
} from '../data/labor'
import { LABOR_FLOW, type AgentProfile, type Candle, type LaborTask } from '../types'

const FLOW_STEP_MS = 380

type TabId = 'labor' | 'agents' | 'wage' | 'contribute' | 'eco' | 'paper'

const TIER_STYLE: Record<string, { bg: string; text: string; ring: string; dot: string }> = {
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  sky: { bg: 'bg-sky-50', text: 'text-sky-700', ring: 'ring-sky-200', dot: 'bg-sky-500' },
  violet: { bg: 'bg-violet-50', text: 'text-violet-700', ring: 'ring-violet-200', dot: 'bg-violet-500' },
  amber: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
}

const REP_STYLE: Record<string, string> = {
  S: 'bg-violet-600 text-white',
  A: 'bg-emerald-600 text-white',
  B: 'bg-sky-600 text-white',
  C: 'bg-slate-500 text-white',
}

const ROLE_HEX = ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#6366f1', '#94a3b8']

export default function WegEconomy() {
  const eco = useMarket((s) => s.eco)
  const quotes = useMarket((s) => s.quotes)
  const candles = useMarket((s) => s.candles)
  const addContribution = useMarket((s) => s.addContribution)
  const account = useMarket((s) => s.account)
  const dailySettles = useMarket((s) => s.dailySettles)

  const [tab, setTab] = useState<TabId>('labor')
  const [toast, setToast] = useState('')
  const [runningId, setRunningId] = useState<string | null>(null)
  const [flowStep, setFlowStep] = useState(0)
  const [openAgent, setOpenAgent] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(
    () => () => {
      if (timerRef.current) clearInterval(timerRef.current)
    },
    [],
  )

  const tabs: { id: TabId; label: string }[] = [
    { id: 'labor', label: '劳动力市场' },
    { id: 'agents', label: 'Agent 简历' },
    { id: 'wage', label: '工资指数' },
    { id: 'contribute', label: '贡献积分' },
    { id: 'eco', label: '生态总览' },
    { id: 'paper', label: '白皮书' },
  ]

  const wegCandles: Candle[] = useMemo(
    () => (candles.WEG ?? []).map((c) => ({ ...c, close: c.close * 0.085 })),
    [candles],
  )

  const up = isUp((eco.wegPrice - eco.wegPrev) / eco.wegPrev)
  const spark =
    dailySettles.length >= 3 ? dailySettles.slice(-28) : wegCandles.slice(-24).map((c) => c.close)
  const factor = [eco.indices.users, eco.indices.agent, eco.indices.calls, eco.indices.revenue]

  const claim = (action: string, reward: number) => {
    addContribution(action, reward)
    setToast(`+${reward} WEG · ${action}`)
    setTimeout(() => setToast(''), 2200)
  }

  const runTask = (task: LaborTask) => {
    if (runningId) return
    setRunningId(task.id)
    setFlowStep(1)
    let step = 1
    timerRef.current = setInterval(() => {
      step += 1
      setFlowStep(step)
      if (step >= LABOR_FLOW.length) {
        if (timerRef.current) clearInterval(timerRef.current)
        setTimeout(() => {
          addContribution(task.title, task.reward)
          setRunningId(null)
          setFlowStep(0)
          setToast(`✅ ${task.title} · 完成任务，+${task.reward} WEG 贡献积分`)
          setTimeout(() => setToast(''), 2600)
        }, 450)
      }
    }, FLOW_STEP_MS)
  }

  const wegQuote = quotes.WEG
  const laborValueM = (LABOR_MARKET_STATS.laborValue / 1e6).toFixed(2)

  return (
    <div className="space-y-5">
      {/* ========== 头部：AI 劳动力市场 + WEG 定义 ========== */}
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-market-text">AI Labor Market</span>
              <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                AI 劳动力市场
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-market-sub">
              Agent 承接真实工作任务，调用 Skill 与 Model、消耗 Compute，完成任务创造 AI 经济价值。
              你的每一次参与 —— 研究 / 交易模拟 / 创建 Agent / 提交 Skill / 测试 MCP / 完成任务 / 发布数据 / 贡献评价 ——
              都换算为 <span className="font-semibold text-market-primary">WEG · AI 经济贡献积分</span>。
            </p>
            <div className="mt-2 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-market-bg px-3 py-1.5 text-xs text-market-sub">
              <span className="font-bold text-market-primary">WEG</span>
              <span>=</span>
              <span className="font-semibold text-market-text">AI Economy Contribution Point</span>
              <span className="text-market-sub">· 不是货币，不发行、不募资、不承诺升值</span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="rounded-lg bg-market-bg px-4 py-2 text-center">
              <div className="text-xs text-market-sub">我的 WEG · 贡献积分</div>
              <div className="text-lg font-bold text-market-primary tnum">{fmtNumber(account.wegBalance)}</div>
            </div>
            <div className="rounded-lg bg-market-bg px-4 py-2 text-center">
              <div className="text-xs text-market-sub">AI Credit · 信用分</div>
              <div className="text-lg font-bold text-market-text tnum">{account.aiCredit}</div>
            </div>
            <div className="rounded-lg bg-market-bg px-4 py-2 text-center">
              <div className="text-xs text-market-sub">累计贡献</div>
              <div className="text-lg font-bold text-market-text tnum">{fmtNumber(account.totalEarned)}</div>
            </div>
            <div className="rounded-lg bg-market-bg px-4 py-2 text-center">
              <div className="text-xs text-market-sub">等级</div>
              <div className="text-lg font-bold text-market-text tnum">Lv.{account.level}</div>
            </div>
          </div>
        </div>
      </div>

      {/* ========== Tab ========== */}
      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              tab === t.id
                ? 'bg-market-primary text-white'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ========== Tab 1 · 劳动力市场 ========== */}
      {tab === 'labor' && (
        <div className="space-y-5">
          {/* AI JOB MARKET 总览 */}
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-md ring-1 ring-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black tracking-tight">AI JOB MARKET</span>
                  <span className="rounded bg-white/15 px-2 py-0.5 text-[10px] font-bold">全球 AI Agent 劳动力市场</span>
                </div>
                <p className="mt-1 text-xs text-slate-300">发布任务 → 系统自动拆解 → 匹配 Agent → 完成交付</p>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <DarkStat label="今日任务" value={fmtCompact(LABOR_MARKET_STATS.dailyTasks)} />
                <DarkStat label="在线 Agent" value={fmtCompact(LABOR_MARKET_STATS.onlineAgents)} />
                <DarkStat label="已完成任务" value={fmtCompact(LABOR_MARKET_STATS.completedTasks)} />
                <DarkStat label="AI 劳动价值" value={`$${laborValueM}M`} accent />
              </div>
            </div>
          </div>

          {/* 任务拆解示意 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">🧩 发布任务 → 自动拆解 → 匹配 Agent</h2>
              <span className="text-xs text-market-sub">用户不直接找 Agent，而是发布任务</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {['发布任务', 'Research', 'Web Search', 'Data Analysis', 'Comparison', 'Report', '匹配 Agent'].map((s, i, arr) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                      i === 0
                        ? 'bg-market-primary text-white'
                        : i === arr.length - 1
                          ? 'bg-emerald-600 text-white'
                          : 'bg-market-bg text-market-text'
                    }`}
                  >
                    {s}
                  </span>
                  {i < arr.length - 1 && <span className="text-market-sub">↓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* 劳动力流转流水线 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">🤖 AI 劳动力流转</h2>
              <span className="text-xs text-market-sub">Agent → 接任务 → Skill → Model → Compute → 完成 → AI Credit</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {LABOR_FLOW.map((node, i) => (
                <div key={node.id} className="flex items-center gap-1.5">
                  <div
                    className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-300 ${
                      runningId && flowStep > i
                        ? 'bg-market-primary text-white shadow-md scale-105'
                        : runningId && flowStep === i
                          ? 'bg-amber-100 text-amber-700 ring-1 ring-amber-400 animate-pulse'
                          : 'bg-market-bg text-market-sub'
                    }`}
                  >
                    <span>{node.icon}</span>
                    <span>{node.name}</span>
                  </div>
                  {i < LABOR_FLOW.length - 1 && <span className="text-market-primary">→</span>}
                </div>
              ))}
            </div>
            {runningId && (
              <p className="mt-3 text-xs text-market-sub">
                {LABOR_TASKS.find((t) => t.id === runningId)?.title} · 执行中…
              </p>
            )}
          </div>

          {/* 任务层级 L1-L4 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">📶 任务层级</h2>
              <span className="text-xs text-market-sub">L1 简单 → L4 Agent Team（AI Workforce）</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {TASK_TIERS.map((tier) => {
                const st = TIER_STYLE[tier.color] ?? TIER_STYLE.emerald
                return (
                  <div key={tier.level} className={`rounded-xl bg-white p-5 shadow-sm ring-1 ${st.ring}`}>
                    <div className="flex items-center justify-between">
                      <span className={`rounded-md px-2 py-1 text-xs font-black ${st.bg} ${st.text}`}>{tier.level}</span>
                      <span className="text-lg">{tier.icon}</span>
                    </div>
                    <div className="mt-2 text-base font-bold text-market-text">{tier.name}</div>
                    <div className="text-[11px] text-market-sub">{tier.nameEn}</div>
                    <div className={`mt-2 inline-block rounded px-2 py-0.5 text-xs font-semibold ${st.bg} ${st.text}`}>
                      {tier.priceRange}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {tier.examples.map((e) => (
                        <span key={e} className="rounded bg-market-bg px-2 py-1 text-[11px] text-market-sub">
                          {e}
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* 任务市场 */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">📋 任务市场</h2>
              <span className="text-xs text-market-sub">点击「模拟接单」体验完整流转 · 完成后奖励入账 WEG</span>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {LABOR_TASKS.map((task) => (
                <div
                  key={task.id}
                  className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 transition-shadow hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-slate-900 px-2 py-1 font-mono text-[11px] font-bold text-white">
                      {task.symbol}
                    </span>
                    <span className="rounded bg-market-bg px-2 py-0.5 text-[10px] font-semibold text-market-sub">
                      {task.category}
                    </span>
                  </div>

                  <div className="mt-3 text-base font-bold text-market-text">{task.title}</div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-market-sub">{task.description}</p>

                  <div className="mt-3 flex items-center justify-between rounded-lg bg-emerald-50 px-3 py-2 ring-1 ring-emerald-200">
                    <div>
                      <div className="text-[10px] text-emerald-700">奖励</div>
                      <div className="font-mono text-lg font-bold text-emerald-700">${task.reward}</div>
                    </div>
                    <div className="text-[10px] text-emerald-600">AI Value</div>
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <MiniStat label="Agent" value={task.agent} />
                    <MiniStat label="耗时" value={task.duration} />
                    <MiniStat label="成功率" value={`${task.successRate}%`} />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-[11px] text-market-sub">
                    <span className="shrink-0">需求热度</span>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-market-bg">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-market-primary"
                        style={{ width: `${task.demand}%` }}
                      />
                    </div>
                    <span className="shrink-0 font-mono">{task.demand}</span>
                  </div>

                  <button
                    onClick={() => runTask(task)}
                    disabled={!!runningId}
                    className={`mt-4 w-full rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                      runningId === task.id
                        ? 'cursor-wait bg-amber-100 text-amber-700'
                        : runningId
                          ? 'cursor-not-allowed bg-market-bg text-market-sub'
                          : 'bg-market-primary text-white hover:bg-market-primary-hover'
                    }`}
                  >
                    {runningId === task.id ? '⏳ 执行中…' : runningId ? '其他任务执行中' : '⚡ 模拟接单'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== Tab 2 · Agent 简历 ========== */}
      {tab === 'agents' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-market-text">🪪 AI Worker Profile · Agent 简历</h2>
              <p className="mt-1 text-sm text-market-sub">
                每个 Agent 都有信誉、工资、技能与生产率档案。点击卡片查看信誉明细。
              </p>
            </div>
            <span className="hidden text-xs text-market-sub sm:block">信誉越高 → 可接越贵的任务 → 收入越高</span>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {AGENT_PROFILES.map((p) => (
              <AgentCard
                key={p.symbol}
                profile={p}
                open={openAgent === p.symbol}
                onToggle={() => setOpenAgent(openAgent === p.symbol ? null : p.symbol)}
              />
            ))}
          </div>

          {/* AI 职业阶梯 L1-L7 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">🪜 AI 职业阶梯</h2>
              <span className="text-xs text-market-sub">L1 AI Worker → L7 AI Organization / AI CEO</span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {CAREER_LADDER.map((step, i) => (
                <div key={step.level} className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center rounded-lg bg-market-bg px-3 py-2">
                    <span className="text-lg">{step.icon}</span>
                    <span className="mt-0.5 text-[10px] font-bold text-market-primary">{step.level}</span>
                    <span className="text-xs font-semibold text-market-text">{step.name}</span>
                    <span className="text-[10px] text-market-sub">{step.desc}</span>
                  </div>
                  {i < CAREER_LADDER.length - 1 && <span className="text-market-primary">↓</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== Tab 3 · 工资指数 ========== */}
      {tab === 'wage' && (
        <div className="space-y-5">
          {/* AI LABOR INDEX */}
          <div className="overflow-hidden rounded-xl bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 p-6 text-white shadow-md ring-1 ring-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-widest text-indigo-300">AI Labor Index</div>
                <div className="mt-1 flex items-end gap-3">
                  <span className="font-mono text-4xl font-black tracking-tight">{AI_LABOR_INDEX.name}</span>
                  <span className="mb-1 font-mono text-3xl font-black text-white">{AI_LABOR_INDEX.value}</span>
                  <span className="mb-1.5 rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/40">
                    ▲ +{AI_LABOR_INDEX.change}%
                  </span>
                </div>
                <p className="mt-1 text-xs text-slate-400">AI 工资指数 · 衡量各职业 Agent 的劳动价格变化</p>
              </div>
            </div>
            <div className="mt-4 overflow-hidden rounded-lg bg-white/5 ring-1 ring-white/10">
              <table className="w-full text-sm">
                <thead className="bg-white/5 text-left text-xs text-slate-300">
                  <tr>
                    <th className="px-4 py-2 font-semibold">职业</th>
                    <th className="px-4 py-2 text-right font-semibold">AI 劳动价格</th>
                    <th className="px-4 py-2 text-right font-semibold">24H</th>
                  </tr>
                </thead>
                <tbody>
                  {LABOR_OCCUPATIONS.map((o) => (
                    <tr key={o.id} className="border-t border-white/10">
                      <td className="px-4 py-2.5 font-medium text-white">
                        {o.icon} {o.name}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-semibold text-white">${o.price.toFixed(1)}</td>
                      <td
                        className={`px-4 py-2.5 text-right font-mono font-semibold ${
                          o.change24h >= 0 ? 'text-emerald-300' : 'text-rose-400'
                        }`}
                      >
                        {o.change24h >= 0 ? '+' : ''}
                        {o.change24h}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 供需传导 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <h2 className="mb-3 text-base font-bold text-market-text">⚖️ AI 工资市场 · 供需传导</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {['需求 ↑', '任务数量 ↑', 'Agent 报价 ↑', 'AI Labor Price ↑'].map((s, i, arr) => (
                <div key={s} className="flex items-center gap-1.5">
                  <span
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                      i === arr.length - 1 ? 'bg-market-primary text-white' : 'bg-market-bg text-market-text'
                    }`}
                  >
                    {s}
                  </span>
                  {i < arr.length - 1 && <span className="text-market-primary">↓</span>}
                </div>
              ))}
            </div>
          </div>

          {/* AI Labor Productivity */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-market-text">📈 AI Labor Productivity · 劳动生产率</h2>
                <p className="mt-1 text-xs text-market-sub">
                  生产率 = {LABOR_PRODUCTIVITY.formula}。单位时间产出更高的 Agent 价值更高。
                </p>
              </div>
              <div className="rounded-lg bg-emerald-50 px-5 py-3 text-center ring-1 ring-emerald-200">
                <div className="text-xs text-emerald-700">AI 劳动生产率</div>
                <div className="font-mono text-2xl font-black text-emerald-700">
                  ${LABOR_PRODUCTIVITY.perAgentHour}
                  <span className="text-sm font-semibold"> / Agent Hour</span>
                </div>
                <div className="text-[11px] text-emerald-600">环比 +{LABOR_PRODUCTIVITY.trend}%</div>
              </div>
            </div>

            <div className="mt-4 overflow-hidden rounded-lg border border-market-border">
              <table className="w-full text-sm">
                <thead className="bg-market-bg/60 text-left text-xs text-market-sub">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Agent</th>
                    <th className="px-3 py-2 text-right font-semibold">完成任务</th>
                    <th className="px-3 py-2 text-right font-semibold">成功率</th>
                    <th className="px-3 py-2 text-right font-semibold">耗时</th>
                    <th className="px-3 py-2 text-right font-semibold">单位时间产出</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-market-border">
                    <td className="px-3 py-2.5 font-medium text-market-text">Agent A</td>
                    <td className="px-3 py-2.5 text-right tnum">100</td>
                    <td className="px-3 py-2.5 text-right tnum">90%</td>
                    <td className="px-3 py-2.5 text-right tnum">100h</td>
                    <td className="px-3 py-2.5 text-right font-mono tnum text-market-sub">0.90 任务/h</td>
                  </tr>
                  <tr className="border-t border-market-border bg-emerald-50/50">
                    <td className="px-3 py-2.5 font-medium text-market-text">Agent B</td>
                    <td className="px-3 py-2.5 text-right tnum">50</td>
                    <td className="px-3 py-2.5 text-right tnum">99%</td>
                    <td className="px-3 py-2.5 text-right tnum">20h</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold tnum text-emerald-700">2.48 任务/h</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-xs text-market-sub">
              Agent B 任务更少，但单位时间生产价值是 Agent A 的约 2.75 倍 —— 不能仅凭任务量判断优劣。
            </p>
          </div>
        </div>
      )}

      {/* ========== Tab 4 · 贡献积分 ========== */}
      {tab === 'contribute' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-market-text">WEG · AI 经济贡献积分</h2>
                <p className="mt-1 max-w-2xl text-sm text-market-sub">
                  不做挖矿，而是做贡献。研究、交易模拟、创建 Agent、创建 Skill、测试 MCP、完成任务、
                  发布数据、贡献评价 —— 每一份对 AI 生态的真实贡献，都换算为 WEG 贡献积分。
                  点击任务一键模拟领取（奖励直接入账 WEG 余额，并提升 AI Credit）。
                </p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-market-sub">
              {CONTRIBUTION_FLOW.map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-lg bg-market-bg px-3 py-1.5 font-medium text-market-text">{step}</span>
                  {i < arr.length - 1 && <span className="text-market-primary">→</span>}
                </span>
              ))}
              <span className="rounded-lg bg-market-primary px-3 py-1.5 font-bold text-white">WEG</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {CONTRIBUTION_POINTS.map((item) => (
              <div
                key={item.action}
                className="flex items-center justify-between rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60"
              >
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-lg bg-market-bg text-lg">{item.icon}</span>
                  <div>
                    <div className="text-sm font-semibold text-market-text">{item.action}</div>
                    <div className="text-[11px] text-market-sub">{item.note}</div>
                  </div>
                </div>
                <button
                  onClick={() => claim(item.action, item.reward)}
                  className="shrink-0 rounded-lg bg-market-primary px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-market-primary-hover"
                >
                  +{item.reward} WEG
                </button>
              </div>
            ))}
          </div>

          {/* AI 公司收入分成 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-market-text">🏢 Agent Team = AI 公司 · 收入分成</h2>
              <span className="text-xs text-market-sub">示例：用户发布「创建英语教育产品」，AI 公司自动组队完成</span>
            </div>

            <div className="mb-3 rounded-lg bg-slate-900 p-4 text-white">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>项目收入</span>
                <span className="font-mono text-base font-bold text-white">$10,000</span>
              </div>
              <div className="mt-2 flex h-3 w-full overflow-hidden rounded-full">
                {AI_COMPANY_ROLES.map((r, i) => (
                  <div
                    key={r.name}
                    title={`${r.name} ${r.share}%`}
                    style={{ width: `${r.share}%`, background: ROLE_HEX[i % ROLE_HEX.length] }}
                  />
                ))}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {AI_COMPANY_ROLES.map((r) => (
                  <div key={r.name} className="rounded-lg bg-white/10 px-2 py-1.5 text-center">
                    <div className="text-[10px] text-slate-300">
                      {r.icon} {r.name}
                    </div>
                    <div className="text-xs font-bold text-white">{r.share}%</div>
                    <div className="text-[10px] text-slate-400">${Math.round((10000 * r.share) / 100)}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-market-sub">
              CEO Agent 协调 Research / Product / Coding / Design / Marketing 等 Agent 协同交付，
              按贡献比例分成 —— 这就是 <span className="font-semibold text-market-text">AI 企业经济</span>。
            </p>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <h3 className="mb-2 text-sm font-bold text-market-text">WEG 与 AI Credit</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-market-sub">
              {['完成贡献', '获得 WEG 积分', '提升 AI Credit', '信用解锁更多模拟任务'].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-lg bg-market-bg px-3 py-1.5 font-medium text-market-text">{step}</span>
                  {i < arr.length - 1 && <span className="text-market-primary">→</span>}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========== Tab 5 · 生态总览 ========== */}
      {tab === 'eco' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">
                {dailySettles.length >= 3 ? '每日结算走势' : 'WEG 走势（近 24 日）'}
              </h2>
              <span className="text-xs text-market-sub">
                {dailySettles.length >= 3 ? '每次收盘记录一个结算点' : '模拟结算走势'}
              </span>
            </div>
            <div className="h-36 w-full">
              <Sparkline data={spark} color={up ? '#16A34A' : '#DC2626'} width={720} height={140} />
            </div>
            <div className="mt-2 text-xs text-market-sub">
              当前生态报价 ${fmtNumber(wegQuote?.price ?? 5.8)}（含交易波动） · 结算价 ${eco.wegPrice.toFixed(2)}（由生态指数计算）
            </div>
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <h2 className="mb-4 text-base font-bold text-market-text">AI Engine 定价公式</h2>
            <div className="overflow-x-auto rounded-lg bg-market-bg p-4 text-sm text-market-text">
              <div className="flex flex-wrap items-center justify-center gap-2 whitespace-nowrap py-1">
                <span className="font-bold text-market-primary">WEG 结算价</span>
                <span>=</span>
                <span className="rounded bg-white px-2 py-1 ring-1 ring-market-border">基准价 5.80</span>
                <span>×</span>
                <span className="rounded bg-white px-2 py-1 ring-1 ring-market-border">用户增长指数</span>
                <span>×</span>
                <span className="rounded bg-white px-2 py-1 ring-1 ring-market-border">Agent 数量指数</span>
                <span>×</span>
                <span className="rounded bg-white px-2 py-1 ring-1 ring-market-border">调用量指数</span>
                <span>×</span>
                <span className="rounded bg-white px-2 py-1 ring-1 ring-market-border">收入指数</span>
              </div>
            </div>
            <div className="mt-2 text-xs text-market-sub">
              交易时段：09:00–23:00 实时波动 · 每日 23:00 自动收盘结算并记录结算点 · 次日 09:00 开盘指数重置为 1.0
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ['用户增长', eco.indices.users],
                ['Agent 数量', eco.indices.agent],
                ['调用量', eco.indices.calls],
                ['生态收入', eco.indices.revenue],
              ].map(([label, v], i) => (
                <div key={label} className="rounded-lg border border-market-border p-3">
                  <div className="text-xs text-market-sub">{label}</div>
                  <div className="mt-1 flex items-baseline gap-1">
                    <span className="text-lg font-bold text-market-text tnum">{v}</span>
                    <span className="text-xs text-market-sub">×{factor[i] >= 1 ? '+' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="总发行" value={`${fmtCompact(eco.totalSupply)} WEG`} sub="1,000,000,000" />
              <Stat label="流通" value={fmtCompact(eco.circulating)} sub="2 亿，占总发行 20%" />
              <Stat label="生态用户" value={fmtCompact(eco.users)} sub="月活跃持续增长" />
              <Stat label="每日活跃" value={fmtCompact(eco.dailyActive)} sub="日活 / 用户 ≈ 16.7%" />
            </div>
          </div>
        </div>
      )}

      {/* ========== Tab 6 · 白皮书 ========== */}
      {tab === 'paper' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-market-text">《AI Labor Market 白皮书》（模拟版）</span>
              <span className="rounded bg-market-bg px-1.5 py-0.5 text-[10px] font-bold text-market-sub">
                v2.0 · 教育模拟
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <PaperSection title="1. 设计目标">
                <p>
                  AI 劳动力市场是 AI 经济的生产端：Agent 承接任务，调用 Skill 与 Model、消耗 Compute，
                  产出可量化的经济价值（AI Value）。<b className="text-market-text">WEG 不是货币</b>，
                  而是 <b className="text-market-text">AI Economy Contribution Point（AI 经济贡献积分）</b>，
                  用于衡量与记录用户在 AI 生态中的每一份贡献。WEG 不发行交易代币、不募资、不承诺升值回报。
                </p>
              </PaperSection>

              <PaperSection title="2. 劳动力市场三层结构">
                <p>
                  <b className="text-market-text">任务市场</b>（用户发布任务，系统自动拆解并匹配 Agent）→
                  <b className="text-market-text"> Agent 简历</b>（信誉 / 技能 / 工资 / 生产率档案）→
                  <b className="text-market-text"> 工资指数</b>（供需决定 AI 劳动价格，形成 AI LABOR 100 指数）。
                  三层结构让 AI Exchange 与 AI Labor Market 连接为一个完整的经济系统。
                </p>
              </PaperSection>

              <PaperSection title="3. WEG 获取：贡献积分规则">
                <p>用户通过研究、交易模拟、创建 Agent、创建 Skill、测试 MCP、完成任务、发布数据、贡献评价获得 WEG 贡献积分：</p>
                <div className="mt-3 overflow-hidden rounded-lg border border-market-border">
                  <table className="w-full text-sm">
                    <thead className="bg-market-bg/60 text-left text-xs text-market-sub">
                      <tr>
                        <th className="px-3 py-2 font-semibold">贡献行为</th>
                        <th className="px-3 py-2 font-semibold">积分</th>
                        <th className="px-3 py-2 font-semibold">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CONTRIBUTION_POINTS.map((c) => (
                        <tr key={c.action} className="border-t border-market-border">
                          <td className="px-3 py-2 font-medium text-market-text">
                            {c.icon} {c.action}
                          </td>
                          <td className="px-3 py-2 font-bold text-market-primary tnum">+{c.reward} WEG</td>
                          <td className="px-3 py-2 text-xs text-market-sub">{c.note}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </PaperSection>

              <PaperSection title="4. 劳动力流转闭环">
                <p>
                  Agent → 接任务 → 调用 Skill → 调用 Model → 消耗 Compute → 完成任务 →
                  获得 AI Credit。每一次任务完成既创造 AI 经济产出（计入 AI GDP），也提升参与者的
                  AI Credit 信用分。
                </p>
              </PaperSection>

              <PaperSection title="5. 信誉与职业阶梯">
                <p>
                  Agent 的信誉（成功率 / 返工率 / 满意度 / 争议率）决定任务资格、议价能力与收入。
                  从 L1 AI Worker 到 L7 AI Organization，Agent 可成长为 AI CEO，调度整支 AI Workforce，
                  形成 AI 企业经济与收入分成。
                </p>
              </PaperSection>

              <div className="rounded-lg bg-market-primary/5 px-4 py-3 text-sm text-market-primary">
                提示：本白皮书为教育模拟内容，WEG 是贡献积分而非货币、证券或投资标的。
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-market-text px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function DarkStat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-white/10 px-4 py-2.5 text-center ring-1 ring-white/10">
      <div className="text-[11px] text-slate-300">{label}</div>
      <div className={`font-mono text-xl font-black ${accent ? 'text-emerald-300' : 'text-white'} tnum`}>{value}</div>
    </div>
  )
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-market-border p-3">
      <div className="text-xs text-market-sub">{label}</div>
      <div className="mt-1 text-lg font-bold text-market-text tnum">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-market-sub">{sub}</div>}
    </div>
  )
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-market-bg px-2 py-1.5">
      <div className="text-[10px] text-market-sub">{label}</div>
      <div className="mt-0.5 truncate text-xs font-semibold text-market-text" title={value}>
        {value}
      </div>
    </div>
  )
}

function PaperSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-market-border pb-4 last:border-0 last:pb-0">
      <h3 className="mb-2 text-sm font-bold text-market-text">{title}</h3>
      <div className="text-sm leading-relaxed text-market-sub">{children}</div>
    </div>
  )
}

function Stars({ count }: { count: number }) {
  return (
    <span className="text-amber-500" aria-label={`${count} 星`}>
      {'★'.repeat(count)}
      <span className="text-market-border">{'★'.repeat(Math.max(0, 5 - count))}</span>
    </span>
  )
}

function StatusDot({ status }: { status: AgentProfile['status'] }) {
  const map: Record<AgentProfile['status'], { dot: string; label: string; cls: string }> = {
    available: { dot: 'bg-emerald-500', label: '可接单', cls: 'text-emerald-600' },
    busy: { dot: 'bg-amber-500', label: '执行中', cls: 'text-amber-600' },
    offline: { dot: 'bg-slate-400', label: '离线', cls: 'text-slate-500' },
  }
  const s = map[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium ${s.cls}`}>
      <span className={`h-2 w-2 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

function AgentCard({
  profile: p,
  open,
  onToggle,
}: {
  profile: AgentProfile
  open: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex flex-col rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-lg bg-market-bg text-2xl">{p.icon}</span>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono text-xs font-bold text-market-sub">{p.symbol}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${REP_STYLE[p.reputation]}`}>
                {p.reputation}
              </span>
            </div>
            <div className="text-base font-bold text-market-text">{p.name}</div>
            <div className="text-[11px] text-market-sub">{p.role}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1">
            <span className="text-amber-500">⭐</span>
            <span className="font-mono text-sm font-bold text-market-text">{p.rating}</span>
          </div>
          <div className="mt-1">
            <StatusDot status={p.status} />
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <MiniStat label="完成任务" value={fmtCompact(p.completedTasks)} />
        <MiniStat label="成功率" value={`${p.successRate}%`} />
        <MiniStat label="平均耗时" value={p.avgDuration} />
      </div>

      <div className="mt-2 flex items-center justify-between rounded-lg bg-market-bg px-3 py-2">
        <span className="text-[11px] text-market-sub">总劳动价值</span>
        <span className="font-mono text-sm font-bold text-market-primary">${fmtCompact(p.totalLaborValue)}</span>
      </div>

      <div className="mt-3">
        <div className="mb-1 text-[11px] font-semibold text-market-sub">技能</div>
        <div className="space-y-1">
          {p.skills.map((s) => (
            <div key={s.name} className="flex items-center justify-between text-xs">
              <span className="text-market-text">{s.name}</span>
              <Stars count={s.stars} />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg bg-market-bg p-2 text-center text-[10px]">
        <div>
          <div className="text-market-sub">基础</div>
          <div className="font-mono font-bold text-market-text">${p.pricing.base}/T</div>
        </div>
        <div>
          <div className="text-market-sub">复杂</div>
          <div className="font-mono font-bold text-market-text">${p.pricing.complex}/T</div>
        </div>
        <div>
          <div className="text-market-sub">企业</div>
          <div className="font-mono font-bold text-market-text">${p.pricing.enterprise}/H</div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-market-sub">
        <span>需求</span>
        <span>
          <span className="text-amber-500">{'★'.repeat(p.demandStars)}</span>
          <span className="text-market-border">{'★'.repeat(5 - p.demandStars)}</span>
        </span>
        <span className="font-mono font-bold text-market-primary">${p.productivity}/h</span>
      </div>

      <button
        onClick={onToggle}
        className="mt-3 w-full rounded-lg bg-market-bg px-3 py-1.5 text-xs font-semibold text-market-text transition-colors hover:bg-market-primary/10 hover:text-market-primary"
      >
        {open ? '收起信誉明细' : '查看信誉明细'}
      </button>

      {open && (
        <div className="mt-3 rounded-lg bg-market-bg p-3">
          <div className="mb-2 text-[11px] font-bold text-market-text">Agent Reputation · 信誉档案</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-market-sub">信誉等级</span>
              <span className="font-bold text-market-text">{p.reputation}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">生产率</span>
              <span className="font-mono font-bold text-market-text">${p.productivity}/h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">完成 / 成功</span>
              <span className="font-mono text-market-text">
                {p.reputationDetail.completed.toLocaleString()} / {p.reputationDetail.success.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">失败</span>
              <span className="font-mono text-market-text">{p.reputationDetail.failed}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">返工率</span>
              <span className="font-mono text-market-text">{p.reputationDetail.reworkRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">用户满意度</span>
              <span className="font-mono text-market-text">{p.reputationDetail.satisfaction}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">平均交付</span>
              <span className="font-mono text-market-text">{p.reputationDetail.avgDelivery}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-market-sub">争议率</span>
              <span className="font-mono text-market-text">{p.reputationDetail.disputeRate}%</span>
            </div>
          </div>
          <div className="mt-2 text-[11px] leading-relaxed text-market-sub">
            信誉越高 → 可接越贵的任务 → 议价能力越强 → 收入越高
          </div>
        </div>
      )}
    </div>
  )
}
