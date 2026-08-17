import { useState } from 'react'
import { useEconomy } from '../store/economy'
import { fmtNumber, fmtPct } from '../utils/format'
import { Sparkline } from '../components/Sparkline'

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-xl bg-white p-5 shadow-sm ring-1 ring-market-border/60 ${className}`}>{children}</div>
}

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-market-text">{label}</span>
        <span className="font-semibold tnum text-market-text">{value.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-market-bg">
        <div className="h-full rounded-full transition-all" style={{ width: `${value}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}

export default function DsuPage() {
  const { dsu, mintDSU, burnDSU } = useEconomy()
  const [amount, setAmount] = useState(100)

  return (
    <div className="space-y-5">
      <Card>
        <h1 className="text-xl font-black text-market-text">DSU · AI Stable Unit</h1>
        <p className="mt-2 text-sm leading-relaxed text-market-sub">
          DSU 是 AI Exchange 内部的模拟 AI 生产力计价单位，以 DeepSeek AI 生产力作为核心价值锚。
          1 DSU = 1000 AI Compute Units，仅用于平台内部经济模拟，不代表任何现实世界货币或稳定币承诺。
        </p>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <div className="text-xs text-market-sub">DSU Price</div>
          <div className="mt-1 text-3xl font-bold text-market-text tnum">{fmtNumber(dsu.price, 4)}</div>
          <div className="mt-2 h-10">
            <Sparkline data={dsu.history} color="#1677ff" />
          </div>
        </Card>
        <Card>
          <div className="text-xs text-market-sub">AI Production Index</div>
          <div className="mt-1 text-3xl font-bold text-market-text tnum">{fmtNumber(dsu.aiProductionIndex, 2)}</div>
          <div className="mt-1 text-xs text-market-sub">基期 100</div>
        </Card>
        <Card>
          <div className="text-xs text-market-sub">Circulation</div>
          <div className="mt-1 text-3xl font-bold text-market-text tnum">{fmtNumber(dsu.circulation, 0)}</div>
          <div className="mt-1 text-xs text-market-sub">Reserve {fmtNumber(dsu.reserve, 0)}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <h3 className="mb-4 text-sm font-bold text-market-text">AI Production Components</h3>
          <Bar label="DeepSeek Production" value={dsu.components.deepSeek} color="#1677ff" />
          <Bar label="GPU Compute" value={dsu.components.gpuCompute} color="#06b6d4" />
          <Bar label="AI Agent Work" value={dsu.components.agentWork} color="#8b5cf6" />
          <Bar label="AI API Service" value={dsu.components.apiService} color="#f59e0b" />
        </Card>

        <Card>
          <h3 className="mb-4 text-sm font-bold text-market-text">Mint / Burn Simulation</h3>
          <div className="mb-4 grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-lg bg-market-bg p-3">
              <div className="text-xs text-market-sub">Daily Mint</div>
              <div className="mt-0.5 font-semibold tnum text-market-up">+{fmtNumber(dsu.dailyMint, 0)}</div>
            </div>
            <div className="rounded-lg bg-market-bg p-3">
              <div className="text-xs text-market-sub">Daily Burn</div>
              <div className="mt-0.5 font-semibold tnum text-market-down">-{fmtNumber(dsu.dailyBurn, 0)}</div>
            </div>
            <div className="rounded-lg bg-market-bg p-3">
              <div className="text-xs text-market-sub">Daily Consumption</div>
              <div className="mt-0.5 font-semibold tnum text-market-text">{fmtNumber(dsu.dailyConsumption, 0)}</div>
            </div>
            <div className="rounded-lg bg-market-bg p-3">
              <div className="text-xs text-market-sub">Reserve Ratio</div>
              <div className="mt-0.5 font-semibold tnum text-market-text">
                {fmtPct(dsu.reserve / (dsu.circulation + dsu.reserve || 1))}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-28 rounded-lg border border-market-border px-3 py-2 text-sm outline-none focus:border-market-primary"
            />
            <button
              onClick={() => mintDSU(amount)}
              className="rounded-lg bg-market-primary px-4 py-2 text-sm font-semibold text-white hover:bg-market-primary-hover"
            >
              Mint
            </button>
            <button
              onClick={() => burnDSU(amount)}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-market-text ring-1 ring-market-border hover:bg-market-bg"
            >
              Burn
            </button>
          </div>
          <p className="mt-2 text-[10px] text-market-sub">* 模拟操作，不影响真实资产，仅更新内部模拟状态。</p>
        </Card>
      </div>
    </div>
  )
}
