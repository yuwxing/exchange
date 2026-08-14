import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMarket } from '../store/market'
import { SECTORS } from '../data/assets'

export default function News() {
  const news = useMarket((s) => s.news)
  const publishNews = useMarket((s) => s.publishNews)
  const eco = useMarket((s) => s.eco)
  const [filter, setFilter] = useState<string>('all')
  const [toast, setToast] = useState('')

  const pool = useMemo(() => news.filter((n) => !n.published), [news])
  const list = useMemo(() => {
    if (filter === 'all') return news
    if (filter === 'important') return news.filter((n) => n.importance === 3)
    return news.filter((n) => n.sectorId === filter)
  }, [news, filter])

  const publish = (id: string, title: string) => {
    publishNews(id)
    setToast(`事件已发布，行情已更新：${title}`)
    setTimeout(() => setToast(''), 2600)
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-market-text">AI 新闻事件</h1>
          <p className="mt-0.5 text-sm text-market-sub">
            新闻事件会通过 AI Engine 影响板块指数与 WEG 模拟结算价 · 待发布事件可一键模拟发布
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-market-sub">待发布</span>
          <span className="rounded bg-amber-500/10 px-2 py-0.5 font-bold text-amber-600 tnum">
            {pool.length}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'all'
              ? 'bg-market-primary text-white'
              : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('important')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            filter === 'important'
              ? 'bg-market-primary text-white'
              : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
          }`}
        >
          🔔 重要事件
        </button>
        {SECTORS.map((c) => (
          <button
            key={c.id}
            onClick={() => setFilter(c.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              filter === c.id
                ? 'bg-market-primary text-white'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            {c.symbol} {c.code} {c.name}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {list.map((n) => (
          <div
            key={n.id}
            className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                      n.importance === 3
                        ? 'bg-market-down/10 text-market-down'
                        : n.importance === 2
                          ? 'bg-amber-500/10 text-amber-600'
                          : 'bg-market-bg text-market-sub'
                    }`}
                  >
                    {n.importance === 3 ? '重要' : n.importance === 2 ? '关注' : '一般'}
                  </span>
                  {n.symbol && (
                    <Link
                      to={`/asset/${n.symbol}`}
                      className="rounded bg-market-bg px-1.5 py-0.5 text-[10px] font-bold text-market-text hover:text-market-primary"
                    >
                      {n.symbol}
                    </Link>
                  )}
                  <span className="text-xs text-market-sub">{n.time}</span>
                  {n.published ? (
                    <span className="rounded bg-market-up/10 px-1.5 py-0.5 text-[10px] font-bold text-market-up">
                      已发布
                    </span>
                  ) : (
                    <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600">
                      待发布
                    </span>
                  )}
                </div>
                <h2 className="mt-2 text-base font-semibold text-market-text">{n.title}</h2>
                <p className="mt-1 text-sm text-market-sub">{n.summary}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {n.effect.map((e) => (
                    <span
                      key={e.index}
                      className="rounded bg-market-primary/5 px-2 py-0.5 text-[11px] text-market-primary"
                    >
                      影响 {indexLabel(e.index)} {e.delta >= 0 ? '+' : ''}
                      {Math.round(e.delta * 100)}%
                    </span>
                  ))}
                </div>
              </div>
              {!n.published && (
                <button
                  onClick={() => publish(n.id, n.title)}
                  className="shrink-0 rounded-lg bg-market-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-market-primary-hover"
                >
                  模拟发布
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-market-primary/5 p-5 text-sm leading-relaxed text-market-sub">
        <span className="font-bold text-market-primary">机制说明：</span>
        每条事件都会对指定板块指数或生态指数产生百分比影响，进而驱动相关股票与
        WEG 模拟结算价波动。当前生态指数 —— 用户增长{' '}
        <b className="text-market-text tnum">{eco.indices.users.toFixed(2)}</b>、Agent 数量{' '}
        <b className="text-market-text tnum">{eco.indices.agent.toFixed(2)}</b>、调用量{' '}
        <b className="text-market-text tnum">{eco.indices.calls.toFixed(2)}</b>、收入{' '}
        <b className="text-market-text tnum">{eco.indices.revenue.toFixed(2)}</b>。
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 w-full max-w-md -translate-x-1/2 rounded-lg bg-market-text px-5 py-3 text-center text-sm font-medium text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  )
}

function indexLabel(key: string) {
  const map: Record<string, string> = {
    users: '用户指数',
    agent: 'Agent 数量指数',
    calls: '调用量指数',
    revenue: '收入指数',
    developers: '开发者生态',
    ecosystem: '生态指数',
    market: '市场情绪',
    model: '模型板块',
    skill: '技能板块',
    mcp: '工具协议板块',
    app: '应用板块',
    robot: '机器人板块',
    data: '数据板块',
    infra: '算力板块',
    protocol: '协议板块',
  }
  return map[key] ?? key
}
