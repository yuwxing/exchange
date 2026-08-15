// ============================================================
// AI Exchange · AI Economy Orchestrator（经济三引擎编排层）
// 把 ① Demand Engine → ② Production Engine → ③ Economic Ledger
// 串成一条真实运行的资金闭环，替换原先单点的「服务收入 → 利润」逻辑：
//   人类需求(Demand) → 市场订单 → 企业竞争(中标=收入)
//   AI Worker + Skill + Compute + Time(Production) → 产出 + 成本 + 工资
//   Economic Ledger → 收入 - 成本 - 工资 = 利润 → 60% 分红 / 40% 再投资
// 利润分红回流账户现金，留存再投资进入 AI 再平衡。
// ============================================================
import type {
  Account,
  Asset,
  CapitalOsState,
  DemandEngineState,
  EconomicLedgerState,
  ProductionEngineState,
  Quote,
  SentimentState,
} from '../types'
import {
  allocationDrift,
  baseLaborUnits,
  portfolioValue,
  rebalanceCapitalOs,
} from './capitalOs'
import { runDemandTick } from './demandEngine'
import { runProductionTick } from './productionEngine'
import { runLedgerTick } from './economicLedger'
import { round2, timeStr } from '../utils/format'

type EcoShape = { users: number; agent: number; calls: number; revenue: number }

export type EconomyState = {
  capitalOs: CapitalOsState
  demand: DemandEngineState
  production: ProductionEngineState
  ledger: EconomicLedgerState
  account: Account
}

/** 每 tick 运行一次完整 AI 经济闭环（三引擎联动） */
export function runEconomyTick(
  capitalOs: CapitalOsState,
  demand: DemandEngineState,
  production: ProductionEngineState,
  ledger: EconomicLedgerState,
  account: Account,
  quotes: Record<string, Quote>,
  assets: Asset[],
  eco: EcoShape,
  sentiment: SentimentState,
): EconomyState {
  if (!capitalOs.active) {
    return { capitalOs, demand, production, ledger, account }
  }
  const now = Date.now()
  const dt = Math.min(Math.max((now - capitalOs.lastAccrualAt) / 1000, 0), 3600) // 秒，封顶 1h
  if (dt <= 0) return { capitalOs, demand, production, ledger, account }

  // ---- 生态活力：用户 / Agent / 调用 / 营收 几何平均 ----
  const vitality = (eco.users * eco.agent * eco.calls * eco.revenue) ** 0.25
  const sentimentBias = (sentiment.score - 50) / 50

  // ---- 收入速率（与 AI 服务收入同源，保证账本对齐）----
  const revenueRate = capitalOs.invested * 2.2e-8 * vitality * (1 + sentimentBias * 0.3)
  const revenueTick = revenueRate * dt

  // ---- 劳动力产出速率 ----
  const laborUnits = Math.max(baseLaborUnits(capitalOs.amount), capitalOs.laborUnits)
  const laborOutputTick = laborUnits * 0.02 * vitality * dt

  // ---- ① Demand Engine：人类需求 → 订单 → 企业竞争 ----
  const demandRes = runDemandTick(demand, {
    assets,
    cap: capitalOs,
    revenueTick,
    vitality,
    sentiment,
  })

  // ---- ② Production Engine：Worker + Skill + Compute + Time → Production ----
  const prodRes = runProductionTick(production, {
    cap: capitalOs,
    assets,
    revenueTick,
    laborOutputTick,
    dt,
  })

  // ---- ③ Economic Ledger：收入/成本/工资 → 利润 → 投资/分红 ----
  const ledgerRes = runLedgerTick(ledger, {
    revenue: revenueTick,
    cost: prodRes.computeCost,
    wage: prodRes.wageCost,
    winnerSymbol: demandRes.demand.orders.find((o) => o.status === 'fulfilled')?.winnerSymbol,
  })

  // ---- 分红回流账户现金（利润回到资本）----
  const nextAccount: Account = {
    ...account,
    cash: round2(account.cash + ledgerRes.dividend),
    totalEarned: round2(account.totalEarned + ledgerRes.dividend),
  }

  // ---- 同步 Capital OS 运行指标（由三引擎驱动）----
  const nav = portfolioValue(nextAccount, quotes)
  const driftPct = allocationDrift(nextAccount, capitalOs.targets, capitalOs.invested, quotes)
  let nextCap: CapitalOsState = {
    ...capitalOs,
    laborUnits,
    laborOutput: round2(capitalOs.laborOutput + laborOutputTick),
    serviceRevenue: ledgerRes.ledger.revenue,
    profitReturned: ledgerRes.ledger.dividend,
    retained: ledgerRes.ledger.investment,
    nav,
    driftPct,
    lastAccrualAt: now,
    history: [
      ...capitalOs.history.slice(-119),
      { t: timeStr(new Date(now)), revenue: ledgerRes.ledger.revenue, profit: ledgerRes.ledger.dividend, nav },
    ],
  }

  let nextDemand = demandRes.demand
  let nextProd = prodRes.production
  let nextLedger = ledgerRes.ledger
  let nextAccount2 = nextAccount

  // ---- AI 再平衡：偏离 >10% 或情绪极端（恐惧≤20 / 贪婪≥80）----
  const extreme = sentiment.score <= 20 || sentiment.score >= 80
  if ((driftPct > 10 || extreme) && nextCap.rebalances < 100) {
    const r = rebalanceCapitalOs(nextCap, nextAccount2, quotes, now)
    nextCap = r.cap
    nextAccount2 = r.account
    // 留存再投资进入再平衡时的实际调仓金额计入账本投资
    if (nextCap.rebalances > capitalOs.rebalances) {
      nextLedger = {
        ...nextLedger,
        investment: round2(nextLedger.investment + nextCap.retained),
      }
    }
  }

  return {
    capitalOs: nextCap,
    demand: nextDemand,
    production: nextProd,
    ledger: nextLedger,
    account: nextAccount2,
  }
}
