// ============================================================
// AI Exchange · AI Capital OS 闭环引擎（运行态）
// 资本进入 → AI 理解资本 → AI 配置资本 → AI 寻找机会
//        → AI 投资 AI 企业 → AI 劳动力生产 → AI 服务产生收入
//        → 利润回到资本 → AI 再平衡
// 纯前端模拟：每 tick 依据实时市场状态（生态指数 / 情绪 / 报价）
// 驱动闭环运行，所有累计值均由真实时间增量累加，可被审计。
// ============================================================
import type { Account, CapitalGoal, CapitalGoalId, CapitalOsState, Quote, SentimentState } from '../types'
import { round2, timeStr } from '../utils/format'

type EcoShape = { users: number; agent: number; calls: number; revenue: number }

/** 基础劳动力规模：每 $1,000 资本雇佣 12 个 Agent */
export function baseLaborUnits(amount: number) {
  return Math.max(1, Math.round((amount / 1000) * 12))
}

/** 组合净值：现金 + 持仓市值 */
export function portfolioValue(account: Account, quotes: Record<string, Quote>) {
  const holdingsValue = account.holdings.reduce((sum, h) => {
    const price = quotes[h.symbol]?.price ?? h.avgCost
    return sum + h.quantity * price
  }, 0)
  return round2(account.cash + holdingsValue)
}

/** 配置偏离度：Σ|实际持仓价值 - 目标价值| / 已部署资本 × 100 */
export function allocationDrift(account: Account, targets: CapitalOsState['targets'], invested: number, quotes: Record<string, Quote>) {
  if (invested <= 0 || targets.length === 0) return 0
  let drift = 0
  for (const t of targets) {
    const h = account.holdings.find((x) => x.symbol === t.symbol)
    const actual = h ? h.quantity * (quotes[t.symbol]?.price ?? h.avgCost) : 0
    drift += Math.abs(actual - (invested * t.pct) / 100)
  }
  return round2((drift / invested) * 100)
}

/** 初始化闭环运行态：按实际成交记录生成目标配置 */
export function initCapitalOs(opts: {
  planId: string
  amount: number
  invested: number
  goal: CapitalGoal
  buys: { symbol: string; name: string; cost: number }[]
  startedAt?: string
}): CapitalOsState {
  const { planId, amount, invested, goal, buys } = opts
  const startedAt = opts.startedAt ?? timeStr()
  const targets = buys.map((b) => ({
    symbol: b.symbol,
    name: b.name,
    pct: round2((b.cost / Math.max(1, invested)) * 100),
  }))
  return {
    active: true,
    planId,
    goalId: goal.id as CapitalGoalId,
    goalLabel: goal.label,
    goalIcon: goal.icon,
    amount,
    invested: round2(invested),
    laborUnits: baseLaborUnits(amount),
    laborOutput: 0,
    serviceRevenue: 0,
    profitReturned: 0,
    retained: 0,
    rebalances: 0,
    lastRebalanceAt: '',
    startedAt,
    lastAccrualAt: Date.now(),
    targets,
    nav: round2(amount),
    driftPct: 0,
    history: [{ t: startedAt, revenue: 0, profit: 0, nav: round2(amount) }],
  }
}

/**
 * 每 tick 运行一步闭环（按真实流逝秒数结算）：
 *   AI 劳动力生产 → 服务收入 → 利润（30%）→ 60% 分红回流账户 / 40% 留存
 *   偏离度超过阈值或情绪极端时触发 AI 再平衡
 */
