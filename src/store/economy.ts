// ============================================================
// AI Economy Store
// 统一持有 EconomyState，提供 tick 与所有模拟经济动作
// ============================================================
import { create } from 'zustand'
import type { EconomyState, SimOrder } from '../economy/types'
import { createEconomyState, tickEconomyState } from '../economy/economyEngine'
import { hireWorker, fireWorker, trainWorker } from '../economy/workerEngine'
import { round2, timeStr } from '../utils/format'

type EconomyActions = {
  tick: () => void
  buyCompany: (symbol: string, quantity: number, type?: SimOrder['type'], price?: number) => { ok: boolean; message: string }
  sellCompany: (symbol: string, quantity: number, type?: SimOrder['type'], price?: number) => { ok: boolean; message: string }
  cancelOrder: (id: string) => void
  hireWorker: (id: string) => { ok: boolean; message: string }
  fireWorker: (id: string) => { ok: boolean; message: string }
  trainWorker: (id: string) => { ok: boolean; message: string }
  deployWorker: (id: string) => { ok: boolean; message: string }
  mintDSU: (amount: number) => { ok: boolean; message: string }
  burnDSU: (amount: number) => { ok: boolean; message: string }
  triggerEvent: (id?: string) => { ok: boolean; message: string }
  resetEconomy: () => void
}

export type EconomyStore = EconomyState & EconomyActions

