import { useState } from 'react'
import { useTaskMarket, TASK_TYPE_META, type MarketBid, type MarketTask, type TaskType } from '../store/taskMarket'
import { fmtNumber } from '../utils/format'

const STATUS_META: Record<MarketTask['status'], { label: string; cls: string }> = {
  open: { label: '待竞标', cls: 'bg-sky-500/10 text-sky-600 ring-sky-400/40' },
  executing: { label: '执行中', cls: 'bg-amber-500/10 text-amber-600 ring-amber-400/40' },
  reviewing: { label: '待验收', cls: 'bg-violet-500/10 text-violet-600 ring-violet-400/40' },
  settled: { label: '已结算', cls: 'bg-emerald-500/10 text-emerald-600 ring-emerald-400/40' },
  external: { label: '待外部执行', cls: 'bg-orange-500/10 text-orange-600 ring-orange-400/40' },
}

const fmtMoney = (n: number) => `¥${fmtNumber(n)}`

export default function TaskMarket() {
  const { providers, tasks, bids, publishTask, runMarket, reset } = useTaskMarket()
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [type, setType] = useState<TaskType>('research')
  const [budget, setBudget] = useState(500)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [toast, setToast] = useState('')

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3000)
  }

  const selected = tasks.find((t) => t.id === selectedId) ?? null
  const selectedBids = selected ? bids.filter((b) => b.taskId === selected.id) : []

  const publish = () => {
    if (!title.trim() || !desc.trim()) {
      flash('请填写任务标题与描述')
      return
    }
    publishTask({ title, description: desc, type, budget })
    flash('✅ 任务已发布，等待能力方竞标')
    setTitle('')
    setDesc('')
  }

  const totalRevenue = providers.reduce((s, p) => s + p.revenue, 0)
  const totalWins = providers.reduce((s, p) => s + p.wins, 0)

  return (
    <div className="space-y-5">
      {/* 头部 */}
      <section className="overflow-hidden rounded-xl bg-gradient-to-r from-indigo-50 via-white to-sky-50/70 p-6 shadow-sm ring-1 ring-indigo-200/70">
        <div className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-sky-500 text-2xl shadow-sm">🧩</span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-2xl font-black tracking-tight text-market-text">AI 任务市场</span>
                  <span className="rounded bg-indigo-500/15 px-2 py-0.5 text-xs font-bold text-indigo-600 ring-1 ring-indigo-400/40">
                    B2B 能力撮合
                  </span>
                </div>
                <p className="mt-1 text-sm text-market-sub">
                  企业发布 Task → AI 自动寻找能力 → 竞争报价匹配 → 执行 → 验收 → 结算
                </p>
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                if (tasks.some((t) => t.status === 'open')) {
                  runMarket()
                  flash('🔁 市场已运行，完成竞标 → 匹配 → 执行 → 验收 → 结算')
                } else {
                  flash('当前没有待竞标任务，请先发布任务')
                }
              }}
              className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-600"
            >
              运行市场
            </button>
            <button
              onClick={() => {
                reset()
                setSelectedId(null)
                flash('已重置市场')
              }}
              className="rounded-lg border border-market-border bg-white px-4 py-2 text-sm font-medium text-market-sub transition-colors hover:text-market-text"
            >
              重置
            </button>
          </div>
        </div>
      </section>

      {toast && (
        <div className="rounded-lg bg-market-text px-4 py-2.5 text-sm font-medium text-white shadow-md">{toast}</div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 左侧：发布任务 */}
        <section className="space-y-4 lg:col-span-1">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
            <h2 className="text-base font-bold text-market-text">🏢 企业发布任务</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">任务标题</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：2026 中国 AI 智能客服市场调研"
                  className="w-full rounded-lg border border-market-border bg-market-bg px-3 py-2 text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">任务类型</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {TASK_TYPE_META.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => setType(m.id)}
                      className={`rounded-lg px-2 py-1.5 text-xs font-medium transition-colors ${
                        type === m.id ? 'bg-indigo-500 text-white' : 'bg-market-bg text-market-sub hover:text-market-text'
                      }`}
                      title={m.hint}
                    >
                      {m.icon} {m.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">任务描述</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  rows={4}
                  placeholder="描述需求、交付物、验收标准…"
                  className="w-full resize-none rounded-lg border border-market-border bg-market-bg px-3 py-2 text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">预算（¥）</label>
                <input
                  type="number"
                  value={budget}
                  min={50}
                  step={50}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full rounded-lg border border-market-border bg-market-bg px-3 py-2 text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={publish}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-sky-500 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90"
              >
                发布任务
              </button>
            </div>
          </div>

          {/* 市场看板 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
            <h2 className="text-base font-bold text-market-text">📊 市场看板</h2>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-market-bg p-3">
                <div className="text-xs text-market-sub">累计中标</div>
                <div className="mt-0.5 text-lg font-bold text-market-text tnum">{totalWins}</div>
              </div>
              <div className="rounded-lg bg-market-bg p-3">
                <div className="text-xs text-market-sub">执行方总收入</div>
                <div className="mt-0.5 text-lg font-bold text-market-text tnum">{fmtMoney(totalRevenue)}</div>
              </div>
            </div>
            <div className="mt-3 space-y-2">
              {providers.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg bg-market-bg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span>{p.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-market-text">{p.name}</div>
                      <div className="text-[10px] text-market-sub">
                        {p.type === 'llm' ? 'AI 执行' : '外部能力'} · 信誉 {p.quality.toFixed(1)}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-bold text-market-text tnum">中标 {p.wins}</div>
                    <div className="text-[10px] text-market-sub tnum">收入 {fmtMoney(p.revenue)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 右侧：任务列表 + 详情 */}
        <section className="space-y-4 lg:col-span-2">
          {/* 任务列表 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
            <h2 className="text-base font-bold text-market-text">📋 任务列表</h2>
            {tasks.length === 0 ? (
              <div className="mt-4 rounded-lg bg-market-bg py-10 text-center text-sm text-market-sub">
                还没有任务，请在左侧发布第一个任务
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {tasks.map((t) => {
                  const meta = TASK_TYPE_META.find((m) => m.id === t.type)!
                  const st = STATUS_META[t.status]
                  return (
                    <button
                      key={t.id}
                      onClick={() => setSelectedId(t.id)}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                        selectedId === t.id ? 'bg-indigo-50 ring-1 ring-indigo-300' : 'bg-market-bg hover:bg-indigo-50/50'
                      }`}
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-market-sub">#{t.id}</span>
                          <span className="truncate text-sm font-semibold text-market-text">{t.title}</span>
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-market-sub">
                          <span>{meta.icon} {meta.label}</span>
                          <span>·</span>
                          <span className="tnum">{fmtMoney(t.budget)}</span>
                          <span>·</span>
                          <span>{t.createdAt}</span>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ring-1 ${st.cls}`}>{st.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 任务详情 */}
          {selected ? (
            <TaskDetail task={selected} bids={selectedBids} />
          ) : (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
              <div className="py-8 text-center text-sm text-market-sub">点击左侧任务查看竞标与结算详情</div>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function TaskDetail({ task, bids }: { task: MarketTask; bids: MarketBid[] }) {
  const st = STATUS_META[task.status]
  const sorted = [...bids].sort((a, b) => b.finalScore - a.finalScore)
  const typeMeta = TASK_TYPE_META.find((m) => m.id === task.type)!

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-market-sub">#{task.id}</span>
            <h2 className="text-lg font-bold text-market-text">{task.title}</h2>
          </div>
          <p className="mt-1 text-sm text-market-sub">{task.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded bg-indigo-500/10 px-2 py-0.5 font-medium text-indigo-600">{typeMeta.icon} {typeMeta.label}</span>
            <span className="tnum font-semibold text-market-text">{fmtMoney(task.budget)}</span>
            <span className={`rounded px-2 py-0.5 font-bold ring-1 ${st.cls}`}>{st.label}</span>
            {task.winnerName && <span className="text-market-sub">🏆 中标：{task.winnerName}</span>}
          </div>
        </div>
      </div>

      {/* 竞标表 */}
      {sorted.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-market-text">⚔️ 竞争报价</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-market-border text-xs text-market-sub">
                  <th className="py-2 pr-3">能力方</th>
                  <th className="py-2 pr-3 text-right">报价</th>
                  <th className="py-2 pr-3 text-right">匹配度</th>
                  <th className="py-2 pr-3 text-right">信誉</th>
                  <th className="py-2 pr-3 text-right">综合分</th>
                  <th className="py-2 text-right">结果</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((b) => {
                  return (
                    <tr key={b.providerId} className="border-b border-market-border/50">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span>{b.icon}</span>
                          <span className="font-medium text-market-text">{b.providerName}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-right tnum">{fmtMoney(b.price)}</td>
                      <td className="py-2 pr-3 text-right tnum">{Math.round(b.match * 100)}%</td>
                      <td className="py-2 pr-3 text-right tnum">{Math.round(b.confidence * 100)}</td>
                      <td className="py-2 pr-3 text-right font-bold text-market-text tnum">{b.finalScore.toFixed(3)}</td>
                      <td className="py-2 text-right">
                        {b.status === 'won' ? (
                          <span className="rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-bold text-emerald-600 ring-1 ring-emerald-400/40">中标</span>
                        ) : (
                          <span className="text-xs text-market-sub">落选</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 执行结果 / 交付物 */}
      {task.result && (
        <div className="mt-4">
          <h3 className="text-sm font-bold text-market-text">📦 交付物</h3>
          <div className="mt-2 max-h-80 overflow-y-auto whitespace-pre-wrap rounded-lg bg-market-bg p-4 text-xs leading-relaxed text-market-text">
            {task.result}
          </div>
        </div>
      )}

      {/* 验收 + 结算 */}
      {task.status === 'settled' && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Stat label="验收评分" value={`${task.qualityScore} 分`} accent={task.qualityScore! >= 70 ? 'text-emerald-600' : 'text-amber-600'} />
          <Stat label="平台抽成" value={fmtMoney(task.platformFee!)} />
          <Stat label="执行方收入" value={fmtMoney(task.providerRevenue!)} />
          <Stat label="执行方利润" value={fmtMoney(task.providerProfit!)} accent="text-emerald-600" />
        </div>
      )}

      {(task.status === 'external' || task.status === 'reviewing') && task.feedback && (
        <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200/70">{task.feedback}</div>
      )}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-lg bg-market-bg p-3">
      <div className="text-xs text-market-sub">{label}</div>
      <div className={`mt-0.5 text-base font-bold tnum ${accent ?? 'text-market-text'}`}>{value}</div>
    </div>
  )
}
