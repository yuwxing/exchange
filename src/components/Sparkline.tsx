import { useEffect, useRef } from 'react'

export function Sparkline({
  data,
  color = '#1677FF',
  width = 96,
  height = 36,
}: {
  data: number[]
  color?: string
  width?: number
  height?: number
}) {
  const ref = useRef<SVGSVGElement>(null)

  useEffect(() => {
    const svg = ref.current
    if (!svg || data.length < 2) return
    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const step = width / (data.length - 1)
    const pts = data.map((v, i) => {
      const x = i * step
      const y = height - ((v - min) / range) * (height - 6) - 3
      return `${x},${y}`
    })
    const area = `0,${height} ${pts.join(' ')} ${width},${height}`
    svg.querySelectorAll('polyline').forEach((el) => el.remove())
    svg.querySelectorAll('path').forEach((el) => el.remove())
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'polyline')
    line.setAttribute('points', pts.join(' '))
    line.setAttribute('fill', 'none')
    line.setAttribute('stroke', color)
    line.setAttribute('stroke-width', '1.5')
    line.setAttribute('stroke-linejoin', 'round')
    const areaPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    areaPath.setAttribute('d', `M ${area} Z`)
    areaPath.setAttribute('fill', color)
    areaPath.setAttribute('opacity', '0.08')
    svg.appendChild(areaPath)
    svg.appendChild(line)
  }, [data, color, width, height])

  return (
    <svg
      ref={ref}
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
    />
  )
}
