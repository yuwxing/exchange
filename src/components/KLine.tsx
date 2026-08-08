import { useEffect, useMemo, useRef } from 'react'
import * as echarts from 'echarts'
import type { Candle } from '../types'

export default function KLine({
  candles,
  height = 340,
}: {
  candles: Candle[]
  height?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const chartRef = useRef<echarts.ECharts | null>(null)

  const option = useMemo(() => {
    const dates = candles.map((c) => c.time)
    const kData = candles.map((c) => [c.open, c.close, c.low, c.high])
    const volume = candles.map((c) => c.volume)
    const ma5 = movingAvg(candles.map((c) => c.close), 5)
    const ma10 = movingAvg(candles.map((c) => c.close), 10)
    const ma20 = movingAvg(candles.map((c) => c.close), 20)

    return {
      animation: false,
      grid: [
        { left: 58, right: 16, top: 16, height: height * 0.62 },
        { left: 58, right: 16, top: height * 0.72, height: height * 0.22 },
      ],
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: 'rgba(255,255,255,0.98)',
        borderColor: '#E5E7EB',
        textStyle: { color: '#1F2937', fontSize: 12 },
        formatter: (params: any) => {
          const i = params[0].dataIndex
          const d = candles[i]
          const rows = params
            .map((p: any) => `${p.marker}${p.seriesName}: ${p.value}`)
            .join('<br/>')
          return `<div class="tnum">${d.time}</div><div>开 ${d.open} 高 ${d.high}<br/>低 ${d.low} 收 ${d.close}</div><br/>${rows}`
        },
      },
      axisPointer: { link: [{ xAxisIndex: 'all' }] },
      xAxis: [
        {
          type: 'category',
          data: dates,
          gridIndex: 0,
          axisLine: { lineStyle: { color: '#D1D5DB' } },
          axisLabel: { color: '#6B7280', fontSize: 10 },
          axisTick: { show: false },
        },
        {
          type: 'category',
          gridIndex: 1,
          data: dates,
          axisLine: { lineStyle: { color: '#D1D5DB' } },
          axisLabel: { show: false },
          axisTick: { show: false },
        },
      ],
      yAxis: [
        {
          scale: true,
          gridIndex: 0,
          splitLine: { lineStyle: { color: '#F0F2F5' } },
          axisLabel: { color: '#6B7280', fontSize: 10 },
        },
        {
          gridIndex: 1,
          splitLine: { show: false },
          axisLabel: { color: '#6B7280', fontSize: 10 },
        },
      ],
      dataZoom: [
        { type: 'inside', xAxisIndex: [0, 1], start: 40, end: 100 },
        {
          type: 'slider',
          xAxisIndex: [0, 1],
          start: 40,
          end: 100,
          height: 16,
          bottom: 4,
          borderColor: '#E5E7EB',
          fillerColor: 'rgba(22,119,255,0.15)',
          handleStyle: { color: '#1677FF' },
          textStyle: { color: '#6B7280' },
        },
      ],
      series: [
        {
          name: 'K线',
          type: 'candlestick',
          data: kData,
          itemStyle: {
            color: '#16A34A',
            color0: '#DC2626',
            borderColor: '#16A34A',
            borderColor0: '#DC2626',
          },
        },
        {
          name: 'MA5',
          type: 'line',
          data: ma5,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, color: '#1677FF' },
          itemStyle: { color: '#1677FF' },
        },
        {
          name: 'MA10',
          type: 'line',
          data: ma10,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, color: '#F59E0B' },
          itemStyle: { color: '#F59E0B' },
        },
        {
          name: 'MA20',
          type: 'line',
          data: ma20,
          smooth: true,
          symbol: 'none',
          lineStyle: { width: 1, color: '#8B5CF6' },
          itemStyle: { color: '#8B5CF6' },
        },
        {
          name: '成交量',
          type: 'bar',
          xAxisIndex: 1,
          yAxisIndex: 1,
          data: volume,
          itemStyle: {
            color: (p: any) => {
              const c = candles[p.dataIndex]
              return c.close >= c.open ? 'rgba(22,163,74,0.7)' : 'rgba(220,38,38,0.7)'
            },
          },
        },
      ],
    }
  }, [candles, height])

  useEffect(() => {
    if (!ref.current) return
    if (!chartRef.current) {
      chartRef.current = echarts.init(ref.current)
    }
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

  return <div ref={ref} style={{ height }} className="w-full" />
}

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
