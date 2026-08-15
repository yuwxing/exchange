// ============================================================
// AI Exchange · ③ Economic Ledger（经济账本）
// 所有资金流 → 收入 → 成本 → 工资 → 利润 → 投资 → 分红
// 复式记账：每个 tick 把「收入(订单成交) / 成本(算力) / 工资 / 利润 /
// 投资(留存) / 分红(回流资本)」逐笔记录，形成可审计的资金流水。
// 利润 = 收入 - 成本 - 工资；分红 = 利润 × 60%；投资 = 利润 × 40%。
// ============================================================
import type { EconomicLedgerState, LedgerEntry, LedgerType } from '../types'
import { round2, timeStr } from '../utils/format'

/** 账本条目图标 */
export const LEDGER_ICONS: Record<LedgerType, string> = {
  revenue: '💰',
  cost: '⚡',
  wage: '🧑‍💻',
  profit: '📈',
  investment: '🏗️',
  dividend: '💸',
}

export const LEDGER_LABELS: Record<LedgerType, string> = {
  revenue: '收入',
  cost: '成本',
  wage: '工资',
  profit: '利润',
  investment: '投资',
  dividend: '分红',
}

/** 初始化经济账本 */
export function initLedger(): EconomicLedgerState {
  return {
    entries: [],
    revenue: 0,
    cost: 0,
    wage: 0,
    profit: 0,
    investment: 0,
    dividend: 0,
  }
}

let entrySeq = 0
function pushEntry(
  entries: LedgerEntry[],
  type: LedgerType,
  amount: number,
  note: string,
  symbol?: string,
): LedgerEntry[] {
  entrySeq += 1
  const entry: LedgerEntry = {
    id: `lg-${Date.now()}-${entrySeq}`,
    type,
    amount: round2(amount),
    symbol,
    note,
    time: timeStr(),
  }
  return [entry, ...entries].slice(0, 120)
}

export type LedgerTickCtx = {
  revenue: number // 本 tick 收入
  cost: number // 本 tick 算力成本
  wage: number // 本 tick 工资
  winnerSymbol?: string // 订单中标企业
}

export type LedgerTickResult = {
  ledger: EconomicLedgerState
  profit: number // 本 tick 利润
  dividend: number // 本 tick 分红（回流资本）
  investment: number // 本 tick 再投资（留存）
}

/** 每 tick 结算一步账本 */
export function runLedgerTick(ledger: EconomicLedgerState, ctx: LedgerTickCtx): LedgerTickResult {
  const revenue = Math.max(0, ctx.revenue)
  const cost = Math.max(0, ctx.cost)
  const wage = Math.max(0, ctx.wage)
  const profit = Math.max(0, revenue - cost - wage)
  const dividend = profit * 0.6 // 60% 分红回流资本
  const investment = profit * 0.4 // 40% 留存再投资

  let entries = ledger.entries
  if (revenue > 0.0005) entries = pushEntry(entries, 'revenue', revenue, '订单成交 · AI 服务收入', ctx.winnerSymbol)
  if (cost > 0.0005) entries = pushEntry(entries, 'cost', -cost, '算力消耗 · Compute')
  if (wage > 0.0005) entries = pushEntry(entries, 'wage', -wage, 'AI Worker 工资')
  if (profit > 0.0005) entries = pushEntry(entries, 'profit', profit, '净利润 = 收入 - 成本 - 工资')
  if (investment > 0.0005) entries = pushEntry(entries, 'investment', -investment, '留存再投资（40%）')
  if (dividend > 0.0005) entries = pushEntry(entries, 'dividend', dividend, '分红回流资本（60%）')

  return {
    ledger: {
      ...ledger,
      entries,
      revenue: round2(ledger.revenue + revenue),
      cost: round2(ledger.cost + cost),
      wage: round2(ledger.wage + wage),
      profit: round2(ledger.profit + profit),
      investment: round2(ledger.investment + investment),
      dividend: round2(ledger.dividend + dividend),
    },
    profit: round2(profit),
    dividend: round2(dividend),
    investment: round2(investment),
  }
}
