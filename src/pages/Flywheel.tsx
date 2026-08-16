import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as echarts from 'echarts'
import { useMarket } from '../store/market'
import { FLYWHEEL_NODE_DEFS, flywheelIndex } from '../ai/flywheel'
import { fmtCompact, fmtNumber } from '../utils/format'
import FlywheelNodeDetail from '../components/FlywheelNodeDetail'
import type { FlywheelNode, FlywheelNodeId } from '../types'

const NODE_COLORS: Record<string, string> = {
  capital: '#1677ff',
  company: '#7c3aed',
  ipo: '#f59e0b',
  workforce: '#0ea5e9',
  production: '#10b981',
  revenue: '#16a34a',
  profit: '#6366f1',
  valuation: '#f43f5e',
}

/** 环形飞轮：8 节点按圆周排布，中心为转速仪表盘 */
function RingFlywheel({ nodes, speed, onSelect }: { nodes: FlywheelNode[]; speed: number; onSelect: (id: FlywheelNodeId) => void }) {
  const gaugeRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const SIZE = 560
  const CX = SIZE / 2
  const CY = SIZE / 2
  const R = 208

  const positions = useMemo(() => {
    return FLYWHEEL_NODE_DEFS.map((d, i) => {
      const angle = (-90 + (360 / FLYWHEEL_NODE_DEFS.length) * i) * (Math.PI / 180)
      return {
        id: d.id,
        x: CX + R * Math.cos(angle),
        y: CY + R * Math.sin(angle),
      }
    })
  }, [CX, CY, R])

  // 中心转速仪表盘
  useEffect(() => {
    if (!gaugeRef.current) return
    if (!chartRef.current) chartRef.current = echarts.init(gaugeRef.current)
    chartRef.current.setOption(
      {
        animation: false,
        series: [
          {
            type: 'gauge',
            startAngle: 210,
            endAngle: -30,
            min: 0,
            max: 100,
            radius: '100%',
            center: ['50%', '58%'],
            pointer: { length: '52%', width: 4, itemStyle: { color: '#1f2937' } },
            progress: { show: true, width: 12, itemStyle: { color: '#1677ff' } },
            axisLine: {
              lineStyle: {
                width: 12,
                color: [
                  [0.3, '#dc2626'],
                  [0.55, '#f59e0b'],
                  [0.75, '#eab308'],
                  [1, '#16a34a'],
                ],
              },
            },
            axisTick: { show: false },
            splitLine: { show: false },
            axisLabel: { show: false },
            title: { offsetCenter: [0, '38%'], fontSize: 11, color: '#6b7280', fontWeight: 'bold' },
            detail: {
              offsetCenter: [0, '0%'],
              fontSize: 24,
              fontWeight: 'bold',
              color: '#1f2937',
              formatter: (v: number) => `${Math.round(v)}`,
            },
            data: [{ value: speed, name: '飞轮转速' }],
          },
        ],
      },
      true,
    )
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [speed])

  return (
    <div className="overflow-auto">
      <div style={{ width: SIZE, height: SIZE, margin: '0 auto', position: 'relative' }}>
        {/* 连接弧线 */}
        <svg width={SIZE} height={SIZE} className="absolute inset-0" style={{ zIndex: 0 }}>
          {positions.map((p, i) => {
            const q = positions[(i + 1) % positions.length]
            const mx = (p.x + q.x) / 2
            const my = (p.y + q.y) / 2
            const dx = q.x - p.x
            const dy = q.y - p.y
            const len = Math.sqrt(dx * dx + dy * dy) || 1
            const ox = (-dy / len) * 26
            const oy = (dx / len) * 26
            const ctrlX = mx + ox
            const ctrlY = my + oy
            const endX = q.x - (dx / len) * 46
            const endY = q.y - (dy / len) * 46
            const startX = p.x + (dx / len) * 46
            const startY = p.y + (dy / len) * 46
            const arrowAngle = Math.atan2(q.y - p.y, q.x - p.x)
            const a1x = endX - 8 * Math.cos(arrowAngle - 0.42)
            const a1y = endY - 8 * Math.sin(arrowAngle - 0.42)
            const a2x = endX - 8 * Math.cos(arrowAngle + 0.42)
            const a2y = endY - 8 * Math.sin(arrowAngle + 0.42)
            return (
              <g key={i}>
                <path
                  d={`M ${startX} ${startY} Q ${ctrlX} ${ctrlY} ${endX} ${endY}`}
                  fill="none"
                  stroke="#c7d2fe"
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  className="animate-pulse"
                />
                <path d={`M ${endX} ${endY} L ${a1x} ${a1y} L ${a2x} ${a2y} Z`} fill="#818cf8" />
              </g>
            )
          })}
        </svg>

        {/* 中心仪表盘 */}
        <div
          ref={gaugeRef}
          style={{
            position: 'absolute',
            left: CX - 170,
            top: CY - 170,
            width: 340,
            height: 340,
            zIndex: 1,
          }}
        />

        {/* 8 节点 */}
        {FLYWHEEL_NODE_DEFS.map((d, i) => {
          const p = positions[i]
          const node = nodes.find((n) => n.id === d.id)
          const color = NODE_COLORS[d.id]
          return (
            <div
              key={d.id}
              onClick={() => onSelect(d.id)}
              style={{ left: p.x - 74, top: p.y - 40, position: 'absolute', zIndex: 2 }}
              className="flex w-[148px] cursor-pointer flex-col items-center rounded-xl border bg-white px-2 py-1.5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="flex w-full items-center justify-between gap-1">
                <span className="text-sm">{d.icon}</span>
                <span className="truncate text-[11px] font-semibold text-market-sub">{d.name}</span>
                <span className="h-2 w-2 rounded-full" style={{ background: color }} />
              </div>
              <div className="tnum w-full truncate text-center text-base font-bold" style={{ color }}>
                {fmtCompact(node?.value ?? 0)}
                <span className="ml-0.5 text-[10px] font-normal text-market-sub">{d.unit}</span>
              </div>
              <div className="tnum text-[10px] text-market-sub">
                {node && node.pct !== 0 ? (
                  <span className={node.pct >= 0 ? 'text-market-up' : 'text-market-down'}>
                    {node.pct >= 0 ? '+' : ''}
                    {node.pct.toFixed(1)}%
                  </span>
                ) : (
                  <span>—</span>
                )}
                <span className="ml-1">Δ{fmtNumber(node?.delta ?? 0)}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 飞轮历史曲线（转速 / 估值 / 资本） */
function FlywheelChart({ history }: { history: { t: string; speed: number; valuation: number; capital: number }[] }) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo(() => {
    const times = history.map((h) => h.t.slice(11))
    const labels = ['飞轮转速', '总估值', '总资本']
    const datas = [
      history.map((h) => h.speed),
      history.map((h) => h.valuation),
      history.map((h) => h.capital),
    ]
    return {
      animation: false,
      color: ['#1677ff', '#7c3aed', '#f59e0b'],
      tooltip: { trigger: 'axis' },
      legend: { data: labels, top: 0, textStyle: { color: '#6b7280', fontSize: 11 } },
      grid: { left: 48, right: 16, top: 32, bottom: 24 },
      xAxis: {
        type: 'category',
        data: times,
        axisLine: { lineStyle: { color: '#e5e7eb' } },
        axisLabel: { color: '#9ca3af', fontSize: 10 },
      },
      yAxis: [
        { type: 'value', name: '转速', min: 0, max: 100, splitLine: { lineStyle: { color: '#f3f4f6' } }, axisLabel: { color: '#9ca3af', fontSize: 10 } },
        { type: 'value', name: '估值/资本', splitLine: { show: false }, axisLabel: { color: '#9ca3af', fontSize: 10, formatter: (v: number) => fmtCompact(v) } },
      ],
      series: [
        { name: labels[0], type: 'line', data: datas[0], smooth: true, showSymbol: false, lineStyle: { width: 2 } },
        { name: labels[1], type: 'line', yAxisIndex: 1, data: datas[1], smooth: true, showSymbol: false, lineStyle: { width: 2 } },
        { name: labels[2], type: 'line', yAxisIndex: 1, data: datas[2], smooth: true, showSymbol: false, lineStyle: { width: 2 } },
      ],
    }
  }, [history])

  useEffect(() => {
    if (!ref.current) return
    if (!chartRef.current) chartRef.current = echarts.init(ref.current)
    chartRef.current.setOption(option, true)
    const onResize = () => chartRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [option])

  useEffect(() => {
    return () => {
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [])

  return <div ref={ref} style={{ height: 260 }} />
}

export default function Flywheel() {
  const flywheel = useMarket((s) => s.flywheel)
  const [selected, setSelected] = useState<FlywheelNodeId | null>(null)

  const idx = flywheelIndex(flywheel)
  const active = flywheel.active

  return (
    <div className="mx-auto max-w-7xl space-y-4 px-4 py-6">
      {/* 页头 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-market-text">AI 产业经济飞轮</h1>
          <p className="text-xs text-market-sub">
            AI资本 → AI企业 → AI IPO → AI Workforce → Agent生产 → AI收入 → AI利润 → 企业估值 → 资本增长 → 循环
          </p>
        </div>
        {!active && (
          <Link
            to="/capital"
            className="rounded-lg bg-market-primary px-4 py-2 text-sm font-semibold text-white hover:bg-market-primary-hover"
          >
            🚀 启动 AI Capital OS 闭环
          </Link>
        )}
      </div>

      {/* 顶部 KPI */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <div className="rounded-xl border border-market-border bg-white p-4">
          <div className="text-xs text-market-sub">飞轮指数</div>
          <div className="tnum mt-1 text-2xl font-bold text-market-primary">{idx}</div>
          <div className="mt-1 text-[11px] text-market-sub">转速 × 估值增速综合</div>
        </div>
        <div className="rounded-xl border border-market-border bg-white p-4">
          <div className="text-xs text-market-sub">飞轮转速</div>
          <div className="tnum mt-1 text-2xl font-bold text-market-text">{flywheel.speed}</div>
          <div className="mt-1 text-[11px] text-market-sub">{flywheel.speed > 70 ? '高速运转' : flywheel.speed > 40 ? '正常运转' : '低速起步'}</div>
        </div>
        <div className="rounded-xl border border-market-border bg-white p-4">
          <div className="text-xs text-market-sub">企业总估值</div>
          <div className="tnum mt-1 text-2xl font-bold text-market-up">${fmtCompact(flywheel.totalValuation)}</div>
          <div className="mt-1 text-[11px] text-market-sub">持仓 + 额外上市企业</div>
        </div>
        <div className="rounded-xl border border-market-border bg-white p-4">
          <div className="text-xs text-market-sub">资本总规模</div>
          <div className="tnum mt-1 text-2xl font-bold text-market-text">${fmtCompact(flywheel.totalCapital)}</div>
          <div className="mt-1 text-[11px] text-market-sub">初始资本 + 分红回流</div>
        </div>
        <div className="rounded-xl border border-market-border bg-white p-4">
          <div className="text-xs text-market-sub">循环次数</div>
          <div className="tnum mt-1 text-2xl font-bold text-amber-500">{flywheel.cycles}</div>
          <div className="mt-1 text-[11px] text-market-sub">资本 → 利润 → 资本完整轮回</div>
        </div>
      </div>

      {/* 环形飞轮 + 节点明细 */}
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-market-border bg-white p-4 lg:col-span-3">
          <div className="mb-2 text-sm font-semibold text-market-text">🔄 飞轮运行图（8 节点实时 · 点击下钻）</div>
          <RingFlywheel nodes={flywheel.nodes} speed={flywheel.speed} onSelect={setSelected} />
        </div>
        <div className="rounded-xl border border-market-border bg-white p-4 lg:col-span-2">
          <div className="mb-3 text-sm font-semibold text-market-text">📋 节点明细</div>
          <div className="space-y-2">
            {FLYWHEEL_NODE_DEFS.map((d) => {
              const node = flywheel.nodes.find((n) => n.id === d.id)
              const color = NODE_COLORS[d.id]
              return (
                <div key={d.id} onClick={() => setSelected(d.id)} className="flex cursor-pointer items-center gap-3 rounded-lg border border-market-border/60 bg-market-bg/40 px-3 py-2 transition hover:border-market-primary/40 hover:bg-white">
                  <span className="text-lg">{d.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-market-text">{d.name}</div>
                    <div className="truncate text-[10px] text-market-sub">{d.desc}</div>
                  </div>
                  <div className="text-right">
                    <div className="tnum text-sm font-bold" style={{ color }}>
                      {fmtCompact(node?.value ?? 0)}
                      <span className="ml-0.5 text-[10px] font-normal text-market-sub">{d.unit}</span>
                    </div>
                    <div className="tnum text-[10px]">
                      {node && node.pct !== 0 ? (
                        <span className={node.pct >= 0 ? 'text-market-up' : 'text-market-down'}>
                          {node.pct >= 0 ? '+' : ''}
                          {node.pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-market-sub">—</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 历史曲线 */}
      <div className="rounded-xl border border-market-border bg-white p-4">
        <div className="mb-2 text-sm font-semibold text-market-text">📈 飞轮历史（转速 / 总估值 / 总资本）</div>
        {flywheel.history.length >= 2 ? (
          <FlywheelChart history={flywheel.history} />
        ) : (
          <div className="py-16 text-center text-sm text-market-sub">等待 tick 积累数据…</div>
        )}
      </div>

      {/* 说明 */}
      <div className="rounded-xl border border-market-border bg-white p-4 text-[11px] leading-relaxed text-market-sub">
        <b className="text-market-text">说明：</b>飞轮是聚合视图层，直接读取 AI Capital OS 与 需求/生产/账本三引擎的真实累计值派生，不另造数据。
        启动 AI Capital OS 后，资本自动配置 → AI 企业雇佣 Worker 生产 → 服务收入 → 利润（60% 分红回流 / 40% 再投资）→ 估值增长 → 更多资本进入，形成完整闭环。
        所有行情与收益均为模拟数据，不代表真实证券或金融产品。
      </div>

      {/* 节点详情弹层 */}
      {selected && <FlywheelNodeDetail nodeId={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}
