import { useMemo, useState } from 'react'
import { useMarket } from '../store/market'
import { CONTRIBUTION_RULES } from '../data/stocks'
import { fmtCompact, fmtNumber, isUp } from '../utils/format'
import { Sparkline } from '../components/Sparkline'
import type { Candle } from '../types'

const ALLOCATION = [
  { label: '用户贡献奖励', pct: 40, desc: '学习、内容、使用行为的贡献回报' },
  { label: '开发者生态', pct: 20, desc: 'Skill 与 Agent 应用开发者激励' },
  { label: '教育机构', pct: 15, desc: '课程与教育内容合作方' },
  { label: '平台发展', pct: 15, desc: '生态基础设施与平台运营' },
  { label: '社区基金', pct: 10, desc: '社区自治与活动基金' },
]

export default function WegEconomy() {
  const eco = useMarket((s) => s.eco)
  const quotes = useMarket((s) => s.quotes)
  const candles = useMarket((s) => s.candles)
  const addContribution = useMarket((s) => s.addContribution)
  const account = useMarket((s) => s.account)
  const simDay = useMarket((s) => s.simDay)
  const lastSettle = useMarket((s) => s.lastSettle)
  const dailySettles = useMarket((s) => s.dailySettles)
  const marketOpen = useMarket((s) => s.marketOpen)
  const tradeDate = useMarket((s) => s.tradeDate)
  const [tab, setTab] = useState<'weg' | 'paper' | 'contribute'>('weg')
  const [toast, setToast] = useState('')

  const tabs: { id: 'weg' | 'paper' | 'contribute'; label: string }[] = [
    { id: 'weg', label: 'WEG 行情' },
    { id: 'paper', label: '经济白皮书' },
    { id: 'contribute', label: 'AI 贡献系统' },
  ]

  const wegCandles: Candle[] = useMemo(() => {
    return (candles.WEG ?? []).map((c) => ({
      ...c,
      close: c.close * 0.085,
    }))
  }, [candles])

  const up = isUp((eco.wegPrice - eco.wegPrev) / eco.wegPrev)
  const spark =
    dailySettles.length >= 3
      ? dailySettles.slice(-28)
      : wegCandles.slice(-24).map((c) => c.close)
  const factor = [eco.indices.users, eco.indices.agent, eco.indices.calls, eco.indices.revenue]

  const claim = (action: string, reward: number) => {
    addContribution(action, reward)
    setToast(`+${reward} WEG · ${action}`)
    setTimeout(() => setToast(''), 2200)
  }

  const wegQuote = quotes.WEG

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-market-text">WEG</span>
              <span className="text-sm text-market-sub">AI Education Economy</span>
              <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                生态积分资产 · 非证券
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-market-sub">
              AI-Wego 生态积分资产，衡量 AI 教育生态的贡献价值。不是货币，不发行、不募资、不承诺升值回报，
              仅用于衡量与记录学习 / Agent / 内容 / 技能贡献。
            </p>
          </div>
          <div className="text-right">
            <div className="flex items-center justify-end gap-2">
              <span
                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  marketOpen
                    ? 'bg-market-up/10 text-market-up'
                    : 'bg-market-bg text-market-sub'
                }`}
              >
                {marketOpen ? '● 交易中' : '○ 已收盘'}
              </span>
            </div>
            <div className={`mt-1 text-4xl font-bold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
              ¥{fmtNumber(eco.wegPrice)}
            </div>
            <div className={`mt-1 text-lg font-semibold tnum ${up ? 'text-market-up' : 'text-market-down'}`}>
              {up ? '▲' : '▼'} {Math.abs(((eco.wegPrice - eco.wegPrev) / eco.wegPrev) * 100).toFixed(2)}%
            </div>
            <div className="mt-1 text-xs text-market-sub">模拟结算价 · 由 AI Engine 生成</div>
            <div className="mt-1 text-[11px] text-market-sub">
              第 {simDay} 个交易日（{tradeDate}）· 上次结算 ¥{lastSettle.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="总发行" value={`${fmtCompact(eco.totalSupply)} WEG`} sub="1,000,000,000" />
          <Stat label="流通" value={fmtCompact(eco.circulating)} sub="2 亿，占总发行 20%" />
          <Stat label="生态用户" value={fmtCompact(eco.users)} sub="月活跃持续增长" />
          <Stat label="每日活跃" value={fmtCompact(eco.dailyActive)} sub="日活 / 用户 ≈ 16.7%" />
        </div>
      </div>

      <div className="flex gap-2">
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

      {tab === 'weg' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-bold text-market-text">
                {dailySettles.length >= 3 ? '每日结算走势' : 'WEG 价格走势（近 24 日）'}
              </h2>
              <span className="text-xs text-market-sub">
                {dailySettles.length >= 3 ? '每次收盘记录一个结算点' : '模拟结算走势'}
              </span>
            </div>
            <div className="h-36 w-full">
              <Sparkline data={spark} color={up ? '#16A34A' : '#DC2626'} width={720} height={140} />
            </div>
            <div className="mt-2 text-xs text-market-sub">
              当前市场报价 ¥{fmtNumber(wegQuote?.price ?? 5.8)}（含交易波动） · 结算价 ¥{eco.wegPrice.toFixed(2)}（由生态指数计算）
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
          </div>
        </div>
      )}

      {tab === 'paper' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-market-text">《WEG 经济白皮书》（模拟版）</span>
              <span className="rounded bg-market-bg px-1.5 py-0.5 text-[10px] font-bold text-market-sub">
                v1.0 · 教育模拟
              </span>
            </div>

            <div className="mt-4 space-y-4">
              <PaperSection title="1. 设计目标">
                <p>
                  WEG 不是货币。它是 AI 生态贡献积分，用于衡量与记录用户在生态中的学习贡献、Agent
                  贡献、内容贡献与技能贡献。WEG 不发行交易代币、不募资、不承诺任何升值回报，仅作为
                  生态贡献的可量化记录，帮助用户理解「AI 时代的模拟证券市场」。
                </p>
              </PaperSection>

              <PaperSection title="2. WEG 发行规则">
                <p className="text-sm text-market-sub">
                  总量：<span className="font-semibold text-market-text">1,000,000,000 WEG</span>
                  （10 亿），模拟一次性发行，用于生态贡献奖励的度量。
                </p>
                <div className="mt-3 overflow-hidden rounded-lg border border-market-border">
                  <table className="w-full text-sm">
                    <thead className="bg-market-bg/60 text-left text-xs text-market-sub">
                      <tr>
                        <th className="px-3 py-2 font-semibold">用途</th>
                        <th className="px-3 py-2 font-semibold">比例</th>
                        <th className="px-3 py-2 font-semibold">说明</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ALLOCATION.map((a) => (
                        <tr key={a.label} className="border-t border-market-border">
                          <td className="px-3 py-2.5 font-medium text-market-text">{a.label}</td>
                          <td className="px-3 py-2.5 font-bold text-market-primary tnum">
                            {a.pct}%
                          </td>
                          <td className="px-3 py-2.5 text-xs text-market-sub">{a.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex justify-between text-xs text-market-sub">
                    <span>发行分配</span>
                    <span>合计 {ALLOCATION.reduce((a, b) => a + b.pct, 0)}%</span>
                  </div>
                  <div className="flex h-4 w-full overflow-hidden rounded-full">
                    {ALLOCATION.map((a) => (
                      <div
                        key={a.label}
                        style={{ width: `${a.pct}%` }}
                        className={`h-full ${segColor(ALLOCATION.indexOf(a))}`}
                        title={`${a.label} ${a.pct}%`}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-market-sub">
                    {ALLOCATION.map((a, i) => (
                      <span key={a.label} className="flex items-center gap-1">
                        <i
                          className={`inline-block h-2 w-2 rounded-sm ${segColor(i)}`}
                        />
                        {a.label} {a.pct}%
                      </span>
                    ))}
                  </div>
                </div>
              </PaperSection>

              <PaperSection title="3. 生态指数与结算">
                <p>
                  每日 <b className="text-market-text">09:00 开盘、23:00 收盘</b>。交易时段内，AI Engine
                  依据用户增长指数、Agent 数量指数、调用量指数与收入指数实时生成模拟价格；每日 23:00
                  自动结算并记录当日结算点，次日 09:00 开盘指数重置为 1.0，形成真实日期循环。
                  新闻事件会影响上述指数，从而影响 WEG 模拟价格。
                </p>
              </PaperSection>

              <div className="rounded-lg bg-market-primary/5 px-4 py-3 text-sm text-market-primary">
                提示：本白皮书为教育模拟内容，WEG 不构成任何形式的货币、证券或投资标的。
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'contribute' && (
        <div className="space-y-5">
          <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-market-text">AI Contribution · AI 贡献</h2>
                <p className="mt-1 max-w-2xl text-sm text-market-sub">
                  不做挖矿，而是做贡献。学习、教学、开发、使用——每一份对 AI 生态的真实贡献，
                  都换算为 WEG 生态积分。右侧任务可一键模拟领取奖励（奖励自动入账模拟资金，¥1 WEG = ¥20 模拟资金）。
                </p>
              </div>
              <div className="rounded-lg bg-market-bg px-4 py-2 text-center">
                <div className="text-xs text-market-sub">我的累计贡献</div>
                <div className="text-lg font-bold text-market-primary tnum">
                  {fmtNumber(account.totalEarned)} WEG
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {CONTRIBUTION_RULES.map((role) => (
              <div key={role.role} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold text-market-text">
                    {role.icon} {role.role}
                  </h3>
                  <span className="text-xs text-market-sub">点击领取模拟奖励</span>
                </div>
                <div className="space-y-2">
                  {role.items.map((item) => (
                    <div
                      key={item.action}
                      className="flex items-center justify-between rounded-lg border border-market-border px-3 py-2.5"
                    >
                      <div>
                        <div className="text-sm text-market-text">{item.action}</div>
                        {item.note && (
                          <div className="text-[11px] text-amber-600">{item.note}</div>
                        )}
                      </div>
                      <button
                        onClick={() => claim(item.action, item.reward)}
                        className="shrink-0 rounded-lg bg-market-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-market-primary-hover"
                      >
                        +{item.reward} WEG
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
            <h3 className="mb-3 text-sm font-bold text-market-text">普通用户贡献链路</h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-market-sub">
              {['使用 AI', '每日任务', 'AI 行为数据', '贡献值', 'WEG 奖励'].map((step, i, arr) => (
                <span key={step} className="flex items-center gap-2">
                  <span className="rounded-lg bg-market-bg px-3 py-1.5 font-medium text-market-text">
                    {step}
                  </span>
                  {i < arr.length - 1 && <span className="text-market-primary">→</span>}
                </span>
              ))}
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

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-market-border p-3">
      <div className="text-xs text-market-sub">{label}</div>
      <div className="mt-1 text-lg font-bold text-market-text tnum">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-market-sub">{sub}</div>}
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

function segColor(i: number) {
  const colors = ['bg-market-primary', 'bg-sky-400', 'bg-emerald-400', 'bg-amber-400', 'bg-violet-400']
  return colors[i % colors.length]
}
