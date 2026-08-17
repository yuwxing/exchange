// ============================================================
// WEG Engine — 平台生态增长资产
// WEG Price = BasePrice * PlatformGrowth * UserGrowth * TransactionGrowth * AgentGrowth
// ============================================================
import type { WEGState } from './types'
import { clamp, round2, mulberry32 } from '../utils/format'

const BASE_PRICE = 0.05

export function initWEG(): WEGState {
  return {
    price: 0.0842,
    prevPrice: 0.0842,
    changePct: 0,
    marketCap: 8_420_000,
    totalSupply: 100_000_000,
    circulatingSupply: 42_000_000,
    history: Array.from({ length: 40 }, (_, i) => 0.05 + i * 0.001 + Math.sin(i * 0.4) * 0.003),
    factors: {
      platformGrowth: 1.12,
      userGrowth: 1.18,
      transactionGrowth: 1.24,
      agentGrowth: 1.15,
    },
  }
}

let wegRng = mulberry32(848484)

export function tickWEG(
  state: WEGState,
  eco: { users: number; agents: number; transactions: number; companies: number },
  events: { impactTarget: string; magnitude: number }[],
): WEGState {
  const r = wegRng()

  // 增长因子缓慢演化；整体生态规模作为温和的增长锚点，
  // 让 WEG 与四引擎产出的用户/交易/Agent 数保持联动。
  const scale = clamp(
    (eco.users / 1_200_000 + eco.agents / 2_000_000 + eco.transactions / 3_000_000 + eco.companies / 3_800) / 4,
    0.75,
    1.5,
  )
  const factors = {
    platformGrowth: clamp(state.factors.platformGrowth + (r - 0.48) * 0.003 + (scale - 1) * 0.001, 0.9, 1.5),
    userGrowth: clamp(state.factors.userGrowth + (wegRng() - 0.48) * 0.004 + (eco.users / 1_200_000 - 1) * 0.001, 0.9, 1.6),
    transactionGrowth: clamp(state.factors.transactionGrowth + (wegRng() - 0.48) * 0.005 + (eco.transactions / 3_000_000 - 1) * 0.001, 0.9, 1.7),
    agentGrowth: clamp(state.factors.agentGrowth + (wegRng() - 0.48) * 0.003 + (eco.agents / 2_000_000 - 1) * 0.001, 0.9, 1.5),
  }

  let rawPrice = BASE_PRICE * factors.platformGrowth * factors.userGrowth * factors.transactionGrowth * factors.agentGrowth

  // 事件影响
  for (const e of events) {
    if (e.impactTarget === 'weg') rawPrice *= 1 + e.magnitude / 100
  }

  const price = clamp(rawPrice, 0.01, 1.0)
  const changePct = (price - state.price) / state.price
  const circulatingSupply = state.circulatingSupply + Math.round((r - 0.4) * 2000)

  const history = [...state.history.slice(-39), price]

  return {
    ...state,
    prevPrice: state.price,
    price: round2(price * 100) / 100,
    changePct,
    marketCap: Math.round(price * state.totalSupply),
    circulatingSupply,
    factors,
    history,
  }
}