function uid(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`
}

export const useEconomy = create<EconomyStore>((set, get) => ({
  ...createEconomyState(),

  tick: () => {
    set((state) => tickEconomyState(state))
  },

  buyCompany: (symbol, quantity, type = 'market', price) => {
    const state = get()
    const c = state.companies.find((x) => x.symbol === symbol)
    if (!c) return { ok: false, message: '企业不存在' }
    if (quantity <= 0) return { ok: false, message: '数量不合法' }

    const orderPrice = type === 'market' ? c.price : round2(price ?? c.price)
    const order: SimOrder = {
      id: uid('so'),
      companySymbol: symbol,
      side: 'buy',
      type,
      price: orderPrice,
      quantity,
      filled: 0,
      status: 'pending',
      time: timeStr(),
    }
    const next = { ...state, orders: [...state.orders, order] }
    const afterTick = tickEconomyState(next)
    set(afterTick)
    const filled = afterTick.orders.find((o) => o.id === order.id)?.filled ?? 0
    if (filled > 0) {
      return { ok: true, message: `已买入 ${symbol} ${filled}/${quantity} 股 @ ${orderPrice} DSU` }
    }
    return { ok: true, message: `限价买单 ${symbol} ${quantity} 股 @ ${orderPrice} DSU 已挂单` }
  },

  sellCompany: (symbol, quantity, type = 'market', price) => {
    const state = get()
    const c = state.companies.find((x) => x.symbol === symbol)
    if (!c) return { ok: false, message: '企业不存在' }
    const pos = state.portfolio.companyPositions[symbol]
    if (!pos || pos.shares < quantity) return { ok: false, message: '持仓不足' }

    const orderPrice = type === 'market' ? c.price : round2(price ?? c.price)
    const order: SimOrder = {
      id: uid('so'),
      companySymbol: symbol,
      side: 'sell',
      type,
      price: orderPrice,
      quantity,
      filled: 0,
      status: 'pending',
      time: timeStr(),
    }
    const next = { ...state, orders: [...state.orders, order] }
    const afterTick = tickEconomyState(next)
    set(afterTick)
    const filled = afterTick.orders.find((o) => o.id === order.id)?.filled ?? 0
    if (filled > 0) {
      return { ok: true, message: `已卖出 ${symbol} ${filled}/${quantity} 股 @ ${orderPrice} DSU` }
    }
    return { ok: true, message: `限价卖单 ${symbol} ${quantity} 股 @ ${orderPrice} DSU 已挂单` }
  },

  cancelOrder: (id) => {
    set((state) => ({ ...state, orders: state.orders.filter((o) => o.id !== id) }))
  },

  hireWorker: (id) => {
    const state = get()
    const idx = state.workers.findIndex((w) => w.id === id)
    if (idx === -1) return { ok: false, message: 'Agent 不存在' }
    const w = state.workers[idx]
    if (w.owner === 'user') return { ok: false, message: '已拥有该 Agent' }
    if (state.portfolio.dsuBalance < w.hireCost) return { ok: false, message: `DSU 不足（需 ${w.hireCost}）` }

    const updated = hireWorker(w)
    const workers = state.workers.map((x, i) => (i === idx ? updated : x))
    const portfolio = {
      ...state.portfolio,
      dsuBalance: round2(state.portfolio.dsuBalance - w.hireCost),
      workerRoster: [...state.portfolio.workerRoster, id],
    }
    set(tickEconomyState({ ...state, workers, portfolio }))
    return { ok: true, message: `已雇佣 ${w.name}（花费 ${w.hireCost} DSU）` }
  },

  fireWorker: (id) => {
    const state = get()
    const idx = state.workers.findIndex((w) => w.id === id)
    if (idx === -1) return { ok: false, message: 'Agent 不存在' }
    const w = state.workers[idx]
    if (w.owner !== 'user') return { ok: false, message: '未雇佣该 Agent' }

    const updated = fireWorker(w)
    const workers = state.workers.map((x, i) => (i === idx ? updated : x))
    const portfolio = {
      ...state.portfolio,
      workerRoster: state.portfolio.workerRoster.filter((x) => x !== id),
    }
    set(tickEconomyState({ ...state, workers, portfolio }))
    return { ok: true, message: `已解雇 ${w.name}` }
  },

  trainWorker: (id) => {
    const state = get()
    const idx = state.workers.findIndex((w) => w.id === id)
    if (idx === -1) return { ok: false, message: 'Agent 不存在' }
    const w = state.workers[idx]
    if (w.owner !== 'user') return { ok: false, message: '只能训练已雇佣的 Agent' }
    const cost = 10
    if (state.portfolio.dsuBalance < cost) return { ok: false, message: `DSU 不足（训练需 ${cost}）` }

    const updated = trainWorker(w)
    const workers = state.workers.map((x, i) => (i === idx ? updated : x))
    const portfolio = { ...state.portfolio, dsuBalance: round2(state.portfolio.dsuBalance - cost) }
    set(tickEconomyState({ ...state, workers, portfolio }))
    return { ok: true, message: `${w.name} 训练完成，等级 ${w.level} → ${updated.level}` }
  },

  deployWorker: (id) => {
    const state = get()
    const idx = state.workers.findIndex((w) => w.id === id)
    if (idx === -1) return { ok: false, message: 'Agent 不存在' }
    const w = state.workers[idx]
    if (w.owner !== 'user') return { ok: false, message: '先雇佣该 Agent' }
    if (w.status === 'working') return { ok: false, message: 'Agent 已在工作中' }

    const workers = state.workers.map((x, i) => (i === idx ? { ...x, status: 'working' as const } : x))
    set(tickEconomyState({ ...state, workers }))
    return { ok: true, message: `${w.name} 已部署并开始产出` }
  },

  mintDSU: (amount) => {
    const state = get()
    if (amount <= 0) return { ok: false, message: '数量不合法' }
    const dsu = { ...state.dsu, circulation: state.dsu.circulation + amount }
    const portfolio = { ...state.portfolio, dsuBalance: round2(state.portfolio.dsuBalance + amount) }
    set(tickEconomyState({ ...state, dsu, portfolio }))
    return { ok: true, message: `模拟铸造 ${amount} DSU` }
  },

  burnDSU: (amount) => {
    const state = get()
    if (amount <= 0) return { ok: false, message: '数量不合法' }
    if (state.portfolio.dsuBalance < amount) return { ok: false, message: 'DSU 余额不足' }
    const dsu = { ...state.dsu, circulation: Math.max(0, state.dsu.circulation - amount) }
    const portfolio = { ...state.portfolio, dsuBalance: round2(state.portfolio.dsuBalance - amount) }
    set(tickEconomyState({ ...state, dsu, portfolio }))
    return { ok: true, message: `模拟销毁 ${amount} DSU` }
  },

  triggerEvent: (id) => {
    const state = get()
    const e = id ? state.events.find((x) => x.id === id) : state.events.filter((x) => !x.active)[Math.floor(Math.random() * state.events.filter((x) => !x.active).length)]
    if (!e) return { ok: false, message: '无可用事件' }
    const events = state.events.map((x) => (x.id === e.id ? { ...x, active: true, durationTicks: 6, time: timeStr() } : x))
    set(tickEconomyState({ ...state, events }))
    return { ok: true, message: `经济事件：${e.title}` }
  },

  resetEconomy: () => {
    set(createEconomyState())
  },
}))
