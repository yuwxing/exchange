import { useMemo, useState } from 'react'
import { CATEGORIES, STOCKS } from '../data/stocks'
import StockTable from '../components/StockTable'

export default function Stocks() {
  const [cat, setCat] = useState<string>('all')
  const [query, setQuery] = useState('')

  const list = useMemo(() => {
    return STOCKS.filter((s) => {
      const matchCat = cat === 'all' || s.categoryId === cat
      const q = query.trim().toLowerCase()
      const matchQuery =
        q === '' ||
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.nameEn.toLowerCase().includes(q)
      return matchCat && matchQuery
    })
  }, [cat, query])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-market-text">AI 股票榜</h1>
          <p className="mt-0.5 text-sm text-market-sub">
            全市场 AI 生态上市公司模拟行情 · {STOCKS.length} 个标的
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索代码 / 名称，如 DSK 或 DeepSeek"
          className="w-full max-w-xs rounded-lg border border-market-border bg-white px-3 py-2 text-sm text-market-text outline-none focus:border-market-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCat('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            cat === 'all'
              ? 'bg-market-primary text-white'
              : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
          }`}
        >
          全部板块
        </button>
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              cat === c.id
                ? 'bg-market-primary text-white'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            {c.symbol} {c.name}
          </button>
        ))}
      </div>

      <StockTable stocks={list} />

      <div className="rounded-xl bg-white p-4 text-xs leading-relaxed text-market-sub shadow-sm ring-1 ring-market-border/60">
        点击表头可排序。点击任意股票可进入详情页查看 K 线、公司指标与 AI 评分，并可进行模拟买卖。
        所有价格由 AI Engine 实时模拟生成。
      </div>
    </div>
  )
}
