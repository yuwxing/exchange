import { useEconomy } from '../store/economy'
import { fmtCompact } from '../utils/format'

const NODE_POS: Record<string, { x: number; y: number }> = {
  capital: { x: 80, y: 220 },
  dsu: { x: 260, y: 220 },
  company: { x: 440, y: 130 },
  worker: { x: 440, y: 310 },
  service: { x: 620, y: 220 },
  revenue: { x: 800, y: 220 },
  profit: { x: 980, y: 220 },
}

function NodeBox({ node }: { node: { id: string; label: string; value: number; icon: string } }) {
  const pos = NODE_POS[node.id]
  if (!pos) return null
  return (
    <g transform={`translate(${pos.x},${pos.y})`}>
      <rect x="-58" y="-32" width="116" height="64" rx="10" fill="white" stroke="#e5e7eb" strokeWidth="1.5" />
      <text x="0" y="-12" textAnchor="middle" className="text-lg">
        {node.icon}
      </text>
      <text x="0" y="6" textAnchor="middle" className="fill-market-text text-xs font-semibold">
        {node.label}
      </text>
      <text x="0" y="22" textAnchor="middle" className="fill-market-sub text-[10px] tnum">
        {fmtCompact(node.value)}
      </text>
    </g>
  )
}

function FlowLink({ from, to, label }: { from: string; to: string; label: string }) {
  const a = NODE_POS[from]
  const b = NODE_POS[to]
  if (!a || !b) return null

  let d = `M ${a.x} ${a.y} L ${b.x} ${b.y}`
  if (from === 'profit' && to === 'capital') {
    d = `M ${a.x} ${a.y - 32} C ${a.x - 200} ${a.y - 160}, ${b.x + 200} ${b.y - 160}, ${b.x} ${b.y - 32}`
  } else if (from === 'dsu' && to === 'worker') {
    d = `M ${a.x + 58} ${a.y + 10} C ${a.x + 110} ${a.y + 10}, ${b.x - 70} ${b.y - 20}, ${b.x - 58} ${b.y - 10}`
  } else if (from === 'company' && to === 'worker') {
    d = `M ${a.x} ${a.y + 32} L ${b.x} ${b.y - 32}`
  } else if (from === 'worker' && to === 'service') {
    d = `M ${a.x + 58} ${a.y - 10} C ${a.x + 110} ${a.y - 10}, ${b.x - 70} ${b.y + 20}, ${b.x - 58} ${b.y + 10}`
  } else if (from === 'service' && to === 'revenue') {
    d = `M ${a.x + 58} ${a.y} L ${b.x - 58} ${b.y}`
  } else if (from === 'dsu' && to === 'company') {
    d = `M ${a.x + 58} ${a.y - 10} C ${a.x + 110} ${a.y - 10}, ${b.x - 70} ${b.y - 20}, ${b.x - 58} ${b.y - 10}`
  } else if (from === 'capital' && to === 'dsu') {
    d = `M ${a.x + 58} ${a.y} L ${b.x - 58} ${b.y}`
  } else if (from === 'revenue' && to === 'profit') {
    d = `M ${a.x + 58} ${a.y} L ${b.x - 58} ${b.y}`
  }

  const pathId = `path-${from}-${to}`
  return (
    <g>
      <path id={pathId} d={d} fill="none" stroke="#d1d5db" strokeWidth="2" markerEnd="url(#arrow)" />
      <path d={d} fill="none" stroke="#1677ff" strokeWidth="2" strokeDasharray="6 6" opacity="0.6">
        <animate attributeName="stroke-dashoffset" from="24" to="0" dur="1.2s" repeatCount="indefinite" />
      </path>
      <text className="fill-market-sub text-[9px]">
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle" dy="-6">
          {label}
        </textPath>
      </text>
    </g>
  )
}

export default function CapitalFlowPage() {
  const { capitalFlow } = useEconomy()

  return (
    <div className="space-y-5">
      <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60">
        <h1 className="text-xl font-black text-market-text">AI Capital Flow</h1>
        <p className="mt-1 text-sm text-market-sub">
          资本 → DSU → AI 企业 / AI Worker → AI Service → Revenue → Profit → 资本回流。动态模拟 AI 经济闭环。
        </p>
      </div>

      <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-market-border/60">
        <div className="overflow-x-auto">
          <svg width="1080" height="420" viewBox="0 0 1080 420" className="min-w-[1080px]">
            <defs>
              <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L7,3 z" fill="#1677ff" />
              </marker>
            </defs>
            {capitalFlow.links.map((l) => (
              <FlowLink key={`${l.from}-${l.to}`} from={l.from} to={l.to} label={l.label} />
            ))}
            {capitalFlow.nodes.map((n) => (
              <NodeBox key={n.id} node={n} />
            ))}
          </svg>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-market-sub">
          <span>总流量 {fmtCompact(capitalFlow.totalFlow)}</span>
          <span>动画虚线表示资金流向，节点数值随经济引擎 tick 更新</span>
        </div>
      </div>
    </div>
  )
}
