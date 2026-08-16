import { useMarket } from '../store/market'
import { FLYWHEEL_NODE_DEFS } from '../ai/flywheel'
import { fmtCompact, fmtNumber } from '../utils/format'
import type { FlywheelNodeId } from '../types'

const fmtMoney = (n: number) => `$${fmtNumber(n)}`

function Row({ label, value, cls = '' }: { label: string; value: string; cls?: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-market-border/50 py-1.5 text-sm last:border-0">
      <span className="text-market-sub">{label}</span>
      <span className={`tnum font-semibold ${cls}`}>{value}</span>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <div className="mb-1.5 text-xs font-bold uppercase tracking-wide text-market-sub">{title}</div>
      {children}
    </div>
  )
}

/** 飞轮节点详情弹层（只读 store 真实状态，与引擎同源） */
export default function FlywheelNodeDetail({ nodeId, onClose }: { nodeId: FlywheelNodeId; onClose: () => void }) {
  const capitalOs = useMarket((s) => s.capitalOs)
  const production = useMarket((s) => s.production)
  const ledger = useMarket((s) => s.ledger)
  const demand = useMarket((s) => s.demand)
  const account = useMarket((s) => s.account)
  const quotes = useMarket((s) => s.quotes)
  const extraAssets = useMarket((s) => s.extraAssets)
  const candidates = useMarket((s) => s.candidates)
  const listings = useMarket((s) => s.listings)
  const flywheel = useMarket((s) => s.flywheel)

  const def = FLYWHEEL_NODE_DEFS.find((d) => d.id === nodeId)
  const node = flywheel.nodes.find((n) => n.id === nodeId)

  const renderBody = () => {
    switch (nodeId) {
      case 'capital': {
        const invested = capitalOs?.targets ?? []
        return (
          <>
            <Section title="资本构成">
              <Row label="初始资本" value={fmtMoney(capitalOs?.amount ?? 0)} />
              <Row label="累计分红回流" value={fmtMoney(ledger.dividend)} cls="text-market-up" />
              <Row label="留存再投资" value={fmtMoney(ledger.investment)} cls="text-market-primary" />
              <Row label="账户现金" value={fmtMoney(account.cash)} />
              <Row label="当前组合净值" value={fmtMoney(capitalOs?.nav ?? 0)} cls="text-market-up" />
              <Row label={`目标：${capitalOs?.goalLabel ?? '—'}`} value={capitalOs?.goalLabel ?? '—'} />
            </Section>
            <Section title="资本去向（板块配置）">
              {invested.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">尚未启动 Capital OS 配置</div>
              ) : (
                invested.map((t) => {
                  const price = quotes[t.symbol]?.price ?? 0
                  return (
                    <Row key={t.symbol} label={`${t.symbol} · ${t.name}`} value={`${t.pct.toFixed(0)}% · ${fmtMoney(price)}`} />
                  )
                })
              )}
            </Section>
          </>
        )
      }
      case 'company': {
        const invested = capitalOs?.targets ?? []
        const investedWithPrice = invested
          .map((t) => ({ ...t, price: quotes[t.symbol]?.price ?? 0 }))
          .filter((t) => t.price > 0)
        return (
          <>
            <Section title="被投企业（Capital OS 持仓）">
              {investedWithPrice.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无被投企业</div>
              ) : (
                investedWithPrice.map((t) => (
                  <Row key={t.symbol} label={`${t.symbol} · ${t.name}`} value={`${t.pct.toFixed(0)}%`} cls="text-market-primary" />
                ))
              )}
            </Section>
            <Section title="额外上市企业">
              {extraAssets.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无额外上市企业</div>
              ) : (
                extraAssets.map((a) => (
                  <Row key={a.symbol} label={`${a.symbol} · ${a.name}`} value={fmtMoney(quotes[a.symbol]?.price ?? a.basePrice)} />
                ))
              )}
            </Section>
          </>
        )
      }
      case 'ipo': {
        return (
          <>
            <Section title="已模拟上市">
              {listings.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">本会话暂无新增上市</div>
              ) : (
                listings.slice(-8).reverse().map((l) => (
                  <Row key={l.symbol} label={l.symbol} value={l.time} />
                ))
              )}
            </Section>
            <Section title="待上市管线（候选）">
              {candidates.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无候选管线</div>
              ) : (
                candidates.slice(0, 8).map((c) => (
                  <Row key={c.symbol} label={`${c.symbol} · ${c.name}`} value={`${fmtCompact(c.marketCap)}`} />
                ))
              )}
            </Section>
          </>
        )
      }
      case 'workforce': {
        return (
          <>
            <Section title="劳动力规模">
              <Row label="Capital OS 雇佣 Agent" value={`${capitalOs?.laborUnits ?? 0} 个`} />
              <Row label="生产引擎 Worker" value={`${production.workers.length} 个`} />
              <Row label="总产出" value={`${fmtCompact(production.totalOutput)} 任务`} />
              <Row label="累计工资" value={fmtMoney(production.totalWage)} cls="text-market-down" />
            </Section>
            <Section title="Worker 明细">
              {production.workers.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无 Worker，启动 Capital OS 后派生</div>
              ) : (
                production.workers.slice(0, 10).map((w) => (
                  <Row
                    key={w.id}
                    label={`${w.symbol} · ${w.skill}`}
                    value={`${w.efficiency.toFixed(2)}x · ${fmtCompact(w.output)}`}
                  />
                ))
              )}
            </Section>
          </>
        )
      }
      case 'production': {
        return (
          <>
            <Section title="生产统计">
              <Row label="累计产出" value={`${fmtCompact(production.totalOutput)} 任务`} cls="text-market-up" />
              <Row label="算力成本" value={fmtMoney(production.totalComputeCost)} cls="text-market-down" />
              <Row label="累计工资" value={fmtMoney(production.totalWage)} cls="text-market-down" />
              <Row label="订单成交金额" value={fmtMoney(demand.fulfilledValue)} cls="text-market-up" />
            </Section>
            <Section title="最近生产记录">
              {production.runs.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无生产记录</div>
              ) : (
                production.runs.slice(-8).reverse().map((r) => (
                  <Row key={r.id} label={`${r.workerId} → ${r.orderId}`} value={`${r.output.toFixed(2)} · ${r.time}`} />
                ))
              )}
            </Section>
          </>
        )
      }
      case 'revenue': {
        const revenueEntries = ledger.entries.filter((e) => e.type === 'revenue')
        return (
          <>
            <Section title="收入统计">
              <Row label="累计收入" value={fmtMoney(ledger.revenue)} cls="text-market-up" />
              <Row label="市场需求总额" value={fmtMoney(demand.totalDemand)} />
              <Row label="已成交订单" value={`${demand.orders.filter((o) => o.status === 'fulfilled').length} 单`} />
            </Section>
            <Section title="最近收入流水">
              {revenueEntries.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无收入流水，启动 Capital OS 后产生</div>
              ) : (
                revenueEntries.slice(0, 8).map((e) => (
                  <Row key={e.id} label={e.note} value={`+${fmtMoney(e.amount)} · ${e.time}`} cls="text-market-up" />
                ))
              )}
            </Section>
          </>
        )
      }
      case 'profit': {
        const margin = ledger.revenue > 0 ? (ledger.profit / ledger.revenue) * 100 : 0
        return (
          <>
            <Section title="利润统计">
              <Row label="累计利润" value={fmtMoney(ledger.profit)} cls="text-market-up" />
              <Row label="利润率" value={`${margin.toFixed(1)}%`} cls="text-market-up" />
              <Row label="累计成本（算力）" value={fmtMoney(ledger.cost)} cls="text-market-down" />
              <Row label="累计工资" value={fmtMoney(ledger.wage)} cls="text-market-down" />
              <Row label="分红回流（60%）" value={fmtMoney(ledger.dividend)} cls="text-market-primary" />
              <Row label="留存再投资（40%）" value={fmtMoney(ledger.investment)} cls="text-market-primary" />
            </Section>
            <Section title="最近利润流水">
              {ledger.entries.filter((e) => e.type === 'profit').slice(0, 6).map((e) => (
                <Row key={e.id} label={e.note} value={`+${fmtMoney(e.amount)} · ${e.time}`} cls="text-market-up" />
              ))}
            </Section>
          </>
        )
      }
      case 'valuation': {
        const holdingsValue = account.holdings.reduce((s, h) => s + h.quantity * (quotes[h.symbol]?.price ?? h.avgCost), 0)
        const extraValue = extraAssets.reduce((s, a) => s + (quotes[a.symbol]?.price ?? a.basePrice), 0)
        return (
          <>
            <Section title="估值构成">
              <Row label="持仓企业市值" value={fmtMoney(holdingsValue)} cls="text-market-up" />
              <Row label="额外上市企业" value={fmtMoney(extraValue)} cls="text-market-up" />
              <Row label="总估值（飞轮）" value={fmtMoney(flywheel.totalValuation)} cls="text-market-primary" />
              <Row label="资本总规模" value={fmtMoney(flywheel.totalCapital)} />
            </Section>
            <Section title="持仓明细">
              {account.holdings.length === 0 ? (
                <div className="py-2 text-xs text-market-sub">暂无持仓</div>
              ) : (
                account.holdings.map((h) => {
                  const price = quotes[h.symbol]?.price ?? h.avgCost
                  const pnl = (price - h.avgCost) * h.quantity
                  return (
                    <Row
                      key={h.symbol}
                      label={`${h.symbol} · ${h.name}（${h.quantity} 份）`}
                      value={`${fmtMoney(h.quantity * price)} · ${pnl >= 0 ? '+' : ''}${fmtMoney(pnl)}`}
                      cls={pnl >= 0 ? 'text-market-up' : 'text-market-down'}
                    />
                  )
                })
              )}
            </Section>
          </>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{def?.icon}</span>
            <div>
              <div className="text-base font-bold text-market-text">{def?.name}</div>
              <div className="text-[11px] text-market-sub">{def?.desc}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg px-2 py-1 text-market-sub hover:bg-market-bg">✕</button>
        </div>
        <div className="mb-3 flex gap-6 rounded-lg bg-market-bg/60 px-4 py-2.5">
          <div>
            <div className="text-[10px] text-market-sub">当前值</div>
            <div className="tnum text-lg font-bold text-market-text">
              {fmtCompact(node?.value ?? 0)}
              <span className="ml-0.5 text-[10px] font-normal text-market-sub">{def?.unit}</span>
            </div>
          </div>
          <div>
            <div className="text-[10px] text-market-sub">本 tick 增量</div>
            <div className={`tnum text-lg font-bold ${(node?.delta ?? 0) >= 0 ? 'text-market-up' : 'text-market-down'}`}>
              {(node?.delta ?? 0) >= 0 ? '+' : ''}
              {fmtNumber(node?.delta ?? 0)}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-market-sub">环比增速</div>
            <div className={`tnum text-lg font-bold ${(node?.pct ?? 0) >= 0 ? 'text-market-up' : 'text-market-down'}`}>
              {node?.pct !== 0 ? `${(node?.pct ?? 0) >= 0 ? '+' : ''}${(node?.pct ?? 0).toFixed(1)}%` : '—'}
            </div>
          </div>
        </div>
        {renderBody()}
      </div>
    </div>
  )
}