export function runCapitalOsTick(
  cap: CapitalOsState,
  account: Account,
  quotes: Record<string, Quote>,
  eco: EcoShape,
  sentiment: SentimentState,
): { cap: CapitalOsState; account: Account } {
  if (!cap.active) return { cap, account }
  const now = Date.now()
  const dt = Math.min(Math.max((now - cap.lastAccrualAt) / 1000, 0), 3600) // 秒，封顶 1h 防后台跳变
  if (dt <= 0) return { cap, account }

  // 生态活力：用户 / Agent / 调用 / 营收 几何平均
  const vitality = (eco.users * eco.agent * eco.calls * eco.revenue) ** 0.25
  const sentimentBias = (sentiment.score - 50) / 50 // -1 ~ 1

  // ---- 6 · AI 劳动力生产 ----
  const laborUnits = Math.max(baseLaborUnits(cap.amount), cap.laborUnits)
  const outputRate = laborUnits * 0.02 * vitality // 任务量 / 秒
  const laborOutput = cap.laborOutput + outputRate * dt

  // ---- 7 · AI 服务产生收入（USDT/秒 = 部署资本 × 营收景气 × 情绪偏置）----
  const revenueRate = cap.invested * 2.2e-8 * vitality * (1 + sentimentBias * 0.3)
  const revenueTick = revenueRate * dt
  const serviceRevenue = cap.serviceRevenue + revenueTick

  // ---- 8 · 利润回到资本：30% 利润率，60% 分红回流账户现金 ----
  const profit = revenueTick * 0.3
  const dividend = profit * 0.6
  const nextAccount: Account = {
    ...account,
    cash: round2(account.cash + dividend),
    totalEarned: round2(account.totalEarned + dividend),
  }
  const profitReturned = cap.profitReturned + dividend
  const retained = cap.retained + (profit - dividend)

  // ---- 组合净值 & 配置偏离 ----
  const nav = portfolioValue(nextAccount, quotes)
  const driftPct = allocationDrift(nextAccount, cap.targets, cap.invested, quotes)

  // ---- 9 · AI 再平衡：偏离 > 10% 或情绪极端（恐惧≤20 / 贪婪≥80）----
  let cap2: CapitalOsState = {
    ...cap,
    laborUnits,
    laborOutput,
    serviceRevenue,
    profitReturned,
    retained,
    nav,
    driftPct,
    lastAccrualAt: now,
    history: [...cap.history.slice(-119), { t: timeStr(new Date(now)), revenue: serviceRevenue, profit: profitReturned, nav }],
  }
  let account2 = nextAccount
  const extreme = sentiment.score <= 20 || sentiment.score >= 80
  if ((driftPct > 10 || extreme) && cap.rebalances < 100) {
    const r = rebalanceCapitalOs(cap2, account2, quotes, now)
    cap2 = r.cap
    account2 = r.account
  }

  return { cap: cap2, account: account2 }
}

/** 再平衡：按目标配置（pct × 已部署资本）对持仓做差额调仓，重置偏离度 */
export function rebalanceCapitalOs(
  cap: CapitalOsState,
  account: Account,
  quotes: Record<string, Quote>,
  now: number,
): { cap: CapitalOsState; account: Account } {
  let cash = account.cash
  let holdings = [...account.holdings]
  const investedNow = account.holdings.reduce((s, h) => s + h.quantity * (quotes[h.symbol]?.price ?? h.avgCost), 0)
  const base = Math.max(cap.invested, investedNow)
  const minTrade = base * 0.003

  for (const t of cap.targets) {
    const price = quotes[t.symbol]?.price ?? 0
    if (price <= 0) continue
    const cur = holdings.find((h) => h.symbol === t.symbol)
    const curVal = cur ? cur.quantity * price : 0
    const targetVal = (base * t.pct) / 100
    const delta = targetVal - curVal
    if (Math.abs(delta) < minTrade) continue
    const qty = Math.floor(Math.abs(delta) / price)
    if (qty <= 0) continue

    if (delta > 0) {
      const cost = qty * price
      if (cost <= cash) {
        cash = round2(cash - cost)
        holdings = cur
          ? holdings.map((h) =>
              h.symbol === t.symbol
                ? { ...h, quantity: h.quantity + qty, avgCost: round2((h.avgCost * h.quantity + cost) / (h.quantity + qty)) }
                : h,
            )
          : [...holdings, { symbol: t.symbol, name: t.name, quantity: qty, avgCost: price }]
      }
    } else if (cur && cur.quantity >= qty) {
      cash = round2(cash + qty * price)
      holdings = holdings.map((h) => (h.symbol === t.symbol ? { ...h, quantity: h.quantity - qty } : h)).filter((h) => h.quantity > 0)
    }
  }

  const nextAccount: Account = { ...account, cash, holdings }
  const nav = portfolioValue(nextAccount, quotes)
  const driftPct = allocationDrift(nextAccount, cap.targets, cap.invested, quotes)
  return {
    cap: {
      ...cap,
      nav,
      driftPct,
      rebalances: cap.rebalances + 1,
      lastRebalanceAt: timeStr(new Date(now)),
      lastAccrualAt: now,
      history: [...cap.history.slice(-119), { t: timeStr(new Date(now)), revenue: cap.serviceRevenue, profit: cap.profitReturned, nav }],
    },
    account: nextAccount,
  }
}

/** 停止闭环（保留账户现状） */
export function deactivateCapitalOs(cap: CapitalOsState | null): CapitalOsState | null {
  return cap ? { ...cap, active: false } : null
}

/** 运行年化（按真实流逝时间折算，%）：利润回流 / 资本 / 天数 × 365 */
export function annualizedReturn(cap: CapitalOsState) {
  const start = new Date(cap.startedAt.replace(' ', 'T')).getTime()
  const days = Math.max((Date.now() - start) / 86400000, 1 / 1440)
  return round2(((cap.profitReturned + (cap.nav - cap.amount)) / Math.max(1, cap.amount) / days) * 36500)
}
