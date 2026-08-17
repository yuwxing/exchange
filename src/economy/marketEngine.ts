// ============================================================
// Market Engine — 模拟订单簿与撮合
// Market Order / Limit Order / 撮合 / 订单状态
// ============================================================
import type { EconomyState, SimOrder } from './types'

export function initOrders(): SimOrder[] {
  return []
}

/** 每个 tick 的订单簿维护：超时取消最老的 pending 订单 */
export function tickMarket(state: EconomyState): EconomyState {
  if (state.tickCount % 25 !== 0) return state
  const pending = state.orders.filter((o) => o.status === 'pending')
  if (pending.length === 0) return state
  const oldest = pending[pending.length - 1]
  const orders = state.orders.map((o) =>
    o.id === oldest.id ? { ...o, status: 'cancelled' as const } : o,
  )
  return { ...state, orders }
}
