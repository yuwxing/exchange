import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { AGENT_META } from '../ai/intelligence'
import AdvisorChat from '../components/AdvisorChat'
import type { AgentId } from '../types'

export default function Intelligence() {
  const aiReports = useMarket((s) => s.aiReports)
  const dailyReport = useMarket((s) => s.dailyReport)
  const candidates = useMarket((s) => s.candidates)
  const listings = useMarket((s) => s.listings)
  const runAgent = useMarket((s) => s.runAgent)
  const generateReport = useMarket((s) => s.generateReport)
  const listCandidate = useMarket((s) => s.listCandidate)
  const publishNews = useMarket((s) => s.publishNews)
  const news = useMarket((s) => s.news)
  const allAssets = useMarket((s) => s.allAssets)
  const radar = useMarket((s) => s.radar)
  const runRadar = useMarket((s) => s.runRadar)
  const navigate = useNavigate()

  const [running, setRunning] = useState<AgentId | null>(null)
  const [toast, setToast] = useState('')

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 2600)
  }

  const run = (id: AgentId) => {
    setRunning(id)
    setTimeout(() => {
      runAgent(id)
      setRunning(null)
    }, 500)
  }

  const doReport = () => {
    generateReport()
    showToast('AI 市场日报已生成')
  }

  const doRadar = () => {
    const ops = runRadar()
    showToast(`机会雷达扫描完成：发现 ${ops.length} 个机会`)
  }

  const doList = (symbol: string) => {
    const res = listCandidate(symbol)
    showToast(res.message)
    if (res.ok) setTimeout(() => navigate(`/asset/${symbol}`), 1200)
  }

  const doAutoNews = () => {
    const event = news.find((n) => !n.published)
    if (event) {
      publishNews(event.id)
      showToast(`已发布新闻事件：${event.title.slice(0, 24)}…`)
    } else {
      showToast('暂无可发布的待办事件')
    }
  }

  const unpubCount = news.filter((n) => !n.published).length

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-market-border/60">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold text-market-text">AI Intelligence</span>
              <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                6 个智能体协同
              </span>
            </div>
            <p className="mt-2 max-w-2xl text-sm text-market-sub">
              不是人手工给 AI 产品报价 —— 由 AI Research Agent + Market Agent + Valuation Agent 每天扫描全球
              AI 市场，自动发现新模型、新 Agent、新 Skill、新应用、新机器人，自动生成资产卡、评级、指数与模拟价格。
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={doRadar}
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-600"
            >
              📡 运行机会雷达
            </button>
            <button
              onClick={doAutoNews}
              className="rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-rose-600"
            >
              📰 自动发布新闻（{unpubCount}）
            </button>
            <button
              onClick={doReport}
              className="rounded-lg bg-market-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-market-primary-hover"
            >
              📋 生成 AI 市场日报
            </button>
          </div>
        </div>
      </div>

      {/* AI 顾问对话 */}
      <AdvisorChat />

      {dailyReport && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">📋 {dailyReport.title}</h2>
            <span className="text-xs text-market-sub">
              由 {dailyReport.agentCount} 个 AI 智能体协同生成 · {dailyReport.generatedAt}
            </span>
          </div>
          <p className="text-sm text-market-sub">{dailyReport.summary}</p>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {dailyReport.sections.map((s) => (
              <div key={s.label} className="rounded-lg bg-market-bg p-3">
                <div className="text-xs font-semibold text-market-primary">{s.label}</div>
                <div className="mt-1 text-xs leading-relaxed text-market-sub">{s.text}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI 机会雷达 */}
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-base font-bold text-market-text">📡 AI 机会雷达</h2>
          <span className="text-[11px] text-market-sub">低估值 · 高增长 · 巨鲸流入 · 强势突破（模拟）</span>
        </div>
        {radar.length === 0 ? (
          <div className="rounded-lg bg-market-bg/40 p-4 text-center text-xs text-market-sub">
            尚未扫描，点击「运行机会雷达」扫描全市场 AI 资产
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {radar.map((o) => (
              <Link
                key={`${o.symbol}-${o.tag}`}
                to={`/asset/${o.symbol}`}
                className="rounded-lg border border-market-border px-4 py-3 transition-colors hover:border-market-primary/50"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-market-text">
                    {o.symbol} <span className="font-normal text-market-sub">{o.name}</span>
                  </span>
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      o.tag === '强势突破'
                        ? 'bg-market-up/10 text-market-up'
                        : o.tag === '资金流入'
                          ? 'bg-sky-500/10 text-sky-600'
                          : o.tag === '高增长'
                            ? 'bg-violet-500/10 text-violet-600'
                            : 'bg-amber-500/10 text-amber-600'
                    }`}
                  >
                    {o.tag}
                  </span>
                </div>
                <div className="mt-1 text-[11px] leading-relaxed text-market-sub">{o.reason}</div>
                <div className="mt-1.5 flex items-center justify-between text-[11px] text-market-sub tnum">
                  <span>${o.price.toFixed(2)} · {o.changePct >= 0 ? '+' : ''}{(o.changePct * 100).toFixed(2)}%</span>
                  <span className="font-bold text-market-primary">AI {o.aiValue}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* 候选资产发现 */}
      {candidates.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-bold text-market-text">🔭 AI Research Agent 发现（{candidates.length} 个候选）</h2>
            <span className="text-xs text-market-sub">一键模拟上市 · 本次会话有效</span>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {candidates.slice(0, 6).map((c) => (
              <div key={c.symbol} className="flex items-center justify-between rounded-lg border border-market-border px-4 py-3">
                <div>
                  <div className="text-sm font-bold text-market-text">
                    {c.symbol} <span className="font-normal text-market-sub">{c.name}</span>
                  </div>
                  <div className="mt-0.5 line-clamp-1 text-[11px] text-market-sub">{c.description}</div>
                  <div className="mt-0.5 text-[10px] text-market-sub">
                    发行价 ${c.basePrice} · AI 评分 {c.score}
                  </div>
                </div>
                <button
                  onClick={() => doList(c.symbol)}
                  className="shrink-0 rounded-lg bg-market-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-market-primary-hover"
                >
                  上市
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {listings.length > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
          <h2 className="mb-3 text-base font-bold text-market-text">📌 本会话模拟上市记录</h2>
          <div className="flex flex-wrap gap-2">
            {listings.map((l) => (
              <Link
                key={l.symbol}
                to={`/asset/${l.symbol}`}
                className="rounded-lg bg-market-bg px-3 py-1.5 text-xs font-semibold text-market-text hover:text-market-primary"
              >
                {l.symbol} <span className="font-normal text-market-sub">· {l.time}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 六大智能体 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {AGENT_META.map((meta) => {
          const report = aiReports[meta.id]
          const isRunning = running === meta.id
          return (
            <div key={meta.id} className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${meta.color} text-xl text-white`}
                  >
                    {meta.icon}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-market-text">{meta.name}</div>
                    <div className="text-[11px] text-market-sub">{meta.role}</div>
                  </div>
                </div>
                <button
                  onClick={() => run(meta.id)}
                  disabled={isRunning}
                  className="shrink-0 rounded-lg bg-market-primary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-market-primary-hover disabled:opacity-50"
                >
                  {isRunning ? '运行中…' : '▶ 运行'}
                </button>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-market-sub">{meta.desc}</p>

              {report ? (
                <div className="mt-3 rounded-lg bg-market-bg/60 p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-market-text">{report.title}</span>
                    {report.level && (
                      <span className="rounded bg-market-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-market-primary">
                        {report.level}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-market-sub">{report.summary}</p>
                  <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-market-sub">
                    {report.points.map((p, i) => (
                      <li key={i} className="flex gap-1.5">
                        <span className="text-market-primary">·</span>
                        {p}
                      </li>
                    ))}
                  </ul>
                  {report.linkedSymbol &&
                    (() => {
                      const listed = allAssets().some((a) => a.symbol === report.linkedSymbol)
                      const cand = candidates.find((c) => c.symbol === report.linkedSymbol)
                      if (listed)
                        return (
                          <Link
                            to={`/asset/${report.linkedSymbol}`}
                            className="mt-2 inline-block rounded bg-white px-2 py-1 text-[11px] font-semibold text-market-primary ring-1 ring-market-border/60 hover:bg-market-bg"
                          >
                            查看 {report.linkedSymbol} →
                          </Link>
                        )
                      if (cand)
                        return (
                          <button
                            onClick={() => doList(cand.symbol)}
                            className="mt-2 inline-block rounded bg-market-primary px-2 py-1 text-[11px] font-semibold text-white hover:bg-market-primary-hover"
                          >
                            模拟上市 {cand.symbol} →
                          </button>
                        )
                      return null
                    })()}
                  <div className="mt-2 text-right text-[10px] text-market-sub">{report.time}</div>
                </div>
              ) : (
                <div className="mt-3 rounded-lg bg-market-bg/40 p-3 text-center text-xs text-market-sub">
                  尚未运行，点击「运行」生成报告
                </div>
              )}
            </div>
          )
        })}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-lg bg-market-text px-5 py-3 text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}
