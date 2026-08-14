import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'

/** AI 情绪指数（恐惧-贪婪）仪表盘 */
export default function SentimentGauge({
  score,
  level,
  prev,
  history = [],
  height = 190,
}: {
  score: number
  level: string
  prev?: number
  history?: number[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const delta = prev !== undefined ? score - prev : 0

  const option = useMemo(() => {
    return {
      animation: false,
      series: [
        {
          type: 'gauge',
          startAngle: 210,
          endAngle: -30,
          min: 0,
          max: 100,
          radius: '95%',
          center: ['50%', '62%'],
          pointer: { length: '55%', width: 4, itemStyle: { color: '#1f2937' } },
          progress: { show: true, width: 14, itemStyle: { color: '#1677ff' } },
          axisLine: {
            lineStyle: {
              width: 14,
              color: [
                [0.25, '#dc2626'],
                [0.45, '#f59e0b'],
                [0.55, '#eab308'],
                [0.75, '#22c55e'],
                [1, '#16a34a'],
              ],
            },
          },
          axisTick: { show: false },
          splitLine: { show: false },
          axisLabel: { show: false },
          title: {
            offsetCenter: [0, '32%'],
            fontSize: 13,
            color: '#6b7280',
            fontWeight: 'bold',
          },
          detail: {
            offsetCenter: [0, '-8%'],
            fontSize: 26,
            fontWeight: 'bold',
            color: '#1f2937',
            formatter: (v: number) => `${Math.round(v)}`,
          },
          data: [{ value: score, name: level }],
        },
      ],
    }
  }, [score, level])

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

  return (
    <div className="flex items-center gap-3">
      <div ref={ref} style={{ height, width: 190 }} className="shrink-0" />
      <div className="min-w-0 space-y-2 text-sm">
        <div className="text-xs text-market-sub">较上次</div>
        <div className={`text-lg font-bold tnum ${delta >= 0 ? 'text-market-up' : 'text-market-down'}`}>
          {delta >= 0 ? '+' : ''}
          {delta.toFixed(1)}
        </div>
        {history.length >= 12 && (
          <div className="flex h-8 items-end gap-0.5">
            {history.slice(-24).map((v, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-sm ${v >= 55 ? 'bg-market-up/70' : v <= 45 ? 'bg-market-down/70' : 'bg-amber-400/70'}`}
                style={{ height: `${(v / 100) * 100}%` }}
              />
            ))}
          </div>
        )}
        <div className="text-[11px] leading-relaxed text-market-sub">
          由涨跌家数、平均涨跌、成交活跃度加权计算（模拟）
        </div>
      </div>
    </div>
  )
}
