import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarket } from '../store/market'
import { analyzeAdvisor } from '../ai/advisor'
import type { AdvisorReply } from '../ai/advisor'

type Msg = { role: 'user' | 'ai'; text: string; reply?: AdvisorReply }

const QUICK = ['市场情绪怎么样', 'AI-DEEPSEEK 怎么样', '有什么机会', '分析我的持仓', 'WEG 金库是什么']

export default function AdvisorChat() {
  const assets = useMarket((s) => s.allAssets)()
  const quotes = useMarket((s) => s.quotes)
  const sentiment = useMarket((s) => s.sentiment)
  const radar = useMarket((s) => s.radar)
  const whaleFlows = useMarket((s) => s.whaleFlows)
  const whaleTrades = useMarket((s) => s.whaleTrades)
  const account = useMarket((s) => s.account)
  const reports = useMarket((s) => s.aiReports)
  const wegPrice = useMarket((s) => s.eco.wegPrice)
  const lastAttribution = useMarket((s) => s.lastAttribution)
  const runRadar = useMarket((s) => s.runRadar)
  const runAgent = useMarket((s) => s.runAgent)

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      role: 'ai',
      text: '你好，我是 AI 顾问 🤖。可以问我市场情绪、具体资产、投资机会、持仓诊断、风险提示或 WEG 金库玩法。',
    },
  ])
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  const ctx = useMemo(
    () => ({
      assets,
      quotes,
      sentiment,
      radar,
      whaleFlows,
      whaleTrades: whaleTrades.map((t) => ({ whaleName: t.whaleName, whaleIcon: t.whaleIcon, symbol: t.symbol, direction: t.direction, amount: t.amount, time: t.time })),
      account,
      reports,
      wegPrice,
      lastAttribution,
    }),
    [assets, quotes, sentiment, radar, whaleFlows, whaleTrades, account, reports, wegPrice, lastAttribution],
  )

  const ask = (raw: string) => {
    const text = raw.trim()
    if (!text || thinking) return
    const userMsg: Msg = { role: 'user', text }
    setMsgs((m) => [...m, userMsg])
    setInput('')
    setThinking(true)
    setTimeout(() => {
      const reply = analyzeAdvisor(text, ctx)
      if (reply.suggestion?.includes('机会雷达') || reply.reply.includes('机会雷达')) runRadar()
      if (reply.suggestion?.includes('AI Portfolio Agent')) runAgent('portfolio')
      setMsgs((m) => [...m, { role: 'ai', text: reply.reply, reply }])
      setThinking(false)
    }, 600)
  }

  return (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold text-market-text">💬 AI 顾问</h2>
        <span className="text-[11px] text-market-sub">对话式投顾 · 教育模拟</span>
      </div>

      <div ref={listRef} className="max-h-80 space-y-3 overflow-y-auto rounded-lg bg-market-bg/50 p-3">
        {msgs.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                m.role === 'user' ? 'rounded-br-sm bg-market-primary text-white' : 'rounded-bl-sm bg-white text-market-text ring-1 ring-market-border/60'
              }`}
            >
              <div>{m.text}</div>
              {m.reply?.points && (
                <ul className="mt-1.5 space-y-0.5 text-xs text-market-sub">
                  {m.reply.points.map((p, j) => (
                    <li key={j} className="flex gap-1.5">
                      <span className="text-market-primary">·</span>
                      {p}
                    </li>
                  ))}
                </ul>
              )}
              {m.reply?.linkedSymbol && (
                <Link
                  to={`/asset/${m.reply.linkedSymbol}`}
                  className="mt-1.5 inline-block rounded bg-market-bg px-2 py-0.5 text-xs font-semibold text-market-primary hover:bg-market-border/60"
                >
                  查看 {m.reply.linkedSymbol} →
                </Link>
              )}
              {m.reply?.suggestion && <div className="mt-1.5 text-xs text-market-primary/80">💡 {m.reply.suggestion}</div>}
            </div>
          </div>
        ))}
        {thinking && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-2.5 text-sm text-market-sub ring-1 ring-market-border/60">
              AI 顾问思考中…
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {QUICK.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            className="rounded-full bg-market-bg px-3 py-1 text-[11px] text-market-sub transition-colors hover:bg-market-primary/10 hover:text-market-primary"
          >
            {q}
          </button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && ask(input)}
          placeholder="问点关于 AI 市场的问题…"
          className="w-full rounded-lg border border-market-border px-3 py-2 text-sm text-market-text outline-none focus:border-market-primary"
        />
        <button
          onClick={() => ask(input)}
          disabled={thinking}
          className="shrink-0 rounded-lg bg-market-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-market-primary-hover disabled:opacity-50"
        >
          发送
        </button>
      </div>
    </div>
  )
}
