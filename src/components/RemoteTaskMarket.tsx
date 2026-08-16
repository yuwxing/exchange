import { useEffect, useRef, useState } from 'react'
import { useRemoteTaskMarket, REMOTE_TASK_TYPE_META, REMOTE_STATUS_META, type RemoteTaskType } from '../store/taskMarketRemote'
import { fmtNumber } from '../utils/format'

const fmtMoney = (n: number) => `¥${fmtNumber(n)}`

/** 任务市场 · 真实 API 模式（对接 task_market_api.py FastAPI v2） */
export default function RemoteTaskMarketPanel() {
  const {
    base,
    apiKey,
    connected,
    checking,
    tasks,
    submitting,
    lastError,
    setBase,
    setApiKey,
    health,
    submit,
    refresh,
    clearError,
  } = useRemoteTaskMarket()

  const [title, setTitle] = useState('')
  const [type, setType] = useState<RemoteTaskType>('research')
  const [desc, setDesc] = useState('')
  const [budget, setBudget] = useState(500)
  const [toast, setToast] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)

  const flash = (m: string) => {
    setToast(m)
    setTimeout(() => setToast(''), 3200)
  }

  // 已连接且有 key 时轮询任务状态（每 5s）
  useEffect(() => {
    if (connected && apiKey) {
      refresh()
      timer.current = setInterval(refresh, 5000)
      return () => {
        if (timer.current) clearInterval(timer.current)
      }
    }
  }, [connected, apiKey, refresh])

  const doSubmit = async () => {
    if (!title.trim() || !desc.trim()) {
      flash('请填写标题与描述（描述至少 10 字）')
      return
    }
    const r = await submit({ title: title.trim(), task_type: type, description: desc.trim(), budget })
    flash(r.ok ? `✅ ${r.message}，已进入后台执行` : `❌ ${r.message}`)
    if (r.ok) {
      setTitle('')
      setDesc('')
      await refresh()
    }
  }

  const selected = tasks.find((t) => t.id === selectedId) ?? null
  const settledCount = tasks.filter((t) => t.status === 'settled').length

  return (
    <div className="space-y-5">
      {toast && <div className="rounded-lg bg-market-text px-4 py-2.5 text-sm font-medium text-white shadow-md">{toast}</div>}
      {lastError && (
        <div className="flex items-center justify-between rounded-lg bg-red-50 px-4 py-2.5 text-sm text-red-600 ring-1 ring-red-200">
          <span>⚠️ {lastError}</span>
          <button onClick={clearError} className="text-xs font-bold hover:underline">清除</button>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* 连接配置 */}
        <section className="space-y-4 lg:col-span-1">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
            <h2 className="text-base font-bold text-market-text">🔌 API 连接</h2>
            <div className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">API 地址</label>
                <input
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder="留空=同源 /api 代理；生产填 https://api 域名"
                  className="w-full rounded-lg border border-market-border bg-market-bg px-3 py-2 text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">企业 API Key（aex_live_ 开头）</label>
                <input
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="aex_live_xxxxxxxx"
                  className="w-full rounded-lg border border-market-border bg-market-bg px-3 py-2 font-mono text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={async () => {
                  const ok = await health()
                  flash(ok ? '✅ 连接成功，后端在线' : `❌ 连接失败：${useRemoteTaskMarket.getState().lastError}`)
                }}
                disabled={checking}
                className="w-full rounded-lg bg-indigo-500 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-indigo-600 disabled:opacity-50"
              >
                {checking ? '检查中…' : '测试连接'}
              </button>
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ring-1 ${
                connected === null
                  ? 'bg-market-bg text-market-sub ring-market-border'
                  : connected
                    ? 'bg-emerald-50 text-emerald-600 ring-emerald-200'
                    : 'bg-red-50 text-red-600 ring-red-200'
              }`}>
                <span className={`h-2 w-2 rounded-full ${connected === null ? 'bg-slate-400' : connected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                {connected === null ? '未连接' : connected ? '后端在线' : '后端不可达'}
              </div>
              <p className="text-[11px] leading-relaxed text-market-sub">
                后端：scripts/task_market_api.py（FastAPI v2，端口 8000，HTTPS 中间件）。真实执行走 DeepSeek LLM →
                AI 评委验收 → 复式结算（平台抽成 15%）。Key 由管理员签发（TASK_MARKET_ADMIN_TOKEN）。
              </p>
            </div>
          </div>

          {/* 发布真实任务 */}
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
            <h2 className="text-base font-bold text-market-text">🚀 发布真实任务</h2>
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
                  {REMOTE_TASK_TYPE_META.map((m) => (
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
                  placeholder="描述需求、交付物、验收标准…（≥10 字）"
                  className="w-full resize-none rounded-lg border border-market-border bg-market-bg px-3 py-2 text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-market-sub">预算（¥）</label>
                <input
                  type="number"
                  value={budget}
                  min={10}
                  max={5000}
                  step={50}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full rounded-lg border border-market-border bg-market-bg px-3 py-2 text-sm text-market-text outline-none focus:border-indigo-400"
                />
              </div>
              <button
                onClick={doSubmit}
                disabled={submitting}
                className="w-full rounded-lg bg-gradient-to-r from-indigo-500 to-sky-500 py-2.5 text-sm font-bold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {submitting ? '提交中…' : '提交真实任务'}
              </button>
            </div>
          </div>
        </section>

        {/* 真实任务列表 */}
        <section className="space-y-4 lg:col-span-2">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">📋 真实任务列表</h2>
              <div className="flex items-center gap-3 text-xs text-market-sub">
                <span>已结算 <b className="text-emerald-600">{settledCount}</b> 单</span>
                <button onClick={() => refresh()} className="rounded-lg border border-market-border px-2.5 py-1 font-medium hover:bg-market-bg">
                  刷新
                </button>
              </div>
            </div>
            {tasks.length === 0 ? (
              <div className="mt-4 rounded-lg bg-market-bg py-10 text-center text-sm text-market-sub">
                {connected ? '暂无任务，发布一个试试' : '请先配置连接并测试'}
              </div>
            ) : (
              <div className="mt-3 space-y-2">
                {tasks.map((t) => {
                  const meta = REMOTE_TASK_TYPE_META.find((m) => m.id === t.task_type)!
                  const st = REMOTE_STATUS_META[t.status] ?? REMOTE_STATUS_META.queued
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
                          <span>{t.created_at?.slice(0, 16).replace('T', ' ')}</span>
                          {t.provider_name && <span>· 执行方 {t.provider_name}</span>}
                        </div>
                      </div>
                      <span className={`shrink-0 rounded px-2 py-0.5 text-xs font-bold ring-1 ${st.cls}`}>{st.label}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* 任务详情 / 状态流转说明 */}
          {selected ? (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
              <h2 className="text-base font-bold text-market-text">📄 {selected.id}</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between border-b border-market-border/60 pb-2">
                  <span className="text-market-sub">状态</span>
                  <span className={`rounded px-2 py-0.5 text-xs font-bold ring-1 ${REMOTE_STATUS_META[selected.status]?.cls}`}>
                    {REMOTE_STATUS_META[selected.status]?.label}
                  </span>
                </div>
                <div className="flex justify-between border-b border-market-border/60 pb-2">
                  <span className="text-market-sub">预算</span>
                  <span className="tnum font-semibold">{fmtMoney(selected.budget)}</span>
                </div>
                <div className="flex justify-between border-b border-market-border/60 pb-2">
                  <span className="text-market-sub">执行方</span>
                  <span className="font-semibold">{selected.provider_name ?? '待匹配'}</span>
                </div>
              </div>
              <div className="mt-4 rounded-lg bg-market-bg/60 px-4 py-3 text-xs leading-relaxed text-market-sub">
                <b className="text-market-text">状态流转：</b>queued（排队）→ executing（DeepSeek 真实执行）→ reviewing（AI 评委验收）
                → settled（复式结算，平台抽成 15%，利润入账）→ 利润回流飞轮「AI 收入 / AI 利润」节点。
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border">
              <h2 className="mb-3 text-base font-bold text-market-text">🔁 与飞轮联动</h2>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-lg bg-market-bg p-4">
                  <div className="text-xs text-market-sub">企业真实任务</div>
                  <div className="mt-1 text-lg font-bold text-market-text tnum">{tasks.length}</div>
                </div>
                <div className="rounded-lg bg-market-bg p-4">
                  <div className="text-xs text-market-sub">结算利润（最近）</div>
                  <div className="mt-1 text-lg font-bold text-emerald-600 tnum">
                    {tasks.some((t) => t.status === 'settled') ? fmtMoney(tasks.find((t) => t.status === 'settled')?.budget ?? 0) : '—'}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-[11px] leading-relaxed text-market-sub">
                结算后的真实利润会写入经济账本（Economic Ledger）的 revenue / profit，飞轮「AI 收入」「AI 利润」「企业估值」节点随之增长，
                与 Capital OS 模拟闭环共享同一套数据源。
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
