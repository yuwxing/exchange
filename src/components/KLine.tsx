import { useEffect, useMemo, useRef, useState } from 'react'
import * as echarts from 'echarts'
import type { Candle } from '../types'

type Period = 'D' | 'W'
type Indicator = 'MA' | 'BOLL' | 'RSI' | 'MACD'

export default function KLine({
  candles,
  height = 400,
}: {
  candles: Candle[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)
  const [period, setPeriod] = useState<Period>('D')
  const [indicator, setIndicator] = useState<Indicator>('MA')

  const data = useMemo(() => aggregateCandles(candles, period), [candles, period])

  const option = useMemo(() => {
    const dates = data.map((c) => c.time)
    const kData = data.map((c) => [c.open, c.close, c.low, c.high])
    const volume = data.map((c) => c.volume)
    const closes = data.map((c) => c.close)
    const ma5 = movingAvg(closes, 5)
    const ma10 = movingAvg(closes, 10)
    const ma20 = movingAvg(closes, 20)
    const boll = bollinger(closes, 20, 2)
    const rsi = rsiCalc(closes, 14)
    const macd = macdCalc(closes)

    const hasSub = indicator === 'RSI' || indicator === 'MACD'
    const mainH = hasSub ? height * 0.5 : height * 0.62
    const volTop = hasSub ? height * 0.58 : height * 0.7
    const subTop = height * 0.86

    const grid: any[] = hasSub
      ? [
          { left: 58, right: 16, top: 12, height: mainH },
          { left: 58, right: 16, top: volTop, height: height * 0.2 },
          { left: 58, right: 16, top: subTop, height: height * 0.12 },
        ]
      : [
          { left: 58, right: 16, top: 12, height: mainH },
          { left: 58, right: 16, top: volTop, height: height * 0.24 },
        ]

    const xAxes: any[] = [
      { type: 'category', data: dates, gridIndex: 0, axisLine: { lineStyle: { color: '#D1D5DB' } }, axisLabel: { color: '#6B7280', fontSize: 10 }, axisTick: { show: false } },
      { type: 'category', data: dates, gridIndex: 1, axisLine: { lineStyle: { color: '#D1D5DB' } }, axisLabel: { show: false }, axisTick: { show: false } },
    ]
    if (hasSub) xAxes.push({ type: 'category', data: dates, gridIndex: 2, axisLine: { lineStyle: { color: '#D1D5DB' } }, axisLabel: { show: false }, axisTick: { show: false } })

    const yAxes: any[] = [
      { scale: true, gridIndex: 0, splitLine: { lineStyle: { color: '#F0F2F5' } }, axisLabel: { color: '#6B7280', fontSize: 10 } },
      { gridIndex: 1, splitLine: { show: false }, axisLabel: { color: '#6B7280', fontSize: 10 } },
    ]
    if (hasSub) yAxes.push({ gridIndex: 2, splitLine: { show: false }, axisLabel: { color: '#6B7280', fontSize: 10 }, min: indicator === 'RSI' ? 0 : undefined, max: indicator === 'RSI' ? 100 : undefined })

    const series: any[] = [
      {
        name: 'K线',
        type: 'candlestick',
        data: kData,
        itemStyle: { color: '#16A34A', color0: '#DC2626', borderColor: '#16A34A', borderColor0: '#DC2626' },
      },
    ]

    if (indicator === 'MA') {
      series.push(
        { name: 'MA5', type: 'line', data: ma5, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#1677FF' }, itemStyle: { color: '#1677FF' } },
        { name: 'MA10', type: 'line', data: ma10, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' } },
        { name: 'MA20', type: 'line', data: ma20, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#8B5CF6' }, itemStyle: { color: '#8B5CF6' } },
      )
    } else if (indicator === 'BOLL') {
      series.push(
        { name: 'BOLL上轨', type: 'line', data: boll.up, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#0EA5E9', opacity: 0.8 }, itemStyle: { color: '#0EA5E9' } },
        { name: 'BOLL中轨', type: 'line', data: boll.mid, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#8B5CF6' }, itemStyle: { color: '#8B5CF6' } },
        { name: 'BOLL下轨', type: 'line', data: boll.low, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#0EA5E9', opacity: 0.8 }, itemStyle: { color: '#0EA5E9' } },
      )
    }

    series.push({
      name: '成交量',
      type: 'bar',
      xAxisIndex: 1,
      yAxisIndex: 1,
      data: volume,
      itemStyle: {
        color: (p: any) => {
          const c = data[p.dataIndex]
          return c.close >= c.open ? 'rgba(22,163,74,0.7)' : 'rgba(220,38,38,0.7)'
        },
      },
    })

    if (indicator === 'RSI') {
      series.push(
        { name: 'RSI14', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: rsi, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#8B5CF6' }, itemStyle: { color: '#8B5CF6' } },
        { name: '超买70', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: closes.map(() => 70), symbol: 'none', lineStyle: { width: 1, type: 'dashed', color: '#DC2626', opacity: 0.5 }, itemStyle: { color: '#DC2626' } },
        { name: '超卖30', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: closes.map(() => 30), symbol: 'none', lineStyle: { width: 1, type: 'dashed', color: '#16A34A', opacity: 0.5 }, itemStyle: { color: '#16A34A' } },
      )
    } else if (indicator === 'MACD') {
      series.push(
        { name: 'DIF', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macd.dif, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#1677FF' }, itemStyle: { color: '#1677FF' } },
        { name: 'DEA', type: 'line', xAxisIndex: 2, yAxisIndex: 2, data: macd.dea, smooth: true, symbol: 'none', lineStyle: { width: 1, color: '#F59E0B' }, itemStyle: { color: '#F59E0B' } },
        {
          name: 'MACD柱',
          type: 'bar',
          xAxisIndex: 2,
          yAxisIndex: 2,
          data: macd.hist,
          itemStyle: {
            color: (p: any) => ((p.value ?? 0) >= 0 ? 'rgba(22,163,74,0.7)' : 'rgba(220,38,38,0.7)'),
          },
        },
      )
    }

    return {
      animation: false,
      grid,
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#E5E7EB',
        textStyle: { color: '#1F2937', fontSize: 12 },
        formatter: (params: any) => {
          const i = params[0].dataIndex
          const d = data[i]
          if (!d) return ''
          const rows = params
            .filter((p: any) => p.value !== null && p.value !== undefined)
            .map((p: any) => `${p.marker}${p.seriesName}: ${typeof p.value === 'number' ? p.value.toFixed(2) : Array.isArray(p.value) ? p.value.join(' / ') : p.value}`)
            .join('<br/>')
          return `<div class="tnum">${d.time}</div><div>开 ${d.open} 高 ${d.high}<br/>低 ${d.low} 收 ${d.close}</div><br/>${rows}`
        },
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: xAxes,
      yAxis: yAxes,
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1, 2].filter((i) => (hasSub ? true : i < 2)), start: 35, end: 100 },
        { type: 'slider', xAxisIndex: [0, 1, 2].filter((i) => (hasSub ? true : i < 2)), start: 35, end: 100, height: 14, bottom: 2, borderColor: '#E5E7EB', fillerColor: 'rgba(22,119,255,0.15)', handleStyle: { color: '#1677FF' }, textStyle: { color: '#6B7280' } },
      ],
      series,
    }
  }, [data, height, indicator])

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
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1 rounded-lg bg-market-bg p-0.5">
          {(['D', 'W'] as Period[]).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                period === p ? 'bg-market-primary text-white' : 'text-market-sub hover:text-market-text'
              }`}
            >
              {p === 'D' ? '日线' : '周线'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-market-bg p-0.5">
          {(['MA', 'BOLL', 'RSI', 'MACD'] as Indicator[]).map((ind) => (
            <button
              key={ind}
              onClick={() => setIndicator(ind)}
              className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                indicator === ind ? 'bg-market-primary text-white' : 'text-market-sub hover:text-market-text'
              }`}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>
      <div ref={ref} style={{ height }} className="w-full" />
    </div>
  )
}

/** ---------- 工具函数 ---------- */

function movingAvg(arr: number[], n: number) {
  const out: (number | null)[] = []
  for (let i = 0; i < arr.length; i++) {
    if (i < n - 1) {
      out.push(null)
    } else {
      let sum = 0
      for (let j = i - n + 1; j <= i; j++) sum += arr[j]
      out.push(Math.round((sum / n) * 100) / 100)
    }
  }
  return out
}

function bollinger(arr: number[], n: number, k: number) {
  const mid = movingAvg(arr, n)
  const up: (number | null)[] = []
  const low: (number | null)[] = []
  for (let i = 0; i < arr.length; i++) {
    if (mid[i] === null) {
      up.push(null)
      low.push(null)
      continue
    }
    let s = 0
    for (let j = i - n + 1; j <= i; j++) s += (arr[j] - (mid[i] as number)) ** 2
    const sd = Math.sqrt(s / n)
    up.push(Math.round(((mid[i] as number) + k * sd) * 100) / 100)
    low.push(Math.round(((mid[i] as number) - k * sd) * 100) / 100)
  }
  return { mid, up, low }
}

function ema(arr: number[], n: number) {
  const out: number[] = []
  const k = 2 / (n + 1)
  let prev = arr[0]
  out.push(prev)
  for (let i = 1; i < arr.length; i++) {
    prev = arr[i] * k + prev * (1 - k)
    out.push(Math.round(prev * 100) / 100)
  }
  return out
}

function rsiCalc(arr: number[], n: number) {
  const out: (number | null)[] = [null]
  let avgGain = 0
  let avgLoss = 0
  for (let i = 1; i < arr.length; i++) {
    const chg = arr[i] - arr[i - 1]
    const gain = Math.max(chg, 0)
    const loss = Math.max(-chg, 0)
    if (i === n) {
      let g = 0
      let l = 0
      for (let j = i - n + 1; j <= i; j++) {
        const c = arr[j] - arr[j - 1]
        g += Math.max(c, 0)
        l += Math.max(-c, 0)
      }
      avgGain = g / n
      avgLoss = l / n
    } else if (i > n) {
      avgGain = (avgGain * (n - 1) + gain) / n
      avgLoss = (avgLoss * (n - 1) + loss) / n
    }
    out.push(i < n ? null : avgLoss === 0 ? 100 : Math.round((100 - 100 / (1 + avgGain / avgLoss)) * 100) / 100)
  }
  return out
}

function macdCalc(arr: number[]) {
  const e12 = ema(arr, 12)
  const e26 = ema(arr, 26)
  const dif: (number | null)[] = arr.map((_, i) => (i < 25 ? null : Math.round((e12[i] - e26[i]) * 100) / 100))
  const difNums = dif.filter((v): v is number => v !== null)
  const deaFull = ema(difNums, 9)
  const dea: (number | null)[] = arr.map((_, i) => (i < 25 + 8 ? null : deaFull[i - 25]))
  const hist: (number | null)[] = arr.map((_, i) =>
    dif[i] === null || dea[i] === null ? null : Math.round((((dif[i] as number) - (dea[i] as number)) * 2) * 100) / 100,
  )
  return { dif, dea, hist }
}

/** 按周期聚合 K 线（日/周） */
function aggregateCandles(candles: Candle[], period: Period): Candle[] {
  if (period === 'D') return candles
  const groups = new Map<string, Candle[]>()
  for (const c of candles) {
    const key = weekKey(c.time)
    const arr = groups.get(key) ?? []
    arr.push(c)
    groups.set(key, arr)
  }
  const out: Candle[] = []
  for (const [, arr] of groups) {
    const first = arr[0]
    const last = arr[arr.length - 1]
    out.push({
      time: `${first.time.slice(5, 7)}-${first.time.slice(8, 10)}周`,
      open: first.open,
      close: last.close,
      low: Math.min(...arr.map((c) => c.low)),
      high: Math.max(...arr.map((c) => c.high)),
      volume: arr.reduce((a, c) => a + c.volume, 0),
    })
  }
  return out
}

function weekKey(dateStr: string) {
  const d = new Date(dateStr.replace(/-/g, '/'))
  const onejan = new Date(d.getFullYear(), 0, 1)
  const week = Math.ceil(((d.getTime() - onejan.getTime()) / 86400000 + onejan.getDay() + 1) / 7)
  return `${d.getFullYear()}-W${week}`
}
