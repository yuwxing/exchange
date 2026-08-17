// ============================================================
// Economy Engine Facade
// 统一调度 DSU / WEG / Company / Worker 四个经济引擎。
// 页面与 store 只依赖这层，避免直接耦合子引擎的初始化细节。
// ============================================================
import type { EconomyState } from './types'
import { initEconomy, tickEconomy } from './simulationEngine'

export type EconomyEngine = {
  createState: () => EconomyState
  tick: (state: EconomyState) => EconomyState
}

export const economyEngine: EconomyEngine = {
  createState: initEconomy,
  tick: tickEconomy,
}

export const createEconomyState = economyEngine.createState
export const tickEconomyState = economyEngine.tick

