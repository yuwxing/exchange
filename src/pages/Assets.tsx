import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useMarket } from '../store/market'
import { SECTORS } from '../data/assets'
import AssetTable from '../components/AssetTable'
import { typeName } from '../utils/assetType'

export default function Assets() {
  const [params, setParams] = useSearchParams()
  const initialSector = params.get('sector') ?? 'all'
  const [sector, setSector] = useState<string>(initialSector)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const allAssets = useMarket((s) => s.allAssets)

  const assets = allAssets()

  const list = useMemo(() => {
    return assets.filter((a) => {
      const matchSector = sector === 'all' || a.sectorId === sector
      const matchType = typeFilter === 'all' || a.type === typeFilter
      const q = query.trim().toLowerCase()
      const matchQuery =
        q === '' ||
        a.symbol.toLowerCase().includes(q) ||
        a.name.toLowerCase().includes(q) ||
        a.nameEn.toLowerCase().includes(q) ||
        (a.issuer ?? '').toLowerCase().includes(q)
      return matchSector && matchType && matchQuery
    })
  }, [assets, sector, typeFilter, query])

  const selectSector = (id: string) => {
    setSector(id)
    if (id === 'all') params.delete('sector')
    else params.set('sector', id)
    setParams(params, { replace: true })
  }

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = {}
    for (const a of assets) map[a.type] = (map[a.type] ?? 0) + 1
    return map
  }, [assets])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-market-text">AI 资产市场</h1>
          <p className="mt-0.5 text-sm text-market-sub">
            全球 AI 资产统一资产化 · 指数化 · 交易化 · {assets.length} 个模拟上市标的
          </p>
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索代码 / 名称，如 AI-OPENAI 或 DeepSeek"
          className="w-full max-w-xs rounded-lg border border-market-border bg-white px-3 py-2 text-sm text-market-text outline-none focus:border-market-primary"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => selectSector('all')}
          className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
            sector === 'all'
              ? 'bg-market-primary text-white'
              : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
          }`}
        >
          全部板块
        </button>
        {SECTORS.map((c) => (
          <button
            key={c.id}
            onClick={() => selectSector(c.id)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              sector === c.id
                ? 'bg-market-primary text-white'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            {c.symbol} {c.code} {c.name}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setTypeFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            typeFilter === 'all'
              ? 'bg-market-text text-white'
              : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
          }`}
        >
          全部类型
        </button>
        {Object.entries(typeCounts).map(([t, count]) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              typeFilter === t
                ? 'bg-market-text text-white'
                : 'bg-white text-market-sub ring-1 ring-market-border/60 hover:text-market-text'
            }`}
          >
            {typeName(t)} · {count}
          </button>
        ))}
      </div>

      <AssetTable assets={list} />

      <div className="rounded-xl bg-white p-4 text-xs leading-relaxed text-market-sub shadow-sm ring-1 ring-market-border/60">
        点击表头可排序。点击任意资产可进入详情页查看 K 线、AI 价值指标与 AI 评分，并可进行模拟买卖。
        所有价格由 AI Engine 实时模拟生成；AI 资产仅作生态贡献衡量，不构成任何货币或证券发行。
      </div>
    </div>
  )
}
