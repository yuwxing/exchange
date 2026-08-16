import { useEffect } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useMarket } from '../store/market'
import { fmtNumber } from '../utils/format'

const NAV = [
  { to: '/capital', label: 'CAPITAL', icon: '💰', end: false, capital: true },
  { to: '/', label: '行情大厅', icon: '📊', end: true },
  { to: '/assets', label: '资产市场', icon: '🏛️' },
  { to: '/index', label: '指数中心', icon: '🧮' },
  { to: '/intelligence', label: 'AI 智能', icon: '🤖' },
  { to: '/weg', label: 'AI 劳动力', icon: '🧑‍💻' },
  { to: '/flywheel', label: '经济飞轮', icon: '🔄' },
  { to: '/task-market', label: '任务市场', icon: '🧩' },
  { to: '/portfolio', label: '我的资产', icon: '💼' },
  { to: '/news', label: '新闻事件', icon: '📰' },
]

export default function Layout() {
  const tick = useMarket((s) => s.tick)
  const account = useMarket((s) => s.account)
  const navigate = useNavigate()

  useEffect(() => {
    const id = setInterval(tick, 2500)
    return () => clearInterval(id)
  }, [tick])

  return (
    <div className="min-h-screen bg-market-bg">
      <header className="sticky top-0 z-40 border-b border-market-border bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4">
          <div className="flex h-14 items-center justify-between">
            <div className="flex cursor-pointer items-center gap-2" onClick={() => navigate('/')}>
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-market-primary text-sm font-bold text-white">
                AX
              </div>
              <div>
                <div className="text-base font-bold leading-tight text-market-text">AI Exchange</div>
                <div className="text-[10px] leading-tight text-market-sub">
                  全球 AI 经济模拟交易市场
                </div>
              </div>
            </div>

            <div className="hidden items-center gap-1 lg:flex">
              {NAV.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    item.capital
                      ? `relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-bold transition-colors ${
                          isActive
                            ? 'bg-amber-400/15 text-amber-600 ring-1 ring-amber-400/40'
                            : 'bg-gradient-to-r from-amber-400/10 to-amber-500/10 text-amber-600 ring-1 ring-amber-400/30 hover:from-amber-400/20 hover:to-amber-500/20'
                        }`
                      : `flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-market-primary/10 text-market-primary'
                            : 'text-market-sub hover:bg-market-bg hover:text-market-text'
                        }`
                  }
                >
                  <span>{item.icon}</span>
                  {item.label}
                  {item.capital && (
                    <span className="rounded bg-amber-500 px-1 py-0.5 text-[9px] font-bold leading-none text-white">
                      总入口
                    </span>
                  )}
                </NavLink>
              ))}
            </div>

            <div
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-market-border bg-market-bg px-3 py-1.5"
              onClick={() => navigate('/portfolio')}
            >
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-market-primary text-[11px] font-bold text-white">
                {account.level}
              </div>
              <div className="text-right">
                <div className="text-xs font-semibold text-market-text tnum">${fmtNumber(account.cash)}</div>
                <div className="text-[10px] text-market-sub">
                  Lv.{account.level} · WEG {fmtNumber(account.wegBalance, 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto pb-2 lg:hidden">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  item.capital
                    ? `shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold ${
                        isActive ? 'bg-amber-400/15 text-amber-600' : 'bg-amber-400/10 text-amber-600'
                      }`
                    : `shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium ${
                        isActive ? 'bg-market-primary/10 text-market-primary' : 'text-market-sub'
                      }`
                }
              >
                {item.icon} {item.label}
              </NavLink>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <Outlet />
      </main>

      <footer className="border-t border-market-border bg-white py-6">
        <div className="mx-auto max-w-7xl px-4 text-center text-xs leading-relaxed text-market-sub">
          <p>AI Exchange · 全球人工智能资产交易与经济系统</p>
          <p className="mt-1">
            本平台为教育模拟产品，所有行情与价格均由 AI Engine 模拟生成，不构成任何投资建议。模型、Agent、
            Skill、MCP、应用、机器人、数据、算力与协议均为模拟上市资产，仅作 AI 生态贡献衡量，不构成任何货币或证券发行。
          </p>
        </div>
      </footer>
    </div>
  )
}
